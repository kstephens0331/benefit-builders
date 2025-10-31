import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { syncCustomerToQB, createInvoiceInQB, recordPaymentInQB, ensureValidToken } from "@/lib/quickbooks";

// POST - Sync AR/AP item to QuickBooks
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, id } = body; // type: 'ar' or 'ap', id: record ID

    const db = createServiceClient();

    // Get QuickBooks connection
    const { data: connection, error: connError } = await db
      .from("quickbooks_connections")
      .select("*")
      .eq("status", "active")
      .single();

    if (connError || !connection) {
      return NextResponse.json(
        { ok: false, error: "No active QuickBooks connection found" },
        { status: 400 }
      );
    }

    const tokens = {
      realmId: connection.realm_id,
      accessToken: connection.access_token,
      refreshToken: connection.refresh_token,
      accessTokenExpiry: connection.token_expires_at,
      refreshTokenExpiry: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString(), // 100 days
    };

    // Ensure token is valid
    const validTokens = await ensureValidToken(tokens);

    // Update tokens in database if refreshed
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

    if (type === "ar") {
      // Sync Accounts Receivable to QuickBooks
      const { data: ar } = await db
        .from("accounts_receivable")
        .select(`
          *,
          companies(
            id,
            name,
            contact_email,
            contact_phone
          )
        `)
        .eq("id", id)
        .single();

      if (!ar) {
        return NextResponse.json(
          { ok: false, error: "A/R record not found" },
          { status: 404 }
        );
      }

      // First, ensure customer exists in QuickBooks
      let qbCustomerId = ar.companies?.qb_customer_id;

      if (!qbCustomerId) {
        // Create customer in QuickBooks
        const customerResult = await syncCustomerToQB(validTokens, {
          id: ar.companies.id,
          name: ar.companies.name,
          email: ar.companies.contact_email,
          phone: ar.companies.contact_phone,
        });

        if (!customerResult.success) {
          return NextResponse.json(
            { ok: false, error: `Failed to create customer: ${customerResult.error}` },
            { status: 500 }
          );
        }

        qbCustomerId = customerResult.qb_customer_id;

        // Update company with QB customer ID
        await db
          .from("companies")
          .update({ qb_customer_id: qbCustomerId })
          .eq("id", ar.companies.id);
      }

      // Create invoice in QuickBooks
      const invoiceResult = await createInvoiceInQB(validTokens, {
        customer_qb_id: qbCustomerId!,
        invoice_number: ar.invoice_number,
        invoice_date: ar.invoice_date,
        due_date: ar.due_date,
        line_items: [
          {
            description: ar.description || "Services",
            quantity: 1,
            rate: ar.amount * 100, // Convert to cents
            amount: ar.amount * 100,
          },
        ],
        subtotal: ar.amount * 100,
        tax_amount: 0,
        total: ar.amount * 100,
      });

      if (!invoiceResult.success) {
        return NextResponse.json(
          { ok: false, error: `Failed to create invoice: ${invoiceResult.error}` },
          { status: 500 }
        );
      }

      // Update AR record
      await db
        .from("accounts_receivable")
        .update({
          quickbooks_invoice_id: invoiceResult.qb_invoice_id,
          synced_to_qb: true,
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", id);

      return NextResponse.json({
        ok: true,
        message: "A/R synced to QuickBooks",
        qb_invoice_id: invoiceResult.qb_invoice_id,
      });
    } else if (type === "ap") {
      // A/P syncing would go here
      // For now, return not implemented
      return NextResponse.json(
        { ok: false, error: "A/P sync not yet implemented" },
        { status: 501 }
      );
    } else {
      return NextResponse.json(
        { ok: false, error: "Invalid sync type" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("QuickBooks sync error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
