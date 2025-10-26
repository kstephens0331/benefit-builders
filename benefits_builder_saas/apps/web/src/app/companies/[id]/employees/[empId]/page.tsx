// src/app/companies/[id]/employees/[empId]/page.tsx
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";
import { calcFICA, calcFITFromTable } from "@/lib/tax";

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
  const { data: company, error: companyError } = await db
    .from("companies")
    .select("id, name, model, employer_rate, employee_rate, pay_frequency")
    .eq("id", companyId)
    .single();

  // Log for debugging
  if (companyError) {
    console.error("Error fetching company:", companyError);
  }
  if (!company) {
    console.error("No company found for ID:", companyId);
  } else {
    console.log("Company fetched:", { id: company.id, model: company.model, employer_rate: company.employer_rate, employee_rate: company.employee_rate });
  }

  // Fetch employee benefits
  const { data: benefits } = await db
    .from("employee_benefits")
    .select("id, plan_code, per_pay_amount, reduces_fit, reduces_fica")
    .eq("employee_id", empId);

  // Fetch federal tax rates for current year
  const currentYear = new Date().getFullYear();
  const { data: fedRates } = await db
    .from("tax_federal_params")
    .select("ss_rate, med_rate")
    .eq("tax_year", currentYear)
    .single();

  // Fetch federal withholding table
  const { data: fedWithholding } = await db
    .from("tax_federal_withholding_15t")
    .select("tax_year, pay_period, filing_status, over, base_tax, pct")
    .eq("tax_year", currentYear)
    .eq("pay_period", emp.pay_period)
    .eq("filing_status", emp.filing_status)
    .order("over", { ascending: true });

  const label = "text-xs uppercase tracking-wide text-slate-500";
  const row = "grid grid-cols-2 gap-4";

  const payMap: Record<string, string> = {
    w: "weekly",
    b: "biweekly",
    s: "semimonthly",
    m: "monthly"
  };

  // Calculate benefit deductions
  const benefitsReduceFIT = (benefits || []).filter(b => b.reduces_fit);
  const benefitsReduceFICA = (benefits || []).filter(b => b.reduces_fica);

  const totalBenefitDeductions = (benefits || []).reduce(
    (sum, b) => sum + (Number(b.per_pay_amount) || 0),
    0
  );

  const totalFITReductions = benefitsReduceFIT.reduce(
    (sum, b) => sum + (Number(b.per_pay_amount) || 0),
    0
  );

  const totalFICAReductions = benefitsReduceFICA.reduce(
    (sum, b) => sum + (Number(b.per_pay_amount) || 0),
    0
  );

  const grossPay = Number(emp.gross_pay) || 0;
  const employerRate = Number(company?.employer_rate) || 0;
  const employeeRate = Number(company?.employee_rate) || 0;
  const ssRate = Number(fedRates?.ss_rate) || 0.062;
  const medRate = Number(fedRates?.med_rate) || 0.0145;

  // Standard deduction per paycheck (2025 values)
  const standardDeductionAnnual = emp.filing_status === "single" ? 14600 : emp.filing_status === "married" ? 29200 : 21900;
  const payPeriodsPerYear = emp.pay_period === "w" ? 52 : emp.pay_period === "b" ? 26 : emp.pay_period === "s" ? 24 : 12;
  const standardDeductionPerPay = standardDeductionAnnual / payPeriodsPerYear;
  const dependentAllowancePerPay = (emp.dependents || 0) * (2000 / payPeriodsPerYear);

  // BEFORE SECTION 125 (No Benefits)
  const beforeGross = grossPay;
  const beforeFICA = calcFICA(beforeGross, 0, ssRate, medRate);
  const beforeFITTaxable = Math.max(0, beforeGross - standardDeductionPerPay - dependentAllowancePerPay);
  const beforeFIT = fedWithholding && fedWithholding.length > 0
    ? calcFITFromTable(beforeFITTaxable, fedWithholding.map(r => ({ over: Number(r.over), baseTax: Number(r.base_tax), pct: Number(r.pct) })))
    : beforeFITTaxable * 0.12;
  const beforeTotalTax = beforeFICA.fica + beforeFIT;
  const beforeNetPay = beforeGross - beforeTotalTax;

  // AFTER SECTION 125 (With Pre-Tax Benefits)
  const afterGross = grossPay;
  const afterPreTaxDeductions = totalBenefitDeductions;
  const afterTaxableForFIT = Math.max(0, afterGross - totalFITReductions - standardDeductionPerPay - dependentAllowancePerPay);
  const afterFICA = calcFICA(afterGross, totalFICAReductions, ssRate, medRate);
  const afterFIT = fedWithholding && fedWithholding.length > 0
    ? calcFITFromTable(afterTaxableForFIT, fedWithholding.map(r => ({ over: Number(r.over), baseTax: Number(r.base_tax), pct: Number(r.pct) })))
    : afterTaxableForFIT * 0.12;
  const afterTotalTax = afterFICA.fica + afterFIT;

  // Benefits Builder fees
  const employerFee = totalBenefitDeductions * (employerRate / 100);
  const employeeFee = totalBenefitDeductions * (employeeRate / 100);

  const afterNetPay = afterGross - afterPreTaxDeductions - afterTotalTax - employeeFee;

  // SAVINGS CALCULATIONS
  const employeeTaxSavings = beforeTotalTax - afterTotalTax;
  const employeeNetIncrease = afterNetPay - beforeNetPay;
  const employerFICASavings = (beforeFICA.fica - afterFICA.fica);
  const employerNetSavings = employerFICASavings - employerFee;
  const bbTotalFees = employerFee + employeeFee;

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {emp.last_name}, {emp.first_name}
          </h1>
          <p className="text-slate-600 text-sm">
            {company?.name} · {emp.state} · {payMap[emp.pay_period] ?? emp.pay_period} ·{" "}
            {emp.active ? "active" : `inactive${emp.inactive_date ? ` since ${emp.inactive_date}` : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/companies/${companyId}/employees/${emp.id}/compare`}
            className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm"
          >
            Compare
          </Link>
          <Link
            href={`/companies/${companyId}/employees/${emp.id}/benefits`}
            className="px-3 py-2 rounded-lg bg-slate-100 text-sm"
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
            <div className={label}>Model</div>
            <div className="font-medium">{company?.model || "N/A"} ({employeeRate}% Emp / {employerRate}% Empr)</div>
          </div>
        </div>
      </div>

      {/* Benefits List */}
      {benefits && benefits.length > 0 && (
        <div className="p-4 bg-white rounded-2xl shadow space-y-3">
          <h2 className="font-semibold text-lg">Enrolled Benefits</h2>
          <div className="space-y-2">
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
          <div className="border-t pt-3">
            <div className="flex justify-between font-semibold">
              <span>Total Pre-Tax Deductions:</span>
              <span>${totalBenefitDeductions.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Paycheck Comparison - BEFORE vs AFTER Section 125 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BEFORE Section 125 */}
        <div className="p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-2xl shadow-lg border-2 border-red-200">
          <h3 className="text-lg font-bold text-red-900 mb-4">❌ WITHOUT Section 125 Plan</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-700">Gross Pay:</span>
              <span className="font-semibold">${beforeGross.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700">Pre-Tax Benefits:</span>
              <span className="font-semibold">$0.00</span>
            </div>
            <div className="border-t border-red-300 my-2"></div>
            <div className="flex justify-between">
              <span className="text-slate-700">FICA (SS + Medicare):</span>
              <span className="font-medium text-red-700">-${beforeFICA.fica.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs pl-4">
              <span className="text-slate-600">Social Security ({(ssRate * 100).toFixed(2)}%):</span>
              <span>-${beforeFICA.ss.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs pl-4">
              <span className="text-slate-600">Medicare ({(medRate * 100).toFixed(2)}%):</span>
              <span>-${beforeFICA.med.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700">Federal Income Tax:</span>
              <span className="font-medium text-red-700">-${beforeFIT.toFixed(2)}</span>
            </div>
            <div className="border-t border-red-300 my-2"></div>
            <div className="flex justify-between font-bold text-base">
              <span className="text-slate-900">Total Taxes:</span>
              <span className="text-red-700">-${beforeTotalTax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg bg-red-200 -mx-6 px-6 py-3 mt-3">
              <span className="text-slate-900">NET PAY:</span>
              <span className="text-red-900">${beforeNetPay.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* AFTER Section 125 */}
        <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-lg border-2 border-green-200">
          <h3 className="text-lg font-bold text-green-900 mb-4">✅ WITH Section 125 Plan</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-700">Gross Pay:</span>
              <span className="font-semibold">${afterGross.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700">Pre-Tax Benefits:</span>
              <span className="font-medium text-green-700">-${afterPreTaxDeductions.toFixed(2)}</span>
            </div>
            <div className="border-t border-green-300 my-2"></div>
            <div className="flex justify-between">
              <span className="text-slate-700">FICA (SS + Medicare):</span>
              <span className="font-medium text-green-700">-${afterFICA.fica.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs pl-4">
              <span className="text-slate-600">Social Security ({(ssRate * 100).toFixed(2)}%):</span>
              <span>-${afterFICA.ss.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs pl-4">
              <span className="text-slate-600">Medicare ({(medRate * 100).toFixed(2)}%):</span>
              <span>-${afterFICA.med.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700">Federal Income Tax:</span>
              <span className="font-medium text-green-700">-${afterFIT.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700">Benefits Builder Fee ({employeeRate}%):</span>
              <span className="font-medium text-blue-700">-${employeeFee.toFixed(2)}</span>
            </div>
            <div className="border-t border-green-300 my-2"></div>
            <div className="flex justify-between font-bold text-base">
              <span className="text-slate-900">Total Deductions:</span>
              <span className="text-green-700">-${(afterPreTaxDeductions + afterTotalTax + employeeFee).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg bg-green-200 -mx-6 px-6 py-3 mt-3">
              <span className="text-slate-900">NET PAY:</span>
              <span className="text-green-900">${afterNetPay.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Savings Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employee Savings */}
        <div className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl shadow-lg">
          <h3 className="text-sm font-medium opacity-90 mb-2">Employee Tax Savings</h3>
          <div className="text-4xl font-bold mb-2">${employeeTaxSavings.toFixed(2)}</div>
          <div className="text-sm opacity-90">per paycheck</div>
          <div className="mt-4 pt-4 border-t border-blue-400 text-sm">
            <div className="flex justify-between">
              <span>Net Pay Increase:</span>
              <span className="font-semibold">${employeeNetIncrease.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs opacity-75 mt-1">
              <span>After {employeeRate}% BB fee</span>
            </div>
          </div>
        </div>

        {/* Employer Savings */}
        <div className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl shadow-lg">
          <h3 className="text-sm font-medium opacity-90 mb-2">Employer FICA Savings</h3>
          <div className="text-4xl font-bold mb-2">${employerFICASavings.toFixed(2)}</div>
          <div className="text-sm opacity-90">per paycheck</div>
          <div className="mt-4 pt-4 border-t border-purple-400 text-sm">
            <div className="flex justify-between">
              <span>BB Fee ({employerRate}%):</span>
              <span className="font-semibold">-${employerFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold mt-2">
              <span>Net Savings:</span>
              <span>${employerNetSavings.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Benefits Builder Revenue */}
        <div className="p-6 bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl shadow-lg">
          <h3 className="text-sm font-medium opacity-90 mb-2">Benefits Builder Fees</h3>
          <div className="text-4xl font-bold mb-2">${bbTotalFees.toFixed(2)}</div>
          <div className="text-sm opacity-90">per paycheck</div>
          <div className="mt-4 pt-4 border-t border-amber-400 text-sm">
            <div className="flex justify-between">
              <span>Employee ({employeeRate}%):</span>
              <span className="font-semibold">${employeeFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Employer ({employerRate}%):</span>
              <span className="font-semibold">${employerFee.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {benefits && benefits.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-2xl">
          <p className="text-slate-600 mb-4">No benefits enrolled yet</p>
          <Link
            href={`/companies/${companyId}/employees/${emp.id}/benefits`}
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Add Benefits →
          </Link>
        </div>
      )}
    </main>
  );
}
