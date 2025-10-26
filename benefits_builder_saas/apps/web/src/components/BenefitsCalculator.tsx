"use client";

import { useState } from "react";
import { calcFICA, calcFITFromTable } from "@/lib/tax";

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
  };
  fedRates: {
    ss_rate: number;
    med_rate: number;
  };
  fedWithholding: Array<{
    over: number;
    base_tax: number;
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
  const [hypotheticalAmount, setHypotheticalAmount] = useState<number>(enrolledBenefits || 0);

  const grossPay = Number(employee.gross_pay) || 0;
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

  // Calculate with the hypothetical amount
  const benefitAmount = hypotheticalAmount;

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

  const afterNetPay = grossPay - benefitAmount - afterTotalTax - employeeFee;

  // Savings
  const employeeTaxSavings = beforeTotalTax - afterTotalTax;
  const employeeNetIncrease = afterNetPay - beforeNetPay;
  const employerFICASavings = beforeFICA.fica - afterFICA.fica;
  const employerNetSavings = employerFICASavings - employerFee;
  const bbTotalFees = employerFee + employeeFee;

  return (
    <div className="space-y-6">
      {/* Calculator Input */}
      <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl shadow-lg border-2 border-blue-200">
        <h3 className="text-lg font-bold text-blue-900 mb-4">
          💰 Benefits Calculator
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Enter Pre-Tax Benefit Amount (per paycheck):
            </label>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 font-semibold">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={hypotheticalAmount}
                  onChange={(e) => setHypotheticalAmount(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-4 py-3 text-lg font-semibold border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  placeholder="0.00"
                />
              </div>
              <button
                onClick={() => setHypotheticalAmount(0)}
                className="px-4 py-3 bg-slate-200 hover:bg-slate-300 rounded-lg text-sm font-medium"
              >
                Reset
              </button>
            </div>
          </div>
          {hypotheticalAmount > 0 && (
            <div className="text-sm text-blue-800 bg-blue-100 p-3 rounded-lg">
              <strong>Tip:</strong> Try different amounts to see how tax savings change!
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
              <span className="text-slate-900">Total Deductions:</span>
              <span className="text-green-700">
                -${(benefitAmount + afterTotalTax + employeeFee).toFixed(2)}
              </span>
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
