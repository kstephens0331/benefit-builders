// apps/web/src/app/api/reports/summary.csv/route.ts
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
  const res = await fetch(`${base}/api/reports/summary?period=${encodeURIComponent(period)}`, {
    cache: "no-store",
  });
  const json = await res.json();

  if (!json?.ok) {
    return NextResponse.json({ ok: false, error: json?.error ?? "Summary failed" }, { status: 500 });
  }

  const rows: Array<{
    company_id: string;
    company_name: string;
    state: string | null;
    model: string | null;
    status: string | null;
    employees_active: number;
    pretax_monthly: number;
    employer_fica_saved_monthly: number;
    employee_fee_monthly: number;
    employer_fee_monthly: number;
    employer_net_monthly: number;
  }> = json.data ?? [];

  const header = [
    "company_id",
    "company_name",
    "state",
    "model",
    "status",
    "employees_active",
    "pretax_monthly",
    "employer_fica_saved_monthly",
    "employee_fee_monthly",
    "employer_fee_monthly",
    "employer_net_monthly",
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
            r.state ?? "",
            r.model ?? "",
            r.status ?? "",
            r.employees_active,
            r.pretax_monthly,
            r.employer_fica_saved_monthly,
            r.employee_fee_monthly,
            r.employer_fee_monthly,
            r.employer_net_monthly,
          ]
            .map(esc)
            .join(",")
        )
      )
      .join("\r\n");

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="companies_${period}.csv"`,
    },
  });
}
