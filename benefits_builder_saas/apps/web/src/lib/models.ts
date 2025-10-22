// apps/web/src/lib/models.ts
export type BillingModel = "5/3" | "4/3" | "5/1" | "4/4";

/**
 * Returns [employeeRate, employerRate] as decimals.
 * Example: "5/3" => [0.05, 0.03]
 */
export function getModelRates(model: string | null | undefined): [number, number] {
  const m = (model ?? "").trim();
  switch (m) {
    case "5/3":
      return [0.05, 0.03];
    case "4/3":
      return [0.04, 0.03];
    case "5/1":
      return [0.05, 0.01];
    case "4/4":
      return [0.04, 0.04];
    default:
      // Default to 5/3 if unknown; you can change this to [0,0] if you prefer “no fees” fallback
      return [0.05, 0.03];
  }
}

/** Human-friendly label like "5.0% / 3.0%" */
export function formatRates(model: string | null | undefined): string {
  const [ee, er] = getModelRates(model);
  return `${(ee * 100).toFixed(1)}% / ${(er * 100).toFixed(1)}%`;
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
