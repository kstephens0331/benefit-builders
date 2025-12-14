import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import {
  ensureValidToken,
  getAllCustomersFromQB,
  getAllInvoicesFromQB,
  getAllPaymentsFromQB,
  getAllBillsFromQB,
  syncCustomerToQB,
  createInvoiceInQB,
  QBTokens,
} from "@/lib/quickbooks";

/**
 * POST - Auto-sync endpoint that runs before token expires
 * Called by cron job every 45 minutes
 * Only syncs if token expires within 20 minutes
 */
export async function POST(request: NextRequest) {
  try {
    const db = createServiceClient();

    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get QuickBooks connection
    const { data: connection, error: connError } = await db
      .from("quickbooks_connections")
      .select("*")
      .eq("status", "active")
      .maybeSingle();

    if (connError || !connection) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        message: "No active QuickBooks connection",
      });
    }

    // Check if token expires within 20 minutes
    const tokenExpiry = new Date(connection.token_expires_at);
    const now = new Date();
    const minutesUntilExpiry = (tokenExpiry.getTime() - now.getTime()) / (1000 * 60);

    // Always log the status
    console.log(`QuickBooks token expires in ${minutesUntilExpiry.toFixed(1)} minutes`);

    // If token expires in more than 20 minutes, skip sync (will be triggered on next cron)
    if (minutesUntilExpiry > 20) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        message: `Token valid for ${minutesUntilExpiry.toFixed(0)} more minutes, skipping sync`,
        next_sync_before: tokenExpiry.toISOString(),
      });
    }

    // Token expires soon - run full bidirectional sync
    console.log("Token expiring soon, running full sync...");

    const tokens: QBTokens = {
      realmId: connection.realm_id,
      accessToken: connection.access_token,
      refreshToken: connection.refresh_token,
      accessTokenExpiry: connection.token_expires_at,
      refreshTokenExpiry: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // Refresh token first (ensureValidToken will refresh if needed)
    let validTokens: QBTokens;
    try {
      validTokens = await ensureValidToken(tokens);

      // Update tokens in database
      if (validTokens.accessToken !== tokens.accessToken) {
        await db
          .from("quickbooks_connections")
          .update({
            access_token: validTokens.accessToken,
            refresh_token: validTokens.refreshToken,
            token_expires_at: validTokens.accessTokenExpiry,
            updated_at: new Date().toISOString(),
          })
          .eq("id", connection.id);
        console.log("QuickBooks token refreshed successfully");
      }
    } catch (tokenError: any) {
      console.error("Token refresh failed:", tokenError);

      // Mark connection as expired
      await db
        .from("quickbooks_connections")
        .update({ status: "expired" })
        .eq("id", connection.id);

      return NextResponse.json({
        ok: false,
        error: `Token refresh failed: ${tokenError.message}`,
        action_required: "Please reconnect QuickBooks",
      }, { status: 401 });
    }

    const syncResults = {
      timestamp: new Date().toISOString(),
      token_refreshed: validTokens.accessToken !== tokens.accessToken,
      push: { customers: 0, invoices: 0, errors: [] as string[] },
      pull: { invoices: 0, bills: 0, payments: 0, errors: [] as string[] },
    };

    // Get date range for imports (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];

    // ===== PUSH: Unsynced customers to QuickBooks =====
    try {
      const { data: unsyncedCompanies } = await db
        .from("companies")
        .select("*")
        .eq("status", "active")
        .or("qb_customer_id.is.null,qb_synced_at.is.null")
        .limit(50);

      if (unsyncedCompanies && unsyncedCompanies.length > 0) {
        for (const company of unsyncedCompanies) {
          try {
            const result = await syncCustomerToQB(validTokens, {
              id: company.id,
              name: company.name,
              email: company.contact_email,
              phone: company.contact_phone,
              qb_customer_id: company.qb_customer_id,
            });

            if (result.success && result.qb_customer_id) {
              await db
                .from("companies")
                .update({
                  qb_customer_id: result.qb_customer_id,
                  qb_synced_at: new Date().toISOString(),
                })
                .eq("id", company.id);
              syncResults.push.customers++;
            }
          } catch (err: any) {
            syncResults.push.errors.push(`Customer ${company.name}: ${err.message}`);
          }
        }
      }
    } catch (err: any) {
      syncResults.push.errors.push(`Customers push failed: ${err.message}`);
    }

    // ===== PUSH: Unsynced invoices to QuickBooks =====
    try {
      const { data: unsyncedInvoices } = await db
        .from("invoices")
        .select(`
          *,
          companies(id, name, qb_customer_id)
        `)
        .eq("qb_synced", false)
        .limit(50);

      if (unsyncedInvoices && unsyncedInvoices.length > 0) {
        for (const invoice of unsyncedInvoices) {
          try {
            const company = Array.isArray(invoice.companies) ? invoice.companies[0] : invoice.companies;

            if (!company?.qb_customer_id) continue;

            const { data: lines } = await db
              .from("invoice_lines")
              .select("*")
              .eq("invoice_id", invoice.id);

            const result = await createInvoiceInQB(validTokens, {
              customer_qb_id: company.qb_customer_id,
              invoice_number: `${invoice.period}-${invoice.id.substring(0, 8)}`,
              invoice_date: invoice.issued_at.split("T")[0],
              due_date: new Date(
                new Date(invoice.issued_at).getTime() + 30 * 24 * 60 * 60 * 1000
              ).toISOString().split("T")[0],
              line_items: lines?.map((line) => ({
                description: line.description,
                quantity: parseFloat(line.quantity.toString()),
                rate: line.unit_price_cents,
                amount: line.amount_cents,
              })) || [],
              subtotal: invoice.subtotal_cents,
              tax_amount: invoice.tax_cents,
              total: invoice.total_cents,
            });

            if (result.success && result.qb_invoice_id) {
              await db
                .from("invoices")
                .update({
                  qb_invoice_id: result.qb_invoice_id,
                  qb_synced: true,
                  qb_synced_at: new Date().toISOString(),
                })
                .eq("id", invoice.id);
              syncResults.push.invoices++;
            }
          } catch (err: any) {
            syncResults.push.errors.push(`Invoice ${invoice.id}: ${err.message}`);
          }
        }
      }
    } catch (err: any) {
      syncResults.push.errors.push(`Invoices push failed: ${err.message}`);
    }

    // ===== PULL: Invoices from QuickBooks =====
    try {
      const invoicesResult = await getAllInvoicesFromQB(validTokens, thirtyDaysAgo, today);

      if (invoicesResult.success && invoicesResult.invoices) {
        for (const qbInvoice of invoicesResult.invoices) {
          try {
            const { data: existingAR } = await db
              .from("accounts_receivable")
              .select("id")
              .eq("quickbooks_invoice_id", qbInvoice.Id)
              .maybeSingle();

            const { data: company } = await db
              .from("companies")
              .select("id")
              .eq("qb_customer_id", qbInvoice.CustomerRef?.value)
              .maybeSingle();

            const invoiceAmount = parseFloat(qbInvoice.TotalAmt || "0");
            const balanceDue = parseFloat(qbInvoice.Balance || "0");
            const amountPaid = invoiceAmount - balanceDue;

            let status = "open";
            if (balanceDue <= 0) status = "paid";
            else if (amountPaid > 0) status = "partial";
            else if (new Date(qbInvoice.DueDate) < new Date()) status = "overdue";

            if (existingAR) {
              await db
                .from("accounts_receivable")
                .update({
                  amount: invoiceAmount,
                  amount_paid: amountPaid,
                  status,
                  synced_to_qb: true,
                  last_synced_at: new Date().toISOString(),
                })
                .eq("id", existingAR.id);
            } else {
              await db
                .from("accounts_receivable")
                .insert({
                  company_id: company?.id || null,
                  invoice_number: qbInvoice.DocNumber || `QB-${qbInvoice.Id}`,
                  invoice_date: qbInvoice.TxnDate,
                  due_date: qbInvoice.DueDate || qbInvoice.TxnDate,
                  amount: invoiceAmount,
                  amount_paid: amountPaid,
                  status,
                  description: `Imported from QuickBooks`,
                  quickbooks_invoice_id: qbInvoice.Id,
                  synced_to_qb: true,
                  last_synced_at: new Date().toISOString(),
                });
              syncResults.pull.invoices++;
            }
          } catch (err: any) {
            syncResults.pull.errors.push(`Invoice ${qbInvoice.Id}: ${err.message}`);
          }
        }
      }
    } catch (err: any) {
      syncResults.pull.errors.push(`Invoices pull failed: ${err.message}`);
    }

    // ===== PULL: Bills from QuickBooks =====
    try {
      const billsResult = await getAllBillsFromQB(validTokens, thirtyDaysAgo, today);

      if (billsResult.success && billsResult.bills) {
        for (const qbBill of billsResult.bills) {
          try {
            const { data: existingAP } = await db
              .from("accounts_payable")
              .select("id")
              .eq("quickbooks_bill_id", qbBill.Id)
              .maybeSingle();

            const billAmount = parseFloat(qbBill.TotalAmt || "0");
            const balanceDue = parseFloat(qbBill.Balance || "0");
            const amountPaid = billAmount - balanceDue;

            let status = "open";
            if (balanceDue <= 0) status = "paid";
            else if (amountPaid > 0) status = "partial";
            else if (new Date(qbBill.DueDate) < new Date()) status = "overdue";

            if (!existingAP) {
              await db
                .from("accounts_payable")
                .insert({
                  vendor_name: qbBill.VendorRef?.name || "Unknown Vendor",
                  bill_number: qbBill.DocNumber || `QB-${qbBill.Id}`,
                  bill_date: qbBill.TxnDate,
                  due_date: qbBill.DueDate || qbBill.TxnDate,
                  amount: billAmount,
                  amount_paid: amountPaid,
                  status,
                  description: `Imported from QuickBooks`,
                  quickbooks_bill_id: qbBill.Id,
                  synced_to_qb: true,
                  last_synced_at: new Date().toISOString(),
                });
              syncResults.pull.bills++;
            }
          } catch (err: any) {
            syncResults.pull.errors.push(`Bill ${qbBill.Id}: ${err.message}`);
          }
        }
      }
    } catch (err: any) {
      syncResults.pull.errors.push(`Bills pull failed: ${err.message}`);
    }

    // ===== PULL: Payments from QuickBooks =====
    try {
      const paymentsResult = await getAllPaymentsFromQB(validTokens, thirtyDaysAgo, today);

      if (paymentsResult.success && paymentsResult.payments) {
        for (const qbPayment of paymentsResult.payments) {
          try {
            const { data: existingPayment } = await db
              .from("payment_transactions")
              .select("id")
              .eq("quickbooks_payment_id", qbPayment.Id)
              .maybeSingle();

            if (!existingPayment) {
              const linkedInvoiceId = qbPayment.Line?.[0]?.LinkedTxn?.[0]?.TxnId;
              let arId = null;

              if (linkedInvoiceId) {
                const { data: arRecord } = await db
                  .from("accounts_receivable")
                  .select("id")
                  .eq("quickbooks_invoice_id", linkedInvoiceId)
                  .maybeSingle();
                arId = arRecord?.id;
              }

              const paymentAmount = parseFloat(qbPayment.TotalAmt || "0");

              await db
                .from("payment_transactions")
                .insert({
                  transaction_type: "ar_payment",
                  ar_id: arId,
                  payment_date: qbPayment.TxnDate,
                  amount: paymentAmount,
                  payment_method: "other",
                  reference_number: qbPayment.PaymentRefNum || null,
                  notes: `Imported from QuickBooks`,
                  quickbooks_payment_id: qbPayment.Id,
                  synced_to_qb: true,
                  last_synced_at: new Date().toISOString(),
                });
              syncResults.pull.payments++;
            }
          } catch (err: any) {
            syncResults.pull.errors.push(`Payment ${qbPayment.Id}: ${err.message}`);
          }
        }
      }
    } catch (err: any) {
      syncResults.pull.errors.push(`Payments pull failed: ${err.message}`);
    }

    // Log sync results
    const totalPushed = syncResults.push.customers + syncResults.push.invoices;
    const totalPulled = syncResults.pull.invoices + syncResults.pull.bills + syncResults.pull.payments;
    const totalErrors = syncResults.push.errors.length + syncResults.pull.errors.length;

    await db.from("quickbooks_sync_log").insert({
      connection_id: connection.id,
      sync_type: "auto",
      status: totalErrors > 0 ? "partial" : "success",
      customers_pushed: syncResults.push.customers,
      invoices_pushed: syncResults.push.invoices,
      invoices_pulled: syncResults.pull.invoices,
      payments_pulled: syncResults.pull.payments,
      errors: JSON.stringify({
        push: syncResults.push.errors,
        pull: syncResults.pull.errors,
      }),
      synced_at: new Date().toISOString(),
    });

    // Update last sync time
    await db
      .from("quickbooks_connections")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", connection.id);

    return NextResponse.json({
      ok: true,
      message: `Auto-sync complete: pushed ${totalPushed}, pulled ${totalPulled}, ${totalErrors} errors`,
      results: syncResults,
    });
  } catch (error: any) {
    console.error("Auto-sync error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET - Check sync status and next scheduled sync
 */
export async function GET(request: NextRequest) {
  try {
    const db = createServiceClient();

    const { data: connection } = await db
      .from("quickbooks_connections")
      .select("*")
      .eq("status", "active")
      .maybeSingle();

    if (!connection) {
      return NextResponse.json({
        ok: true,
        connected: false,
        message: "QuickBooks not connected",
      });
    }

    const tokenExpiry = new Date(connection.token_expires_at);
    const now = new Date();
    const minutesUntilExpiry = (tokenExpiry.getTime() - now.getTime()) / (1000 * 60);

    // Get last sync
    const { data: lastSync } = await db
      .from("quickbooks_sync_log")
      .select("*")
      .eq("connection_id", connection.id)
      .order("synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      connected: true,
      token_status: {
        expires_at: tokenExpiry.toISOString(),
        minutes_remaining: Math.round(minutesUntilExpiry),
        needs_sync: minutesUntilExpiry <= 20,
      },
      last_sync: lastSync ? {
        at: lastSync.synced_at,
        type: lastSync.sync_type,
        status: lastSync.status,
      } : null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
