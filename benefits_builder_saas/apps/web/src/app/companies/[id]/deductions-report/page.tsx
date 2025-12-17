// src/app/companies/[id]/deductions-report/page.tsx
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";

// Helper to parse plan_code into provider and category
function parsePlanCode(planCode: string): { provider: string; category: string } {
  if (planCode.includes(" - ")) {
    const [provider, ...rest] = planCode.split(" - ");
    return { provider: provider.trim(), category: rest.join(" - ").trim() };
  }
  return { provider: planCode, category: "-" };
}

type EmployeeBenefit = {
  id: string;
  plan_code: string;
  per_pay_amount: number;
};

type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  employee_benefits: EmployeeBenefit[];
};

export default async function DeductionReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: companyId } = await params;
  const db = createServiceClient();

  // Get company info
  const { data: company } = await db
    .from("companies")
    .select("id, name, pay_frequency")
    .eq("id", companyId)
    .single();

  // Get all employees with their benefits
  const { data: employees, error } = await db
    .from("employees")
    .select(`
      id,
      first_name,
      last_name,
      employee_benefits (
        id,
        plan_code,
        per_pay_amount
      )
    `)
    .eq("company_id", companyId)
    .eq("active", true)
    .order("last_name", { ascending: true });

  // Calculate totals
  const employeesWithBenefits = (employees as Employee[] ?? []).filter(
    (emp) => emp.employee_benefits && emp.employee_benefits.length > 0
  );

  // Grand total
  let grandTotal = 0;
  employeesWithBenefits.forEach((emp) => {
    emp.employee_benefits.forEach((b) => {
      grandTotal += Number(b.per_pay_amount || 0);
    });
  });

  // Format pay frequency
  const payFreqDisplay: Record<string, string> = {
    weekly: "Weekly",
    biweekly: "Bi-Weekly",
    semimonthly: "Semi-Monthly",
    monthly: "Monthly",
  };

  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Deduction Report</h1>
          <p className="text-slate-600">{company?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/companies/${companyId}/deductions-report/pdf`}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Download PDF
          </Link>
          <Link
            href={`/companies/${companyId}`}
            className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            Back to Company
          </Link>
        </div>
      </div>

      {error && <pre className="text-red-600 p-4 bg-red-50 rounded-lg">{error.message}</pre>}

      {/* Report Header */}
      <div className="bg-white rounded-xl shadow p-6 print:shadow-none">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500">Company</p>
            <p className="font-semibold">{company?.name}</p>
          </div>
          <div>
            <p className="text-slate-500">Pay Frequency</p>
            <p className="font-semibold">
              {payFreqDisplay[company?.pay_frequency || "biweekly"] || "Bi-Weekly"}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Report Date</p>
            <p className="font-semibold">{currentDate}</p>
          </div>
          <div>
            <p className="text-slate-500">Employees with Deductions</p>
            <p className="font-semibold">{employeesWithBenefits.length}</p>
          </div>
        </div>
      </div>

      {/* Employee Deductions */}
      {employeesWithBenefits.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-slate-500">
          <p>No employees have enrolled benefits</p>
          <p className="text-sm mt-1">Add benefits to employees to generate the deduction report</p>
        </div>
      ) : (
        <div className="space-y-4">
          {employeesWithBenefits.map((emp) => {
            const empTotal = emp.employee_benefits.reduce(
              (sum, b) => sum + Number(b.per_pay_amount || 0),
              0
            );
            return (
              <div key={emp.id} className="bg-white rounded-xl shadow overflow-hidden">
                {/* Employee Header */}
                <div className="bg-slate-50 px-4 py-3 border-b flex justify-between items-center">
                  <h3 className="font-semibold">
                    {emp.last_name}, {emp.first_name}
                  </h3>
                  <span className="text-sm text-slate-500">
                    Employee Total: <span className="font-bold text-slate-900">${empTotal.toFixed(2)}</span>
                  </span>
                </div>

                {/* Benefits Table */}
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="text-left py-2 px-4 font-medium text-slate-600">Provider</th>
                      <th className="text-left py-2 px-4 font-medium text-slate-600">Benefit Type</th>
                      <th className="text-right py-2 px-4 font-medium text-slate-600">Per Check</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emp.employee_benefits.map((b, idx) => {
                      const { provider, category } = parsePlanCode(b.plan_code);
                      return (
                        <tr key={b.id} className={idx % 2 === 0 ? "" : "bg-slate-50"}>
                          <td className="py-2 px-4">{provider}</td>
                          <td className="py-2 px-4 text-slate-600">{category}</td>
                          <td className="py-2 px-4 text-right font-medium">
                            ${Number(b.per_pay_amount || 0).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {/* Grand Total */}
      {employeesWithBenefits.length > 0 && (
        <div className="bg-blue-600 rounded-xl p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-blue-100 text-sm">Total Deductions per Pay Period</p>
              <p className="text-lg font-medium">
                {employeesWithBenefits.length} employees with {employeesWithBenefits.reduce(
                  (sum, emp) => sum + emp.employee_benefits.length,
                  0
                )} benefits
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">${grandTotal.toFixed(2)}</p>
              <p className="text-blue-100 text-sm">per paycheck</p>
            </div>
          </div>
        </div>
      )}

      {/* Print instructions */}
      <div className="text-sm text-slate-500 text-center print:hidden">
        <p>Use the "Download PDF" button or press Ctrl+P to print this report</p>
      </div>
    </main>
  );
}
