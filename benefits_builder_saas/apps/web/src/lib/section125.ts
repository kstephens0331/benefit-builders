// Section 125 calculation utilities
// Determines monthly pre-tax benefit amounts based on company tier and employee details

export type CompanyTier = 'state_school' | '2025' | 'pre_2025' | 'original_6pct';
export type FilingStatus = 'single' | 'married' | 'head';

/**
 * Calculate the monthly Section 125 benefit amount based on company tier and employee details
 *
 * @param tier - The company's pricing tier
 * @param filingStatus - Employee's filing status (single, married, head)
 * @param dependents - Number of dependents
 * @returns Monthly Section 125 amount in dollars
 */
export function calculateSection125Amount(
  tier: CompanyTier,
  filingStatus: FilingStatus,
  dependents: number
): number {
  // Normalize filing status
  const status = filingStatus === 'head' ? 'single' : filingStatus;

  switch (tier) {
    case 'state_school':
      // All employees get $1,300/month
      return 1300;

    case '2025':
      // S/0 = $1,300, everything else = $1,700
      if (status === 'single' && dependents === 0) {
        return 1300;
      }
      return 1700;

    case 'pre_2025':
      // S/0 = $800
      if (status === 'single' && dependents === 0) {
        return 800;
      }
      // S/1+ = $1,200
      if (status === 'single' && dependents >= 1) {
        return 1200;
      }
      // M/0 = $1,200
      if (status === 'married' && dependents === 0) {
        return 1200;
      }
      // M/1+ = $1,600
      if (status === 'married' && dependents >= 1) {
        return 1600;
      }
      return 800; // fallback

    case 'original_6pct':
      // S/0 = $700
      if (status === 'single' && dependents === 0) {
        return 700;
      }
      // S/1+ = $1,100
      if (status === 'single' && dependents >= 1) {
        return 1100;
      }
      // M/0+ = $1,500
      if (status === 'married') {
        return 1500;
      }
      return 700; // fallback

    default:
      // Default to 2025 pricing if tier is unknown
      if (status === 'single' && dependents === 0) {
        return 1300;
      }
      return 1700;
  }
}

/**
 * Get the fee model rates based on company tier
 * Note: Most companies use the model field (e.g., "5/3"), but state schools have special rates
 *
 * @param tier - The company's pricing tier
 * @param model - The company's model (e.g., "5/3", "8", "7", "6")
 * @returns { employeeRate, employerRate } as percentages (e.g., 5 for 5%)
 */
export function getTierFeeRates(tier: CompanyTier, model: string): { employeeRate: number; employerRate: number } {
  // State schools always use 6% EE / 0% ER
  if (tier === 'state_school') {
    return { employeeRate: 6, employerRate: 0 };
  }

  // Original 6% clients use 1% EE / 5% ER
  if (tier === 'original_6pct') {
    return { employeeRate: 1, employerRate: 5 };
  }

  // For other tiers, parse the model field
  // Model can be "5/3", "8", "7", "6", etc.
  const parts = model.split('/');

  if (parts.length === 2) {
    // Format: "5/3" - first is EE, second is ER
    return {
      employeeRate: parseFloat(parts[0]) || 0,
      employerRate: parseFloat(parts[1]) || 0,
    };
  }

  // Single number format: "8", "7", "6"
  const total = parseFloat(model) || 0;

  if (total === 8) {
    return { employeeRate: 5, employerRate: 3 }; // 8% = 5% EE + 3% ER
  }
  if (total === 7) {
    return { employeeRate: 3, employerRate: 4 }; // 7% = 3% EE + 4% ER
  }
  if (total === 6) {
    return { employeeRate: 1, employerRate: 5 }; // 6% = 1% EE + 5% ER
  }

  // Default fallback: parse as "X/Y" format or return 0/0
  return { employeeRate: 0, employerRate: 0 };
}

/**
 * Convert annual amount to per-paycheck amount based on pay frequency
 *
 * @param annualAmount - Annual amount in dollars
 * @param payPeriod - Pay period code (w=weekly, b=biweekly, s=semimonthly, m=monthly)
 * @returns Per-paycheck amount
 */
export function annualToPerPay(annualAmount: number, payPeriod: string): number {
  const payPeriodsPerYear: Record<string, number> = {
    w: 52,     // weekly
    b: 26,     // biweekly
    s: 24,     // semimonthly
    m: 12,     // monthly
  };

  const periods = payPeriodsPerYear[payPeriod] || 26; // default to biweekly
  return annualAmount / periods;
}

/**
 * Convert monthly amount to per-paycheck amount based on pay frequency
 *
 * @param monthlyAmount - Monthly amount in dollars
 * @param payPeriod - Pay period code (w=weekly, b=biweekly, s=semimonthly, m=monthly)
 * @returns Per-paycheck amount
 */
export function monthlyToPerPay(monthlyAmount: number, payPeriod: string): number {
  const payPeriodsPerMonth: Record<string, number> = {
    w: 52 / 12,      // ~4.33 weekly
    b: 26 / 12,      // ~2.17 biweekly
    s: 24 / 12,      // 2 semimonthly
    m: 1,            // 1 monthly
  };

  const periods = payPeriodsPerMonth[payPeriod] || 26 / 12; // default to biweekly
  return monthlyAmount / periods;
}
