-- Add employer_fee and employee_fee as valid invoice line types
ALTER TABLE invoice_lines DROP CONSTRAINT IF EXISTS invoice_lines_kind_check;
ALTER TABLE invoice_lines ADD CONSTRAINT invoice_lines_kind_check
  CHECK (kind IN ('base_fee', 'per_employee_active', 'per_report', 'maintenance', 'profit_share', 'credit', 'adjustment', 'tax', 'employer_fee', 'employee_fee'));
