import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// GET - Fetch all Accounts Receivable
export async function GET(request: NextRequest) {
  try {
    const db = createServiceClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let query = db
      .from("accounts_receivable")
      .select(`
        id,
        company_id,
        invoice_number,
        invoice_date,
        due_date,
        amount,
        amount_paid,
        amount_due,
        status,
        description,
        notes,
        synced_to_qb,
        last_synced_at,
        created_at,
        companies(name)
      `)
      .order("invoice_date", { ascending: false });

    if (status) {
      query = query.eq("status", status);
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

// POST - Create new Accounts Receivable entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const db = createServiceClient();

    const { data, error } = await db
      .from("accounts_receivable")
      .insert({
        company_id: body.company_id,
        invoice_number: body.invoice_number,
        invoice_date: body.invoice_date,
        due_date: body.due_date,
        amount: body.amount,
        amount_paid: body.amount_paid || 0,
        status: body.status || 'open',
        description: body.description,
        notes: body.notes,
        created_by: body.created_by || 'system',
      })
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

// PATCH - Update Accounts Receivable entry
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "A/R ID is required" },
        { status: 400 }
      );
    }

    const db = createServiceClient();

    const { data, error } = await db
      .from("accounts_receivable")
      .update(updates)
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

// DELETE - Delete Accounts Receivable entry
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

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
