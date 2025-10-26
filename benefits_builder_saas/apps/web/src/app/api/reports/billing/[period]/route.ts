// apps/web/src/app/api/reports/billing/[period]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

type InvoiceRow = {
  company_id: string;
  company_name: string;
  model: string | null;
  rates: string;
  total_pretax: number;
  total_employer_fica_saved: number;
  employer_fee: number;
  employer_net_savings: number;
  employee_fee_total: number;
  period: string;
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ period: string }> }
) {
  const { period } = await ctx.params;
  const db = createServiceClient();

  // Query to get billing data aggregated by company
  const { data, error } = await db
    .from("invoices")
    .select(`
      company_id,
      period,
      subtotal_cents,
      tax_cents,
      total_cents,
      companies (
        name,
        model,
        employer_rate,
        employee_rate
      )
    `)
    .eq("period", period)
    .order("company_id");

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Transform the data into the expected format
  const invoices: InvoiceRow[] = (data || []).map((row: any) => {
    const company = row.companies || {};
    const employerRate = Number(company.employer_rate || 0);
    const employeeRate = Number(company.employee_rate || 0);
    const subtotal = Number(row.subtotal_cents || 0) / 100;

    return {
      company_id: row.company_id,
      company_name: company.name || "Unknown",
      model: company.model || null,
      rates: `${employerRate.toFixed(1)}% / ${employeeRate.toFixed(1)}%`,
      total_pretax: subtotal,
      total_employer_fica_saved: subtotal * 0.0765, // Approximate FICA savings
      employer_fee: subtotal * (employerRate / 100),
      employer_net_savings: (subtotal * 0.0765) - (subtotal * (employerRate / 100)),
      employee_fee_total: subtotal * (employeeRate / 100),
      period: row.period
    };
  });

  return NextResponse.json({
    ok: true,
    period,
    invoices
  });
}
