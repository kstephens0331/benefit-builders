// apps/web/src/app/api/reports/summary/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { computeFeesForPretaxMonthly } from "@/lib/fees";
import { calcFICA } from "@/lib/tax";

export async function GET(req: Request) {
  const db = createServiceClient();
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period");

  // tax year (from YYYY-MM) for FICA params
  const now = new Date();
  const [yearStr] = (period ?? "").split("-");
  const taxYear = Number(yearStr) || now.getFullYear();

  // Federal employer FICA rates
  const { data: fed, error: fErr } = await db
    .from("tax_federal_params")
    .select("ss_rate, med_rate")
    .eq("tax_year", taxYear)
    .single();
  if (fErr || !fed) {
    return NextResponse.json({ ok: false, error: "Federal params missing" }, { status: 500 });
  }

  // All active companies
  const { data: companies, error: cErr } = await db
    .from("companies")
    .select("id,name,state,model,status")
    .eq("status", "active");
  if (cErr) return NextResponse.json({ ok: false, error: cErr.message }, { status: 500 });

  // Preload all active employees
  const { data: emps, error: eErr } = await db
    .from("employees")
    .select("id,company_id,active,pay_period,paycheck_gross")
    .eq("active", true);
  if (eErr) return NextResponse.json({ ok: false, error: eErr.message }, { status: 500 });

  // Preload all active pre-tax benefits
  const { data: bens, error: bErr } = await db
    .from("employee_benefits")
    .select("employee_id, per_pay_amount, active, reduces_fica")
    .eq("active", true);
  if (bErr) return NextResponse.json({ ok: false, error: bErr.message }, { status: 500 });

  const payMap: Record<string, number> = { w: 52, b: 26, s: 24, m: 12 };
  const ppm = (pp: string | null | undefined) => (payMap[pp ?? "b"] ?? 26) / 12;

  const byCompany: Record<
    string,
    {
      company_id: string;
      company_name: string;
      state: string | null;
      model: string | null;
      status: string | null;
      employees_active: number;
      pretax_monthly: number;
      employer_fica_saved_monthly: number;
    }
  > = {};

  for (const c of companies ?? []) {
    byCompany[c.id] = {
      company_id: c.id,
      company_name: c.name,
      state: c.state,
      model: c.model,
      status: c.status,
      employees_active: 0,
      pretax_monthly: 0,
      employer_fica_saved_monthly: 0,
    };
  }

  // index benefits by employee
  const benByEmp = new Map<string, { perPay: number; reducesFICA: boolean }>();
  for (const b of bens ?? []) {
    const key = String(b.employee_id);
    const prev = benByEmp.get(key) ?? { perPay: 0, reducesFICA: true };
    prev.perPay += Number(b.per_pay_amount ?? 0);
    prev.reducesFICA = prev.reducesFICA && !!b.reduces_fica;
    benByEmp.set(key, prev);
  }

  for (const e of emps ?? []) {
    const bucket = byCompany[e.company_id];
    if (!bucket) continue;
    bucket.employees_active += 1;

    const perPayPretax = benByEmp.get(e.id)?.perPay ?? 0;
    const perMonth = ppm(e.pay_period);
    bucket.pretax_monthly += perPayPretax * perMonth;

    // employer FICA saved (per-pay to monthly)
    const gross = Number(e.paycheck_gross ?? 0);
    const before = calcFICA(gross, 0, Number(fed.ss_rate), Number(fed.med_rate));
    const after = calcFICA(gross, perPayPretax, Number(fed.ss_rate), Number(fed.med_rate));
    const savedPerPay = +(before.fica - after.fica).toFixed(2);
    bucket.employer_fica_saved_monthly += savedPerPay * perMonth;
  }

  // finalize + add fees
  const rows = Object.values(byCompany).map((r) => {
    const fees = computeFeesForPretaxMonthly(+r.pretax_monthly.toFixed(2), r.model);
    const employer_net = +(
      +r.employer_fica_saved_monthly.toFixed(2) - fees.employerFeeMonthly
    ).toFixed(2);
    return {
      ...r,
      pretax_monthly: +r.pretax_monthly.toFixed(2),
      employer_fica_saved_monthly: +r.employer_fica_saved_monthly.toFixed(2),
      employee_fee_monthly: fees.employeeFeeMonthly,
      employer_fee_monthly: fees.employerFeeMonthly,
      employer_net_monthly: employer_net,
    };
  });

  return NextResponse.json({ ok: true, count: rows.length, data: rows });
}
