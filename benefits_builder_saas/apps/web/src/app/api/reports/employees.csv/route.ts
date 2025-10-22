// apps/web/src/app/api/reports/employees.csv/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const period =
    url.searchParams.get("period") ??
    (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    })();

  const base = (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3002").replace(/\/$/, "");
  const res = await fetch(`${base}/api/reports/employees?period=${encodeURIComponent(period)}`, {
    cache: "no-store",
  });
  const json = await res.json();

  if (!json?.ok) {
    return NextResponse.json({ ok: false, error: json?.error ?? "Employees failed" }, { status: 500 });
  }

  const rows: Array<{
    company_id: string;
    company_name: string;
    first_name: string;
    last_name: string;
    active: boolean;
    pay_period: string | null;
    paycheck_gross: number | null;
    pretax_per_pay: number;
    pretax_monthly: number;
  }> = json.data ?? [];

  const header = [
    "company_id",
    "company_name",
    "last_name",
    "first_name",
    "active",
    "pay_period",
    "paycheck_gross",
    "pretax_per_pay",
    "pretax_monthly",
  ];

  const esc = (v: unknown) =>
    `"${String(v ?? "").replaceAll(`"`, `""`)}"`;

  const csv =
    [header.join(",")]
      .concat(
        rows.map((r) =>
          [
            r.company_id,
            r.company_name,
            r.last_name,
            r.first_name,
            r.active ? "Yes" : "No",
            r.pay_period ?? "",
            r.paycheck_gross ?? 0,
            r.pretax_per_pay,
            r.pretax_monthly,
          ]
            .map(esc)
            .join(",")
        )
      )
      .join("\r\n");

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="employees_${period}.csv"`,
    },
  });
}
