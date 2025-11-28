import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

/**
 * GET /api/recurring-invoices
 * List all recurring invoices with optional filters
 */
export async function GET(request: Request) {
  const db = createServiceClient();
  const { searchParams } = new URL(request.url);

  const companyId = searchParams.get("companyId");
  const isActive = searchParams.get("isActive");

  let query = db.from("recurring_invoices").select(`
    *,
    company:companies(id, name, contact_email),
    payment_method:customer_payment_methods(
      id,
      payment_type,
      card_last_four,
      account_last_four
    )
  `);

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  if (isActive !== null) {
    query = query.eq("is_active", isActive === "true");
  }

  query = query.order("next_invoice_date", { ascending: true });

  const { data: recurringInvoices, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ recurringInvoices });
}

/**
 * POST /api/recurring-invoices
 * Create a new recurring invoice template
 */
export async function POST(request: Request) {
  const db = createServiceClient();

  try {
    const body = await request.json();
    const {
      companyId,
      frequency,
      startDate,
      endDate,
      invoiceTemplate,
      deliveryMethod,
      autoSend,
      autoCharge,
      paymentMethodId,
    } = body;

    // Validate required fields
    if (!companyId || !frequency || !startDate || !invoiceTemplate) {
      return NextResponse.json(
        { error: "Missing required fields: companyId, frequency, startDate, invoiceTemplate" },
        { status: 400 }
      );
    }

    // Calculate next invoice date based on frequency
    const nextInvoiceDate = calculateNextInvoiceDate(new Date(startDate), frequency);

    const { data: recurring, error } = await db
      .from("recurring_invoices")
      .insert({
        company_id: companyId,
        frequency,
        start_date: startDate,
        end_date: endDate || null,
        next_invoice_date: nextInvoiceDate.toISOString().split("T")[0],
        invoice_template: invoiceTemplate,
        delivery_method: deliveryMethod || "email",
        auto_send: autoSend !== undefined ? autoSend : true,
        auto_charge: autoCharge || false,
        payment_method_id: paymentMethodId || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ recurring }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * Helper function to calculate next invoice date
 */
function calculateNextInvoiceDate(startDate: Date, frequency: string): Date {
  const next = new Date(startDate);

  switch (frequency) {
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "biweekly":
      next.setDate(next.getDate() + 14);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "quarterly":
      next.setMonth(next.getMonth() + 3);
      break;
    case "annually":
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      next.setMonth(next.getMonth() + 1); // Default to monthly
  }

  return next;
}
