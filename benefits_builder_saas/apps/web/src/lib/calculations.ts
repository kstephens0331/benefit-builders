/**
 * Benefit Calculations
 * FICA tax savings and benefit amount calculations
 */

import { getModelRates } from './models';

/**
 * Calculate FICA tax savings (7.65% of gross wages)
 * @param grossWages - Annual gross wages
 * @param options - Optional parameters for wage base and Medicare additional tax
 * @returns FICA savings amount rounded to 2 decimal places
 */
export function calculateFICASavings(
  grossWages: number,
  options?: {
    wageBase?: number;
    includeMedicareAdditional?: boolean;
    medicareThreshold?: number;
  }
): number {
  if (grossWages === 0) return 0;

  const socialSecurityRate = 0.062; // 6.2%
  const medicareRate = 0.0145; // 1.45%
  const medicareAdditionalRate = 0.009; // 0.9%
  const standardFicaRate = 0.0765; // 7.65%

  // If no wage base specified, use standard FICA rate
  if (!options?.wageBase) {
    let savings = grossWages * standardFicaRate;

    // Include additional Medicare tax if specified
    if (options?.includeMedicareAdditional && options?.medicareThreshold) {
      const excessWages = Math.max(0, grossWages - options.medicareThreshold);
      savings += excessWages * medicareAdditionalRate;
    }

    return Math.round(savings * 100) / 100;
  }

  // Calculate with wage base cap on Social Security
  const socialSecurityWages = Math.min(grossWages, options.wageBase);
  const socialSecurityTax = socialSecurityWages * socialSecurityRate;

  // Medicare applies to all wages
  const medicareTax = grossWages * medicareRate;

  let savings = socialSecurityTax + medicareTax;

  // Include additional Medicare tax if specified
  if (options?.includeMedicareAdditional && options?.medicareThreshold) {
    const excessWages = Math.max(0, grossWages - options.medicareThreshold);
    savings += excessWages * medicareAdditionalRate;
  }

  return Math.round(savings * 100) / 100;
}

/**
 * Calculate benefit amount based on billing model
 * The benefit is the portion of FICA savings available to the employee
 * @param ficaSavings - Total FICA savings
 * @param model - Billing model (e.g., "5/3", "5/0", "4/4")
 * @returns Benefit amount (full FICA savings in most cases)
 */
export function calculateBenefitAmount(ficaSavings: number, model: string): number {
  // For these calculations, the benefit amount is the full FICA savings
  // The model determines how fees are split, not the benefit amount itself
  return ficaSavings;
}

/**
 * Calculate employer share (contribution) based on model
 * @param grossWages - Annual gross wages
 * @param model - Billing model (e.g., "5/3", "5/0", "4/4")
 * @returns Employer contribution amount
 */
export function calculateEmployerShare(grossWages: number, model: string): number {
  const [, employerRate] = getModelRates(model);
  return Math.round(grossWages * employerRate * 100) / 100;
}

/**
 * Calculate employee share (contribution) based on model
 * @param grossWages - Annual gross wages
 * @param model - Billing model (e.g., "5/3", "5/0", "4/4")
 * @returns Employee contribution amount
 */
export function calculateEmployeeShare(grossWages: number, model: string): number {
  const [employeeRate] = getModelRates(model);
  return Math.round(grossWages * employeeRate * 100) / 100;
}

/**
 * Apply billing model to calculate all components
 * @param employee - Employee data with gross_wages
 * @param model - Billing model (e.g., "5/3", "5/0", "4/4")
 * @returns Complete calculation results
 */
export function applyBillingModel(
  employee: { gross_wages: number; filing_status?: string; exemptions?: number },
  model: string
): {
  fica_savings: number;
  employee_benefit: number;
  employer_contribution: number;
  our_fee: number;
} {
  const grossWages = employee.gross_wages;
  const ficaSavings = calculateFICASavings(grossWages);
  const employeeBenefit = calculateEmployeeShare(grossWages, model);
  const employerContribution = calculateEmployerShare(grossWages, model);

  // Our fee is the employee contribution (employee rate applied to gross wages)
  const ourFee = employeeBenefit;

  return {
    fica_savings: ficaSavings,
    employee_benefit: employeeBenefit,
    employer_contribution: employerContribution,
    our_fee: ourFee,
  };
}
