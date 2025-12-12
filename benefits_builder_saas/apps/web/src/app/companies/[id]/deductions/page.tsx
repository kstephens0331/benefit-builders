// apps/web/src/app/companies/[id]/deductions/page.tsx
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";
import {
  calculateSafeSection125Deduction,
  perPayToMonthly,
  type CompanyTier,
  type FilingStatus,
  type CustomSection125Amounts,
} from "@/lib/section125";

type Params = { params: Promise<{ id: string }> };

const PAY_PERIODS_PER_YEAR: Record<string, number> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
  w: 52,
  b: 26,
  s: 24,
  m: 12,
};

// Helper to convert pay_frequency to code
function getPayPeriodCode(payFrequency: string | null | undefined): string {
  const freq = (payFrequency || "").toLowerCase();
  if (freq === "weekly" || freq === "w") return "w";
  if (freq === "biweekly" || freq === "bi-weekly" || freq === "b") return "b";
  if (freq === "semimonthly" || freq === "semi-monthly" || freq === "s") return "s";
  if (freq === "monthly" || freq === "m") return "m";
  return "b";
}

export default async function CompanyDeductionsPage({ params }: Params) {
  const { id: companyId } = await params;
  const db = createServiceClient();

  // Fetch company data with tier and custom sec125 amounts
  const { data: company, error: cErr } = await db
    .from("companies")
    .select("id, name, state, model, status, employer_rate, employee_rate, pay_frequency, tier, safety_cap_percent, sec125_single_0, sec125_married_0, sec125_single_deps, sec125_married_deps")
    .eq("id", companyId)
    .single();

  if (cErr || !company) {
    return (
      <main className="max-w-7xl mx-auto p-6">
        <pre className="text-red-600">{cErr?.message ?? "Company not found"}</pre>
      </main>
    );
  }

  // Fetch ENROLLED employees only (consent_status = 'elect')
  const { data: employees, error: eErr } = await db
    .from("employees")
    .select("id, first_name, last_name, gross_pay, pay_period, filing_status, dependents, active, safety_cap_percent, consent_status")
    .eq("company_id", companyId)
    .eq("active", true)
    .eq("consent_status", "elect")
    .order("last_name");

  if (eErr) {
    return (
      <main className="max-w-7xl mx-auto p-6">
        <pre className="text-red-600">{eErr.message}</pre>
      </main>
    );
  }

  const employerRate = Number(company.employer_rate) || 0;
  const employeeRate = Number(company.employee_rate) || 0;
  const ficaRate = 0.0765; // 7.65%
  const companyPayPeriod = getPayPeriodCode(company.pay_frequency);
  const payPeriodsPerYear = PAY_PERIODS_PER_YEAR[companyPayPeriod] || 26;
  const tier: CompanyTier = (company.tier as CompanyTier) || "2025";
  const companySafetyCapPercent = Number(company.safety_cap_percent) || 50;

  // Build custom Section 125 amounts from company settings (for any model)
  const customAmounts: CustomSection125Amounts | undefined = (
    company.sec125_single_0 !== null ||
    company.sec125_married_0 !== null ||
    company.sec125_single_deps !== null ||
    company.sec125_married_deps !== null
  ) ? {
    sec125_single_0: company.sec125_single_0 ? Number(company.sec125_single_0) : undefined,
    sec125_married_0: company.sec125_married_0 ? Number(company.sec125_married_0) : undefined,
    sec125_single_deps: company.sec125_single_deps ? Number(company.sec125_single_deps) : undefined,
    sec125_married_deps: company.sec125_married_deps ? Number(company.sec125_married_deps) : undefined,
  } : undefined;

  // Calculate Section 125 for each employee
  type EmployeeWithCalcs = {
    id: string;
    name: string;
    gross_pay: number;
    section_125_per_pay: number;
    employer_fica_savings: number;
    employer_fee: number;
    employer_net_savings: number;
    employee_fee: number;
  };

  const employeesWithCalcs: EmployeeWithCalcs[] = (employees || []).map((emp: any) => {
    const gross = Number(emp.gross_pay) || 0;
    const payPeriod = emp.pay_period || companyPayPeriod;
    const filingStatus: FilingStatus = (emp.filing_status as FilingStatus) || "single";
    const dependents = Number(emp.dependents) || 0;
    const safetyCapPercent = Number(emp.safety_cap_percent ?? companySafetyCapPercent) || 50;

    // Calculate Section 125 amount using the same logic as BenefitsCalculator
    const section125PerPay = calculateSafeSection125Deduction(
      tier,
      filingStatus,
      dependents,
      gross,
      payPeriod,
      safetyCapPercent,
      customAmounts // Custom amounts from company settings
    );

    const employer_fica_savings = section125PerPay * ficaRate;
    const employer_fee = section125PerPay * (employerRate / 100);
    const employee_fee = section125PerPay * (employeeRate / 100);
    const employer_net_savings = employer_fica_savings - employer_fee;

    return {
      id: emp.id,
      name: `${emp.last_name}, ${emp.first_name}`,
      gross_pay: gross,
      section_125_per_pay: +section125PerPay.toFixed(2),
      employer_fica_savings: +employer_fica_savings.toFixed(2),
      employer_fee: +employer_fee.toFixed(2),
      employer_net_savings: +employer_net_savings.toFixed(2),
      employee_fee: +employee_fee.toFixed(2),
    };
  });

  // Company totals (per pay period)
  const companyTotals = employeesWithCalcs.reduce(
    (acc, emp) => ({
      section_125_per_pay: acc.section_125_per_pay + emp.section_125_per_pay,
      employer_fica_savings: acc.employer_fica_savings + emp.employer_fica_savings,
      employer_fee: acc.employer_fee + emp.employer_fee,
      employer_net_savings: acc.employer_net_savings + emp.employer_net_savings,
      employee_fee: acc.employee_fee + emp.employee_fee,
    }),
    {
      section_125_per_pay: 0,
      employer_fica_savings: 0,
      employer_fee: 0,
      employer_net_savings: 0,
      employee_fee: 0,
    }
  );

  // Annual projections
  const annualTotals = {
    section_125_per_pay: companyTotals.section_125_per_pay * payPeriodsPerYear,
    employer_fica_savings: companyTotals.employer_fica_savings * payPeriodsPerYear,
    employer_fee: companyTotals.employer_fee * payPeriodsPerYear,
    employer_net_savings: companyTotals.employer_net_savings * payPeriodsPerYear,
    employee_fee: companyTotals.employee_fee * payPeriodsPerYear,
  };

  // Count employees with benefits
  const employeesWithBenefits = employeesWithCalcs.filter((e) => e.section_125_per_pay > 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{company.name}</h1>
          <p className="text-slate-600 text-sm mt-1">
            Deduction Summary · {company.state} · Model {company.model} ({employeeRate}% Employee / {employerRate}% Employer)
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/companies/${companyId}`}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium text-sm"
          >
            ← Back to Company
          </Link>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow-lg">
          <div className="text-sm opacity-90 mb-2">Employees with Benefits</div>
          <div className="text-4xl font-bold">{employeesWithBenefits.length}</div>
          <div className="text-xs opacity-75 mt-2">out of {employeesWithCalcs.length} active</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-2xl shadow-lg">
          <div className="text-sm opacity-90 mb-2">Per Pay Period</div>
          <div className="text-4xl font-bold">{formatCurrency(companyTotals.section_125_per_pay)}</div>
          <div className="text-xs opacity-75 mt-2">Section 125 Deductions</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-6 rounded-2xl shadow-lg">
          <div className="text-sm opacity-90 mb-2">ER Net Savings (Per Pay)</div>
          <div className="text-4xl font-bold">{formatCurrency(companyTotals.employer_net_savings)}</div>
          <div className="text-xs opacity-75 mt-2">After {employerRate}% fee</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-2xl shadow-lg">
          <div className="text-sm opacity-90 mb-2">Annual ER Savings</div>
          <div className="text-4xl font-bold">{formatCurrency(annualTotals.employer_net_savings)}</div>
          <div className="text-xs opacity-75 mt-2">{payPeriodsPerYear} pay periods/year</div>
        </div>
      </div>

      {/* Detailed Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Per Pay Period */}
        <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-blue-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Per Pay Period Breakdown</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-slate-600">Section 125 Deductions</span>
              <span className="font-bold text-lg">{formatCurrency(companyTotals.section_125_per_pay)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-slate-600">Employer FICA Savings (7.65%)</span>
              <span className="font-bold text-lg text-green-600">+{formatCurrency(companyTotals.employer_fica_savings)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-slate-600">Employer Fee ({employerRate}%)</span>
              <span className="font-semibold text-red-600">-{formatCurrency(companyTotals.employer_fee)}</span>
            </div>
            <div className="flex justify-between items-center py-3 bg-green-50 -mx-6 px-6 rounded-b-xl border-t-2 border-green-200">
              <span className="font-bold text-slate-800">Employer Net Savings</span>
              <span className="font-bold text-2xl text-green-700">{formatCurrency(companyTotals.employer_net_savings)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t mt-3">
              <span className="text-slate-600">Employee Fees ({employeeRate}%)</span>
              <span className="font-semibold">{formatCurrency(companyTotals.employee_fee)}</span>
            </div>
          </div>
        </div>

        {/* Annual Projection */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-6 rounded-2xl shadow-lg border-2 border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Annual Projection ({payPeriodsPerYear} periods)</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-300">
              <span className="text-slate-600">Annual Section 125 Deductions</span>
              <span className="font-bold text-lg">{formatCurrency(annualTotals.section_125_per_pay)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-300">
              <span className="text-slate-600">Annual ER FICA Savings</span>
              <span className="font-bold text-lg text-green-600">+{formatCurrency(annualTotals.employer_fica_savings)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-300">
              <span className="text-slate-600">Annual ER Fees</span>
              <span className="font-semibold text-red-600">-{formatCurrency(annualTotals.employer_fee)}</span>
            </div>
            <div className="flex justify-between items-center py-3 bg-gradient-to-r from-green-100 to-emerald-100 -mx-6 px-6 rounded-b-xl border-t-2 border-green-300">
              <span className="font-bold text-slate-800">Annual ER Net Savings</span>
              <span className="font-bold text-3xl text-green-700">{formatCurrency(annualTotals.employer_net_savings)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-slate-300 mt-3">
              <span className="text-slate-600">Annual EE Fees</span>
              <span className="font-semibold">{formatCurrency(annualTotals.employee_fee)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Employee Details Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border">
        <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b">
          <h2 className="font-bold text-lg text-slate-800">Employee Benefit Details</h2>
          <p className="text-sm text-slate-600 mt-1">Per pay period breakdown by employee</p>
        </div>

        {employeesWithCalcs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100 text-sm border-b-2">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-slate-700">Employee</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-700">Gross Pay</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-700">Section 125</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-700">ER FICA Savings</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-700">ER Fee</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-700">ER Net Savings</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-700">EE Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {employeesWithCalcs.map((emp) => (
                  <tr key={emp.id} className="hover:bg-blue-50 transition">
                    <td className="px-4 py-3">
                      <Link
                        href={`/companies/${companyId}/employees/${emp.id}`}
                        className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {emp.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatCurrency(emp.gross_pay)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {formatCurrency(emp.section_125_per_pay)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-green-700">
                      {formatCurrency(emp.employer_fica_savings)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatCurrency(emp.employer_fee)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-green-700">
                      {formatCurrency(emp.employer_net_savings)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatCurrency(emp.employee_fee)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2">
                <tr>
                  <td className="px-4 py-4 text-slate-800" colSpan={2}>
                    <div className="font-bold text-lg">TOTALS</div>
                    <div className="text-xs font-normal text-slate-600">{employeesWithBenefits.length} employees enrolled</div>
                  </td>
                  <td className="px-4 py-4 text-right text-slate-900">
                    {formatCurrency(companyTotals.section_125_per_pay)}
                  </td>
                  <td className="px-4 py-4 text-right text-green-700">
                    {formatCurrency(companyTotals.employer_fica_savings)}
                  </td>
                  <td className="px-4 py-4 text-right text-slate-700">
                    {formatCurrency(companyTotals.employer_fee)}
                  </td>
                  <td className="px-4 py-4 text-right text-green-700 text-lg">
                    {formatCurrency(companyTotals.employer_net_savings)}
                  </td>
                  <td className="px-4 py-4 text-right text-slate-700">
                    {formatCurrency(companyTotals.employee_fee)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <p className="text-lg font-medium">No enrolled employees</p>
            <p className="text-sm mt-2">Employees must elect to participate in the Section 125 program</p>
          </div>
        )}
      </div>
    </main>
  );
}
