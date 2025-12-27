import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getCurrentUser, getRepFilterId, isRep } from "@/lib/auth";

export const runtime = "nodejs";

// GET - List all proposals
export async function GET(request: NextRequest) {
  try {
    const db = createServiceClient();
    const user = await getCurrentUser();
    const repFilterId = getRepFilterId(user);

    // If user is a rep, only get proposals for their assigned companies
    if (repFilterId) {
      // First get the rep's assigned company IDs
      const { data: assignedCompanies } = await db
        .from("companies")
        .select("id")
        .eq("assigned_rep_id", repFilterId);

      const companyIds = assignedCompanies?.map(c => c.id) || [];

      if (companyIds.length === 0) {
        // Rep has no assigned companies, return empty
        return NextResponse.json({
          ok: true,
          data: [],
        });
      }

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
        .in("company_id", companyIds)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);

      return NextResponse.json({
        ok: true,
        data: proposals || [],
      });
    }

    // Admin/super_admin gets all proposals
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
