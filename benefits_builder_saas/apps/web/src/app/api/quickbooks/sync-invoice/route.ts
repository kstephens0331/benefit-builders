// QuickBooks Invoice Sync
// Sync invoice from Benefits Builder to QuickBooks

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import { syncCustomerToQB, createInvoiceInQB } from "@/lib/quickbooks";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const db = createServiceClient();
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const { invoice_id } = await req.json().catch(() => ({}));

  if (!invoice_id) {
    return NextResponse.json({ ok: false, error: "invoice_id required" }, { status: 400 });
  }

  try {
    // Get QuickBooks integration
    const { data: qbIntegration } = await db
      .from("quickbooks_integration")
      .select("*")
      .eq("is_active", true)
      .single();

    if (!qbIntegration) {
      return NextResponse.json(
        { ok: false, error: "QuickBooks not connected. Please connect QuickBooks first." },
        { status: 400 }
      );
    }

    // Get invoice with company details
    const { data: invoice } = await db
      .from("invoices")
      .select(`
        *,
        company:company_id(id, name, contact_email)
      `)
      .eq("id", invoice_id)
      .single();

    if (!invoice) {
      return NextResponse.json({ ok: false, error: "Invoice not found" }, { status: 404 });
    }

    const tokens = {
      realmId: qbIntegration.realm_id,
      accessToken: qbIntegration.access_token,
      refreshToken: qbIntegration.refresh_token,
      accessTokenExpiry: qbIntegration.access_token_expiry,
      refreshTokenExpiry: qbIntegration.refresh_token_expiry
    };

    // Step 1: Sync customer to QuickBooks
    const { data: companyMapping } = await db
      .from("quickbooks_sync_mappings")
      .select("qb_entity_id")
      .eq("local_entity_type", "company")
      .eq("local_entity_id", invoice.company.id)
      .single();

    let qbCustomerId = companyMapping?.qb_entity_id;

    if (!qbCustomerId) {
      // Create customer in QuickBooks
      const customerResult = await syncCustomerToQB(tokens, {
        id: invoice.company.id,
        name: invoice.company.name,
        email: invoice.company.contact_email
      });

      if (!customerResult.success) {
        throw new Error(`Failed to create customer in QuickBooks: ${customerResult.error}`);
      }

      qbCustomerId = customerResult.qb_customer_id!;

      // Save mapping
      await db.from("quickbooks_sync_mappings").insert({
        local_entity_type: "company",
        local_entity_id: invoice.company.id,
        qb_entity_type: "Customer",
        qb_entity_id: qbCustomerId,
        sync_status: "synced"
      });
    }

    // Step 2: Get invoice line items
    const { data: lineItems } = await db
      .from("invoice_lines")
      .select("*")
      .eq("invoice_id", invoice_id);

    // Step 3: Create invoice in QuickBooks
    const invoiceDate = new Date(invoice.issued_at);
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 30); // 30 days payment term

    const qbInvoiceData = {
      customer_qb_id: qbCustomerId,
      invoice_number: invoice_id.substring(0, 8).toUpperCase(),
      invoice_date: invoiceDate.toISOString().split("T")[0],
      due_date: dueDate.toISOString().split("T")[0],
      line_items: (lineItems || []).map((item) => ({
        description: item.description,
        quantity: item.quantity,
        rate: item.unit_price_cents,
        amount: item.amount_cents
      })),
      subtotal: invoice.subtotal_cents,
      tax_amount: invoice.tax_cents,
      total: invoice.total_cents
    };

    const invoiceResult = await createInvoiceInQB(tokens, qbInvoiceData);

    if (!invoiceResult.success) {
      throw new Error(`Failed to create invoice in QuickBooks: ${invoiceResult.error}`);
    }

    // Save mapping
    await db.from("quickbooks_sync_mappings").insert({
      local_entity_type: "invoice",
      local_entity_id: invoice_id,
      qb_entity_type: "Invoice",
      qb_entity_id: invoiceResult.qb_invoice_id!,
      sync_status: "synced"
    });

    // Log sync
    const executionTime = Date.now() - startTime;
    await db.from("quickbooks_sync_log").insert({
      operation: "create_invoice",
      entity_type: "invoice",
      local_id: invoice_id,
      qb_id: invoiceResult.qb_invoice_id,
      status: "success",
      request_payload: qbInvoiceData,
      execution_time_ms: executionTime
    });

    return NextResponse.json({
      ok: true,
      message: "Invoice synced to QuickBooks successfully",
      qb_invoice_id: invoiceResult.qb_invoice_id,
      qb_customer_id: qbCustomerId,
      execution_time_ms: executionTime
    });
  } catch (error: any) {
    console.error("QuickBooks sync error:", error);

    // Log error
    await db.from("quickbooks_sync_log").insert({
      operation: "create_invoice",
      entity_type: "invoice",
      local_id: invoice_id,
      status: "failed",
      error_message: error.message,
      execution_time_ms: Date.now() - startTime
    });

    return NextResponse.json(
      { ok: false, error: `QuickBooks sync failed: ${error.message}` },
      { status: 500 }
    );
  }
}
