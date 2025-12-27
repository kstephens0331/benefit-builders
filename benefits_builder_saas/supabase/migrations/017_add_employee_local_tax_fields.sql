-- Add city and county fields to employees table for local tax calculations
-- Required for states with local/city income taxes: MI, OH, PA, NY, IN, MD, KY, MO, AL, DE

-- Residence location (for determining resident tax rates)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS county TEXT;

-- Work location (for determining work location tax rates - if different from residence)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS work_city TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS work_county TEXT;

-- Add comments explaining the fields
COMMENT ON COLUMN employees.city IS 'Residence city for local tax calculations';
COMMENT ON COLUMN employees.county IS 'Residence county for local tax calculations';
COMMENT ON COLUMN employees.work_city IS 'Work location city (if different from residence city)';
COMMENT ON COLUMN employees.work_county IS 'Work location county (if different from residence county)';

-- Create index for common lookups
CREATE INDEX IF NOT EXISTS idx_employees_city ON employees(city);
CREATE INDEX IF NOT EXISTS idx_employees_county ON employees(county);
