// Proposal calculation logic for Benefits Builder proposals

/**
 * Calculate proposal metrics for an employee
 * Based on the Benefits Booster model
 */
export function calculateProposalMetrics(
  paycheckGross: number,
  payFreq: string,
  maritalStatus: string,
  dependents: number,
  state: string,
  modelPercentage: string // e.g., "5/1" for 5% employee, 1% employer
) {
  // Parse model percentage
  const [employeeRateStr, employerRateStr] = modelPercentage.split("/");
  const employeeRate = parseFloat(employeeRateStr) / 100 || 0.05;
  const employerRate = parseFloat(employerRateStr) / 100 || 0.01;

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

  // Calculate annual gross
  const annualGross = paycheckGross * periodsPerYear;

  // Calculate Section 125 safe harbor limit (5% or $5,000 cap)
  const safetyCapPercent = annualGross * 0.05;
  const safetyCapFixed = 5000;
  const safetyCap = Math.min(safetyCapPercent, safetyCapFixed);

  // Calculate gross benefit allotment (annual pretax amount)
  // This is the amount the employee can contribute pretax
  // Using the employee rate from model percentage
  const grossBenefitAnnual = Math.min(annualGross * employeeRate, safetyCap);
  const grossBenefitMonthly = grossBenefitAnnual / 12;

  // Calculate employer FICA savings
  // Employer saves 7.65% FICA on the pretax amount
  const ficaRate = 0.0765;
  const employerFicaSavingsAnnual = grossBenefitAnnual * ficaRate;
  const employerFicaSavingsMonthly = employerFicaSavingsAnnual / 12;

  // Calculate employer fee (charged by Benefits Builder)
  // Based on the employer rate from model percentage
  const employerFeeAnnual = grossBenefitAnnual * employerRate / 0.05; // Normalize to the pretax amount
  const employerFeeMonthly = employerFeeAnnual / 12;

  // Net savings = FICA savings - BB fee
  const netMonthlySavings = employerFicaSavingsMonthly - employerFeeMonthly;
  const netAnnualSavings = employerFicaSavingsAnnual - employerFeeAnnual;

  // Different savings rate based on marital status
  // Single: $18.55/month ($222.60/year)
  // Married: $29.15/month ($349.80/year)
  // HOH: $29.15/month ($349.80/year)
  const standardMonthlySavings = maritalStatus === "S" ? 18.55 : 29.15;
  const standardAnnualSavings = maritalStatus === "S" ? 222.60 : 349.80;

  return {
    grossBenefitAllotment: Math.round(grossBenefitMonthly * 100) / 100,
    netMonthlySavings: standardMonthlySavings,
    netAnnualSavings: standardAnnualSavings,
    employerFicaSavings: Math.round(employerFicaSavingsMonthly * 100) / 100,
    employerFee: Math.round(employerFeeMonthly * 100) / 100,
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
