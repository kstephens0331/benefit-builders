"use client";

import { useState } from "react";
import { calcFICA, calcFITFromTable } from "@/lib/tax";
import { calculateSection125Amount, calculateSafeSection125Deduction, checkSection125Affordability, monthlyToPerPay, type CompanyTier, type FilingStatus } from "@/lib/section125";

type Props = {
  employee: {
    gross_pay: number;
    filing_status: string;
    dependents: number;
    pay_period: string;
  };
  company: {
    model: string;
    employer_rate: number;
    employee_rate: number;
    tier: CompanyTier;
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
  enrolledBenefits: number; // Current enrolled amount
};

export default function BenefitsCalculator({
  employee,
  company,
  fedRates,
  fedWithholding,
  enrolledBenefits,
}: Props) {
  const grossPay = Number(employee.gross_pay) || 0;

  // Check affordability and get safe deduction amount
  const affordability = checkSection125Affordability(
    company.tier,
    employee.filing_status as FilingStatus,
    employee.dependents,
    grossPay,
    employee.pay_period,
    50 // Max 50% of gross pay (matches current Benefits Booster model)
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
  const dependentAllowancePerPay = (employee.dependents || 0) * (2000 / payPeriodsPerYear);

  // Use the automatically calculated Section 125 amount
  const benefitAmount = section125PerPaycheck;

  // BEFORE (no benefits)
  const beforeFICA = calcFICA(grossPay, 0, ssRate, medRate);
  const beforeFITTaxable = Math.max(
    0,
    grossPay - standardDeductionPerPay - dependentAllowancePerPay
  );
  const beforeFIT =
    fedWithholding && fedWithholding.length > 0
      ? calcFITFromTable(beforeFITTaxable, fedWithholding)
      : beforeFITTaxable * 0.12;
  const beforeTotalTax = beforeFICA.fica + beforeFIT;
  const beforeNetPay = grossPay - beforeTotalTax;

  // AFTER (with benefits)
  const afterFICA = calcFICA(grossPay, benefitAmount, ssRate, medRate);
  const afterFITTaxable = Math.max(
    0,
    grossPay - benefitAmount - standardDeductionPerPay - dependentAllowancePerPay
  );
  const afterFIT =
    fedWithholding && fedWithholding.length > 0
      ? calcFITFromTable(afterFITTaxable, fedWithholding)
      : afterFITTaxable * 0.12;
  const afterTotalTax = afterFICA.fica + afterFIT;

  const employeeFee = benefitAmount * (employeeRate / 100);
  const employerFee = benefitAmount * (employerRate / 100);

  // Calculate the plan distribution (benefit amount returned to employee after EE fee deducted)
  // Formula: Plan Distribution % = (100 - Employee Rate)%
  // Examples: 5/1 model → 95% back, 4/3 model → 96% back, 3/4 model → 97% back, 5/3 model → 95% back
  const planDistributionPercent = (100 - employeeRate) / 100;
  const planDistribution = benefitAmount * planDistributionPercent;

  // Net pay BEFORE adding back plan distribution
  const afterNetPayBeforeDistribution = grossPay - benefitAmount - afterTotalTax - employeeFee;

  // Final net pay AFTER adding back plan distribution
  const afterNetPay = afterNetPayBeforeDistribution + planDistribution;

  // Savings
  const employeeTaxSavings = beforeTotalTax - afterTotalTax;
  const employeeNetIncrease = afterNetPay - beforeNetPay;
  const employerFICASavings = beforeFICA.fica - afterFICA.fica;
  const employerNetSavings = employerFICASavings - employerFee;
  const bbTotalFees = employerFee + employeeFee;

  return (
    <div className="space-y-6">
      {/* Auto-Calculated Section 125 Amount Display */}
      <div className={`p-6 rounded-2xl shadow-lg border-2 ${
        hasShortfall
          ? 'bg-gradient-to-br from-yellow-50 to-orange-100 border-yellow-400'
          : 'bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200'
      }`}>
        <h3 className={`text-lg font-bold mb-4 ${hasShortfall ? 'text-orange-900' : 'text-blue-900'}`}>
          💰 Section 125 Calculation
        </h3>

        {hasShortfall && (
          <div className="mb-4 p-4 bg-red-100 border-2 border-red-400 rounded-lg">
            <div className="font-bold text-red-900 mb-2">⚠️ INSUFFICIENT GROSS PAY</div>
            <div className="text-sm text-red-800 space-y-1">
              <div>Target Monthly: <strong>${affordability.targetMonthly.toFixed(2)}</strong></div>
              <div>Safe Monthly (capped at 50% of gross): <strong>${affordability.safeMonthly.toFixed(2)}</strong></div>
              <div className="text-red-900 font-bold">Shortfall: ${affordability.shortfallMonthly.toFixed(2)}/month</div>
              <div className="mt-2 text-xs">
                Employee's gross pay is too low for the full Section 125 benefit based on their tier.
                Deduction capped at {affordability.percentOfGross.toFixed(1)}% of gross pay (maximum 50%).
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-slate-600">Company Tier</div>
            <div className={`text-lg font-bold ${hasShortfall ? 'text-orange-900' : 'text-blue-900'}`}>
              {company.tier.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </div>
          </div>
          <div>
            <div className="text-sm text-slate-600">
              {hasShortfall ? 'Safe Monthly Amount' : 'Monthly Amount'}
              {hasShortfall && <span className="text-red-600 ml-1">*CAPPED*</span>}
            </div>
            <div className={`text-lg font-bold ${hasShortfall ? 'text-orange-900' : 'text-blue-900'}`}>
              ${monthlySection125Amount.toFixed(2)}
              {hasShortfall && (
                <div className="text-xs text-red-600 font-normal mt-1">
                  Target: ${affordability.targetMonthly.toFixed(2)}
                </div>
              )}
            </div>
          </div>
          <div>
            <div className="text-sm text-slate-600">
              {hasShortfall ? 'Safe Per Paycheck' : 'Per Paycheck Amount'}
              {hasShortfall && <span className="text-red-600 ml-1">*CAPPED*</span>}
            </div>
            <div className={`text-2xl font-bold ${hasShortfall ? 'text-orange-900' : 'text-blue-900'}`}>
              ${section125PerPaycheck.toFixed(2)}
              {hasShortfall && (
                <div className="text-xs text-red-600 font-normal mt-1">
                  Target: ${affordability.targetPerPaycheck.toFixed(2)}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className={`mt-4 text-sm p-3 rounded-lg ${
          hasShortfall
            ? 'text-orange-800 bg-orange-100'
            : 'text-blue-800 bg-blue-100'
        }`}>
          <strong>Auto-calculated</strong> based on filing status ({employee.filing_status}) and dependents ({employee.dependents})
          {hasShortfall && (
            <div className="mt-2 font-bold text-red-700">
              Note: Deduction reduced to prevent exceeding 50% of gross pay
            </div>
          )}
        </div>
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
              <span className="text-slate-900">Pay (Net of Taxes):</span>
              <span className="text-green-700">
                ${afterNetPayBeforeDistribution.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700">
                Plan Distribution ({(planDistributionPercent * 100).toFixed(0)}%):
              </span>
              <span className="font-medium text-green-700">
                +${planDistribution.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between font-bold text-lg bg-green-200 -mx-6 px-6 py-3 mt-3">
              <span className="text-slate-900">FINAL NET PAY:</span>
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
              <span className="font-semibold">
                ${employeeNetIncrease.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-xs opacity-75 mt-1">
              <span>After {employeeRate}% BB fee</span>
            </div>
          </div>
        </div>

        {/* Employer Savings */}
        <div className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl shadow-lg">
          <h3 className="text-sm font-medium opacity-90 mb-2">
            Employer FICA Savings
          </h3>
          <div className="text-4xl font-bold mb-2">
            ${employerFICASavings.toFixed(2)}
          </div>
          <div className="text-sm opacity-90">per paycheck</div>
          <div className="mt-4 pt-4 border-t border-purple-400 text-sm">
            <div className="flex justify-between">
              <span>Before BB:</span>
              <span className="font-semibold">${employerFICASavings.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold mt-2">
              <span>After BB:</span>
              <span>${employerNetSavings.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Benefits Builder Revenue */}
        <div className="p-6 bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl shadow-lg">
          <h3 className="text-sm font-medium opacity-90 mb-2">
            Benefits Builder Fees
          </h3>
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
    </div>
  );
}
