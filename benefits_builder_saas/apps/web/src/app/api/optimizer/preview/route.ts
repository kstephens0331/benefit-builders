// apps/web/src/app/api/optimizer/preview/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { computeFeesForPretaxMonthly } from "@/lib/fees";
import { calcFICA, calcFITFromTable, calcSITFlat } from "@/lib/tax";
import { parseModel } from "@/lib/models";
import { OptimizerPreviewSchema, validateRequestBody } from "@/lib/validation";

/**
 * POST /api/optimizer/preview
 * body: { employeeId: string, taxYear?: number }
 * - Sums active pre-tax benefits (that reduce FIT and/or FICA) from employee_benefits.
 * - Computes taxes before vs after, converts to monthly.
 * - Applies company model fees (5/3, 4/3, 5/1, 4/4) on monthly pretax total.
 * - Returns employee/employer monthly & annual savings after fees.
 */
export async function POST(req: Request) {
  const db = createServiceClient();

  // Validate request body
  const validation = await validateRequestBody(req, OptimizerPreviewSchema);
  if (!validation.valid) {
    return NextResponse.json(
      { ok: false, error: validation.error, issues: validation.issues },
      { status: 400 }
    );
  }

  const { employeeId, taxYear } = validation.data;

  // Load employee and company (to get model)
  const { data: emp, error: eErr } = await db
    .from("employees")
    .select("id, company_id, state, pay_period, paycheck_gross, filing_status, dependents")
    .eq("id", employeeId)
    .single();
  if (eErr || !emp) {
    return NextResponse.json({ ok: false, error: eErr?.message ?? "Employee not found" }, { status: 404 });
  }

  const { data: company, error: cErr } = await db
    .from("companies")
    .select("id, model, state")
    .eq("id", emp.company_id)
    .single();
  if (cErr || !company) {
    return NextResponse.json({ ok: false, error: cErr?.message ?? "Company not found" }, { status: 404 });
  }

  // Enforce allowed models
  const modelParsed = parseModel(company.model);
  if (!modelParsed) {
    return NextResponse.json(
      { ok: false, error: `Company model must be one of: 5/3, 3/4, 5/1, 4/4 (got "${company.model ?? ""}")` },
      { status: 400 }
    );
  }

  // Pull pre-tax benefits for employee (sum per-pay)
  // Note: employee_benefits table has no active column - all benefits for active employees are included
  type EmpBen = {
    per_pay_amount: number | null;
    reduces_fit: boolean | null;
    reduces_fica: boolean | null;
  };
  const { data: bens, error: bErr } = await db
    .from("employee_benefits")
    .select("per_pay_amount, reduces_fit, reduces_fica")
    .eq("employee_id", employeeId);
  if (bErr) {
    return NextResponse.json({ ok: false, error: bErr.message }, { status: 500 });
  }
  const benefits = (bens as EmpBen[]) ?? [];

  // Totals for benefits by tax effect
  const preFIT_perPay = benefits
    .filter((b) => b.reduces_fit)
    .reduce((s, b) => s + Number(b.per_pay_amount || 0), 0);
  const preFICA_perPay = benefits
    .filter((b) => b.reduces_fica)
    .reduce((s, b) => s + Number(b.per_pay_amount || 0), 0);
  const preTax_perPay = benefits.reduce((s, b) => s + Number(b.per_pay_amount || 0), 0);

  // Pay frequency mapping
  const payMap: Record<string, { label: string; periods: number }> = {
    w: { label: "weekly", periods: 52 },
    b: { label: "biweekly", periods: 26 },
    s: { label: "semimonthly", periods: 24 },
    m: { label: "monthly", periods: 12 },
  };
  const pf = payMap[emp.pay_period ?? "b"] ?? payMap.b;
  const periodsPerYear = pf.periods;

  const filing = (emp.filing_status ?? "single") as "single" | "married" | "head";
  const gross = Number(emp.paycheck_gross ?? 0);

  // Federal params (FICA rates, 15-T)
  const { data: fed, error: fErr } = await db
    .from("tax_federal_params")
    .select("*")
    .eq("tax_year", taxYear)
    .single();
  if (fErr || !fed) {
    return NextResponse.json({ ok: false, error: "federal params missing" }, { status: 500 });
  }

  const { data: t15 } = await db
    .from("withholding_federal_15t")
    .select("percentage_method_json")
    .eq("tax_year", taxYear)
    .eq("filing_status", filing)
    .eq("pay_frequency", pf.label)
    .maybeSingle();
  const pctTable = (t15?.percentage_method_json as any[]) ?? [];

  // State params (optional flat SIT)
  const stAbbr = emp.state || company.state || "TX";
  const { data: st } = await db
    .from("tax_state_params")
    .select("method, flat_rate")
    .eq("state", stAbbr)
    .eq("tax_year", taxYear)
    .maybeSingle();

  function computeTaxes(perPayPreFIT: number, perPayPreFICA: number) {
    // FICA (SS + Medicare) — calcFICA(gross, preFICA, ss_rate, med_rate)
    const ficaRes = calcFICA(gross, perPayPreFICA, Number(fed.ss_rate), Number(fed.med_rate));

    // FIT using IRS 15-T percentage method
    const taxableForFIT = Math.max(0, gross - perPayPreFIT);
    const fit = pctTable.length ? calcFITFromTable(taxableForFIT, pctTable as any) : 0;

    // SIT (if flat method configured)
    let sit = 0;
    if (st?.method === "flat" && st.flat_rate) {
      sit = calcSITFlat(taxableForFIT, Number(st.flat_rate));
    }

    const taxes = +(ficaRes.fica + fit + sit).toFixed(2);
    return { fit, sit, ...ficaRes, taxes };
  }

  // Current vs After (with pre-tax)
  const current = computeTaxes(0, 0);
  const after = computeTaxes(preFIT_perPay, preFICA_perPay);

  // Per-pay savings
  const empTaxSavings_perPay = +(current.taxes - after.taxes).toFixed(2);

  // Employer FICA savings (per pay)
  const ficaBefore = calcFICA(gross, 0, Number(fed.ss_rate), Number(fed.med_rate));
  const ficaAfter = calcFICA(gross, preFICA_perPay, Number(fed.ss_rate), Number(fed.med_rate));
  const erFicaSavings_perPay = +(ficaBefore.fica - ficaAfter.fica).toFixed(2);

  // Convert to monthly equivalents
  const toMonthly = (xPerPay: number) => +(xPerPay * (periodsPerYear / 12)).toFixed(2);
  const pretaxMonthly = toMonthly(preTax_perPay);
  const empTaxSavings_monthly = toMonthly(empTaxSavings_perPay);
  const erFicaSavings_monthly = toMonthly(erFicaSavings_perPay);

  // Apply fees based on the validated model
  const { employeeFeeMonthly, employerFeeMonthly, employeeRate, employerRate, feesLabel } =
    computeFeesForPretaxMonthly(pretaxMonthly, company.model);

  // Net savings after fees
  const employeeMonthlyNet = +(empTaxSavings_monthly - employeeFeeMonthly).toFixed(2);
  const employerMonthlyNet = +(erFicaSavings_monthly - employerFeeMonthly).toFixed(2);

  return NextResponse.json({
    ok: true,
    meta: {
      taxYear,
      pay_frequency: pf.label,
      periods_per_year: periodsPerYear,
      filing,
      state: stAbbr,
      company_model: modelParsed,
      fees_model: feesLabel,
    },
    inputs: {
      gross_per_pay: gross,
      pre_tax_per_pay: +preTax_perPay.toFixed(2),
      pre_tax_breakdown_per_pay: {
        reduces_fit_per_pay: +preFIT_perPay.toFixed(2),
        reduces_fica_per_pay: +preFICA_perPay.toFixed(2),
      },
    },
    per_pay: {
      taxes_before: current.taxes,
      taxes_after: after.taxes,
      employee_tax_savings: empTaxSavings_perPay,
      employer_fica_savings: erFicaSavings_perPay,
    },
    monthly: {
      pretax_total: pretaxMonthly, // <- basis for model % fees
      employee_tax_savings: empTaxSavings_monthly,
      employer_fica_savings: erFicaSavings_monthly,
      employee_fee: employeeFeeMonthly,
      employer_fee: employerFeeMonthly,
      employee_net_savings: employeeMonthlyNet,
      employer_net_savings: employerMonthlyNet,
      employer_annual_net_savings: +(employerMonthlyNet * 12).toFixed(2),
    },
  });
}
