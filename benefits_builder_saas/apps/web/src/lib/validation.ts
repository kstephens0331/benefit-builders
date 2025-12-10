// Validation schemas using Zod
import { z } from "zod";

// ============================================================================
// Common Validators
// ============================================================================

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
] as const;

export const stateValidator = z.enum(US_STATES);

export const payFrequencyValidator = z.enum(["weekly", "biweekly", "semimonthly", "monthly"]);

export const filingStatusValidator = z.enum(["single", "married", "head"]);

export const billingModelValidator = z.enum(["5/3", "3/4", "5/1", "5/0", "4/4"]);

export const profitShareModeValidator = z.enum(["none", "percent_er_savings", "percent_bb_profit"]);

/**
 * Validates period format (YYYY-MM) with reasonable bounds
 */
export const periodValidator = z.string().regex(/^\d{4}-\d{2}$/).refine((val) => {
  const [yearStr, monthStr] = val.split("-");
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);

  return year >= 2020 && year <= 2100 && month >= 1 && month <= 12;
}, {
  message: "Period must be YYYY-MM format with valid year (2020-2100) and month (01-12)"
});

/**
 * Validates tax year
 */
export const taxYearValidator = z.number().int().min(2020).max(2100);

/**
 * Validates UUID format
 */
export const uuidValidator = z.string().uuid();

/**
 * Validates positive monetary amount (max $1M to prevent extreme values)
 */
export const moneyValidator = z.number().min(0).max(1000000);

/**
 * Validates percentage (0-100)
 */
export const percentageValidator = z.number().min(0).max(100);

/**
 * Validates profit share percentage (0-50% cap to prevent negative invoices)
 */
export const profitSharePercentValidator = z.number().min(0).max(50);

// ============================================================================
// Optimizer/Preview Validation
// ============================================================================

export const OptimizerPreviewSchema = z.object({
  employeeId: uuidValidator,
  taxYear: taxYearValidator.optional().default(2025)
});

// ============================================================================
// Billing Close Validation
// ============================================================================

export const BillingCloseSchema = z.object({
  period: periodValidator
});

// ============================================================================
// Company Creation Validation
// ============================================================================

export const CreateCompanySchema = z.object({
  name: z.string().min(1).max(200),
  state: stateValidator,
  model: billingModelValidator,
  pay_frequency: payFrequencyValidator,
  contact_email: z.string().email().optional(),
  status: z.enum(["active", "inactive"]).optional().default("active")
});

// ============================================================================
// Employee Creation Validation
// ============================================================================

export const CreateEmployeeSchema = z.object({
  company_id: uuidValidator,
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  filing_status: filingStatusValidator.optional().default("single"),
  dependents: z.number().int().min(0).max(20).optional().default(0),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tobacco_use: z.boolean().optional().default(false),
  gross_pay: moneyValidator,
  consent_status: z.enum(["elect", "dont", "pending"]).optional().default("pending"),
  active: z.boolean().optional().default(true)
});

// ============================================================================
// Benefit Election Validation
// ============================================================================

export const CreateBenefitSchema = z.object({
  employee_id: uuidValidator,
  plan_code: z.string().min(1).max(50),
  reduces_fit: z.boolean().optional().default(true),
  reduces_fica: z.boolean().optional().default(true),
  per_pay_amount: moneyValidator,
  effective_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
}).refine((data) => data.per_pay_amount > 0, {
  message: "Benefit amount must be greater than 0"
});

// ============================================================================
// Company Billing Settings Validation
// ============================================================================

export const CompanyBillingSettingsSchema = z.object({
  company_id: uuidValidator,
  plan_tier: z.enum(["starter", "standard", "enterprise", "custom"]).optional().default("standard"),
  base_fee_cents: z.number().int().min(0).max(100000000), // Max $1M
  per_employee_active_cents: z.number().int().min(0).max(100000), // Max $1k per employee
  per_report_cents: z.number().int().min(0).max(100000),
  profit_share_mode: profitShareModeValidator.optional().default("none"),
  profit_share_percent: profitSharePercentValidator.optional().default(0),
  maintenance_cents: z.number().int().min(0).max(100000000),
  tax_rate_percent: percentageValidator.optional().default(0),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

// ============================================================================
// Bulk Upload Validation
// ============================================================================

export const BulkUploadRowSchema = z.object({
  company_name: z.string().min(1).max(200),
  company_state: stateValidator.optional(),
  company_model: billingModelValidator.optional(),
  company_pay_frequency: payFrequencyValidator.optional(),
  employee_first_name: z.string().min(1).max(100),
  employee_last_name: z.string().min(1).max(100),
  employee_gross_pay: z.number().min(0).max(1000000),
  employee_filing_status: filingStatusValidator.optional(),
  employee_dependents: z.number().int().min(0).max(20).optional(),
  benefit_plan_code: z.string().max(50).optional(),
  benefit_amount: z.number().min(0).max(100000).optional()
});

// ============================================================================
// Goal Tracking Validation (for new dashboard)
// ============================================================================

export const CreateGoalSchema = z.object({
  goal_type: z.enum(["revenue", "companies", "employees"]),
  target_amount: z.number().min(0),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().max(500).optional()
});

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validates and parses request body, returning typed data or error response
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string; issues: z.ZodIssue[] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const firstError = result.error.issues[0];
  const errorMessage = `Validation error: ${firstError.path.join(".")}: ${firstError.message}`;

  return {
    success: false,
    error: errorMessage,
    issues: result.error.issues
  };
}

/**
 * Middleware helper for API routes
 */
export async function validateRequestBody<T>(
  req: Request,
  schema: z.ZodSchema<T>
): Promise<{ valid: true; data: T } | { valid: false; error: string; issues: z.ZodIssue[] }> {
  try {
    const body = await req.json();
    const result = validateRequest(schema, body);

    if (result.success) {
      return { valid: true, data: result.data };
    }

    return { valid: false, error: result.error, issues: result.issues };
  } catch (error) {
    return {
      valid: false,
      error: "Invalid JSON in request body",
      issues: []
    };
  }
}
