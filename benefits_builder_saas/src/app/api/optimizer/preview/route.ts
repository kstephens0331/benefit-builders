import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { calcFICA, calcFITFromTable, calcSITFlat } from "@/lib/tax";

const PAY_FREQS: Record<string, number> = {
  weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12
};

export async function POST(req: Request) {
  const db = createServiceClient();
  const { employeeId, taxYear = 2025 } = await req.json().catch(() => ({}));
  if (!employeeId) return NextResponse.json({ ok:false, error:"employeeId required" }, { status:400 });

  // Employee
  const { data: emp, error: eErr } = await db
    .from("employees")
    .select("id,state,pay_period,paycheck_gross,gross_pay,filing_status")
    .eq("id", employeeId).single();
  if (eErr || !emp) return NextResponse.json({ ok:false, error: eErr?.message || "Employee not found" }, { status:404 });

  const payMap: any = { w:"weekly", b:"biweekly", s:"semimonthly", m:"monthly" };
  const pay_frequency = payMap[emp.pay_period] || "biweekly";
  const periodsPerYear = PAY_FREQS[pay_frequency] ?? 26;
  const filing = (emp.filing_status ?? "single") as "single"|"married"|"head";
  // Fallback to gross_pay if paycheck_gross is null/0
  const gross = Number(emp.paycheck_gross ?? emp.gross_pay ?? 0);

  // Federal + 15-T
  const { data: fed, error: fErr } = await db.from("tax_federal_params").select("*").eq("tax_year", taxYear).single();
  if (fErr || !fed) return NextResponse.json({ ok:false, error:"federal params missing" }, { status:500 });

  const { data: t15 } = await db
    .from("withholding_federal_15t")
    .select("percentage_method_json")
    .eq("tax_year", taxYear).eq("filing_status", filing).eq("pay_frequency", pay_frequency)
    .maybeSingle();
  const pctTable = (t15?.percentage_method_json as any[]) ?? [];

  // State
  const { data: st } = await db
    .from("tax_state_params")
    .select("method, flat_rate, brackets")
    .eq("state", emp.state || "TX").eq("tax_year", taxYear).maybeSingle();

  // Active benefits joined by catalog_code → benefit_catalog
  const { data: bens, error: bErr } = await db
    .from("employee_benefits")
    .select(`
      per_pay_amount, active, start_date, end_date, catalog_code,
      benefit_catalog ( reduces_fit, reduces_fica, annual_limit )
    `)
    .eq("employee_id", employeeId)
    .eq("active", true);
  if (bErr) return NextResponse.json({ ok:false, error:bErr.message }, { status:500 });

  const pre = { fit: 0, fica: 0 };
  for (const b of bens ?? []) {
    const amt = Number(b.per_pay_amount || 0);
    const reduces_fit  = b.benefit_catalog?.reduces_fit  ?? true;
    const reduces_fica = b.benefit_catalog?.reduces_fica ?? true;
    const annual = b.benefit_catalog?.annual_limit as number | null | undefined;
    const capPerPay = (annual == null) ? Number.POSITIVE_INFINITY : Number(annual) / periodsPerYear;
    const clamped = Math.max(0, Math.min(amt, capPerPay));
    if (reduces_fit)  pre.fit  += clamped;
    if (reduces_fica) pre.fica += clamped;
  }

  function runScenario(preFIT:number, preFICA:number) {
    const fica = calcFICA(gross, preFICA, Number(fed.ss_rate), Number(fed.med_rate));
    const taxableFIT = Math.max(0, gross - preFIT);
    const fit = pctTable.length ? calcFITFromTable(taxableFIT, pctTable as any) : 0;

    let sit = 0;
    if (st?.method === "flat" && st.flat_rate) sit = calcSITFlat(taxableFIT, Number(st.flat_rate));

    const taxes = +(fica.fica + fit + sit).toFixed(2);
    const net = +(gross - taxes).toFixed(2);
    return { gross, preFIT, preFICA, fit, ...fica, sit, taxes, net };
  }

  const current = runScenario(0, 0);
  const after   = runScenario(+pre.fit.toFixed(2), +pre.fica.toFixed(2));
  const netIncrease = +(after.net - current.net).toFixed(2);

  return NextResponse.json({
    ok:true,
    taxYear, pay_frequency, periodsPerYear,
    preTaxFIT: +pre.fit.toFixed(2),
    preTaxFICA: +pre.fica.toFixed(2),
    current, after, netIncrease
  });
}
