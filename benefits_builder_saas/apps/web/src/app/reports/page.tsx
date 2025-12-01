// apps/web/src/app/reports/page.tsx
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";
import { computeFeesForPretaxMonthly } from "@/lib/fees";
import { calcFICA } from "@/lib/tax";
import {
  calculateSection125Amount,
  calculateSafeSection125Deduction,
  perPayToMonthly,
  type CompanyTier,
  type FilingStatus,
} from "@/lib/section125";

type CompanyRow = {
  company_id: string;
  company_name: string;
  state: string | null;
  model: string | null;
  tier: string | null;
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
  filing_status: string | null;
  dependents: number;
  gross_pay: number | null;
  pretax_per_pay: number;
  pretax_monthly: number;
  employer_fica_saved_per_pay: number;
  employer_fica_saved_monthly: number;
};

function formatMoney(n: number | null | undefined) {
  const v = typeof n === "number" ? n : 0;
  return `$${v.toFixed(2)}`;
}

function formatPayPeriod(p: string | null | undefined) {
  const map: Record<string, string> = {
    w: "Weekly",
    b: "Biweekly",
    s: "Semimonthly",
    m: "Monthly",
  };
  return map[(p ?? "").toLowerCase()] || p || "-";
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

  // Get companies with tier information
  const { data: companiesData } = await db
    .from("companies")
    .select("id,name,state,model,status,tier,safety_cap_percent")
    .eq("status", "active");

  // Get employees with filing status and dependents for Section 125 calculation
  const { data: emps } = await db
    .from("employees")
    .select("id,company_id,active,pay_period,gross_pay,first_name,last_name,filing_status,dependents,safety_cap_percent")
    .eq("active", true);

  const payMap: Record<string, number> = { w: 52, b: 26, s: 24, m: 12 };
  const ppm = (pp: string | null | undefined) => (payMap[pp ?? "b"] ?? 26) / 12;

  // Build company index with tier info
  const companyById = new Map<string, {
    id: string;
    name: string;
    state: string | null;
    model: string | null;
    tier: string | null;
    status: string | null;
    safety_cap_percent: number | null;
  }>();
  for (const c of companiesData ?? []) {
    companyById.set(c.id, c);
  }

  // Build company summaries
  const byCompany: Record<string, any> = {};
  for (const c of companiesData ?? []) {
    byCompany[c.id] = {
      company_id: c.id,
      company_name: c.name,
      state: c.state,
      model: c.model,
      tier: c.tier,
      status: c.status,
      employees_active: 0,
      pretax_monthly: 0,
      employer_fica_saved_monthly: 0,
    };
  }

  // Calculate PROJECTED Section 125 for each employee
  // This assumes all employees will elect the Section 125 benefit
  const employeeRows: EmployeeRow[] = [];

  for (const e of emps ?? []) {
    const bucket = byCompany[e.company_id];
    const company = companyById.get(e.company_id);
    if (bucket) bucket.employees_active += 1;

    const gross = Number(e.gross_pay ?? 0);
    const payPeriod = e.pay_period || "b";
    const perMonth = ppm(payPeriod);

    // Get company tier (default to 2025 if not set)
    const tier: CompanyTier = (company?.tier as CompanyTier) || "2025";

    // Get filing status (default to single if not set)
    const filingStatus: FilingStatus = (e.filing_status as FilingStatus) || "single";
    const dependents = e.dependents || 0;

    // Get safety cap (employee override > company default > 50%)
    const safetyCapPercent = Number(e.safety_cap_percent ?? company?.safety_cap_percent) || 50;

    // Calculate PROJECTED Section 125 amount (assuming employee elects)
    const projectedPerPay = calculateSafeSection125Deduction(
      tier,
      filingStatus,
      dependents,
      gross,
      payPeriod,
      safetyCapPercent
    );

    const projectedMonthly = perPayToMonthly(projectedPerPay, payPeriod);

    // Calculate employer FICA savings based on PROJECTED Section 125 amount
    const ssRate = Number(fed?.ss_rate || 0.062);
    const medRate = Number(fed?.med_rate || 0.0145);
    const before = calcFICA(gross, 0, ssRate, medRate);
    const after = calcFICA(gross, projectedPerPay, ssRate, medRate);
    const savedPerPay = +(before.fica - after.fica).toFixed(2);
    const savedMonthly = +(savedPerPay * perMonth).toFixed(2);

    if (bucket) {
      bucket.pretax_monthly += projectedMonthly;
      bucket.employer_fica_saved_monthly += savedMonthly;
    }

    employeeRows.push({
      employee_id: e.id,
      company_id: e.company_id,
      company_name: company?.name ?? "",
      first_name: e.first_name,
      last_name: e.last_name,
      active: !!e.active,
      pay_period: payPeriod,
      filing_status: filingStatus,
      dependents: dependents,
      gross_pay: gross,
      pretax_per_pay: +projectedPerPay.toFixed(2),
      pretax_monthly: +projectedMonthly.toFixed(2),
      employer_fica_saved_per_pay: savedPerPay,
      employer_fica_saved_monthly: savedMonthly,
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

  // Calculate totals
  const totalEmployees = employees.length;
  const totalPretaxMonthly = companies.reduce((sum, c) => sum + c.pretax_monthly, 0);
  const totalEmployerFICASaved = companies.reduce((sum, c) => sum + c.employer_fica_saved_monthly, 0);
  const totalEmployeeFees = companies.reduce((sum, c) => sum + c.employee_fee_monthly, 0);
  const totalEmployerFees = companies.reduce((sum, c) => sum + c.employer_fee_monthly, 0);
  const totalEmployerNet = companies.reduce((sum, c) => sum + c.employer_net_monthly, 0);

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-slate-600 mt-1">
            Projected Section 125 savings (assuming all employees elect)
          </p>
        </div>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-2xl font-bold text-blue-600">{totalEmployees}</div>
          <div className="text-sm text-slate-600">Active Employees</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-2xl font-bold text-green-600">{formatMoney(totalPretaxMonthly)}</div>
          <div className="text-sm text-slate-600">Projected Pretax/Mo</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-2xl font-bold text-purple-600">{formatMoney(totalEmployerFICASaved)}</div>
          <div className="text-sm text-slate-600">ER FICA Saved/Mo</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-2xl font-bold text-amber-600">{formatMoney(totalEmployerNet)}</div>
          <div className="text-sm text-slate-600">ER Net Savings/Mo</div>
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
                <th className="text-left p-3">Tier</th>
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
                  <td className="p-3">{c.tier ?? "2025"}</td>
                  <td className="p-3 text-right">{c.employees_active}</td>
                  <td className="p-3 text-right">{formatMoney(c.pretax_monthly)}</td>
                  <td className="p-3 text-right text-green-600 font-medium">
                    {formatMoney(c.employer_fica_saved_monthly)}
                  </td>
                  <td className="p-3 text-right">
                    {formatMoney(c.employee_fee_monthly)}
                  </td>
                  <td className="p-3 text-right">
                    {formatMoney(c.employer_fee_monthly)}
                  </td>
                  <td className="p-3 text-right text-green-600 font-medium">
                    {formatMoney(c.employer_net_monthly)}
                  </td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr>
                  <td className="p-4 text-slate-600" colSpan={10}>
                    No data yet.
                  </td>
                </tr>
              )}
              {companies.length > 0 && (
                <tr className="bg-slate-100 font-semibold border-t-2 border-slate-300">
                  <td className="p-3" colSpan={4}>TOTALS</td>
                  <td className="p-3 text-right">{totalEmployees}</td>
                  <td className="p-3 text-right">{formatMoney(totalPretaxMonthly)}</td>
                  <td className="p-3 text-right text-green-700">{formatMoney(totalEmployerFICASaved)}</td>
                  <td className="p-3 text-right">{formatMoney(totalEmployeeFees)}</td>
                  <td className="p-3 text-right">{formatMoney(totalEmployerFees)}</td>
                  <td className="p-3 text-right text-green-700">{formatMoney(totalEmployerNet)}</td>
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
                <th className="text-left p-3">Pay Period</th>
                <th className="text-left p-3">Filing</th>
                <th className="text-center p-3">Deps</th>
                <th className="text-right p-3">Gross/Pay</th>
                <th className="text-right p-3">Sec 125/Pay</th>
                <th className="text-right p-3">Sec 125/Mo</th>
                <th className="text-right p-3">ER Saved/Mo</th>
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
                  <td className="p-3">{formatPayPeriod(e.pay_period)}</td>
                  <td className="p-3 capitalize">{e.filing_status ?? "-"}</td>
                  <td className="p-3 text-center">{e.dependents}</td>
                  <td className="p-3 text-right">
                    {formatMoney(e.gross_pay ?? 0)}
                  </td>
                  <td className="p-3 text-right text-blue-600 font-medium">
                    {formatMoney(e.pretax_per_pay)}
                  </td>
                  <td className="p-3 text-right text-blue-600 font-medium">
                    {formatMoney(e.pretax_monthly)}
                  </td>
                  <td className="p-3 text-right text-green-600 font-medium">
                    {formatMoney(e.employer_fica_saved_monthly)}
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
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

      {/* Note about projections */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <strong>Note:</strong> These are <strong>projected</strong> savings assuming all active employees elect the Section 125 benefit.
        Actual savings will depend on employee elections. The Section 125 amounts are calculated based on each company's tier
        and each employee's filing status and dependents, capped at the safety percentage of gross pay.
      </div>
    </main>
  );
}
