-- Add employee net increase columns to proposal_employees table
-- These track the projected take-home increase for employees with Section 125

ALTER TABLE proposal_employees ADD COLUMN IF NOT EXISTS employee_net_increase_monthly numeric(12,2) DEFAULT 0;
ALTER TABLE proposal_employees ADD COLUMN IF NOT EXISTS employee_net_increase_annual numeric(12,2) DEFAULT 0;

-- Add comments
COMMENT ON COLUMN proposal_employees.employee_net_increase_monthly IS 'Projected monthly take-home increase for employee with Section 125';
COMMENT ON COLUMN proposal_employees.employee_net_increase_annual IS 'Projected annual take-home increase for employee with Section 125';
