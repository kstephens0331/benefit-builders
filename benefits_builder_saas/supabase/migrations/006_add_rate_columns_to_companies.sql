-- Migration: Add employer_rate and employee_rate columns to companies table
-- These columns store the parsed rates from the model field for easier querying

-- Add the new columns
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS employee_rate numeric(5,2) DEFAULT 0.00 CHECK (employee_rate >= 0 AND employee_rate <= 100),
ADD COLUMN IF NOT EXISTS employer_rate numeric(5,2) DEFAULT 0.00 CHECK (employer_rate >= 0 AND employer_rate <= 100);

-- Update existing rows by parsing the model field
-- Model format is "employee/employer" (e.g., "5/3" means 5% employee, 3% employer)
-- Cast model to text first since it may be a custom type
UPDATE companies
SET
  employee_rate = CAST(SPLIT_PART(model::text, '/', 1) AS numeric(5,2)),
  employer_rate = CAST(SPLIT_PART(model::text, '/', 2) AS numeric(5,2))
WHERE employee_rate = 0 AND employer_rate = 0;

-- Add comment for documentation
COMMENT ON COLUMN companies.employee_rate IS 'Employee contribution rate (%) - parsed from model field';
COMMENT ON COLUMN companies.employer_rate IS 'Employer contribution rate (%) - parsed from model field';
