import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import {
  ensureValidToken,
  getAllCustomersFromQB,
  getAllInvoicesFromQB,
  getAllPaymentsFromQB,
  syncCustomerToQB,
  createInvoiceInQB,
  recordPaymentInQB,
} from "@/lib/quickbooks";

/**
 * POST - Bidirectional sync between app and QuickBooks
 * Runs automatically every 3 hours via cron
 */
export async function POST(request: NextRequest) {
  try {
    const db = createServiceClient();

    // Verify cron secret to prevent unauthorized access
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
      .single();

    if (connError || !connection) {
      return NextResponse.json({
        ok: false,
        error: "No active QuickBooks connection",
        skipped: true,
      });
    }

    const tokens = {
      realmId: connection.realm_id,
      accessToken: connection.access_token,
      refreshToken: connection.refresh_token,
      accessTokenExpiry: connection.token_expires_at,
      refreshTokenExpiry: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // Ensure token is valid
    const validTokens = await ensureValidToken(tokens);

    // Update tokens if refreshed
    if (validTokens.accessToken !== tokens.accessToken) {
      await db
        .from("quickbooks_connections")
        .update({
          access_token: validTokens.accessToken,
          refresh_token: validTokens.refreshToken,
          token_expires_at: validTokens.accessTokenExpiry,
        })
        .eq("id", connection.id);
    }

    const syncResults = {
      timestamp: new Date().toISOString(),
      customers: { pushed: 0, pulled: 0, errors: [] as string[] },
      invoices: { pushed: 0, pulled: 0, errors: [] as string[] },
      payments: { pushed: 0, pulled: 0, errors: [] as string[] },
    };

    // ===== STEP 1: Push unsync'd customers to QuickBooks =====
    const { data: unsyncedCompanies } = await db
      .from("companies")
      .select("*")
      .eq("status", "active")
      .or("qb_customer_id.is.null,qb_synced_at.is.null");

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

            syncResults.customers.pushed++;
          } else {
            syncResults.customers.errors.push(`${company.name}: ${result.error}`);
          }
        } catch (error: any) {
          syncResults.customers.errors.push(`${company.name}: ${error.message}`);
        }
      }
    }

    // ===== STEP 2: Push unsynced invoices to QuickBooks =====
    const { data: unsyncedInvoices } = await db
      .from("invoices")
      .select(`
        *,
        companies(
          id,
          name,
          qb_customer_id
        )
      `)
      .eq("qb_synced", false);

    if (unsyncedInvoices && unsyncedInvoices.length > 0) {
      for (const invoice of unsyncedInvoices) {
        try {
          const company = Array.isArray(invoice.companies) ? invoice.companies[0] : invoice.companies;

          if (!company?.qb_customer_id) {
            syncResults.invoices.errors.push(
              `Invoice ${invoice.id}: Company not synced to QB`
            );
            continue;
          }

          // Get invoice lines
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
            )
              .toISOString()
              .split("T")[0],
            line_items:
              lines?.map((line) => ({
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

            syncResults.invoices.pushed++;
          } else {
            syncResults.invoices.errors.push(
              `Invoice ${invoice.id}: ${result.error}`
            );
          }
        } catch (error: any) {
          syncResults.invoices.errors.push(
            `Invoice ${invoice.id}: ${error.message}`
          );
        }
      }
    }

    // ===== STEP 3: Pull payments from QuickBooks (last 7 days) =====
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const today = new Date().toISOString().split("T")[0];

    const paymentsResult = await getAllPaymentsFromQB(
      validTokens,
      sevenDaysAgo,
      today
    );

    if (paymentsResult.success && paymentsResult.payments) {
      for (const qbPayment of paymentsResult.payments) {
        try {
          // Check if payment already imported
          const { data: existing } = await db
            .from("payment_transactions")
            .select("id")
            .eq("qb_payment_id", qbPayment.Id)
            .single();

          if (existing) {
            continue; // Already imported
          }

          // Find matching invoice
          const linkedInvoiceId = qbPayment.Line?.[0]?.LinkedTxn?.[0]?.TxnId;

          if (!linkedInvoiceId) {
            continue; // No linked invoice
          }

          // Find our invoice with this QB ID
          const { data: ourInvoice } = await db
            .from("invoices")
            .select("id, company_id")
            .eq("qb_invoice_id", linkedInvoiceId)
            .single();

          if (!ourInvoice) {
            continue; // Invoice not in our system
          }

          // Find corresponding A/R record
          const { data: arRecord } = await db
            .from("accounts_receivable")
            .select("id, amount, amount_paid")
            .eq("company_id", ourInvoice.company_id)
            .eq("quickbooks_invoice_id", linkedInvoiceId)
            .single();

          if (arRecord) {
            // Record payment in our system
            const paymentAmount = parseFloat(qbPayment.TotalAmt || "0") * 100; // Convert to cents

            await db.from("payment_transactions").insert({
              transaction_type: "ar_payment",
              ar_id: arRecord.id,
              payment_date: qbPayment.TxnDate,
              amount: paymentAmount,
              payment_method: qbPayment.PaymentMethodRef?.name || "other",
              reference_number: qbPayment.PaymentRefNum || qbPayment.PrivateNote,
              notes: `Imported from QuickBooks (Payment ID: ${qbPayment.Id})`,
              qb_payment_id: qbPayment.Id,
            });

            // Calculate new amounts
            const newAmountPaid = (arRecord.amount_paid || 0) + paymentAmount;
            const newAmountDue = arRecord.amount - newAmountPaid;
            let newStatus = arRecord.status;
            if (newAmountDue <= 0) {
              newStatus = 'paid';
            } else if (newAmountPaid > 0) {
              newStatus = 'partial';
            }

            // Update A/R record
            await db
              .from("accounts_receivable")
              .update({
                amount_paid: newAmountPaid,
                amount_due: newAmountDue,
                status: newStatus,
              })
              .eq("id", arRecord.id);

            syncResults.payments.pulled++;
          }
        } catch (error: any) {
          syncResults.payments.errors.push(
            `Payment ${qbPayment.Id}: ${error.message}`
          );
        }
      }
    }

    // ===== STEP 4: Log sync results =====
    await db.from("quickbooks_sync_log").insert({
      connection_id: connection.id,
      sync_type: "bidirectional",
      customers_pushed: syncResults.customers.pushed,
      customers_pulled: syncResults.customers.pulled,
      invoices_pushed: syncResults.invoices.pushed,
      invoices_pulled: syncResults.invoices.pulled,
      payments_pushed: syncResults.payments.pushed,
      payments_pulled: syncResults.payments.pulled,
      errors: JSON.stringify({
        customers: syncResults.customers.errors,
        invoices: syncResults.invoices.errors,
        payments: syncResults.payments.errors,
      }),
      synced_at: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      message: "Bidirectional sync completed",
      results: syncResults,
    });
  } catch (error: any) {
    console.error("Bidirectional sync error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET - Get sync status and history
 */
export async function GET(request: NextRequest) {
  try {
    const db = createServiceClient();

    // Get last 10 sync runs
    const { data: syncHistory } = await db
      .from("quickbooks_sync_log")
      .select("*")
      .order("synced_at", { ascending: false })
      .limit(10);

    // Get connection status
    const { data: connection } = await db
      .from("quickbooks_connections")
      .select("*")
      .eq("status", "active")
      .single();

    // Get counts of unsynced items
    const { count: unsyncedCompanies } = await db
      .from("companies")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .or("qb_customer_id.is.null,qb_synced_at.is.null");

    const { count: unsyncedInvoices } = await db
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .eq("qb_synced", false);

    return NextResponse.json({
      ok: true,
      connection_active: !!connection,
      last_sync: syncHistory?.[0]?.synced_at || null,
      pending_sync: {
        customers: unsyncedCompanies || 0,
        invoices: unsyncedInvoices || 0,
      },
      sync_history: syncHistory || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
