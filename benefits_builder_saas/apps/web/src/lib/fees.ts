// apps/web/src/lib/fees.ts
import type { BillingModel } from "./models";
import { getModelRates } from "./models";

/**
 * Computes monthly fees from the total monthly pre-tax amount.
 * Returns: employeeFeeMonthly, employerFeeMonthly, employeeRate, employerRate, feesLabel
 */
export function computeFeesForPretaxMonthly(
  pretaxMonthly: number,
  model: string | null | undefined
): {
  employeeFeeMonthly: number;
  employerFeeMonthly: number;
  employeeRate: number;
  employerRate: number;
  feesLabel: string;
} {
  const [employeeRate, employerRate] = getModelRates(model);
  const employeeFeeMonthly = +(pretaxMonthly * employeeRate).toFixed(2);
  const employerFeeMonthly = +(pretaxMonthly * employerRate).toFixed(2);
  const feesLabel = `${(employeeRate * 100).toFixed(1)}% / ${(employerRate * 100).toFixed(1)}%`;
  return { employeeFeeMonthly, employerFeeMonthly, employeeRate, employerRate, feesLabel };
}

/**
 * Convenience for showing multiple models at once (for proposal PDF).
 */
export function computeAllModels(
  pretaxMonthly: number,
  models: BillingModel[]
) {
  return models.map((m) => ({
    model: m,
    ...computeFeesForPretaxMonthly(pretaxMonthly, m),
  }));
}

/**
 * Profit-sharing modes:
 * - "none": No profit sharing
 * - "percent_er_savings": Share a % of employer FICA tax savings
 * - "percent_bb_profit": Share a % of BB's collected fees (employee + employer fees)
 */
export type ProfitShareMode = "none" | "percent_er_savings" | "percent_bb_profit";

export interface ProfitShareResult {
  profitShareAmount: number; // Amount to credit back (as positive number)
  profitShareCents: number;   // Amount in cents
  description: string;        // Human-readable description
}

/**
 * Calculate profit-sharing credit based on the configured mode.
 *
 * @param mode - The profit-sharing mode
 * @param percent - The percentage to share (e.g., 20 for 20%)
 * @param employerFicaSavingsMonthly - Monthly employer FICA savings in dollars
 * @param bbProfitMonthly - BB's monthly profit (employee fees + employer fees)
 * @returns Profit-share calculation result
 */
export function computeProfitShare(
  mode: ProfitShareMode,
  percent: number,
  employerFicaSavingsMonthly: number,
  bbProfitMonthly: number
): ProfitShareResult {
  if (mode === "none" || percent <= 0) {
    return {
      profitShareAmount: 0,
      profitShareCents: 0,
      description: "No profit sharing"
    };
  }

  const percentDecimal = percent / 100;

  if (mode === "percent_er_savings") {
    const amount = +(employerFicaSavingsMonthly * percentDecimal).toFixed(2);
    return {
      profitShareAmount: amount,
      profitShareCents: Math.round(amount * 100),
      description: `${percent}% of employer FICA savings ($${employerFicaSavingsMonthly.toFixed(2)})`
    };
  }

  if (mode === "percent_bb_profit") {
    const amount = +(bbProfitMonthly * percentDecimal).toFixed(2);
    return {
      profitShareAmount: amount,
      profitShareCents: Math.round(amount * 100),
      description: `${percent}% of BB profit ($${bbProfitMonthly.toFixed(2)})`
    };
  }

  return {
    profitShareAmount: 0,
    profitShareCents: 0,
    description: "Unknown profit share mode"
  };
}

/**
 * Complete billing calculation including profit-sharing.
 * Returns all components needed for invoice generation.
 */
export function computeCompleteBilling(params: {
  pretaxMonthly: number;
  model: string | null | undefined;
  employerFicaSavingsMonthly: number;
  profitShareMode: ProfitShareMode;
  profitSharePercent: number;
}): {
  employeeFeeMonthly: number;
  employerFeeMonthly: number;
  bbProfitMonthly: number;
  employeeRate: number;
  employerRate: number;
  feesLabel: string;
  profitShare: ProfitShareResult;
  netBillingAmount: number; // Total to bill after profit-share credit
} {
  const fees = computeFeesForPretaxMonthly(params.pretaxMonthly, params.model);
  const bbProfitMonthly = fees.employeeFeeMonthly + fees.employerFeeMonthly;

  const profitShare = computeProfitShare(
    params.profitShareMode,
    params.profitSharePercent,
    params.employerFicaSavingsMonthly,
    bbProfitMonthly
  );

  const netBillingAmount = +(fees.employerFeeMonthly - profitShare.profitShareAmount).toFixed(2);

  return {
    ...fees,
    bbProfitMonthly,
    profitShare,
    netBillingAmount
  };
}
