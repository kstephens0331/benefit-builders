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
