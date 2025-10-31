import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// GET - Fetch payment transactions
export async function GET(request: NextRequest) {
  try {
    const db = createServiceClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // 'ar_payment' or 'ap_payment'
    const arId = searchParams.get("ar_id");
    const apId = searchParams.get("ap_id");

    let query = db
      .from("payment_transactions")
      .select("*")
      .order("payment_date", { ascending: false });

    if (type) {
      query = query.eq("transaction_type", type);
    }
    if (arId) {
      query = query.eq("ar_id", arId);
    }
    if (apId) {
      query = query.eq("ap_id", apId);
    }

    const { data, error } = await query;

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

// POST - Record a new payment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const db = createServiceClient();

    // Validate that either ar_id or ap_id is provided
    if (!body.ar_id && !body.ap_id) {
      return NextResponse.json(
        { ok: false, error: "Either ar_id or ap_id is required" },
        { status: 400 }
      );
    }

    if (body.ar_id && body.ap_id) {
      return NextResponse.json(
        { ok: false, error: "Cannot specify both ar_id and ap_id" },
        { status: 400 }
      );
    }

    // Start a transaction to update both payment and AR/AP
    const { data: payment, error: paymentError } = await db
      .from("payment_transactions")
      .insert({
        transaction_type: body.transaction_type,
        ar_id: body.ar_id || null,
        ap_id: body.ap_id || null,
        payment_date: body.payment_date,
        amount: body.amount,
        payment_method: body.payment_method,
        check_number: body.check_number,
        reference_number: body.reference_number,
        notes: body.notes,
        created_by: body.created_by || 'system',
      })
      .select()
      .single();

    if (paymentError) {
      return NextResponse.json(
        { ok: false, error: paymentError.message },
        { status: 500 }
      );
    }

    // Update the amount_paid in AR or AP
    if (body.ar_id) {
      const { data: ar } = await db
        .from("accounts_receivable")
        .select("amount_paid")
        .eq("id", body.ar_id)
        .single();

      const newAmountPaid = (parseFloat(ar?.amount_paid as any) || 0) + parseFloat(body.amount);

      await db
        .from("accounts_receivable")
        .update({ amount_paid: newAmountPaid })
        .eq("id", body.ar_id);
    }

    if (body.ap_id) {
      const { data: ap } = await db
        .from("accounts_payable")
        .select("amount_paid")
        .eq("id", body.ap_id)
        .single();

      const newAmountPaid = (parseFloat(ap?.amount_paid as any) || 0) + parseFloat(body.amount);

      await db
        .from("accounts_payable")
        .update({ amount_paid: newAmountPaid })
        .eq("id", body.ap_id);
    }

    return NextResponse.json({ ok: true, data: payment });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete a payment transaction
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Payment ID is required" },
        { status: 400 }
      );
    }

    const db = createServiceClient();

    // Get payment details before deleting
    const { data: payment } = await db
      .from("payment_transactions")
      .select("*")
      .eq("id", id)
      .single();

    if (!payment) {
      return NextResponse.json(
        { ok: false, error: "Payment not found" },
        { status: 404 }
      );
    }

    // Delete the payment
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

    // Update amount_paid in AR or AP
    if (payment.ar_id) {
      const { data: ar } = await db
        .from("accounts_receivable")
        .select("amount_paid")
        .eq("id", payment.ar_id)
        .single();

      const newAmountPaid = Math.max(0, (parseFloat(ar?.amount_paid as any) || 0) - parseFloat(payment.amount as any));

      await db
        .from("accounts_receivable")
        .update({ amount_paid: newAmountPaid })
        .eq("id", payment.ar_id);
    }

    if (payment.ap_id) {
      const { data: ap } = await db
        .from("accounts_payable")
        .select("amount_paid")
        .eq("id", payment.ap_id)
        .single();

      const newAmountPaid = Math.max(0, (parseFloat(ap?.amount_paid as any) || 0) - parseFloat(payment.amount as any));

      await db
        .from("accounts_payable")
        .update({ amount_paid: newAmountPaid })
        .eq("id", payment.ap_id);
    }

    return NextResponse.json({ ok: true, message: "Payment deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
