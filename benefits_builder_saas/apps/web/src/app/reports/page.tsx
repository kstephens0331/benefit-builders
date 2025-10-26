// apps/web/src/app/reports/page.tsx
import Link from "next/link";

// Use VERCEL_URL in production or localhost in development
const BASE =
  process.env.NEXT_PUBLIC_BASE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3002");

type CompanyRow = {
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
};

type EmployeeRow = {
  company_id: string;
  company_name: string;
  first_name: string;
  last_name: string;
  active: boolean;
  pay_period: string | null;
  paycheck_gross: number | null;
  pretax_per_pay: number;
  pretax_monthly: number;
};

function formatMoney(n: number | null | undefined) {
  const v = typeof n === "number" ? n : 0;
  return `$${v.toFixed(2)}`;
}

export default async function ReportsPage() {
  // default period (YYYY-MM)
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // fetch summary + employees (server-side)
  const [summaryRes, employeesRes] = await Promise.all([
    fetch(`${BASE}/api/reports/summary?period=${period}`, { cache: "no-store" }).then((r) =>
      r.json()
    ),
    fetch(`${BASE}/api/reports/employees?period=${period}`, { cache: "no-store" }).then((r) =>
      r.json()
    ),
  ]);

  const companies: CompanyRow[] = summaryRes?.data ?? [];
  const employees: EmployeeRow[] = employeesRes?.data ?? [];

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
        <div className="flex gap-2">
          <a
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white"
            href={`/api/reports/pdf?period=${period}`}
            target="_blank"
          >
            Download All-Companies PDF
          </a>
          <a
            className="px-4 py-2 rounded-xl border"
            href={`/api/reports/summary?period=${period}`}
            target="_blank"
          >
            JSON (Companies)
          </a>
          <a
            className="px-4 py-2 rounded-xl border"
            href={`/api/reports/employees?period=${period}`}
            target="_blank"
          >
            JSON (Employees)
          </a>
          <a
  className="px-4 py-2 rounded-xl border"
  href={`/api/reports/summary.csv?period=${period}`}
  target="_blank"
>
  CSV (Companies)
</a>
<a
  className="px-4 py-2 rounded-xl border"
  href={`/api/reports/employees.csv?period=${period}`}
  target="_blank"
>
  CSV (Employees)
</a>
        </div>
      </div>

      {/* Companies summary */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Companies — {period}</h2>
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left p-3">Company</th>
                <th className="text-left p-3">State</th>
                <th className="text-left p-3">Model</th>
                <th className="text-right p-3">Active Emps</th>
                <th className="text-right p-3">Pretax (mo)</th>
                <th className="text-right p-3">ER FICA Saved (mo)</th>
                <th className="text-right p-3">EE Fees (mo)</th>
                <th className="text-right p-3">ER Fees (mo)</th>
                <th className="text-right p-3">ER Net (mo)</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.company_id} className="border-t">
                  <td className="p-3">
                    <Link
                      className="underline underline-offset-2"
                      href={`/companies/${c.company_id}`}
                    >
                      {c.company_name}
                    </Link>
                  </td>
                  <td className="p-3">{c.state ?? "-"}</td>
                  <td className="p-3">{c.model ?? "-"}</td>
                  <td className="p-3 text-right">{c.employees_active}</td>
                  <td className="p-3 text-right">{formatMoney(c.pretax_monthly)}</td>
                  <td className="p-3 text-right">
                    {formatMoney(c.employer_fica_saved_monthly)}
                  </td>
                  <td className="p-3 text-right">
                    {formatMoney(c.employee_fee_monthly)}
                  </td>
                  <td className="p-3 text-right">
                    {formatMoney(c.employer_fee_monthly)}
                  </td>
                  <td className="p-3 text-right">
                    {formatMoney(c.employer_net_monthly)}
                  </td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr>
                  <td className="p-4 text-slate-600" colSpan={9}>
                    No data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Employee enrollment */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Employees — {period}</h2>
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left p-3">Company</th>
                <th className="text-left p-3">Employee</th>
                <th className="text-left p-3">Active</th>
                <th className="text-left p-3">Pay Period</th>
                <th className="text-right p-3">Gross/Pay</th>
                <th className="text-right p-3">Pretax / Pay</th>
                <th className="text-right p-3">Pretax / Mo</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e, idx) => (
                <tr key={`${e.company_id}-${idx}`} className="border-t">
                  <td className="p-3">{e.company_name}</td>
                  <td className="p-3">
                    {e.last_name}, {e.first_name}
                  </td>
                  <td className="p-3">{e.active ? "Yes" : "No"}</td>
                  <td className="p-3">{e.pay_period ?? "-"}</td>
                  <td className="p-3 text-right">
                    {formatMoney(e.paycheck_gross ?? 0)}
                  </td>
                  <td className="p-3 text-right">{formatMoney(e.pretax_per_pay)}</td>
                  <td className="p-3 text-right">{formatMoney(e.pretax_monthly)}</td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td className="p-4 text-slate-600" colSpan={7}>
                    No data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
