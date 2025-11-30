import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

/**
 * GET /api/recurring-invoices/[id]
 * Get a specific recurring invoice
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = createServiceClient();
  const { id } = params;

  const { data: recurring, error } = await db
    .from("recurring_invoices")
    .select(`
      *,
      company:companies(id, name, contact_email),
      payment_method:customer_payment_methods(
        id,
        payment_type,
        card_last_four,
        account_last_four,
        bank_name
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ recurring });
}

/**
 * PATCH /api/recurring-invoices/[id]
 * Update a recurring invoice
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = createServiceClient();
  const { id } = params;

  try {
    const body = await request.json();
    const updates: any = {};

    // Only update fields that are provided
    if (body.frequency !== undefined) updates.frequency = body.frequency;
    if (body.startDate !== undefined) updates.start_date = body.startDate;
    if (body.endDate !== undefined) updates.end_date = body.endDate;
    if (body.nextInvoiceDate !== undefined) updates.next_invoice_date = body.nextInvoiceDate;
    if (body.invoiceTemplate !== undefined) updates.invoice_template = body.invoiceTemplate;
    if (body.deliveryMethod !== undefined) updates.delivery_method = body.deliveryMethod;
    if (body.autoSend !== undefined) updates.auto_send = body.autoSend;
    if (body.autoCharge !== undefined) updates.auto_charge = body.autoCharge;
    if (body.paymentMethodId !== undefined) updates.payment_method_id = body.paymentMethodId;
    if (body.isActive !== undefined) updates.is_active = body.isActive;

    const { data: recurring, error } = await db
      .from("recurring_invoices")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ recurring });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/recurring-invoices/[id]
 * Delete a recurring invoice (or deactivate)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = createServiceClient();
  const { id } = params;
  const { searchParams } = new URL(request.url);
  const hardDelete = searchParams.get("hard") === "true";

  if (hardDelete) {
    // Permanently delete
    const { error } = await db
      .from("recurring_invoices")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Recurring invoice deleted" });
  } else {
    // Soft delete (deactivate)
    const { data: recurring, error } = await db
      .from("recurring_invoices")
      .update({ is_active: false })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ recurring });
  }
}
