// apps/web/src/app/api/reports/employees/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET(req: Request) {
  const db = createServiceClient();
  const { searchParams } = new URL(req.url);
  const _period = searchParams.get("period"); // reserved for future filters

  const { data: companies, error: cErr } = await db
    .from("companies")
    .select("id,name,status");
  if (cErr) return NextResponse.json({ ok: false, error: cErr.message }, { status: 500 });

  const nameById = new Map<string, string>();
  for (const c of companies ?? []) nameById.set(c.id, c.name);

  const { data: emps, error: eErr } = await db
    .from("employees")
    .select(
      "id,company_id,first_name,last_name,active,pay_period,paycheck_gross"
    );
  if (eErr) return NextResponse.json({ ok: false, error: eErr.message }, { status: 500 });

  const { data: bens, error: bErr } = await db
    .from("employee_benefits")
    .select("employee_id, per_pay_amount, active")
    .eq("active", true);
  if (bErr) return NextResponse.json({ ok: false, error: bErr.message }, { status: 500 });

  const payMap: Record<string, number> = { w: 52, b: 26, s: 24, m: 12 };
  const ppm = (pp: string | null | undefined) => (payMap[pp ?? "b"] ?? 26) / 12;

  // index benefits
  const byEmp = new Map<string, number>();
  for (const b of bens ?? []) {
    const key = String(b.employee_id);
    const prev = byEmp.get(key) ?? 0;
    byEmp.set(key, prev + Number(b.per_pay_amount ?? 0));
  }

  const rows = (emps ?? []).map((e) => {
    const perPayPretax = byEmp.get(e.id) ?? 0;
    return {
      company_id: e.company_id,
      company_name: nameById.get(e.company_id) ?? "",
      first_name: e.first_name,
      last_name: e.last_name,
      active: !!e.active,
      pay_period: e.pay_period,
      paycheck_gross: e.paycheck_gross ? Number(e.paycheck_gross) : 0,
      pretax_per_pay: +perPayPretax.toFixed(2),
      pretax_monthly: +(perPayPretax * ppm(e.pay_period)).toFixed(2),
    };
  });

  return NextResponse.json({ ok: true, count: rows.length, data: rows });
}
