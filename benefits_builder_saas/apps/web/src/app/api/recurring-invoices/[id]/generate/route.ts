import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

/**
 * POST /api/recurring-invoices/[id]/generate
 * Manually generate an invoice from a recurring template
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = createServiceClient();

  try {
    // Get the recurring invoice template
    const { data: recurring, error: fetchError } = await db
      .from("recurring_invoices")
      .select(`
        *,
        company:companies(id, name, contact_email)
      `)
      .eq("id", id)
      .single();

    if (fetchError || !recurring) {
      return NextResponse.json(
        { error: "Recurring invoice not found" },
        { status: 404 }
      );
    }

    if (!recurring.is_active) {
      return NextResponse.json(
        { error: "Recurring invoice is not active" },
        { status: 400 }
      );
    }

    // Check if end date has passed
    if (recurring.end_date) {
      const endDate = new Date(recurring.end_date);
      if (endDate < new Date()) {
        return NextResponse.json(
          { error: "Recurring invoice has ended" },
          { status: 400 }
        );
      }
    }

    // Generate invoice from template
    const template = recurring.invoice_template;
    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 30); // Default 30 days

    // Create the invoice
    const { data: invoice, error: invoiceError } = await db
      .from("invoices")
      .insert({
        company_id: recurring.company_id,
        invoice_number: `INV-${Date.now()}`, // TODO: Use better invoice numbering
        billing_period_start: template.billing_period_start || today.toISOString().split("T")[0],
        billing_period_end: template.billing_period_end || today.toISOString().split("T")[0],
        due_date: dueDate.toISOString().split("T")[0],
        total_cents: template.total_cents || 0,
        payment_status: "unpaid",
        delivery_method: recurring.delivery_method,
        line_items: template.line_items || [],
        notes: template.notes || `Generated from recurring invoice template`,
      })
      .select()
      .single();

    if (invoiceError) {
      return NextResponse.json(
        { error: `Failed to create invoice: ${invoiceError.message}` },
        { status: 500 }
      );
    }

    // Update recurring invoice
    const nextInvoiceDate = calculateNextInvoiceDate(
      new Date(recurring.next_invoice_date),
      recurring.frequency
    );

    await db
      .from("recurring_invoices")
      .update({
        last_generated_at: new Date().toISOString(),
        next_invoice_date: nextInvoiceDate.toISOString().split("T")[0],
      })
      .eq("id", id);

    // If auto-send is enabled, send the invoice
    if (recurring.auto_send) {
      // TODO: Send invoice email via Resend
      console.log(`Auto-send enabled for invoice ${invoice.id}`);
    }

    // If auto-charge is enabled and payment method exists, charge it
    if (recurring.auto_charge && recurring.payment_method_id) {
      // TODO: Process payment via payment processor
      console.log(`Auto-charge enabled for invoice ${invoice.id}`);
    }

    return NextResponse.json({
      invoice,
      nextInvoiceDate: nextInvoiceDate.toISOString().split("T")[0],
    });
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
function calculateNextInvoiceDate(currentDate: Date, frequency: string): Date {
  const next = new Date(currentDate);

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
      next.setMonth(next.getMonth() + 1);
  }

  return next;
}
