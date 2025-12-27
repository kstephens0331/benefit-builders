// Revenue Projection Calculator API
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { z } from "zod";
import { validateRequestBody } from "@/lib/validation";

export const runtime = "nodejs";

const ProjectionSchema = z.object({
  new_companies: z.number().int().min(0).max(10000),
  avg_employees_per_company: z.number().min(0).max(1000),
  avg_pretax_per_employee: z.number().min(0).max(10000),
  avg_model_rate: z.number().min(0).max(0.10).optional().default(0.06), // Combined 6% avg (e.g., 5/1 = 6%, 5/3 = 8%)
  months_remaining: z.number().int().min(1).max(12).optional().default(12),
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
    new_companies,
    avg_employees_per_company,
    avg_pretax_per_employee,
    avg_model_rate,
    months_remaining,
    save,
    notes
  } = validation.data;

  // Get current metrics
  const { count: current_companies } = await db
    .from("companies")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  const { count: current_enrolled_employees } = await db
    .from("employees")
    .select("*", { count: "exact", head: true })
    .eq("active", true)
    .eq("consent_status", "elect");

  // Get current monthly revenue from enrolled employees
  const { data: revenueData } = await db
    .from("employees")
    .select("pretax_benefit, model")
    .eq("active", true)
    .eq("consent_status", "elect");

  let current_monthly_revenue = 0;
  if (revenueData) {
    for (const emp of revenueData) {
      const pretax = Number(emp.pretax_benefit) || 0;
      const model = emp.model || "5/3";
      // Parse model to get combined rate (e.g., "5/3" = 0.05 + 0.03 = 0.08)
      const parts = model.split("/");
      const empRate = (parseInt(parts[0]) || 0) / 100;
      const erRate = (parseInt(parts[1]) || 0) / 100;
      current_monthly_revenue += pretax * (empRate + erRate);
    }
  }

  // Calculate new business projections
  const new_employees = new_companies * avg_employees_per_company;
  const new_pretax_monthly = new_employees * avg_pretax_per_employee;
  const new_monthly_revenue = new_pretax_monthly * avg_model_rate!;

  // Combined totals
  const total_companies = (current_companies || 0) + new_companies;
  const total_employees = (current_enrolled_employees || 0) + new_employees;
  const combined_monthly_revenue = current_monthly_revenue + new_monthly_revenue;
  const partial_year_revenue = combined_monthly_revenue * months_remaining!;
  const annual_revenue = combined_monthly_revenue * 12;

  const projection_result = {
    current: {
      companies: current_companies || 0,
      employees: current_enrolled_employees || 0,
      monthly_revenue: parseFloat(current_monthly_revenue.toFixed(2))
    },
    new_business: {
      companies: new_companies,
      employees: new_employees,
      monthly_revenue: parseFloat(new_monthly_revenue.toFixed(2))
    },
    combined: {
      total_companies,
      total_employees,
      monthly_revenue: parseFloat(combined_monthly_revenue.toFixed(2)),
      partial_year_revenue: parseFloat(partial_year_revenue.toFixed(2)),
      annual_revenue: parseFloat(annual_revenue.toFixed(2))
    }
  };

  // Save projection if requested
  if (save) {
    const target_date = new Date();
    target_date.setMonth(target_date.getMonth() + months_remaining!);

    await db.from("revenue_projections").insert({
      projection_date: target_date.toISOString().split("T")[0],
      projected_companies: total_companies,
      projected_avg_employees: avg_employees_per_company,
      projected_avg_pretax: avg_pretax_per_employee,
      projected_monthly_revenue: combined_monthly_revenue,
      projected_annual_revenue: annual_revenue,
      assumptions: { new_companies, months_remaining },
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
