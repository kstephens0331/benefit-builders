import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

/**
 * GET /api/bank-reconciliation/[id]
 * Get a specific bank reconciliation
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = createServiceClient();

  const { data: reconciliation, error } = await db
    .from("bank_reconciliations")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ reconciliation });
}

/**
 * PATCH /api/bank-reconciliation/[id]
 * Update a bank reconciliation
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = createServiceClient();

  try {
    const body = await request.json();

    // Check if reconciliation is already marked as reconciled
    const { data: existing } = await db
      .from("bank_reconciliations")
      .select("reconciled")
      .eq("id", id)
      .single();

    if (existing?.reconciled && body.reconciled === undefined) {
      return NextResponse.json(
        { error: "Cannot modify a reconciliation that has been marked as reconciled" },
        { status: 400 }
      );
    }

    const updates: any = {};

    // Only update fields that are provided
    if (body.beginningBookBalance !== undefined) updates.beginning_book_balance = body.beginningBookBalance;
    if (body.endingBookBalance !== undefined) updates.ending_book_balance = body.endingBookBalance;
    if (body.endingBankBalance !== undefined) updates.ending_bank_balance = body.endingBankBalance;
    if (body.totalDeposits !== undefined) updates.total_deposits = body.totalDeposits;
    if (body.totalWithdrawals !== undefined) updates.total_withdrawals = body.totalWithdrawals;
    if (body.outstandingChecks !== undefined) updates.outstanding_checks = body.outstandingChecks;
    if (body.outstandingDeposits !== undefined) updates.outstanding_deposits = body.outstandingDeposits;
    if (body.adjustments !== undefined) updates.adjustments = body.adjustments;
    if (body.notes !== undefined) updates.notes = body.notes;

    // Handle reconciliation completion
    if (body.reconciled !== undefined) {
      updates.reconciled = body.reconciled;
      if (body.reconciled) {
        updates.reconciled_at = new Date().toISOString();
        updates.reconciled_by = body.userId || null;
      } else {
        updates.reconciled_at = null;
        updates.reconciled_by = null;
      }
    }

    const { data: reconciliation, error } = await db
      .from("bank_reconciliations")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reconciliation });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/bank-reconciliation/[id]
 * Delete a bank reconciliation (only if not reconciled)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = createServiceClient();

  // Check if reconciliation is marked as reconciled
  const { data: existing } = await db
    .from("bank_reconciliations")
    .select("reconciled")
    .eq("id", id)
    .single();

  if (existing?.reconciled) {
    return NextResponse.json(
      { error: "Cannot delete a reconciliation that has been marked as reconciled" },
      { status: 400 }
    );
  }

  const { error } = await db
    .from("bank_reconciliations")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Bank reconciliation deleted" });
}
