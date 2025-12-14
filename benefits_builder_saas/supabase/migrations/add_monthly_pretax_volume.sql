-- Add monthly_pretax_volume to company_billing_settings
-- This allows invoice generation to work without depending on employee_benefits table
-- The value represents the total monthly pre-tax deduction volume for the company

ALTER TABLE company_billing_settings
ADD COLUMN IF NOT EXISTS monthly_pretax_volume numeric(12,2) DEFAULT 0;

COMMENT ON COLUMN company_billing_settings.monthly_pretax_volume IS
'Total monthly pre-tax deduction volume in dollars. Used to calculate model-based percentage fees.';
