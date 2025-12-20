-- Add more detailed columns to invoice_lines for per-employee breakdown
-- This allows storing the Section 125 amount and separated EE/ER fees

-- Add section125_monthly_cents to store the monthly Section 125 deduction amount
ALTER TABLE invoice_lines ADD COLUMN IF NOT EXISTS section125_monthly_cents BIGINT DEFAULT 0;

-- Add ee_fee_cents and er_fee_cents to store separated employee/employer fees
ALTER TABLE invoice_lines ADD COLUMN IF NOT EXISTS ee_fee_cents BIGINT DEFAULT 0;
ALTER TABLE invoice_lines ADD COLUMN IF NOT EXISTS er_fee_cents BIGINT DEFAULT 0;

COMMENT ON COLUMN invoice_lines.section125_monthly_cents IS 'Monthly Section 125 pre-tax deduction amount in cents';
COMMENT ON COLUMN invoice_lines.ee_fee_cents IS 'Employee BB fee in cents (monthly)';
COMMENT ON COLUMN invoice_lines.er_fee_cents IS 'Employer BB fee in cents (monthly)';
