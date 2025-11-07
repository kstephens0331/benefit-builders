// apps/web/src/app/reports/page.tsx
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";
import { computeFeesForPretaxMonthly } from "@/lib/fees";
import { calcFICA } from "@/lib/tax";

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
  employee_id: string;
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
  const db = createServiceClient();
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [yearStr] = period.split("-");
  const taxYear = Number(yearStr) || now.getFullYear();

  // Fetch data directly instead of HTTP calls
  // Get federal tax rates
  const { data: fed } = await db
    .from("tax_federal_params")
    .select("ss_rate, med_rate")
    .eq("tax_year", taxYear)
    .single();

  // Get companies
  const { data: companiesData } = await db
    .from("companies")
    .select("id,name,state,model,status")
    .eq("status", "active");

  // Get employees
  const { data: emps } = await db
    .from("employees")
    .select("id,company_id,active,pay_period,paycheck_gross,first_name,last_name")
    .eq("active", true);

  // Get benefits
  const { data: bens } = await db
    .from("employee_benefits")
    .select("employee_id, per_pay_amount, reduces_fica");

  const payMap: Record<string, number> = { w: 52, b: 26, s: 24, m: 12 };
  const ppm = (pp: string | null | undefined) => (payMap[pp ?? "b"] ?? 26) / 12;

  // Build company summaries
  const byCompany: Record<string, any> = {};
  for (const c of companiesData ?? []) {
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

  // Index benefits by employee
  const benByEmp = new Map<string, { perPay: number; reducesFICA: boolean }>();
  for (const b of bens ?? []) {
    const key = String(b.employee_id);
    const prev = benByEmp.get(key) ?? { perPay: 0, reducesFICA: true };
    prev.perPay += Number(b.per_pay_amount ?? 0);
    prev.reducesFICA = prev.reducesFICA && !!b.reduces_fica;
    benByEmp.set(key, prev);
  }

  // Calculate for each employee
  const employeeRows: EmployeeRow[] = [];
  const nameById = new Map<string, string>();
  for (const c of companiesData ?? []) nameById.set(c.id, c.name);

  for (const e of emps ?? []) {
    const bucket = byCompany[e.company_id];
    if (bucket) bucket.employees_active += 1;

    const perPayPretax = benByEmp.get(e.id)?.perPay ?? 0;
    const perMonth = ppm(e.pay_period);

    if (bucket) {
      bucket.pretax_monthly += perPayPretax * perMonth;

      // Calculate employer FICA savings
      const gross = Number(e.paycheck_gross ?? 0);
      const before = calcFICA(gross, 0, Number(fed?.ss_rate || 0.062), Number(fed?.med_rate || 0.0145));
      const after = calcFICA(gross, perPayPretax, Number(fed?.ss_rate || 0.062), Number(fed?.med_rate || 0.0145));
      const savedPerPay = +(before.fica - after.fica).toFixed(2);
      bucket.employer_fica_saved_monthly += savedPerPay * perMonth;
    }

    employeeRows.push({
      employee_id: e.id,
      company_id: e.company_id,
      company_name: nameById.get(e.company_id) ?? "",
      first_name: e.first_name,
      last_name: e.last_name,
      active: !!e.active,
      pay_period: e.pay_period,
      paycheck_gross: e.paycheck_gross ? Number(e.paycheck_gross) : 0,
      pretax_per_pay: +perPayPretax.toFixed(2),
      pretax_monthly: +(perPayPretax * perMonth).toFixed(2),
    });
  }

  // Finalize company rows with fees
  const companies: CompanyRow[] = Object.values(byCompany).map((r: any) => {
    const fees = computeFeesForPretaxMonthly(+r.pretax_monthly.toFixed(2), r.model);
    const employer_net = +(+r.employer_fica_saved_monthly.toFixed(2) - fees.employerFeeMonthly).toFixed(2);
    return {
      ...r,
      pretax_monthly: +r.pretax_monthly.toFixed(2),
      employer_fica_saved_monthly: +r.employer_fica_saved_monthly.toFixed(2),
      employee_fee_monthly: fees.employeeFeeMonthly,
      employer_fee_monthly: fees.employerFeeMonthly,
      employer_net_monthly: employer_net,
    };
  });

  const employees: EmployeeRow[] = employeeRows;

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
        <div className="flex gap-3">
          <a
            className="px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 transition flex items-center gap-2"
            href={`/api/reports/excel?period=${period}`}
            download
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Excel
          </a>
          <a
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition flex items-center gap-2"
            href={`/api/reports/pdf?period=${period}`}
            target="_blank"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Download PDF
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
                    <Link
                      className="underline underline-offset-2 hover:text-blue-600"
                      href={`/companies/${e.company_id}/employees/${e.employee_id}`}
                    >
                      {e.last_name}, {e.first_name}
                    </Link>
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
