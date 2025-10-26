-- Migration: Add Constraints for Data Integrity
-- Date: 2025-10-25
-- Description: Adds unique constraints and check constraints to prevent data integrity issues

-- Add unique constraint on invoices to prevent duplicate billing periods
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'invoices_company_id_period_key'
  ) THEN
    ALTER TABLE invoices ADD CONSTRAINT invoices_company_id_period_key UNIQUE (company_id, period);
  END IF;
END $$;

-- Add check constraint on profit_share_percent (0-50%)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'company_billing_settings_profit_share_percent_check'
  ) THEN
    ALTER TABLE company_billing_settings
    ADD CONSTRAINT company_billing_settings_profit_share_percent_check
    CHECK (profit_share_percent >= 0 AND profit_share_percent <= 50);
  END IF;
END $$;

-- Add check constraint on tax_rate_percent (0-100%)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'company_billing_settings_tax_rate_percent_check'
  ) THEN
    ALTER TABLE company_billing_settings
    ADD CONSTRAINT company_billing_settings_tax_rate_percent_check
    CHECK (tax_rate_percent >= 0 AND tax_rate_percent <= 100);
  END IF;
END $$;

-- Create index on invoices for faster period lookups
CREATE INDEX IF NOT EXISTS idx_invoices_period ON invoices(period);
CREATE INDEX IF NOT EXISTS idx_invoices_company_period ON invoices(company_id, period);

-- Create index on employees for faster active employee queries
CREATE INDEX IF NOT EXISTS idx_employees_company_active ON employees(company_id, active);

-- Create index on employee_benefits for faster employee lookups
CREATE INDEX IF NOT EXISTS idx_employee_benefits_employee_id ON employee_benefits(employee_id);

COMMENT ON CONSTRAINT invoices_company_id_period_key ON invoices IS
  'Prevents duplicate invoices for the same company and billing period';

COMMENT ON CONSTRAINT company_billing_settings_profit_share_percent_check ON company_billing_settings IS
  'Limits profit sharing to 50% to prevent negative invoices';

COMMENT ON CONSTRAINT company_billing_settings_tax_rate_percent_check ON company_billing_settings IS
  'Validates tax rate is between 0% and 100%';
