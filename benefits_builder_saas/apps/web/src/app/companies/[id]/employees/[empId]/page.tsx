// src/app/companies/[id]/employees/[empId]/page.tsx
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";
import BenefitsCalculator from "@/components/BenefitsCalculator";
import SafetyCapEditor from "@/components/SafetyCapEditor";
import EmployeeFieldEditor from "@/components/EmployeeFieldEditor";

export default async function EmployeePage({
  params,
}: { params: Promise<{ id: string; empId: string }> }) {
  const { id: companyId, empId } = await params;
  const db = createServiceClient();

  // Fetch employee data
  const { data: emp, error: empError } = await db
    .from("employees")
    .select(
      "id, first_name, last_name, state, pay_period, gross_pay, filing_status, dependents, active, hire_date, dob, inactive_date, company_id, safety_cap_percent"
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

  // Fetch company data for model rates and tier
  const { data: company, error: companyError } = await db
    .from("companies")
    .select("id, name, model, employer_rate, employee_rate, pay_frequency, tier, safety_cap_percent")
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

  // Calculate total enrolled benefits
  const totalBenefitDeductions = (benefits || []).reduce(
    (sum, b) => sum + (Number(b.per_pay_amount) || 0),
    0
  );

  const grossPay = Number(emp.gross_pay) || 0;
  const employerRate = Number(company?.employer_rate) || 0;
  const employeeRate = Number(company?.employee_rate) || 0;

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
            <EmployeeFieldEditor
              employeeId={empId}
              fieldName="gross_pay"
              fieldLabel="Gross per pay"
              initialValue={grossPay}
              fieldType="number"
              min={0}
            />
          </div>
          <div>
            <div className={label}>Filing status</div>
            <EmployeeFieldEditor
              employeeId={empId}
              fieldName="filing_status"
              fieldLabel="Filing status"
              initialValue={emp.filing_status}
              fieldType="select"
              options={[
                { value: "single", label: "Single" },
                { value: "married", label: "Married" },
                { value: "head", label: "Head of Household" },
              ]}
            />
          </div>
        </div>
        <div className={row}>
          <div>
            <div className={label}>Dependents</div>
            <EmployeeFieldEditor
              employeeId={empId}
              fieldName="dependents"
              fieldLabel="Dependents"
              initialValue={emp.dependents ?? 0}
              fieldType="number"
              min={0}
              max={20}
            />
          </div>
          <div>
            <div className={label}>Hire date</div>
            <EmployeeFieldEditor
              employeeId={empId}
              fieldName="hire_date"
              fieldLabel="Hire date"
              initialValue={emp.hire_date}
              fieldType="date"
            />
          </div>
        </div>
        <div className={row}>
          <div>
            <div className={label}>DOB</div>
            <EmployeeFieldEditor
              employeeId={empId}
              fieldName="dob"
              fieldLabel="DOB"
              initialValue={emp.dob}
              fieldType="date"
            />
          </div>
          <div>
            <div className={label}>Model</div>
            <div className="font-medium">{company?.model || "N/A"} ({employeeRate}% Emp / {employerRate}% Empr)</div>
          </div>
        </div>
        <div className={row}>
          <div>
            <div className={label}>Safety Cap % (Max Deduction)</div>
            <SafetyCapEditor
              employeeId={empId}
              initialValue={emp.safety_cap_percent ? Number(emp.safety_cap_percent) : null}
              companyDefault={Number(company?.safety_cap_percent) || 50}
            />
          </div>
        </div>
      </div>

      {/* Total Enrolled Benefits */}
      {totalBenefitDeductions > 0 && (
        <div className="p-4 bg-white rounded-2xl shadow">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-lg">Total Enrolled Benefits</h2>
              <div className="text-xs text-slate-500 mt-1">Total pre-tax deductions per paycheck</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">${totalBenefitDeductions.toFixed(2)}</div>
              <div className="text-xs text-slate-500">per pay</div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Benefits Calculator */}
      <BenefitsCalculator
        employee={{
          gross_pay: grossPay,
          filing_status: emp.filing_status,
          dependents: emp.dependents || 0,
          pay_period: emp.pay_period,
        }}
        company={{
          model: company?.model || "N/A",
          employer_rate: employerRate,
          employee_rate: employeeRate,
          tier: (company?.tier as any) || "2025",
          safety_cap_percent: Number(emp?.safety_cap_percent ?? company?.safety_cap_percent) || 50,
        }}
        fedRates={{
          ss_rate: Number(fedRates?.ss_rate) || 0.062,
          med_rate: Number(fedRates?.med_rate) || 0.0145,
        }}
        fedWithholding={
          fedWithholding
            ? fedWithholding.map((r) => ({
                over: Number(r.over),
                baseTax: Number(r.base_tax),
                pct: Number(r.pct),
              }))
            : []
        }
        enrolledBenefits={totalBenefitDeductions}
      />
    </main>
  );
}
