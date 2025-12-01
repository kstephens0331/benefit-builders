// Proposal calculation logic for Benefits Builder proposals
// Calculates projected Section 125 savings BEFORE employee election

import { calculateSection125Amount, CompanyTier, FilingStatus, monthlyToPerPay } from './section125';

// State tax bracket structure
type TaxBracket = { over: number; rate: number };

// Complete State tax configurations for 2025
// Based on actual state tax laws and IRS guidelines
export const STATE_TAX_CONFIG: Record<string, { method: 'none' | 'flat' | 'brackets'; flatRate?: number; brackets?: TaxBracket[]; standardDeduction?: number; personalExemption?: number; dependentExemption?: number }> = {
  // ============ NO INCOME TAX STATES ============
  AK: { method: 'none' },
  FL: { method: 'none' },
  NV: { method: 'none' },
  NH: { method: 'none' }, // Only taxes interest/dividends
  SD: { method: 'none' },
  TN: { method: 'none' }, // Phased out income tax
  TX: { method: 'none' },
  WA: { method: 'none' },
  WY: { method: 'none' },

  // ============ FLAT TAX STATES ============
  AZ: { method: 'flat', flatRate: 0.025, standardDeduction: 14600 },
  CO: { method: 'flat', flatRate: 0.044 },
  GA: { method: 'flat', flatRate: 0.0549, standardDeduction: 14600 },
  ID: { method: 'flat', flatRate: 0.058, standardDeduction: 14600 },
  IL: { method: 'flat', flatRate: 0.0495, personalExemption: 2625, dependentExemption: 2625 },
  IN: { method: 'flat', flatRate: 0.0305, personalExemption: 1000, dependentExemption: 1000 },
  IA: { method: 'flat', flatRate: 0.038, personalExemption: 40, dependentExemption: 40 },
  KY: { method: 'flat', flatRate: 0.04, standardDeduction: 3160 },
  MA: { method: 'flat', flatRate: 0.05, personalExemption: 4400, dependentExemption: 1000 },
  MI: { method: 'flat', flatRate: 0.0405, personalExemption: 5600, dependentExemption: 5600 },
  MS: { method: 'flat', flatRate: 0.047, standardDeduction: 2300, personalExemption: 6000, dependentExemption: 1500 },
  NC: { method: 'flat', flatRate: 0.0475, standardDeduction: 14600 },
  ND: { method: 'flat', flatRate: 0.019 },
  OH: { method: 'flat', flatRate: 0.035 },
  PA: { method: 'flat', flatRate: 0.0307 },
  UT: { method: 'flat', flatRate: 0.0465 },

  // ============ PROGRESSIVE/BRACKET STATES ============

  // Alabama
  AL: {
    method: 'brackets',
    standardDeduction: 3000,
    personalExemption: 1500,
    dependentExemption: 500,
    brackets: [
      { over: 0, rate: 0.02 },
      { over: 500, rate: 0.04 },
      { over: 3000, rate: 0.05 }
    ]
  },

  // Arkansas
  AR: {
    method: 'brackets',
    standardDeduction: 2340,
    personalExemption: 29,
    dependentExemption: 29,
    brackets: [
      { over: 0, rate: 0.02 },
      { over: 5099, rate: 0.04 },
      { over: 10299, rate: 0.044 }
    ]
  },

  // California
  CA: {
    method: 'brackets',
    standardDeduction: 5540,
    personalExemption: 144,
    dependentExemption: 446,
    brackets: [
      { over: 0, rate: 0.01 },
      { over: 10412, rate: 0.02 },
      { over: 24684, rate: 0.04 },
      { over: 38959, rate: 0.06 },
      { over: 54081, rate: 0.08 },
      { over: 68350, rate: 0.093 },
      { over: 349137, rate: 0.103 },
      { over: 418961, rate: 0.113 },
      { over: 698271, rate: 0.123 }
    ]
  },

  // Connecticut
  CT: {
    method: 'brackets',
    personalExemption: 15000,
    brackets: [
      { over: 0, rate: 0.02 },
      { over: 10000, rate: 0.045 },
      { over: 50000, rate: 0.055 },
      { over: 100000, rate: 0.06 },
      { over: 200000, rate: 0.065 },
      { over: 250000, rate: 0.069 },
      { over: 500000, rate: 0.0699 }
    ]
  },

  // Delaware
  DE: {
    method: 'brackets',
    standardDeduction: 3250,
    personalExemption: 110,
    dependentExemption: 110,
    brackets: [
      { over: 0, rate: 0 },
      { over: 2000, rate: 0.022 },
      { over: 5000, rate: 0.039 },
      { over: 10000, rate: 0.048 },
      { over: 20000, rate: 0.052 },
      { over: 25000, rate: 0.0555 },
      { over: 60000, rate: 0.066 }
    ]
  },

  // Hawaii
  HI: {
    method: 'brackets',
    standardDeduction: 4400,
    personalExemption: 1144,
    dependentExemption: 1144,
    brackets: [
      { over: 0, rate: 0.014 },
      { over: 2400, rate: 0.032 },
      { over: 4800, rate: 0.055 },
      { over: 9600, rate: 0.064 },
      { over: 14400, rate: 0.068 },
      { over: 19200, rate: 0.072 },
      { over: 24000, rate: 0.076 },
      { over: 36000, rate: 0.079 },
      { over: 48000, rate: 0.0825 },
      { over: 150000, rate: 0.09 },
      { over: 175000, rate: 0.10 },
      { over: 200000, rate: 0.11 }
    ]
  },

  // Kansas
  KS: {
    method: 'brackets',
    standardDeduction: 3500,
    personalExemption: 2250,
    dependentExemption: 2250,
    brackets: [
      { over: 0, rate: 0.031 },
      { over: 15000, rate: 0.0525 },
      { over: 30000, rate: 0.057 }
    ]
  },

  // Louisiana
  LA: {
    method: 'brackets',
    personalExemption: 4500,
    dependentExemption: 1000,
    brackets: [
      { over: 0, rate: 0.0185 },
      { over: 12500, rate: 0.035 },
      { over: 50000, rate: 0.0425 }
    ]
  },

  // Maine
  ME: {
    method: 'brackets',
    standardDeduction: 14600,
    brackets: [
      { over: 0, rate: 0.058 },
      { over: 26050, rate: 0.0675 },
      { over: 61600, rate: 0.0715 }
    ]
  },

  // Maryland
  MD: {
    method: 'brackets',
    standardDeduction: 2550,
    personalExemption: 3200,
    dependentExemption: 3200,
    brackets: [
      { over: 0, rate: 0.02 },
      { over: 1000, rate: 0.03 },
      { over: 2000, rate: 0.04 },
      { over: 3000, rate: 0.0475 },
      { over: 100000, rate: 0.05 },
      { over: 125000, rate: 0.0525 },
      { over: 150000, rate: 0.055 },
      { over: 250000, rate: 0.0575 }
    ]
  },

  // Minnesota
  MN: {
    method: 'brackets',
    standardDeduction: 14575,
    brackets: [
      { over: 0, rate: 0.0535 },
      { over: 31690, rate: 0.068 },
      { over: 104090, rate: 0.0785 },
      { over: 183340, rate: 0.0985 }
    ]
  },

  // Missouri
  MO: {
    method: 'brackets',
    standardDeduction: 14600,
    brackets: [
      { over: 0, rate: 0 },
      { over: 1207, rate: 0.02 },
      { over: 2414, rate: 0.025 },
      { over: 3621, rate: 0.03 },
      { over: 4828, rate: 0.035 },
      { over: 6035, rate: 0.04 },
      { over: 7242, rate: 0.045 },
      { over: 8449, rate: 0.048 }
    ]
  },

  // Montana
  MT: {
    method: 'brackets',
    standardDeduction: 5730,
    personalExemption: 3200,
    dependentExemption: 3200,
    brackets: [
      { over: 0, rate: 0.01 },
      { over: 3600, rate: 0.02 },
      { over: 6500, rate: 0.03 },
      { over: 10100, rate: 0.04 },
      { over: 13700, rate: 0.05 },
      { over: 17600, rate: 0.06 },
      { over: 22700, rate: 0.065 }
    ]
  },

  // Nebraska
  NE: {
    method: 'brackets',
    personalExemption: 157,
    dependentExemption: 157,
    brackets: [
      { over: 0, rate: 0.0246 },
      { over: 3700, rate: 0.0351 },
      { over: 22170, rate: 0.0501 },
      { over: 35730, rate: 0.0584 }
    ]
  },

  // New Jersey
  NJ: {
    method: 'brackets',
    personalExemption: 1000,
    dependentExemption: 1500,
    brackets: [
      { over: 0, rate: 0.014 },
      { over: 20000, rate: 0.0175 },
      { over: 35000, rate: 0.035 },
      { over: 40000, rate: 0.05525 },
      { over: 75000, rate: 0.0637 },
      { over: 500000, rate: 0.0897 },
      { over: 1000000, rate: 0.1075 }
    ]
  },

  // New Mexico
  NM: {
    method: 'brackets',
    standardDeduction: 14600,
    brackets: [
      { over: 0, rate: 0.017 },
      { over: 5500, rate: 0.032 },
      { over: 11000, rate: 0.047 },
      { over: 16000, rate: 0.049 },
      { over: 210000, rate: 0.059 }
    ]
  },

  // New York
  NY: {
    method: 'brackets',
    standardDeduction: 8500,
    brackets: [
      { over: 0, rate: 0.04 },
      { over: 8500, rate: 0.045 },
      { over: 11700, rate: 0.0525 },
      { over: 13900, rate: 0.055 },
      { over: 80650, rate: 0.06 },
      { over: 215400, rate: 0.0685 },
      { over: 1077550, rate: 0.0965 },
      { over: 5000000, rate: 0.103 },
      { over: 25000000, rate: 0.109 }
    ]
  },

  // Oklahoma
  OK: {
    method: 'brackets',
    standardDeduction: 6350,
    personalExemption: 1000,
    dependentExemption: 1000,
    brackets: [
      { over: 0, rate: 0.0025 },
      { over: 1000, rate: 0.0075 },
      { over: 2500, rate: 0.0175 },
      { over: 3750, rate: 0.0275 },
      { over: 4900, rate: 0.0375 },
      { over: 7200, rate: 0.0475 }
    ]
  },

  // Oregon
  OR: {
    method: 'brackets',
    standardDeduction: 2745,
    personalExemption: 236,
    dependentExemption: 236,
    brackets: [
      { over: 0, rate: 0.0475 },
      { over: 4300, rate: 0.0675 },
      { over: 10750, rate: 0.0875 },
      { over: 125000, rate: 0.099 }
    ]
  },

  // Rhode Island
  RI: {
    method: 'brackets',
    standardDeduction: 10550,
    personalExemption: 4850,
    brackets: [
      { over: 0, rate: 0.0375 },
      { over: 77450, rate: 0.0475 },
      { over: 176050, rate: 0.0599 }
    ]
  },

  // South Carolina
  SC: {
    method: 'brackets',
    standardDeduction: 14600,
    brackets: [
      { over: 0, rate: 0 },
      { over: 3460, rate: 0.03 },
      { over: 17330, rate: 0.064 }
    ]
  },

  // Vermont
  VT: {
    method: 'brackets',
    standardDeduction: 7200,
    personalExemption: 4850,
    dependentExemption: 4850,
    brackets: [
      { over: 0, rate: 0.0335 },
      { over: 45400, rate: 0.066 },
      { over: 110050, rate: 0.076 },
      { over: 229550, rate: 0.0875 }
    ]
  },

  // Virginia
  VA: {
    method: 'brackets',
    standardDeduction: 4500,
    personalExemption: 930,
    dependentExemption: 930,
    brackets: [
      { over: 0, rate: 0.02 },
      { over: 3000, rate: 0.03 },
      { over: 5000, rate: 0.05 },
      { over: 17000, rate: 0.0575 }
    ]
  },

  // West Virginia
  WV: {
    method: 'brackets',
    personalExemption: 2000,
    dependentExemption: 2000,
    brackets: [
      { over: 0, rate: 0.0236 },
      { over: 10000, rate: 0.0315 },
      { over: 25000, rate: 0.0354 },
      { over: 40000, rate: 0.0472 },
      { over: 60000, rate: 0.0512 }
    ]
  },

  // Wisconsin
  WI: {
    method: 'brackets',
    standardDeduction: 13230,
    personalExemption: 700,
    dependentExemption: 700,
    brackets: [
      { over: 0, rate: 0.0354 },
      { over: 14320, rate: 0.0465 },
      { over: 28640, rate: 0.0530 },
      { over: 315310, rate: 0.0765 }
    ]
  },

  // DC
  DC: {
    method: 'brackets',
    standardDeduction: 14600,
    brackets: [
      { over: 0, rate: 0.04 },
      { over: 10000, rate: 0.06 },
      { over: 40000, rate: 0.065 },
      { over: 60000, rate: 0.085 },
      { over: 250000, rate: 0.0925 },
      { over: 500000, rate: 0.0975 },
      { over: 1000000, rate: 0.1075 }
    ]
  }
};

/**
 * Calculate state income tax based on annual taxable income
 * Uses proper bracket calculations for states like MO
 */
export function calculateStateTax(annualTaxableIncome: number, state: string): number {
  const stateUpper = (state || 'MO').toUpperCase();
  const config = STATE_TAX_CONFIG[stateUpper];

  if (!config || config.method === 'none') {
    return 0;
  }

  // Apply standard deduction if applicable
  const taxableAfterDeduction = Math.max(0, annualTaxableIncome - (config.standardDeduction || 0));

  if (config.method === 'flat') {
    return taxableAfterDeduction * (config.flatRate || 0);
  }

  // Bracket calculation
  if (config.method === 'brackets' && config.brackets) {
    let tax = 0;
    const brackets = config.brackets;

    for (let i = 0; i < brackets.length; i++) {
      const bracket = brackets[i];
      const nextBracket = brackets[i + 1];

      if (taxableAfterDeduction <= bracket.over) {
        break;
      }

      const bracketTop = nextBracket ? nextBracket.over : Infinity;
      const incomeInBracket = Math.min(taxableAfterDeduction, bracketTop) - bracket.over;

      if (incomeInBracket > 0) {
        tax += incomeInBracket * bracket.rate;
      }
    }

    return tax;
  }

  return 0;
}

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
  modelPercentage: string, // e.g., "5/3" for 5% employee, 3% employer (higher number is employee fee)
  tier: CompanyTier = '2025',
  safetyCapPercent: number = 50, // Max % of gross that can be deducted
  stateTaxRate?: number // Optional override for state tax rate
) {
  // Parse model percentage - HIGHER number is employee rate (first position)
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

  // Calculate annual income for state tax bracket calculations
  const annualGross = paycheckGross * periodsPerYear;
  const annualWithSection125 = (paycheckGross - benefitPerPay) * periodsPerYear;

  // Calculate state tax using proper brackets (annual basis then convert to per-pay)
  const stateUpperCase = (state || 'MO').toUpperCase();
  const beforeSITAnnual = stateTaxRate !== undefined
    ? annualGross * stateTaxRate
    : calculateStateTax(annualGross, stateUpperCase);
  const afterSITAnnual = stateTaxRate !== undefined
    ? annualWithSection125 * stateTaxRate
    : calculateStateTax(annualWithSection125, stateUpperCase);

  // Convert annual state tax to per-pay
  const beforeSIT = beforeSITAnnual / periodsPerYear;
  const afterSIT = afterSITAnnual / periodsPerYear;

  // Calculate taxes WITHOUT Section 125 (current situation)
  // Federal withholding estimate (simplified - ~12% for most brackets)
  const estFedWithholdingRate = 0.12;
  const beforeFIT = paycheckGross * estFedWithholdingRate;
  const beforeFICA = paycheckGross * ficaRate;
  const beforeTotalTax = beforeFIT + beforeSIT + beforeFICA;
  const beforeNetPay = paycheckGross - beforeTotalTax;

  // Calculate taxes WITH Section 125
  // The benefit amount is a PRE-TAX deduction
  const taxablePayWithSection125 = paycheckGross - benefitPerPay;
  const afterFIT = taxablePayWithSection125 * estFedWithholdingRate;
  const afterFICA = taxablePayWithSection125 * ficaRate;
  const afterTotalTax = afterFIT + afterSIT + afterFICA;

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

  // State tax savings per pay (difference between before and after Section 125)
  const stateTaxSavingsPerPay = beforeSIT - afterSIT;

  // Employer net savings (FICA savings - BB fee)
  const employerNetSavingsPerPay = employerFicaSavingsPerPay - employerFeePerPay;

  // Convert to monthly and annual amounts
  const employeeNetIncreaseMonthly = employeeNetIncreasePerPay * periodsPerMonth;
  const employeeNetIncreaseAnnual = employeeNetIncreasePerPay * periodsPerYear;

  const employerNetSavingsMonthly = employerNetSavingsPerPay * periodsPerMonth;
  const employerNetSavingsAnnual = employerNetSavingsPerPay * periodsPerYear;

  const employerFicaSavingsMonthly = employerFicaSavingsPerPay * periodsPerMonth;
  const stateTaxSavingsMonthly = stateTaxSavingsPerPay * periodsPerMonth;
  const stateTaxSavingsAnnual = stateTaxSavingsPerPay * periodsPerYear;

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

    // State tax savings (employee benefit from pre-tax deduction)
    stateTaxSavingsPerPay: Math.round(stateTaxSavingsPerPay * 100) / 100,
    stateTaxSavingsMonthly: Math.round(stateTaxSavingsMonthly * 100) / 100,
    stateTaxSavingsAnnual: Math.round(stateTaxSavingsAnnual * 100) / 100,
    stateTaxRate: stateUpperCase,

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
