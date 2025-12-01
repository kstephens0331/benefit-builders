// Proposal calculation logic for Benefits Builder proposals
// Calculates projected Section 125 savings BEFORE employee election

import { calculateSection125Amount, CompanyTier, FilingStatus, monthlyToPerPay } from './section125';

/**
 * Calculate proposal metrics for an employee
 * This calculates PROJECTED savings assuming the employee will elect Section 125
 */
export function calculateProposalMetrics(
  paycheckGross: number,
  payFreq: string,
  maritalStatus: string,
  dependents: number,
  state: string,
  modelPercentage: string, // e.g., "5/3" for 5% employee, 3% employer
  tier: CompanyTier = '2025',
  safetyCapPercent: number = 50 // Max % of gross that can be deducted
) {
  // Parse model percentage
  const [employeeRateStr, employerRateStr] = modelPercentage.split("/");
  const employeeRate = parseFloat(employeeRateStr) || 5;
  const employerRate = parseFloat(employerRateStr) || 3;

  // Convert pay frequency to periods per year
  const payFreqMap: Record<string, number> = {
    W: 52,    // Weekly
    B: 26,    // Bi-Weekly
    S: 24,    // Semi-Monthly
    M: 12,    // Monthly
    A: 1,     // Annual
  };
  const periodsPerYear = payFreqMap[payFreq] || 26;
  const periodsPerMonth = periodsPerYear / 12;

  // Calculate monthly gross
  const monthlyGross = paycheckGross * periodsPerMonth;

  // Get filing status for Section 125 calculation
  const filingStatus: FilingStatus = maritalStatus === 'M' ? 'married' : 'single';

  // Calculate TARGET monthly Section 125 amount from tier
  const targetMonthly = calculateSection125Amount(tier, filingStatus, dependents);

  // Apply safety cap - max deduction as % of gross
  const maxMonthlyDeduction = monthlyGross * (safetyCapPercent / 100);
  const safeMonthly = Math.min(targetMonthly, maxMonthlyDeduction);

  // Convert to per-pay amount for calculations
  const payPeriodCode = payFreq === 'W' ? 'w' : payFreq === 'B' ? 'b' : payFreq === 'S' ? 's' : payFreq === 'M' ? 'm' : 'b';
  const benefitPerPay = monthlyToPerPay(safeMonthly, payPeriodCode);

  // FICA rates
  const ssRate = 0.062;
  const medRate = 0.0145;
  const ficaRate = ssRate + medRate; // 7.65%

  // Calculate taxes WITHOUT Section 125 (current situation)
  // Federal withholding estimate (simplified - ~12% for most brackets)
  const estFedWithholdingRate = 0.12;
  const beforeFIT = paycheckGross * estFedWithholdingRate;
  const beforeFICA = paycheckGross * ficaRate;
  const beforeTotalTax = beforeFIT + beforeFICA;
  const beforeNetPay = paycheckGross - beforeTotalTax;

  // Calculate taxes WITH Section 125
  // The benefit amount is a PRE-TAX deduction
  const taxablePayWithSection125 = paycheckGross - benefitPerPay;
  const afterFIT = taxablePayWithSection125 * estFedWithholdingRate;
  const afterFICA = taxablePayWithSection125 * ficaRate;
  const afterTotalTax = afterFIT + afterFICA;

  // Employee fee (percentage of benefit amount)
  const employeeFeePerPay = benefitPerPay * (employeeRate / 100);
  const employerFeePerPay = benefitPerPay * (employerRate / 100);

  // Net pay WITH Section 125 = Gross - Reduced Taxes - Employee Fee
  const afterNetPay = paycheckGross - afterTotalTax - employeeFeePerPay;

  // Employee tax savings per pay
  const employeeTaxSavingsPerPay = beforeTotalTax - afterTotalTax;

  // Employee net increase (what they actually take home more)
  const employeeNetIncreasePerPay = afterNetPay - beforeNetPay;

  // Employer FICA savings per pay
  const employerFicaSavingsPerPay = (paycheckGross * ficaRate) - (taxablePayWithSection125 * ficaRate);

  // Employer net savings (FICA savings - BB fee)
  const employerNetSavingsPerPay = employerFicaSavingsPerPay - employerFeePerPay;

  // Convert to monthly and annual amounts
  const employeeNetIncreaseMonthly = employeeNetIncreasePerPay * periodsPerMonth;
  const employeeNetIncreaseAnnual = employeeNetIncreasePerPay * periodsPerYear;

  const employerNetSavingsMonthly = employerNetSavingsPerPay * periodsPerMonth;
  const employerNetSavingsAnnual = employerNetSavingsPerPay * periodsPerYear;

  const employerFicaSavingsMonthly = employerFicaSavingsPerPay * periodsPerMonth;

  return {
    // Section 125 benefit amount
    grossBenefitAllotment: Math.round(benefitPerPay * 100) / 100,
    targetMonthly: targetMonthly,
    safeMonthly: Math.round(safeMonthly * 100) / 100,
    isCapped: safeMonthly < targetMonthly,

    // Employee metrics
    employeeNetIncreasePerPay: Math.round(employeeNetIncreasePerPay * 100) / 100,
    employeeNetIncreaseMonthly: Math.round(employeeNetIncreaseMonthly * 100) / 100,
    employeeNetIncreaseAnnual: Math.round(employeeNetIncreaseAnnual * 100) / 100,
    employeeFeePerPay: Math.round(employeeFeePerPay * 100) / 100,

    // Employer metrics
    employerFicaSavingsPerPay: Math.round(employerFicaSavingsPerPay * 100) / 100,
    employerFicaSavingsMonthly: Math.round(employerFicaSavingsMonthly * 100) / 100,
    employerFeePerPay: Math.round(employerFeePerPay * 100) / 100,
    employerNetSavingsPerPay: Math.round(employerNetSavingsPerPay * 100) / 100,
    employerNetSavingsMonthly: Math.round(employerNetSavingsMonthly * 100) / 100,
    employerNetSavingsAnnual: Math.round(employerNetSavingsAnnual * 100) / 100,

    // Legacy fields for backward compatibility
    netMonthlySavings: Math.round(employerNetSavingsMonthly * 100) / 100,
    netAnnualSavings: Math.round(employerNetSavingsAnnual * 100) / 100,
  };
}

/**
 * Format pay frequency code to full name
 */
export function formatPayFrequency(code: string): string {
  const map: Record<string, string> = {
    W: "Weekly",
    B: "Bi-Weekly",
    S: "Semi-Monthly",
    M: "Monthly",
    A: "Annual",
  };
  return map[code] || code;
}

/**
 * Format marital status code to full name
 */
export function formatMaritalStatus(code: string): string {
  const map: Record<string, string> = {
    S: "Single",
    M: "Married",
    HOH: "Head of Household",
  };
  return map[code] || code;
}
