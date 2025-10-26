// apps/web/src/lib/models.ts
export type BillingModel = "5/3" | "4/3" | "5/1" | "4/4";

/**
 * Returns [employeeRate, employerRate] as decimals.
 *
 * IMPORTANT: Model format is EMPLOYER/EMPLOYEE
 * Example: "5/3" means Employer pays 5%, Employee pays 3%
 *
 * Returns: [employeeRate, employerRate]
 * - "5/3" => [0.03, 0.05] (Employee 3%, Employer 5%)
 * - "5/1" => [0.01, 0.05] (Employee 1%, Employer 5%)
 * - "4/3" => [0.03, 0.04] (Employee 3%, Employer 4%)
 * - "4/4" => [0.04, 0.04] (Employee 4%, Employer 4%)
 */
export function getModelRates(model: string | null | undefined): [number, number] {
  const m = (model ?? "").trim();
  switch (m) {
    case "5/3":
      // Employer 5%, Employee 3%
      return [0.03, 0.05];
    case "4/3":
      // Employer 4%, Employee 3%
      return [0.03, 0.04];
    case "5/1":
      // Employer 5%, Employee 1%
      return [0.01, 0.05];
    case "4/4":
      // Employer 4%, Employee 4%
      return [0.04, 0.04];
    default:
      // Default to 5/3 (Employee 3%, Employer 5%)
      return [0.03, 0.05];
  }
}

/**
 * Human-friendly label in EMPLOYER/EMPLOYEE format
 * Example: "5/3" => "5.0% / 3.0%" (Employer 5% / Employee 3%)
 */
export function formatRates(model: string | null | undefined): string {
  const [ee, er] = getModelRates(model);
  // Display as Employer / Employee to match model notation
  return `${(er * 100).toFixed(1)}% / ${(ee * 100).toFixed(1)}%`;
}

/**
 * Parses a billing model string to BillingModel type.
 * Returns the model if valid, otherwise defaults to "5/3"
 */
export function parseModel(model: string | null | undefined): BillingModel {
  const m = (model ?? "").trim() as BillingModel;
  if (m === "5/3" || m === "4/3" || m === "5/1" || m === "4/4") {
    return m;
  }
  return "5/3"; // default
}
