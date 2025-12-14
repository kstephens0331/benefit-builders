import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import {
  ensureValidToken,
  getAllCustomersFromQB,
  getAllInvoicesFromQB,
  getAllPaymentsFromQB,
  getAllBillsFromQB,
  QBTokens,
} from "@/lib/quickbooks";

/**
 * GET - Get import status and available data counts
 */
export async function GET(request: NextRequest) {
  try {
    const db = createServiceClient();

    // Get connection status
    const { data: connection } = await db
      .from("quickbooks_connections")
      .select("*")
      .eq("status", "active")
      .maybeSingle();

    if (!connection) {
      return NextResponse.json({
        ok: false,
        connected: false,
        message: "QuickBooks not connected",
      });
    }

    // Get counts of imported data
    const { count: arCount } = await db
      .from("accounts_receivable")
      .select("*", { count: "exact", head: true })
      .not("quickbooks_invoice_id", "is", null);

    const { count: apCount } = await db
      .from("accounts_payable")
      .select("*", { count: "exact", head: true })
      .not("quickbooks_bill_id", "is", null);

    const { count: paymentCount } = await db
      .from("payment_transactions")
      .select("*", { count: "exact", head: true })
      .not("quickbooks_payment_id", "is", null);

    return NextResponse.json({
      ok: true,
      connected: true,
      connection: {
        realm_id: connection.realm_id,
        last_sync: connection.last_sync_at,
        status: connection.status,
      },
      imported: {
        invoices_ar: arCount || 0,
        bills_ap: apCount || 0,
        payments: paymentCount || 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST - Import data FROM QuickBooks into our system
 * Pull invoices, bills, payments into AR/AP tables
 */
export async function POST(request: NextRequest) {
  try {
    const db = createServiceClient();
    const body = await request.json().catch(() => ({}));
    const { syncType = "all" } = body; // "all", "invoices", "bills", "payments", "customers"

    // Get QuickBooks connection
    const { data: connection, error: connError } = await db
      .from("quickbooks_connections")
      .select("*")
      .eq("status", "active")
      .maybeSingle();

    if (connError || !connection) {
      return NextResponse.json({
        ok: false,
        error: "No active QuickBooks connection. Please connect QuickBooks first.",
      }, { status: 400 });
    }

    const tokens: QBTokens = {
      realmId: connection.realm_id,
      accessToken: connection.access_token,
      refreshToken: connection.refresh_token,
      accessTokenExpiry: connection.token_expires_at,
      refreshTokenExpiry: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // Ensure token is valid (refresh if needed)
    let validTokens: QBTokens;
    try {
      validTokens = await ensureValidToken(tokens);

      // Update tokens if refreshed
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
      }
    } catch (tokenError: any) {
      return NextResponse.json({
        ok: false,
        error: `Token refresh failed: ${tokenError.message}. Please reconnect QuickBooks.`,
      }, { status: 401 });
    }

    const results = {
      timestamp: new Date().toISOString(),
      customers: { imported: 0, updated: 0, errors: [] as string[] },
      invoices: { imported: 0, updated: 0, errors: [] as string[] },
      bills: { imported: 0, updated: 0, errors: [] as string[] },
      payments: { imported: 0, updated: 0, errors: [] as string[] },
    };

    // Get date range (last 90 days by default)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];

    // ===== IMPORT CUSTOMERS =====
    if (syncType === "all" || syncType === "customers") {
      try {
        const customersResult = await getAllCustomersFromQB(validTokens);

        if (customersResult.success && customersResult.customers) {
          for (const qbCustomer of customersResult.customers) {
            try {
              // Check if customer already linked in our system
              const { data: existingCompany } = await db
                .from("companies")
                .select("id, qb_customer_id")
                .eq("qb_customer_id", qbCustomer.Id)
                .maybeSingle();

              if (existingCompany) {
                // Already linked
                results.customers.updated++;
              } else {
                // Try to match by name
                const { data: matchByName } = await db
                  .from("companies")
                  .select("id")
                  .ilike("name", qbCustomer.DisplayName)
                  .maybeSingle();

                if (matchByName) {
                  // Link existing company to QB customer
                  await db
                    .from("companies")
                    .update({
                      qb_customer_id: qbCustomer.Id,
                      qb_synced_at: new Date().toISOString(),
                    })
                    .eq("id", matchByName.id);
                  results.customers.imported++;
                }
              }
            } catch (err: any) {
              results.customers.errors.push(`Customer ${qbCustomer.DisplayName}: ${err.message}`);
            }
          }
        }
      } catch (err: any) {
        results.customers.errors.push(`Failed to fetch customers: ${err.message}`);
      }
    }

    // ===== IMPORT INVOICES (as Accounts Receivable) =====
    if (syncType === "all" || syncType === "invoices") {
      try {
        const invoicesResult = await getAllInvoicesFromQB(validTokens, ninetyDaysAgo, today);

        if (invoicesResult.success && invoicesResult.invoices) {
          for (const qbInvoice of invoicesResult.invoices) {
            try {
              // Check if already imported
              const { data: existingAR } = await db
                .from("accounts_receivable")
                .select("id")
                .eq("quickbooks_invoice_id", qbInvoice.Id)
                .maybeSingle();

              // Find matching company by QB customer ID
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
                // Update existing AR record
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
                results.invoices.updated++;
              } else {
                // Create new AR record
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
                    description: `Imported from QuickBooks - Customer: ${qbInvoice.CustomerRef?.name || "Unknown"}`,
                    quickbooks_invoice_id: qbInvoice.Id,
                    synced_to_qb: true,
                    last_synced_at: new Date().toISOString(),
                  });
                results.invoices.imported++;
              }
            } catch (err: any) {
              results.invoices.errors.push(`Invoice ${qbInvoice.DocNumber || qbInvoice.Id}: ${err.message}`);
            }
          }
        }
      } catch (err: any) {
        results.invoices.errors.push(`Failed to fetch invoices: ${err.message}`);
      }
    }

    // ===== IMPORT BILLS (as Accounts Payable) =====
    if (syncType === "all" || syncType === "bills") {
      try {
        const billsResult = await getAllBillsFromQB(validTokens, ninetyDaysAgo, today);

        if (billsResult.success && billsResult.bills) {
          for (const qbBill of billsResult.bills) {
            try {
              // Check if already imported
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

              if (existingAP) {
                // Update existing AP record
                await db
                  .from("accounts_payable")
                  .update({
                    amount: billAmount,
                    amount_paid: amountPaid,
                    status,
                    synced_to_qb: true,
                    last_synced_at: new Date().toISOString(),
                  })
                  .eq("id", existingAP.id);
                results.bills.updated++;
              } else {
                // Create new AP record
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
                results.bills.imported++;
              }
            } catch (err: any) {
              results.bills.errors.push(`Bill ${qbBill.DocNumber || qbBill.Id}: ${err.message}`);
            }
          }
        }
      } catch (err: any) {
        results.bills.errors.push(`Failed to fetch bills: ${err.message}`);
      }
    }

    // ===== IMPORT PAYMENTS =====
    if (syncType === "all" || syncType === "payments") {
      try {
        const paymentsResult = await getAllPaymentsFromQB(validTokens, ninetyDaysAgo, today);

        if (paymentsResult.success && paymentsResult.payments) {
          for (const qbPayment of paymentsResult.payments) {
            try {
              // Check if already imported
              const { data: existingPayment } = await db
                .from("payment_transactions")
                .select("id")
                .eq("quickbooks_payment_id", qbPayment.Id)
                .maybeSingle();

              if (!existingPayment) {
                // Find linked invoice/AR record
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
                    notes: `Imported from QuickBooks (ID: ${qbPayment.Id})`,
                    quickbooks_payment_id: qbPayment.Id,
                    synced_to_qb: true,
                    last_synced_at: new Date().toISOString(),
                  });
                results.payments.imported++;
              } else {
                results.payments.updated++;
              }
            } catch (err: any) {
              results.payments.errors.push(`Payment ${qbPayment.Id}: ${err.message}`);
            }
          }
        }
      } catch (err: any) {
        results.payments.errors.push(`Failed to fetch payments: ${err.message}`);
      }
    }

    // Log sync results
    await db.from("quickbooks_sync_log").insert({
      connection_id: connection.id,
      sync_type: "import",
      status: "success",
      customers_pulled: results.customers.imported + results.customers.updated,
      invoices_pulled: results.invoices.imported + results.invoices.updated,
      payments_pulled: results.payments.imported + results.payments.updated,
      errors: JSON.stringify({
        customers: results.customers.errors,
        invoices: results.invoices.errors,
        bills: results.bills.errors,
        payments: results.payments.errors,
      }),
      synced_at: new Date().toISOString(),
    });

    // Update connection last_sync_at
    await db
      .from("quickbooks_connections")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", connection.id);

    const totalImported = results.customers.imported + results.invoices.imported +
                          results.bills.imported + results.payments.imported;
    const totalUpdated = results.customers.updated + results.invoices.updated +
                         results.bills.updated + results.payments.updated;
    const totalErrors = results.customers.errors.length + results.invoices.errors.length +
                        results.bills.errors.length + results.payments.errors.length;

    return NextResponse.json({
      ok: true,
      message: `Import complete: ${totalImported} new, ${totalUpdated} updated, ${totalErrors} errors`,
      results,
    });
  } catch (error: any) {
    console.error("QuickBooks import error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
