import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// PUT - Update specific Payment transaction by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Payment ID is required" },
        { status: 400 }
      );
    }

    const db = createServiceClient();

    const { data, error } = await db
      .from("payment_transactions")
      .update({
        transaction_type: body.transaction_type,
        ar_id: body.ar_id || null,
        ap_id: body.ap_id || null,
        payment_date: body.payment_date,
        amount: body.amount,
        payment_method: body.payment_method,
        check_number: body.check_number,
        reference_number: body.reference_number,
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

// DELETE - Delete specific Payment transaction by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Payment ID is required" },
        { status: 400 }
      );
    }

    const db = createServiceClient();

    const { error } = await db
      .from("payment_transactions")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, message: "Payment deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
