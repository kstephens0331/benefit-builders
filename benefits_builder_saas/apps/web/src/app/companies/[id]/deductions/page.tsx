// apps/web/src/app/companies/[id]/deductions/page.tsx
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

const PAY_PERIODS_PER_YEAR: Record<string, number> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};

export default async function CompanyDeductionsPage({ params }: Params) {
  const { id: companyId } = await params;
  const db = createServiceClient();

  // Fetch company data
  const { data: company, error: cErr } = await db
    .from("companies")
    .select("id, name, state, model, status, employer_rate, employee_rate, pay_frequency")
    .eq("id", companyId)
    .single();

  if (cErr || !company) {
    return (
      <main className="max-w-7xl mx-auto p-6">
        <pre className="text-red-600">{cErr?.message ?? "Company not found"}</pre>
      </main>
    );
  }

  // Fetch all employees with their benefits
  const { data: employees, error: eErr } = await db
    .from("employees")
    .select(`
      id,
      first_name,
      last_name,
      gross_pay,
      active,
      employee_benefits (
        id,
        plan_code,
        per_pay_amount,
        reduces_fit,
        reduces_fica
      )
    `)
    .eq("company_id", companyId)
    .eq("active", true)
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
  const payPeriodsPerYear = PAY_PERIODS_PER_YEAR[company.pay_frequency] || 26;

  // Calculate totals for each employee
  type EmployeeWithCalcs = {
    id: string;
    name: string;
    gross_pay: number;
    benefits: Array<{ plan_code: string; per_pay_amount: number }>;
    total_deductions: number;
    employer_fica_savings: number;
    employer_fee: number;
    employer_net_savings: number;
    employee_fee: number;
  };

  const employeesWithCalcs: EmployeeWithCalcs[] = (employees || []).map((emp: any) => {
    const benefits = emp.employee_benefits || [];
    const total_deductions = benefits.reduce(
      (sum: number, b: any) => sum + (Number(b.per_pay_amount) || 0),
      0
    );

    const employer_fica_savings = total_deductions * ficaRate;
    const employer_fee = total_deductions * (employerRate / 100);
    const employee_fee = total_deductions * (employeeRate / 100);
    const employer_net_savings = employer_fica_savings - employer_fee;

    return {
      id: emp.id,
      name: `${emp.last_name}, ${emp.first_name}`,
      gross_pay: Number(emp.gross_pay) || 0,
      benefits: benefits.map((b: any) => ({
        plan_code: b.plan_code,
        per_pay_amount: Number(b.per_pay_amount) || 0,
      })),
      total_deductions,
      employer_fica_savings,
      employer_fee,
      employer_net_savings,
      employee_fee,
    };
  });

  // Company totals (per pay period)
  const companyTotals = employeesWithCalcs.reduce(
    (acc, emp) => ({
      total_deductions: acc.total_deductions + emp.total_deductions,
      employer_fica_savings: acc.employer_fica_savings + emp.employer_fica_savings,
      employer_fee: acc.employer_fee + emp.employer_fee,
      employer_net_savings: acc.employer_net_savings + emp.employer_net_savings,
      employee_fee: acc.employee_fee + emp.employee_fee,
    }),
    {
      total_deductions: 0,
      employer_fica_savings: 0,
      employer_fee: 0,
      employer_net_savings: 0,
      employee_fee: 0,
    }
  );

  // Annual projections
  const annualTotals = {
    total_deductions: companyTotals.total_deductions * payPeriodsPerYear,
    employer_fica_savings: companyTotals.employer_fica_savings * payPeriodsPerYear,
    employer_fee: companyTotals.employer_fee * payPeriodsPerYear,
    employer_net_savings: companyTotals.employer_net_savings * payPeriodsPerYear,
    employee_fee: companyTotals.employee_fee * payPeriodsPerYear,
  };

  // Count employees with benefits
  const employeesWithBenefits = employeesWithCalcs.filter((e) => e.total_deductions > 0);

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
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium text-sm"
          >
            🖨️ Print
          </button>
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

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-2xl shadow-lg">
          <div className="text-sm opacity-90 mb-2">Per Pay Period</div>
          <div className="text-4xl font-bold">{formatCurrency(companyTotals.total_deductions)}</div>
          <div className="text-xs opacity-75 mt-2">Total Deductions</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-6 rounded-2xl shadow-lg">
          <div className="text-sm opacity-90 mb-2">ER Net Savings (Per Pay)</div>
          <div className="text-4xl font-bold">{formatCurrency(companyTotals.employer_net_savings)}</div>
          <div className="text-xs opacity-75 mt-2">After {employerRate}% fee</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-2xl shadow-lg">
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
              <span className="text-slate-600">Total Pre-Tax Deductions</span>
              <span className="font-bold text-lg">{formatCurrency(companyTotals.total_deductions)}</span>
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
              <span className="text-slate-600">Total Annual Deductions</span>
              <span className="font-bold text-lg">{formatCurrency(annualTotals.total_deductions)}</span>
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
                  <th className="px-4 py-3 text-left font-bold text-slate-700">Benefits</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-700">Total Deductions</th>
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
                    <td className="px-4 py-3">
                      {emp.benefits.length > 0 ? (
                        <div className="text-sm space-y-1">
                          {emp.benefits.map((b, idx) => (
                            <div key={idx} className="flex justify-between gap-4">
                              <span className="text-slate-700 font-medium">{b.plan_code}</span>
                              <span className="text-slate-900 font-semibold">{formatCurrency(b.per_pay_amount)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm italic">No benefits</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {formatCurrency(emp.total_deductions)}
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
                    <div className="text-xs font-normal text-slate-600">{employeesWithBenefits.length} employees with benefits</div>
                  </td>
                  <td className="px-4 py-4 text-right text-slate-900">
                    {formatCurrency(companyTotals.total_deductions)}
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
            <p className="text-lg font-medium">No active employees</p>
            <p className="text-sm mt-2">Add employees to see deduction details</p>
          </div>
        )}
      </div>

      {/* Print-only styles */}
      <style jsx global>{`
        @media print {
          nav, button, .no-print {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
        }
      `}</style>
    </main>
  );
}
