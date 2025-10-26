// src/app/companies/[id]/employees/[empId]/page.tsx
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";

export default async function EmployeePage({
  params,
}: { params: Promise<{ id: string; empId: string }> }) {
  const { id: companyId, empId } = await params;
  const db = createServiceClient();

  // Fetch employee data
  const { data: emp, error: empError } = await db
    .from("employees")
    .select(
      "id, first_name, last_name, state, pay_period, gross_pay, filing_status, dependents, active, hire_date, dob, inactive_date, company_id"
    )
    .eq("id", empId)
    .single();

  if (empError || !emp) {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <pre className="text-red-600">{empError?.message ?? "Employee not found"}</pre>
      </main>
    );
  }

  // Fetch company data for model rates
  const { data: company } = await db
    .from("companies")
    .select("id, name, model, employer_rate, employee_rate, pay_frequency")
    .eq("id", companyId)
    .single();

  // Fetch employee benefits
  const { data: benefits } = await db
    .from("employee_benefits")
    .select("id, plan_code, per_pay_amount, reduces_fit, reduces_fica")
    .eq("employee_id", empId);

  const label = "text-xs uppercase tracking-wide text-slate-500";
  const row = "grid grid-cols-2 gap-4";

  const payMap: Record<string, string> = {
    w: "weekly",
    b: "biweekly",
    s: "semimonthly",
    m: "monthly"
  };

  // Calculate benefit deductions
  const totalBenefitDeductions = (benefits || []).reduce(
    (sum, b) => sum + (Number(b.per_pay_amount) || 0),
    0
  );

  const grossPay = Number(emp.gross_pay) || 0;
  const employerRate = Number(company?.employer_rate) || 0;
  const employeeRate = Number(company?.employee_rate) || 0;

  // Calculate FICA savings
  const ficaRate = 0.0765; // 7.65% (SS 6.2% + Medicare 1.45%)
  const employerFicaSavings = totalBenefitDeductions * ficaRate;

  // Calculate fees based on model
  const employerFee = totalBenefitDeductions * (employerRate / 100);
  const employeeFee = totalBenefitDeductions * (employeeRate / 100);

  // Net savings
  const employerNetSavings = employerFicaSavings - employerFee;
  const employeeNetSavings = 0; // Employee pays their % of benefits as fee

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {emp.last_name}, {emp.first_name}
          </h1>
          <p className="text-slate-600 text-sm">
            {emp.state} · {payMap[emp.pay_period] ?? emp.pay_period} ·{" "}
            {emp.active ? "active" : `inactive${emp.inactive_date ? ` since ${emp.inactive_date}` : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/companies/${companyId}/employees/${emp.id}/compare`}
            className="px-3 py-2 rounded-lg bg-slate-900 text-white"
          >
            Compare
          </Link>
          <Link
            href={`/companies/${companyId}/employees/${emp.id}/benefits`}
            className="px-3 py-2 rounded-lg bg-slate-100"
          >
            Manage Benefits
          </Link>
          <Link href={`/companies/${companyId}`} className="text-sm underline">
            Back to Company
          </Link>
        </div>
      </div>

      {/* Employee Info Card */}
      <div className="p-4 bg-white rounded-2xl shadow space-y-3">
        <h2 className="font-semibold text-lg">Employee Information</h2>
        <div className={row}>
          <div>
            <div className={label}>Gross per pay</div>
            <div className="font-medium">${grossPay.toFixed(2)}</div>
          </div>
          <div>
            <div className={label}>Filing status</div>
            <div className="font-medium">{emp.filing_status}</div>
          </div>
        </div>
        <div className={row}>
          <div>
            <div className={label}>Dependents</div>
            <div className="font-medium">{emp.dependents ?? 0}</div>
          </div>
          <div>
            <div className={label}>Hire date</div>
            <div className="font-medium">{emp.hire_date ?? "—"}</div>
          </div>
        </div>
        <div className={row}>
          <div>
            <div className={label}>DOB</div>
            <div className="font-medium">{emp.dob ?? "—"}</div>
          </div>
          <div>
            <div className={label}>Inactive date</div>
            <div className="font-medium">{emp.inactive_date ?? "—"}</div>
          </div>
        </div>
      </div>

      {/* Benefits & Deductions Card */}
      <div className="p-4 bg-white rounded-2xl shadow space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Benefits & Deductions</h2>
          <span className="text-sm text-slate-600">
            Model: {company?.model || "N/A"} ({employeeRate}% Employee / {employerRate}% Employer)
          </span>
        </div>

        {benefits && benefits.length > 0 ? (
          <>
            <div className="border-t pt-3 space-y-2">
              {benefits.map((benefit) => (
                <div key={benefit.id} className="flex justify-between items-center py-2 border-b">
                  <div>
                    <div className="font-medium">{benefit.plan_code}</div>
                    <div className="text-xs text-slate-500">
                      {benefit.reduces_fit && "Reduces FIT"}
                      {benefit.reduces_fit && benefit.reduces_fica && " · "}
                      {benefit.reduces_fica && "Reduces FICA"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${Number(benefit.per_pay_amount || 0).toFixed(2)}</div>
                    <div className="text-xs text-slate-500">per pay</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between font-semibold">
                <span>Total Pre-Tax Deductions:</span>
                <span>${totalBenefitDeductions.toFixed(2)}</span>
              </div>
            </div>

            <div className="border-t pt-3 space-y-2 bg-slate-50 -mx-4 px-4 py-3 rounded-b-xl">
              <h3 className="font-semibold text-sm text-slate-700">Cost Analysis (Per Pay Period)</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Employer FICA Savings ({(ficaRate * 100).toFixed(2)}%):</span>
                  <span className="font-medium text-green-700">${employerFicaSavings.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Employer Fee ({employerRate}%):</span>
                  <span className="font-medium text-slate-700">-${employerFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="font-semibold">Employer Net Savings:</span>
                  <span className="font-semibold text-green-700">${employerNetSavings.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mt-2 pt-2 border-t">
                  <span className="text-slate-600">Employee Fee ({employeeRate}%):</span>
                  <span className="font-medium text-slate-700">${employeeFee.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <p>No benefits enrolled</p>
            <Link
              href={`/companies/${companyId}/employees/${emp.id}/benefits`}
              className="text-blue-600 hover:underline text-sm mt-2 inline-block"
            >
              Add Benefits →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
