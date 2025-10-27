// src/app/api/analytics/summary/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

function lastMonths(n: number) {
  const out: string[] = [];
  const d = new Date();
  d.setUTCDate(1);
  for (let i = 0; i < n; i++) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    out.unshift(`${y}-${m}`);
    d.setUTCMonth(d.getUTCMonth() - 1);
  }
  return out;
}

export async function GET() {
  const db = createServiceClient();
  const now = new Date();
  const thisPeriod = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const months6 = lastMonths(6);

  const { count: companiesCount, error: cErr } = await db
    .from("companies").select("id", { count: "exact", head: true }).eq("status", "active");
  if (cErr) return NextResponse.json({ ok: false, error: cErr.message }, { status: 500 });

  const { count: employeesCount, error: eErr } = await db
    .from("employees").select("id", { count: "exact", head: true }).eq("active", true);
  if (eErr) return NextResponse.json({ ok: false, error: eErr.message }, { status: 500 });

  const { data: enrolledRows, error: enErr} = await db
    .from("employee_benefits").select("employee_id");
  if (enErr) return NextResponse.json({ ok: false, error: enErr.message }, { status: 500 });
  const enrolledCount = new Set((enrolledRows ?? []).map((r: any) => r.employee_id)).size;
  const enrollPct = employeesCount ? +((enrolledCount / (employeesCount || 1)) * 100).toFixed(1) : 0;

  const year = now.getUTCFullYear();
  const { data: ytdRows, error: yErr } = await db
    .from("invoices").select("period,total_cents")
    .gte("period", `${year}-01`).lte("period", `${year}-12`);
  if (yErr) return NextResponse.json({ ok: false, error: yErr.message }, { status: 500 });

  const sumBy = (rows: any[], predicate?: (r: any) => boolean) =>
    (rows ?? []).filter((r) => !predicate || predicate(r)).reduce((acc, r) => acc + Number(r.total_cents || 0), 0);

  const revenueMTD = sumBy(ytdRows, (r) => r.period === thisPeriod);
  const revenueYTD = sumBy(ytdRows);

  const { data: seriesRows } = await db
    .from("invoices").select("period,total_cents").in("period", months6);
  const map = new Map<string, number>();
  (seriesRows ?? []).forEach((r: any) =>
    map.set(r.period, (map.get(r.period) || 0) + Number(r.total_cents || 0))
  );
  const revenue6 = months6.map((p) => ({ period: p, total_cents: map.get(p) || 0 }));

  const tail = revenue6.slice(-3);
  const base = tail.length ? tail : revenue6;
  const avg = base.reduce((a, b) => a + (b.total_cents || 0), 0) / (base.length || 1);
  const projectionNext = Math.round(avg);

  return NextResponse.json({
    ok: true,
    KPIs: {
      companies: companiesCount || 0,
      employees: employeesCount || 0,
      enrolled: enrolledCount,
      enrollment_pct: enrollPct,
      revenue_mtd_cents: revenueMTD,
      revenue_ytd_cents: revenueYTD,
      projection_next_month_cents: projectionNext,
    },
    revenue6,
  });
}
