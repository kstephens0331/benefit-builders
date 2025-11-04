import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

// GET - List all proposals
export async function GET(request: NextRequest) {
  try {
    const db = createServiceClient();

    const { data: proposals, error } = await db
      .from("proposals")
      .select(`
        id,
        proposal_name,
        company_name,
        company_id,
        effective_date,
        model_percentage,
        pay_period,
        total_employees,
        qualified_employees,
        total_monthly_savings,
        total_annual_savings,
        status,
        created_at,
        sent_at,
        accepted_at
      `)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json({
      ok: true,
      data: proposals || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
