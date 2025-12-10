-- Add custom Section 125 monthly amount fields for 3/4 model
-- These allow companies using the 3/4 model to specify custom monthly limits

ALTER TABLE companies ADD COLUMN IF NOT EXISTS sec125_single_0 NUMERIC(10,2) DEFAULT 800;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sec125_married_0 NUMERIC(10,2) DEFAULT 1200;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sec125_single_deps NUMERIC(10,2) DEFAULT 1200;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sec125_married_deps NUMERIC(10,2) DEFAULT 1700;

COMMENT ON COLUMN companies.sec125_single_0 IS 'Custom monthly Section 125 amount for Single with 0 dependents (3/4 model)';
COMMENT ON COLUMN companies.sec125_married_0 IS 'Custom monthly Section 125 amount for Married with 0 dependents (3/4 model)';
COMMENT ON COLUMN companies.sec125_single_deps IS 'Custom monthly Section 125 amount for Single with dependents (3/4 model)';
COMMENT ON COLUMN companies.sec125_married_deps IS 'Custom monthly Section 125 amount for Married with dependents (3/4 model)';
