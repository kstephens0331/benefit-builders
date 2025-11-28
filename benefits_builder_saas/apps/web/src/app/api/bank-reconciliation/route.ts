import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

/**
 * GET /api/bank-reconciliation
 * List all bank reconciliations
 */
export async function GET(request: Request) {
  const db = createServiceClient();
  const { searchParams } = new URL(request.url);

  const year = searchParams.get("year");
  const reconciled = searchParams.get("reconciled");

  let query = db.from("bank_reconciliations").select("*");

  if (year) {
    query = query.eq("year", parseInt(year));
  }

  if (reconciled !== null) {
    query = query.eq("reconciled", reconciled === "true");
  }

  query = query.order("year", { ascending: false }).order("month", { ascending: false });

  const { data: reconciliations, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reconciliations });
}

/**
 * POST /api/bank-reconciliation
 * Create a new bank reconciliation
 */
export async function POST(request: Request) {
  const db = createServiceClient();

  try {
    const body = await request.json();
    const {
      year,
      month,
      bankAccountName,
      bankAccountLastFour,
      beginningBookBalance,
      endingBookBalance,
      endingBankBalance,
      totalDeposits,
      totalWithdrawals,
      outstandingChecks,
      outstandingDeposits,
      adjustments,
      notes,
    } = body;

    // Validate required fields
    if (!year || !month || !bankAccountName || beginningBookBalance === undefined || endingBookBalance === undefined || endingBankBalance === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if reconciliation already exists for this period
    const { data: existing } = await db
      .from("bank_reconciliations")
      .select("id")
      .eq("year", year)
      .eq("month", month)
      .eq("bank_account_name", bankAccountName)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Reconciliation already exists for this period and account" },
        { status: 400 }
      );
    }

    const { data: reconciliation, error } = await db
      .from("bank_reconciliations")
      .insert({
        year,
        month,
        bank_account_name: bankAccountName,
        bank_account_last_four: bankAccountLastFour || null,
        beginning_book_balance: beginningBookBalance,
        ending_book_balance: endingBookBalance,
        ending_bank_balance: endingBankBalance,
        total_deposits: totalDeposits || 0,
        total_withdrawals: totalWithdrawals || 0,
        outstanding_checks: outstandingChecks || 0,
        outstanding_deposits: outstandingDeposits || 0,
        adjustments: adjustments || 0,
        reconciled: false,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reconciliation }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
