// Revenue Projection Calculator API
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { z } from "zod";
import { validateRequestBody } from "@/lib/validation";

export const runtime = "nodejs";

const ProjectionSchema = z.object({
  target_companies: z.number().int().min(1).max(10000),
  avg_employees_per_company: z.number().min(1).max(1000),
  avg_pretax_per_employee: z.number().min(0).max(10000),
  avg_model_rate: z.number().min(0).max(0.10).optional().default(0.06), // Combined 6% avg (e.g., 5/1 = 6%, 5/3 = 8%)
  months_to_achieve: z.number().int().min(1).max(60).optional().default(12),
  save: z.boolean().optional().default(false),
  notes: z.string().max(1000).optional()
});

// POST - Calculate revenue projection
export async function POST(req: Request) {
  const db = createServiceClient();

  const validation = await validateRequestBody(req, ProjectionSchema);
  if (!validation.valid) {
    return NextResponse.json(
      { ok: false, error: validation.error, issues: validation.issues },
      { status: 400 }
    );
  }

  const {
    target_companies,
    avg_employees_per_company,
    avg_pretax_per_employee,
    avg_model_rate,
    months_to_achieve,
    save,
    notes
  } = validation.data;

  // Calculate projections
  const total_employees = target_companies * avg_employees_per_company;
  const total_pretax_monthly = total_employees * avg_pretax_per_employee;
  const projected_monthly_revenue = total_pretax_monthly * avg_model_rate!;
  const projected_annual_revenue = projected_monthly_revenue * 12;

  // Get current metrics for comparison
  const { count: current_companies } = await db
    .from("companies")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  const { count: current_employees } = await db
    .from("employees")
    .select("*", { count: "exact", head: true })
    .eq("active", true);

  const companies_needed = target_companies - (current_companies || 0);
  const employees_needed = total_employees - (current_employees || 0);

  const companies_per_month = months_to_achieve! > 0 ? companies_needed / months_to_achieve! : 0;

  const projection_result = {
    inputs: {
      target_companies,
      avg_employees_per_company,
      avg_pretax_per_employee,
      avg_model_rate: avg_model_rate!,
      months_to_achieve: months_to_achieve!
    },
    projections: {
      total_employees,
      total_pretax_monthly,
      projected_monthly_revenue: parseFloat(projected_monthly_revenue.toFixed(2)),
      projected_annual_revenue: parseFloat(projected_annual_revenue.toFixed(2))
    },
    gap_analysis: {
      current_companies: current_companies || 0,
      current_employees: current_employees || 0,
      companies_needed: Math.max(0, companies_needed),
      employees_needed: Math.max(0, employees_needed),
      companies_per_month: parseFloat(companies_per_month.toFixed(2)),
      months_to_target: months_to_achieve!
    },
    assumptions: {
      model_rate_explanation: "Combined employee + employer fee rate (e.g., 5/1 model = 6% total)",
      estimated_employer_savings: "Typically 7.65% of pretax amount (FICA)",
      profit_margin_estimate: parseFloat(((avg_model_rate! / 0.0765) * 100).toFixed(1)) + "%"
    }
  };

  // Save projection if requested
  if (save) {
    const target_date = new Date();
    target_date.setMonth(target_date.getMonth() + months_to_achieve!);

    await db.from("revenue_projections").insert({
      projection_date: target_date.toISOString().split("T")[0],
      projected_companies: target_companies,
      projected_avg_employees: avg_employees_per_company,
      projected_avg_pretax: avg_pretax_per_employee,
      projected_monthly_revenue,
      projected_annual_revenue,
      assumptions: projection_result.assumptions,
      notes
    });
  }

  return NextResponse.json({
    ok: true,
    ...projection_result
  });
}

// GET - Fetch saved projections
export async function GET() {
  const db = createServiceClient();

  const { data: projections, error } = await db
    .from("revenue_projections")
    .select("*")
    .order("projection_date", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, projections: projections || [] });
}
