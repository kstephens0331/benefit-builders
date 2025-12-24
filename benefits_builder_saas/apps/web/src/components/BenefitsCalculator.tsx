"use client";

import { useState } from "react";
import { calcFICA, calcFITFromTable, calcSITFlat } from "@/lib/tax";
import { calculateSection125Amount, calculateSafeSection125Deduction, checkSection125Affordability, monthlyToPerPay, type CompanyTier, type FilingStatus, type CustomSection125Amounts } from "@/lib/section125";
import { calculateLocalTax, stateHasLocalTax } from "@/lib/local-tax-config";

// Calculate FEDERAL income tax using IRS Percentage Method
// IMPORTANT: Federal brackets are ANNUAL amounts from IRS Pub 15-T
// We need to convert per-pay to annual, calculate tax, then convert back
function calcFederalTax(
  perPayGross: number,
  periodsPerYear: number,
  benefitAmount: number,
  standardDeductionAnnual: number,
  dependentAllowanceAnnual: number,
  brackets: Array<{ over: number; baseTax: number; pct: number }>
): number {
  if (!brackets || brackets.length === 0) {
    // Fallback to 12% flat rate if no brackets available
    const taxable = Math.max(0, perPayGross - benefitAmount - (standardDeductionAnnual / periodsPerYear));
    return +(taxable * 0.12).toFixed(2);
  }

  // Step 1: Calculate ANNUAL wages (per-pay gross × pay periods)
  const annualGross = (perPayGross - benefitAmount) * periodsPerYear;

  // Step 2: Subtract standard deduction and dependent allowances
  const annualTaxable = Math.max(0, annualGross - standardDeductionAnnual - dependentAllowanceAnnual);

  // Step 3: Find the bracket and calculate annual tax
  let row = brackets[0];
  for (const r of brackets) {
    if (annualTaxable >= r.over) row = r;
    else break;
  }
  const overAmt = Math.max(0, annualTaxable - row.over);
  const annualTax = Number(row.baseTax || 0) + overAmt * Number(row.pct || 0);

  // Step 4: Convert annual tax back to per-pay
  const perPayTax = annualTax / periodsPerYear;
  return +perPayTax.toFixed(2);
}

// Calculate state income tax based on method
// IMPORTANT: For bracket states, brackets are ANNUAL amounts
// We need to convert per-pay to annual, calculate tax, then convert back
// Uses standardDeduction + personalExemption + (dependents × dependentExemption)
function calcStateTax(
  perPayTaxableIncome: number,
  periodsPerYear: number,
  dependents: number,
  stateWithholding?: {
    state: string;
    method: 'none' | 'flat' | 'brackets';
    flat_rate?: number;
    brackets?: Array<{ over: number; rate: number }>;
    standardDeduction?: number;
    personalExemption?: number;
    dependentExemption?: number;
  } | null
): number {
  if (!stateWithholding || stateWithholding.method === 'none') {
    return 0;
  }

  // Convert per-pay to annual
  const annualGross = perPayTaxableIncome * periodsPerYear;

  // Calculate total deduction: standardDeduction + personalExemption + (dependents × dependentExemption)
  const standardDed = stateWithholding.standardDeduction || 0;
  const personalEx = stateWithholding.personalExemption || 0;
  const dependentEx = stateWithholding.dependentExemption || 0;
  const totalDeduction = standardDed + personalEx + (dependents * dependentEx);

  const annualTaxable = Math.max(0, annualGross - totalDeduction);

  if (stateWithholding.method === 'flat' && stateWithholding.flat_rate) {
    const annualTax = annualTaxable * stateWithholding.flat_rate;
    return +(annualTax / periodsPerYear).toFixed(2);
  }

  if (stateWithholding.method === 'brackets' && stateWithholding.brackets) {
    // Progressive bracket calculation on annual income
    let annualTax = 0;
    const brackets = stateWithholding.brackets.sort((a, b) => a.over - b.over);

    for (let i = 0; i < brackets.length; i++) {
      const bracket = brackets[i];
      const nextBracket = brackets[i + 1];
      const bracketFloor = bracket.over;
      const bracketCeiling = nextBracket ? nextBracket.over : Infinity;

      if (annualTaxable > bracketFloor) {
        const taxableInBracket = Math.min(annualTaxable, bracketCeiling) - bracketFloor;
        annualTax += taxableInBracket * bracket.rate;
      }
    }

    // Convert annual tax back to per-pay amount
    const perPayTax = annualTax / periodsPerYear;
    return +perPayTax.toFixed(2);
  }

  return 0;
}

type Props = {
  employee: {
    gross_pay: number;
    filing_status: string;
    dependents: number;
    pay_period: string;
    state?: string;
    city?: string;        // City/municipality for local tax
    county?: string;      // County for local tax (IN, MD, KY)
    work_city?: string;   // Work location city (if different from residence)
    work_state?: string;  // Work location state (if different from residence)
  };
  company: {
    model: string;
    employer_rate: number;
    employee_rate: number;
    tier: CompanyTier;
    safety_cap_percent: number;
    state?: string;
    // Custom Section 125 amounts (used for any model when set)
    sec125_single_0?: number;
    sec125_married_0?: number;
    sec125_single_deps?: number;
    sec125_married_deps?: number;
  };
  fedRates: {
    ss_rate: number;
    med_rate: number;
  };
  fedWithholding: Array<{
    over: number;
    baseTax: number;
    pct: number;
  }>;
  stateWithholding?: {
    state: string;
    method: 'none' | 'flat' | 'brackets';
    flat_rate?: number;
    brackets?: Array<{ over: number; rate: number }>;
    standardDeduction?: number;
    personalExemption?: number;
    dependentExemption?: number;
  } | null;
  enrolledBenefits: number; // Current enrolled amount
  showAdminView?: boolean; // When false, hide BB fees and detailed math
};

export default function BenefitsCalculator({
  employee,
  company,
  fedRates,
  fedWithholding,
  stateWithholding,
  enrolledBenefits,
  showAdminView: initialAdminView = true,
}: Props) {
  const [isAdminView, setIsAdminView] = useState(initialAdminView);
  const grossPay = Number(employee.gross_pay) || 0;
  const safetyCapPercent = Number(company.safety_cap_percent) || 50;

  // Build custom amounts object from company settings
  // Only create customAmounts if at least one field has an actual value (not null/undefined)
  const customAmounts: CustomSection125Amounts | undefined = (
    company.sec125_single_0 != null ||
    company.sec125_married_0 != null ||
    company.sec125_single_deps != null ||
    company.sec125_married_deps != null
  ) ? {
    sec125_single_0: company.sec125_single_0 ?? undefined,
    sec125_married_0: company.sec125_married_0 ?? undefined,
    sec125_single_deps: company.sec125_single_deps ?? undefined,
    sec125_married_deps: company.sec125_married_deps ?? undefined,
  } : undefined;

  // Check affordability and get safe deduction amount
  const affordability = checkSection125Affordability(
    company.tier,
    employee.filing_status as FilingStatus,
    employee.dependents,
    grossPay,
    employee.pay_period,
    safetyCapPercent, // Max % of gross pay (configurable per company)
    customAmounts // Custom amounts from company settings
  );

  // Use SAFE deduction amount that won't exceed gross pay
  const section125PerPaycheck = affordability.safePerPaycheck;
  const monthlySection125Amount = affordability.safeMonthly;

  // Track if employee has insufficient pay for full benefit
  const hasShortfall = !affordability.isSufficient;
  const employerRate = Number(company.employer_rate) || 0;
  const employeeRate = Number(company.employee_rate) || 0;
  const ssRate = Number(fedRates.ss_rate) || 0.062;
  const medRate = Number(fedRates.med_rate) || 0.0145;

  // Standard deduction per paycheck
  const standardDeductionAnnual =
    employee.filing_status === "single"
      ? 14600
      : employee.filing_status === "married"
      ? 29200
      : 21900;
  const payPeriodsPerYear =
    employee.pay_period === "w"
      ? 52
      : employee.pay_period === "b"
      ? 26
      : employee.pay_period === "s"
      ? 24
      : 12;
  const standardDeductionPerPay = standardDeductionAnnual / payPeriodsPerYear;
  const dependentAllowanceAnnual = (employee.dependents || 0) * 2000;
  const dependentAllowancePerPay = dependentAllowanceAnnual / payPeriodsPerYear;

  // Use the automatically calculated Section 125 amount
  const benefitAmount = section125PerPaycheck;

  // BEFORE (no benefits) - using IRS Percentage Method with ANNUAL brackets
  const beforeFICA = calcFICA(grossPay, 0, ssRate, medRate);
  // Federal tax: uses annual brackets, converts per-pay to annual, calculates, converts back
  const beforeFIT = calcFederalTax(
    grossPay,
    payPeriodsPerYear,
    0, // No benefit deduction for "before"
    standardDeductionAnnual,
    dependentAllowanceAnnual,
    fedWithholding
  );
  // State tax: pass gross pay (before fed deductions) since state uses its own deductions
  const beforeSIT = calcStateTax(grossPay, payPeriodsPerYear, employee.dependents || 0, stateWithholding);

  // Local tax (city/county): calculate annual then convert to per-pay
  // Use city for MI, OH, PA, NY; county for IN, MD; both may apply for KY
  const annualGrossBefore = grossPay * payPeriodsPerYear;
  const residenceState = employee.state || '';
  const residenceCity = employee.city || employee.county || '';
  const workState = employee.work_state || residenceState;
  const workCity = employee.work_city || residenceCity;
  const beforeLocalAnnual = calculateLocalTax(annualGrossBefore, residenceState, residenceCity, workState, workCity);
  const beforeLocalTax = beforeLocalAnnual / payPeriodsPerYear;

  const beforeTotalTax = beforeFICA.fica + beforeFIT + beforeSIT + beforeLocalTax;
  const beforeNetPay = grossPay - beforeTotalTax;

  // AFTER (with benefits) - using IRS Percentage Method with ANNUAL brackets
  const afterFICA = calcFICA(grossPay, benefitAmount, ssRate, medRate);
  // Federal tax: Section 125 reduces taxable income BEFORE calculating tax
  const afterFIT = calcFederalTax(
    grossPay,
    payPeriodsPerYear,
    benefitAmount, // Section 125 deduction
    standardDeductionAnnual,
    dependentAllowanceAnnual,
    fedWithholding
  );
  // State tax: pass gross pay minus Section 125 benefit (pre-tax deduction)
  const afterSIT = calcStateTax(grossPay - benefitAmount, payPeriodsPerYear, employee.dependents || 0, stateWithholding);

  // Local tax after Section 125 deduction (most local taxes are on earned income, so Section 125 reduces)
  const annualGrossAfter = (grossPay - benefitAmount) * payPeriodsPerYear;
  const afterLocalAnnual = calculateLocalTax(annualGrossAfter, residenceState, residenceCity, workState, workCity);
  const afterLocalTax = afterLocalAnnual / payPeriodsPerYear;

  const afterTotalTax = afterFICA.fica + afterFIT + afterSIT + afterLocalTax;

  const employeeFee = benefitAmount * (employeeRate / 100);
  const employerFee = benefitAmount * (employerRate / 100);

  // Section 125 calculation:
  // - The benefit amount is a PRE-TAX deduction (reduces taxable income)
  // - This means taxes are calculated on (grossPay - benefitAmount)
  // - The employee ONLY pays:
  //   1. The reduced taxes (afterTotalTax)
  //   2. The employee fee (small % of benefit amount)
  //
  // The benefit amount itself is NOT subtracted from their paycheck - it's a tax shelter,
  // not an actual deduction from take-home pay. The employee gets the full tax savings
  // minus only the small BB fee.

  // Net pay WITH Section 125 = Gross - Reduced Taxes - Employee Fee
  const afterNetPay = grossPay - afterTotalTax - employeeFee;

  // Savings
  const employeeTaxSavings = beforeTotalTax - afterTotalTax;
  const employeeNetIncrease = afterNetPay - beforeNetPay;
  const employerFICASavings = beforeFICA.fica - afterFICA.fica;
  const employerNetSavings = employerFICASavings - employerFee;
  const bbTotalFees = employerFee + employeeFee;

  return (
    <div className="space-y-6">
      {/* Admin View Toggle */}
      <div className="flex items-center justify-end gap-3">
        <span className="text-sm text-slate-600">
          {isAdminView ? "Admin View" : "Employee View"}
        </span>
        <button
          onClick={() => setIsAdminView(!isAdminView)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isAdminView ? 'bg-blue-600' : 'bg-slate-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isAdminView ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Auto-Calculated Section 125 Amount Display */}
      <div className={`p-6 rounded-2xl shadow-lg border-2 ${
        hasShortfall
          ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-300'
          : 'bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200'
      }`}>
        <h3 className={`text-lg font-bold mb-4 ${hasShortfall ? 'text-red-900' : 'text-blue-900'}`}>
          💰 Section 125 Calculation
        </h3>

        {hasShortfall ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">❌</div>
            <div className="text-2xl font-bold text-red-800 mb-2">Not Eligible</div>
            <div className="text-sm text-red-600">
              Gross pay of ${grossPay.toFixed(2)}/paycheck is insufficient for Section 125 benefits.
            </div>
            <div className="text-sm text-red-600 mt-1">
              Required minimum: ${affordability.targetPerPaycheck.toFixed(2)}/paycheck
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-slate-600">Monthly Gross</div>
                <div className="text-lg font-bold text-blue-900">
                  ${affordability.grossMonthly.toFixed(2)}
                </div>
                <div className="text-xs text-slate-500 mt-1">${grossPay.toFixed(2)}/pay</div>
              </div>
              <div>
                <div className="text-sm text-slate-600">Company Tier</div>
                <div className="text-lg font-bold text-blue-900">
                  {company.tier.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600">Section 125 Monthly</div>
                <div className="text-lg font-bold text-blue-900">
                  ${monthlySection125Amount.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600">Section 125 Per Paycheck</div>
                <div className="text-2xl font-bold text-blue-900">
                  ${section125PerPaycheck.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="mt-4 text-sm p-3 rounded-lg text-blue-800 bg-blue-100">
              <strong>Auto-calculated</strong> based on filing status ({employee.filing_status}) and dependents ({employee.dependents})
            </div>
          </>
        )}
      </div>

      {/* Paycheck Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* WITHOUT Section 125 */}
        <div className="p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-2xl shadow-lg border-2 border-red-200">
          <h3 className="text-lg font-bold text-red-900 mb-4">
            ❌ WITHOUT Section 125 Plan
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-700">Gross Pay:</span>
              <span className="font-semibold">${grossPay.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700">Pre-Tax Benefits:</span>
              <span className="font-semibold">$0.00</span>
            </div>
            <div className="border-t border-red-300 my-2"></div>
            <div className="flex justify-between">
              <span className="text-slate-700">FICA (SS + Medicare):</span>
              <span className="font-medium text-red-700">
                -${beforeFICA.fica.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-xs pl-4">
              <span className="text-slate-600">
                Social Security ({(ssRate * 100).toFixed(2)}%):
              </span>
              <span>-${beforeFICA.ss.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs pl-4">
              <span className="text-slate-600">
                Medicare ({(medRate * 100).toFixed(2)}%):
              </span>
              <span>-${beforeFICA.med.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700">Federal Income Tax:</span>
              <span className="font-medium text-red-700">-${beforeFIT.toFixed(2)}</span>
            </div>
            {stateWithholding && stateWithholding.method !== 'none' && (
              <div className="flex justify-between">
                <span className="text-slate-700">State Income Tax ({stateWithholding.state}):</span>
                <span className="font-medium text-red-700">-${beforeSIT.toFixed(2)}</span>
              </div>
            )}
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

        {/* WITH Section 125 */}
        <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-lg border-2 border-green-200">
          <h3 className="text-lg font-bold text-green-900 mb-4">
            ✅ WITH Section 125 Plan
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-700">Gross Pay:</span>
              <span className="font-semibold">${grossPay.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700">Pre-Tax Benefits:</span>
              <span className="font-medium text-green-700">
                -${benefitAmount.toFixed(2)}
              </span>
            </div>
            <div className="border-t border-green-300 my-2"></div>
            <div className="flex justify-between">
              <span className="text-slate-700">FICA (SS + Medicare):</span>
              <span className="font-medium text-green-700">
                -${afterFICA.fica.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-xs pl-4">
              <span className="text-slate-600">
                Social Security ({(ssRate * 100).toFixed(2)}%):
              </span>
              <span>-${afterFICA.ss.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs pl-4">
              <span className="text-slate-600">
                Medicare ({(medRate * 100).toFixed(2)}%):
              </span>
              <span>-${afterFICA.med.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700">Federal Income Tax:</span>
              <span className="font-medium text-green-700">-${afterFIT.toFixed(2)}</span>
            </div>
            {stateWithholding && stateWithholding.method !== 'none' && (
              <div className="flex justify-between">
                <span className="text-slate-700">State Income Tax ({stateWithholding.state}):</span>
                <span className="font-medium text-green-700">-${afterSIT.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-700">
                Benefits Builder Fee ({employeeRate}%):
              </span>
              <span className="font-medium text-blue-700">
                -${employeeFee.toFixed(2)}
              </span>
            </div>
            <div className="border-t border-green-300 my-2"></div>
            <div className="flex justify-between font-bold text-base">
              <span className="text-slate-900">Total Taxes + Fee:</span>
              <span className="text-green-700">
                -${(afterTotalTax + employeeFee).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between font-bold text-lg bg-green-200 -mx-6 px-6 py-3 mt-3">
              <span className="text-slate-900">NET PAY:</span>
              <span className="text-green-900">${afterNetPay.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Savings Summary - Monthly Values */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employee Allowable Benefit Amount Per Paycheck */}
        <div className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl shadow-lg">
          <h3 className="text-sm font-medium opacity-90 mb-2">Allowable Benefit Amount</h3>
          <div className="text-4xl font-bold mb-2">${employeeNetIncrease.toFixed(2)}</div>
          <div className="text-sm opacity-90">per paycheck</div>
          <div className="mt-4 pt-4 border-t border-blue-400 text-sm">
            <div className="flex justify-between">
              <span>Monthly:</span>
              <span className="font-semibold">
                ${(employeeNetIncrease * payPeriodsPerYear / 12).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-xs opacity-75 mt-1">
              <span>Tax Savings - {employeeRate}% BB fee</span>
            </div>
          </div>
        </div>

        {/* Employer Savings - Admin Only */}
        {isAdminView && (
          <div className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl shadow-lg">
            <h3 className="text-sm font-medium opacity-90 mb-2">
              Employer FICA Savings
            </h3>
            <div className="text-4xl font-bold mb-2">
              ${(employerFICASavings * payPeriodsPerYear / 12).toFixed(2)}
            </div>
            <div className="text-sm opacity-90">per month</div>
            <div className="mt-4 pt-4 border-t border-purple-400 text-sm">
              <div className="flex justify-between">
                <span>Before BB:</span>
                <span className="font-semibold">${(employerFICASavings * payPeriodsPerYear / 12).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold mt-2">
                <span>After BB:</span>
                <span>${(employerNetSavings * payPeriodsPerYear / 12).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Benefits Builder Revenue - Admin Only */}
        {isAdminView && (
          <div className="p-6 bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl shadow-lg">
            <h3 className="text-sm font-medium opacity-90 mb-2">
              Benefits Builder Fees
            </h3>
            <div className="text-4xl font-bold mb-2">${(bbTotalFees * payPeriodsPerYear / 12).toFixed(2)}</div>
            <div className="text-sm opacity-90">per month</div>
            <div className="mt-4 pt-4 border-t border-amber-400 text-sm">
              <div className="flex justify-between">
                <span>Employee ({employeeRate}%):</span>
                <span className="font-semibold">${(employeeFee * payPeriodsPerYear / 12).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Employer ({employerRate}%):</span>
                <span className="font-semibold">${(employerFee * payPeriodsPerYear / 12).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Math Breakdown - Admin Only */}
      {isAdminView && (
      <div className="p-6 bg-white rounded-2xl shadow-lg border-2 border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-4">📊 Detailed Math Breakdown</h3>
        <p className="text-sm text-slate-600 mb-6">Step-by-step calculations to verify all numbers</p>

        {/* Input Parameters */}
        <div className="mb-6 p-4 bg-slate-50 rounded-lg">
          <h4 className="font-bold text-slate-800 mb-3">Input Parameters</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-slate-500">Gross Pay/Check</div>
              <div className="font-mono font-bold">${grossPay.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-slate-500">Pay Periods/Year</div>
              <div className="font-mono font-bold">{payPeriodsPerYear}</div>
            </div>
            <div>
              <div className="text-slate-500">Filing Status</div>
              <div className="font-mono font-bold">{employee.filing_status}</div>
            </div>
            <div>
              <div className="text-slate-500">Dependents</div>
              <div className="font-mono font-bold">{employee.dependents}</div>
            </div>
            <div>
              <div className="text-slate-500">Company Tier</div>
              <div className="font-mono font-bold">{company.tier}</div>
            </div>
            <div>
              <div className="text-slate-500">Safety Cap %</div>
              <div className="font-mono font-bold">{safetyCapPercent}%</div>
            </div>
            <div>
              <div className="text-slate-500">Employee Rate</div>
              <div className="font-mono font-bold">{employeeRate}%</div>
            </div>
            <div>
              <div className="text-slate-500">Employer Rate</div>
              <div className="font-mono font-bold">{employerRate}%</div>
            </div>
          </div>
        </div>

        {/* Section 125 Calculation */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-bold text-blue-900 mb-3">Step 1: Section 125 Amount Calculation</h4>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex justify-between">
              <span>Monthly Gross = ${grossPay.toFixed(2)} × ({payPeriodsPerYear}/12)</span>
              <span className="font-bold">${affordability.grossMonthly.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Target Monthly (from tier table)</span>
              <span className="font-bold">${affordability.targetMonthly.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Max Monthly ({safetyCapPercent}% cap) = ${affordability.grossMonthly.toFixed(2)} × {safetyCapPercent}%</span>
              <span className="font-bold">${(affordability.grossMonthly * safetyCapPercent / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-blue-900 font-bold border-t border-blue-300 pt-2">
              <span>Safe Monthly = min(Target, Max)</span>
              <span>${affordability.safeMonthly.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-blue-900 font-bold">
              <span>Per Paycheck = ${affordability.safeMonthly.toFixed(2)} × (12/{payPeriodsPerYear})</span>
              <span>${section125PerPaycheck.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* FICA Calculation */}
        <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <h4 className="font-bold text-purple-900 mb-3">Step 2: FICA Calculation (7.65% = 6.2% SS + 1.45% Med)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 text-sm font-mono">
              <div className="font-bold text-red-700 mb-2">WITHOUT Section 125:</div>
              <div className="flex justify-between">
                <span>SS = ${grossPay.toFixed(2)} × 6.2%</span>
                <span>${beforeFICA.ss.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Med = ${grossPay.toFixed(2)} × 1.45%</span>
                <span>${beforeFICA.med.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-purple-300 pt-2">
                <span>Total FICA</span>
                <span>${beforeFICA.fica.toFixed(2)}</span>
              </div>
            </div>
            <div className="space-y-2 text-sm font-mono">
              <div className="font-bold text-green-700 mb-2">WITH Section 125:</div>
              <div className="flex justify-between">
                <span>Taxable = ${grossPay.toFixed(2)} - ${benefitAmount.toFixed(2)}</span>
                <span>${(grossPay - benefitAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>SS = ${(grossPay - benefitAmount).toFixed(2)} × 6.2%</span>
                <span>${afterFICA.ss.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Med = ${(grossPay - benefitAmount).toFixed(2)} × 1.45%</span>
                <span>${afterFICA.med.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-purple-300 pt-2">
                <span>Total FICA</span>
                <span>${afterFICA.fica.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Employer Savings Calculation */}
        <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <h4 className="font-bold text-green-900 mb-3">Step 3: Employer Net Savings (Per Pay Period)</h4>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex justify-between">
              <span>FICA Savings = ${beforeFICA.fica.toFixed(2)} - ${afterFICA.fica.toFixed(2)}</span>
              <span className="font-bold text-green-700">${employerFICASavings.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Or: Section 125 × 7.65% = ${benefitAmount.toFixed(2)} × 7.65%</span>
              <span className="font-bold">${(benefitAmount * 0.0765).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-red-700">
              <span>BB Fee = ${benefitAmount.toFixed(2)} × {employerRate}%</span>
              <span>-${employerFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-green-900 border-t border-green-300 pt-2 text-base">
              <span>ER Net Savings/Pay = ${employerFICASavings.toFixed(2)} - ${employerFee.toFixed(2)}</span>
              <span>${employerNetSavings.toFixed(2)}</span>
            </div>
          </div>

          {/* Monthly & Annual Projections */}
          <div className="mt-4 pt-4 border-t border-green-300">
            <h5 className="font-bold text-green-800 mb-2">Monthly & Annual Projections:</h5>
            <div className="space-y-2 text-sm font-mono">
              <div className="flex justify-between">
                <span>ER Savings/Mo = ${employerNetSavings.toFixed(2)} × ({payPeriodsPerYear}/12)</span>
                <span className="font-bold">${(employerNetSavings * payPeriodsPerYear / 12).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>ER Savings/Yr = ${employerNetSavings.toFixed(2)} × {payPeriodsPerYear}</span>
                <span className="font-bold">${(employerNetSavings * payPeriodsPerYear).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Employee Benefit Calculation */}
        <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
          <h4 className="font-bold text-indigo-900 mb-3">Step 4: Employee Allowable Benefit (Net Pay Increase)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 text-sm font-mono">
              <div className="font-bold text-red-700 mb-2">WITHOUT Section 125:</div>
              <div className="flex justify-between">
                <span>Gross Pay</span>
                <span>${grossPay.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>- FICA</span>
                <span>-${beforeFICA.fica.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>- FIT</span>
                <span>-${beforeFIT.toFixed(2)}</span>
              </div>
              {stateWithholding && stateWithholding.method !== 'none' && (
                <div className="flex justify-between">
                  <span>- SIT ({stateWithholding.state})</span>
                  <span>-${beforeSIT.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold border-t border-indigo-300 pt-2">
                <span>Net Pay</span>
                <span>${beforeNetPay.toFixed(2)}</span>
              </div>
            </div>
            <div className="space-y-2 text-sm font-mono">
              <div className="font-bold text-green-700 mb-2">WITH Section 125:</div>
              <div className="flex justify-between">
                <span>Gross Pay</span>
                <span>${grossPay.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>- FICA (reduced)</span>
                <span>-${afterFICA.fica.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>- FIT (reduced)</span>
                <span>-${afterFIT.toFixed(2)}</span>
              </div>
              {stateWithholding && stateWithholding.method !== 'none' && (
                <div className="flex justify-between">
                  <span>- SIT (reduced)</span>
                  <span>-${afterSIT.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>- EE Fee ({employeeRate}%)</span>
                <span>-${employeeFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-indigo-300 pt-2">
                <span>Net Pay</span>
                <span>${afterNetPay.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-indigo-300">
            <div className="flex justify-between font-bold text-lg">
              <span>Allowable Benefit = ${afterNetPay.toFixed(2)} - ${beforeNetPay.toFixed(2)}</span>
              <span className="text-blue-700">${employeeNetIncrease.toFixed(2)}/pay</span>
            </div>
            <div className="text-xs text-slate-600 mt-1">
              This is how much MORE the employee takes home with Section 125
            </div>
          </div>
        </div>

        {/* BB Revenue Summary */}
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <h4 className="font-bold text-amber-900 mb-3">Step 5: Benefits Builder Revenue</h4>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex justify-between">
              <span>EE Fee = ${benefitAmount.toFixed(2)} × {employeeRate}%</span>
              <span>${employeeFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>ER Fee = ${benefitAmount.toFixed(2)} × {employerRate}%</span>
              <span>${employerFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-amber-300 pt-2">
              <span>Total BB Revenue/Pay</span>
              <span>${bbTotalFees.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>BB Revenue/Month = ${bbTotalFees.toFixed(2)} × ({payPeriodsPerYear}/12)</span>
              <span>${(bbTotalFees * payPeriodsPerYear / 12).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>BB Revenue/Year = ${bbTotalFees.toFixed(2)} × {payPeriodsPerYear}</span>
              <span>${(bbTotalFees * payPeriodsPerYear).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
