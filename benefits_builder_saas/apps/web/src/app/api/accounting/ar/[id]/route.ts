import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// PUT - Update specific Accounts Receivable entry by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "A/R ID is required" },
        { status: 400 }
      );
    }

    const db = createServiceClient();

    const { data, error } = await db
      .from("accounts_receivable")
      .update({
        company_id: body.company_id,
        invoice_number: body.invoice_number,
        invoice_date: body.invoice_date,
        due_date: body.due_date,
        amount: body.amount,
        description: body.description,
        notes: body.notes,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete specific Accounts Receivable entry by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "A/R ID is required" },
        { status: 400 }
      );
    }

    const db = createServiceClient();

    // Check if there are any payments
    const { data: payments } = await db
      .from("payment_transactions")
      .select("id")
      .eq("ar_id", id)
      .limit(1);

    if (payments && payments.length > 0) {
      return NextResponse.json(
        { ok: false, error: "Cannot delete A/R with existing payments. Write off instead." },
        { status: 400 }
      );
    }

    const { error } = await db
      .from("accounts_receivable")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, message: "A/R deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
