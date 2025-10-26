// apps/web/src/app/api/reports/billing/[period]/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { computeFeesForPretaxMonthly, computeProfitShare } from "@/lib/fees";
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
    .select("id, name, model, state, pay_frequency");
  if (cErr || !companies?.length)
    return NextResponse.json({ ok: false, error: "No companies" }, { status: 404 });

  const invoices = [];
  for (const c of companies) {
    // Get company billing settings for profit-sharing
    const { data: billingSettings } = await db
      .from("company_billing_settings")
      .select("profit_share_mode, profit_share_percent")
      .eq("company_id", c.id)
      .maybeSingle();

    const profitShareMode = (billingSettings?.profit_share_mode ?? "none") as "none" | "percent_er_savings" | "percent_bb_profit";
    const profitSharePercent = Number(billingSettings?.profit_share_percent ?? 0);

    // employees + benefits
    const { data: emps } = await db
      .from("employees")
      .select("id, first_name, last_name, gross_pay")
      .eq("company_id", c.id)
      .eq("active", true);

    if (!emps?.length) continue;

    // PERFORMANCE FIX: Fetch all benefits for all employees in ONE query (eliminates N+1 problem)
    const employeeIds = emps.map(e => e.id);
    const { data: allBenefits } = await db
      .from("employee_benefits")
      .select("employee_id, per_pay_amount, reduces_fica")
      .in("employee_id", employeeIds);

    // Group benefits by employee_id for O(1) lookup
    const benefitsByEmployee = new Map<string, Array<{ per_pay_amount: number; reduces_fica: boolean }>>();
    for (const benefit of allBenefits || []) {
      if (!benefitsByEmployee.has(benefit.employee_id)) {
        benefitsByEmployee.set(benefit.employee_id, []);
      }
      benefitsByEmployee.get(benefit.employee_id)!.push({
        per_pay_amount: Number(benefit.per_pay_amount || 0),
        reduces_fica: !!benefit.reduces_fica
      });
    }

    let totalPretax = 0;
    let totalErFicaSavings = 0;

    const payPeriodMap: Record<string, number> = {
      weekly: 52,
      biweekly: 26,
      semimonthly: 24,
      monthly: 12
    };
    const periodsPerYear = payPeriodMap[c.pay_frequency] || 26;
    const periodsPerMonth = periodsPerYear / 12;

    for (const e of emps) {
      const benefits = benefitsByEmployee.get(e.id) || [];

      const perPayPretax = benefits.reduce(
        (sum, b) => sum + b.per_pay_amount,
        0
      );

      const perPayPretaxFica = benefits.filter(b => b.reduces_fica).reduce(
        (sum, b) => sum + b.per_pay_amount,
        0
      );

      // Pretax total (monthly)
      const pretaxMonthly = +(perPayPretax * periodsPerMonth).toFixed(2);
      totalPretax += pretaxMonthly;

      // Employer FICA savings per pay
      const grossPay = Number(e.gross_pay || 0);
      if (grossPay > 0 && perPayPretaxFica > 0) {
        const ficaBefore = calcFICA(
          grossPay,
          0,
          Number(fed?.ss_rate || 0.062),
          Number(fed?.med_rate || 0.0145)
        );
        const ficaAfter = calcFICA(
          grossPay,
          perPayPretaxFica,
          Number(fed?.ss_rate || 0.062),
          Number(fed?.med_rate || 0.0145)
        );
        const ficaSaved = ficaBefore.fica - ficaAfter.fica;
        totalErFicaSavings += +(ficaSaved * periodsPerMonth).toFixed(2);
      }
    }

    const { employeeFeeMonthly, employerFeeMonthly, employeeRate, employerRate } =
      computeFeesForPretaxMonthly(totalPretax, c.model);

    const bbProfitMonthly = employeeFeeMonthly + employerFeeMonthly;

    // Calculate profit-sharing credit
    const profitShare = computeProfitShare(
      profitShareMode,
      profitSharePercent,
      totalErFicaSavings,
      bbProfitMonthly
    );

    const employerNetFee = +(employerFeeMonthly - profitShare.profitShareAmount).toFixed(2);
    const companyNetSavings = +(totalErFicaSavings - employerNetFee).toFixed(2);

    invoices.push({
      company_id: c.id,
      company_name: c.name,
      model: c.model,
      rates: `${(employeeRate * 100).toFixed(1)}% / ${(employerRate * 100).toFixed(1)}%`,
      total_pretax: totalPretax,
      total_employer_fica_saved: totalErFicaSavings,
      bb_profit: bbProfitMonthly,
      employer_fee: employerFeeMonthly,
      profit_share_mode: profitShareMode,
      profit_share_credit: profitShare.profitShareAmount,
      profit_share_description: profitShare.description,
      employer_net_fee: employerNetFee,
      employer_net_savings: companyNetSavings,
      employee_fee_total: employeeFeeMonthly,
      period: `${year}-${String(month).padStart(2, "0")}`,
    });
  }

  return NextResponse.json({ ok: true, period, invoices });
}
