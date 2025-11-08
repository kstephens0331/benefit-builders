-- Migration 011: Add safety_cap_percent to companies and employees tables
-- This field determines the maximum percentage of gross pay that can be
-- deducted for Section 125 benefits per paycheck
--
-- Bill requested the ability to adjust this percentage, which was previously
-- hardcoded at 50%. The default is 50% for employees earning under $2,600/month,
-- but can be adjusted per company OR per employee as needed.

-- Add safety_cap_percent column to companies table (company-wide default)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS safety_cap_percent numeric(5,2) DEFAULT 50.00
CHECK (safety_cap_percent >= 0 AND safety_cap_percent <= 100);

-- Add safety_cap_percent column to employees table (per-employee override)
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS safety_cap_percent numeric(5,2) DEFAULT NULL
CHECK (safety_cap_percent IS NULL OR (safety_cap_percent >= 0 AND safety_cap_percent <= 100));

-- Add comments explaining the fields
COMMENT ON COLUMN companies.safety_cap_percent IS 'Company-wide default maximum percentage of gross pay per paycheck that can be deducted for Section 125 benefits (default: 50%). This prevents deductions from exceeding what employees can afford. Adjustable per company by Bill.';

COMMENT ON COLUMN employees.safety_cap_percent IS 'Per-employee override for maximum percentage of gross pay per paycheck that can be deducted for Section 125 benefits. If NULL, uses the company default. Allows customization for employees with special circumstances.';

-- Update existing companies to use 50% as default
UPDATE companies
SET safety_cap_percent = 50.00
WHERE safety_cap_percent IS NULL;
