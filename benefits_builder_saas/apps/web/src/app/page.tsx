// src/app/page.tsx
import Link from "next/link";

type Summary = {
  ok: boolean;
  KPIs: {
    companies: number;
    employees: number;
    enrolled: number;
    enrollment_pct: number;
    revenue_mtd_cents: number;
    revenue_ytd_cents: number;
    projection_next_month_cents: number;
  };
  revenue6: Array<{ period: string; total_cents: number }>;
};

function usd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
    .format((cents || 0) / 100);
}

async function fetchSummary(): Promise<Summary> {
  try {
    const res = await fetch("/api/analytics/summary", { cache: "no-store" });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  } catch {
    return {
      ok: false,
      KPIs: {
        companies: 0,
        employees: 0,
        enrolled: 0,
        enrollment_pct: 0,
        revenue_mtd_cents: 0,
        revenue_ytd_cents: 0,
        projection_next_month_cents: 0,
      },
      revenue6: [],
    };
  }
}

export default async function DashboardPage() {
  const data = await fetchSummary();
  const k = data.KPIs;
  const trend = data.revenue6;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="text-sm text-slate-500">Live overview</div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="p-4 bg-white rounded-2xl shadow">
          <div className="text-slate-500 text-sm">Companies</div>
          <div className="text-2xl font-semibold">{k.companies}</div>
        </div>
        <div className="p-4 bg-white rounded-2xl shadow">
          <div className="text-slate-500 text-sm">Employees (active)</div>
          <div className="text-2xl font-semibold">{k.employees}</div>
          <div className="text-xs text-slate-500 mt-1">
            {k.enrolled} enrolled ({k.enrollment_pct}%)
          </div>
        </div>
        <div className="p-4 bg-white rounded-2xl shadow">
          <div className="text-slate-500 text-sm">Revenue MTD</div>
          <div className="text-2xl font-semibold">{usd(k.revenue_mtd_cents)}</div>
          <div className="text-xs text-slate-500 mt-1">
            YTD {usd(k.revenue_ytd_cents)}
          </div>
        </div>
        <div className="p-4 bg-white rounded-2xl shadow">
          <div className="text-slate-500 text-sm">Projection (next month)</div>
          <div className="text-2xl font-semibold">
            {usd(k.projection_next_month_cents)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Simple average of recent months
          </div>
        </div>
      </div>

      <div className="p-4 bg-white rounded-2xl shadow">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Revenue — last 6 months</h2>
          <Link href="/admin/billing" className="text-sm underline">
            Open Billing
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {trend.map((t) => (
            <div key={t.period} className="rounded-lg border p-3">
              <div className="text-xs text-slate-500">{t.period}</div>
              <div className="font-medium">{usd(t.total_cents)}</div>
            </div>
          ))}
          {!trend.length && (
            <div className="text-slate-500 text-sm">No invoice data yet.</div>
          )}
        </div>
      </div>
    </section>
  );
}
