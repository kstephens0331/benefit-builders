// apps/web/src/app/api/reports/billing/[period]/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { computeFeesForPretaxMonthly } from "@/lib/fees";
import { calcFICA } from "@/lib/tax";

export const runtime = "nodejs";

/**
 * GET /api/reports/billing/:period
 * Example: /api/reports/billing/2025-10
 * Returns per-company invoice JSON with model-based fees & savings.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ period: string }> }
) {
  const { period } = await params;
  const db = createServiceClient();
  const [yearStr, monthStr] = (period ?? "").split("-");
  const year = Number(yearStr) || new Date().getFullYear();
  const month = Number(monthStr) || new Date().getMonth() + 1;

  const { data: fed } = await db
    .from("tax_federal_params")
    .select("ss_rate, med_rate")
    .eq("tax_year", year)
    .single();

  const { data: companies, error: cErr } = await db
    .from("companies")
    .select("id, name, model, state");
  if (cErr || !companies?.length)
    return NextResponse.json({ ok: false, error: "No companies" }, { status: 404 });

  const invoices = [];
  for (const c of companies) {
    // employees + benefits
    const { data: emps } = await db
      .from("employees")
      .select("id, first_name, last_name, paycheck_gross, pay_period")
      .eq("company_id", c.id)
      .eq("active", true);

    if (!emps?.length) continue;

    let totalPretax = 0;
    let totalEmpTaxSavings = 0;
    let totalErFicaSavings = 0;

    for (const e of emps) {
      const { data: bens } = await db
        .from("employee_benefits")
        .select("per_pay_amount, reduces_fica, active")
        .eq("employee_id", e.id)
        .eq("active", true);

      const perPayPretax = bens?.reduce(
        (sum, b) => sum + Number(b.per_pay_amount || 0),
        0
      ) ?? 0;

      const payMap: Record<string, number> = { w: 52, b: 26, s: 24, m: 12 };
      const periods = payMap[e.pay_period ?? "b"] ?? 26;
      const perYear = periods / 12;

      // Pretax total (monthly)
      const pretaxMonthly = +(perPayPretax * perYear).toFixed(2);
      totalPretax += pretaxMonthly;

      // Employer FICA savings per pay
      const ficaBefore = calcFICA(
        Number(e.paycheck_gross || 0),
        0,
        Number(fed?.ss_rate || 0),
        Number(fed?.med_rate || 0)
      );
      const ficaAfter = calcFICA(
        Number(e.paycheck_gross || 0),
        perPayPretax,
        Number(fed?.ss_rate || 0),
        Number(fed?.med_rate || 0)
      );
      const ficaSaved = ficaBefore.fica - ficaAfter.fica;
      totalErFicaSavings += +(ficaSaved * perYear).toFixed(2);
    }

    const { employeeFeeMonthly, employerFeeMonthly, employeeRate, employerRate } =
      computeFeesForPretaxMonthly(totalPretax, c.model);

    const companyNet =
      +(totalErFicaSavings - employerFeeMonthly).toFixed(2);

    invoices.push({
      company_id: c.id,
      company_name: c.name,
      model: c.model,
      rates: `${(employeeRate * 100).toFixed(1)}% / ${(employerRate * 100).toFixed(1)}%`,
      total_pretax: totalPretax,
      total_employer_fica_saved: totalErFicaSavings,
      employer_fee: employerFeeMonthly,
      employer_net_savings: companyNet,
      employee_fee_total: employeeFeeMonthly,
      period: `${year}-${String(month).padStart(2, "0")}`,
    });
  }

  return NextResponse.json({ ok: true, period, invoices });
}
