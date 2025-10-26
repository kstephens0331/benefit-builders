// apps/web/src/app/companies/[id]/deductions/page.tsx
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

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

  // Company totals
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

  // Count employees with benefits
  const employeesWithBenefits = employeesWithCalcs.filter((e) => e.total_deductions > 0);

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{company.name} - Deduction Summary</h1>
          <p className="text-slate-600 text-sm">
            {company.state} · Model {company.model} ({employeeRate}% Employee / {employerRate}% Employer) · {company.pay_frequency}
          </p>
        </div>
        <Link
          href={`/companies/${companyId}`}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium"
        >
          ← Back to Company
        </Link>
      </div>

      {/* Summary Totals Card */}
      <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg border border-blue-100">
        <h2 className="text-xl font-bold mb-4 text-slate-800">Company Totals (Per Pay Period)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="text-xs text-slate-600 mb-1">Employees with Benefits</div>
            <div className="text-2xl font-bold text-slate-800">{employeesWithBenefits.length}</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="text-xs text-slate-600 mb-1">Total Deductions</div>
            <div className="text-2xl font-bold text-blue-600">${companyTotals.total_deductions.toFixed(2)}</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="text-xs text-slate-600 mb-1">Employer FICA Savings</div>
            <div className="text-2xl font-bold text-green-600">${companyTotals.employer_fica_savings.toFixed(2)}</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="text-xs text-slate-600 mb-1">Employer Net Savings</div>
            <div className="text-2xl font-bold text-green-700">${companyTotals.employer_net_savings.toFixed(2)}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="text-xs text-slate-600 mb-1">Employer Fee ({employerRate}%)</div>
            <div className="text-xl font-semibold text-slate-700">${companyTotals.employer_fee.toFixed(2)}</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="text-xs text-slate-600 mb-1">Employee Fees ({employeeRate}%)</div>
            <div className="text-xl font-semibold text-slate-700">${companyTotals.employee_fee.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Employee Details Table */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="p-4 bg-slate-50 border-b">
          <h2 className="font-semibold text-lg">Employee Benefit Details</h2>
        </div>

        {employeesWithCalcs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100 text-sm">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Employee</th>
                  <th className="px-4 py-3 text-left font-semibold">Benefits</th>
                  <th className="px-4 py-3 text-right font-semibold">Total Deductions</th>
                  <th className="px-4 py-3 text-right font-semibold">ER FICA Savings</th>
                  <th className="px-4 py-3 text-right font-semibold">ER Fee</th>
                  <th className="px-4 py-3 text-right font-semibold">ER Net Savings</th>
                  <th className="px-4 py-3 text-right font-semibold">EE Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {employeesWithCalcs.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/companies/${companyId}/employees/${emp.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {emp.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {emp.benefits.length > 0 ? (
                        <div className="text-sm space-y-1">
                          {emp.benefits.map((b, idx) => (
                            <div key={idx} className="flex justify-between gap-4">
                              <span className="text-slate-600">{b.plan_code}</span>
                              <span className="font-medium">${b.per_pay_amount.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">No benefits</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      ${emp.total_deductions.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-green-700">
                      ${emp.employer_fica_savings.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      ${emp.employer_fee.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-green-700">
                      ${emp.employer_net_savings.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      ${emp.employee_fee.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-bold">
                <tr>
                  <td className="px-4 py-3" colSpan={2}>
                    TOTALS ({employeesWithBenefits.length} employees with benefits)
                  </td>
                  <td className="px-4 py-3 text-right">
                    ${companyTotals.total_deductions.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-green-700">
                    ${companyTotals.employer_fica_savings.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    ${companyTotals.employer_fee.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-green-700">
                    ${companyTotals.employer_net_savings.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    ${companyTotals.employee_fee.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <p className="text-lg">No active employees</p>
          </div>
        )}
      </div>
    </main>
  );
}
