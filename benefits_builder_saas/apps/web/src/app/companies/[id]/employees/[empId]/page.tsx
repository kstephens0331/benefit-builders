// src/app/companies/[id]/employees/[empId]/page.tsx
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";
import BenefitsCalculator from "@/components/BenefitsCalculator";
import SafetyCapEditor from "@/components/SafetyCapEditor";
import EmployeeFieldEditor from "@/components/EmployeeFieldEditor";
import { STATE_TAX_CONFIG } from "@/lib/proposal-calculator";

// US State codes for dropdown
const US_STATES = [
  { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" }, { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" }, { value: "CA", label: "California" }, { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" }, { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" }, { value: "HI", label: "Hawaii" }, { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" }, { value: "IN", label: "Indiana" }, { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" }, { value: "KY", label: "Kentucky" }, { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" }, { value: "MD", label: "Maryland" }, { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" }, { value: "MN", label: "Minnesota" }, { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" }, { value: "MT", label: "Montana" }, { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" }, { value: "NH", label: "New Hampshire" }, { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" }, { value: "NY", label: "New York" }, { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" }, { value: "OH", label: "Ohio" }, { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" }, { value: "PA", label: "Pennsylvania" }, { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" }, { value: "SD", label: "South Dakota" }, { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" }, { value: "UT", label: "Utah" }, { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" }, { value: "WA", label: "Washington" }, { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" }, { value: "WY", label: "Wyoming" }, { value: "DC", label: "District of Columbia" }
];

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
    .select("id, name, state, model, employer_rate, employee_rate, pay_frequency, tier, safety_cap_percent, contact_name, contact_phone")
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

  // Fetch federal withholding table (15-T percentage method)
  // The table stores data in JSONB format with pay_frequency not pay_period
  const payFrequencyMap: Record<string, string> = {
    w: "weekly",
    b: "biweekly",
    s: "semimonthly",
    m: "monthly",
  };
  const payFrequency = payFrequencyMap[emp.pay_period] || "biweekly";

  const { data: fedWithholdingRaw } = await db
    .from("withholding_federal_15t")
    .select("tax_year, pay_frequency, filing_status, percentage_method_json")
    .eq("tax_year", currentYear)
    .eq("pay_frequency", payFrequency)
    .eq("filing_status", emp.filing_status)
    .single();

  // Parse the JSONB percentage_method_json into the bracket format expected by calcFITFromTable
  // The DB stores: { brackets: [{max, rate, base}] } but calcFITFromTable expects [{over, baseTax, pct}]
  // Convert from "max" (upper bound) format to "over" (lower bound) format
  const fedWithholding: Array<{ over: number; baseTax: number; pct: number }> = [];
  if (fedWithholdingRaw?.percentage_method_json) {
    const jsonData = fedWithholdingRaw.percentage_method_json as {
      standard_deduction?: number;
      brackets?: Array<{ max: number | null; rate: number; base: number }>;
    };
    if (jsonData.brackets && Array.isArray(jsonData.brackets)) {
      let prevMax = 0;
      for (const bracket of jsonData.brackets) {
        fedWithholding.push({
          over: prevMax,
          baseTax: bracket.base || 0,
          pct: bracket.rate || 0,
        });
        prevMax = bracket.max || Infinity;
      }
    }
  }

  // Fetch state tax params (use employee state or company state)
  const employeeState = emp.state || company?.state || "MO";
  const { data: stateParams } = await db
    .from("tax_state_params")
    .select("state, method, flat_rate, brackets, standard_deduction")
    .eq("state", employeeState)
    .eq("tax_year", currentYear)
    .single();

  // Get hardcoded state tax config as fallback
  const hardcodedStateTax = STATE_TAX_CONFIG[employeeState.toUpperCase()];

  // Build state withholding object - use database if available, else use hardcoded config
  const stateWithholdingData = stateParams
    ? {
        state: stateParams.state,
        method: stateParams.method as 'none' | 'flat' | 'brackets',
        flat_rate: Number(stateParams.flat_rate) || undefined,
        brackets: stateParams.brackets as Array<{ over: number; rate: number }> || undefined,
        standardDeduction: Number(stateParams.standard_deduction) || 0,
      }
    : hardcodedStateTax
    ? {
        state: employeeState.toUpperCase(),
        method: hardcodedStateTax.method,
        flat_rate: hardcodedStateTax.flatRate,
        brackets: hardcodedStateTax.brackets,
        standardDeduction: hardcodedStateTax.standardDeduction || 0,
      }
    : null;

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

  // Parse model rates from model string (e.g., "5/3" = 5% employee, 3% employer)
  const parseModelRates = (model: string): { employee_rate: number; employer_rate: number } => {
    const parts = model?.split('/') || [];
    if (parts.length === 2) {
      return {
        employee_rate: parseFloat(parts[0]) || 0,
        employer_rate: parseFloat(parts[1]) || 0,
      };
    }
    // Default to 5/3 if model can't be parsed
    return { employee_rate: 5, employer_rate: 3 };
  };

  // Model format: "X/Y" where X = Employee %, Y = Employer %
  // Use model string parsing as source of truth since database values may be inconsistent
  const modelRates = parseModelRates(company?.model || "5/3");
  const employeeRate = modelRates.employee_rate;
  const employerRate = modelRates.employer_rate;

  // Convert company pay_frequency (full word) to pay_period code (single letter)
  const convertPayFrequency = (freq?: string): string => {
    switch (freq?.toLowerCase()) {
      case 'weekly': return 'w';
      case 'biweekly': return 'b';
      case 'semimonthly': return 's';
      case 'monthly': return 'm';
      default: return 'b'; // default to biweekly
    }
  };

  // Use employee's pay_period if set, otherwise fall back to company's pay_frequency
  const effectivePayPeriod = emp.pay_period || convertPayFrequency(company?.pay_frequency);

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {emp.last_name}, {emp.first_name}
          </h1>
          <p className="text-slate-600 text-sm">
            {company?.name} · {emp.state || company?.state} · {payMap[effectivePayPeriod] ?? effectivePayPeriod} ·{" "}
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
            <div className={label}>Pay Frequency</div>
            <EmployeeFieldEditor
              employeeId={empId}
              fieldName="pay_period"
              fieldLabel="Pay Frequency"
              initialValue={effectivePayPeriod}
              fieldType="select"
              options={[
                { value: "w", label: "Weekly" },
                { value: "b", label: "Biweekly" },
                { value: "s", label: "Semimonthly" },
                { value: "m", label: "Monthly" },
              ]}
            />
          </div>
        </div>
        <div className={row}>
          <div>
            <div className={label}>Model</div>
            <div className="font-medium">{company?.model || "N/A"} ({employeeRate}% Emp / {employerRate}% Empr)</div>
          </div>
          <div>
            <div className={label}>Company</div>
            <div className="font-medium">
              <Link href={`/companies/${companyId}`} className="text-blue-600 hover:underline">
                {company?.name || "N/A"}
              </Link>
            </div>
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
          <div>
            <div className={label}>State</div>
            <EmployeeFieldEditor
              employeeId={empId}
              fieldName="state"
              fieldLabel="State"
              initialValue={emp.state || company?.state || "MO"}
              fieldType="select"
              options={US_STATES}
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
          pay_period: effectivePayPeriod,
          state: employeeState,
        }}
        company={{
          model: company?.model || "N/A",
          employer_rate: employerRate,
          employee_rate: employeeRate,
          tier: (company?.tier as any) || "2025",
          safety_cap_percent: Number(emp?.safety_cap_percent ?? company?.safety_cap_percent) || 50,
          state: company?.state,
        }}
        fedRates={{
          ss_rate: Number(fedRates?.ss_rate) || 0.062,
          med_rate: Number(fedRates?.med_rate) || 0.0145,
        }}
        fedWithholding={fedWithholding}
        stateWithholding={stateWithholdingData}
        enrolledBenefits={totalBenefitDeductions}
      />
    </main>
  );
}
