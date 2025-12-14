-- Add employee detail support to invoice_lines for per-employee breakdown
-- This allows invoices to have:
--   Page 1: Summary line (bb_fees_summary) with combined total
--   Pages 2+: Employee detail lines showing per-employee fees

-- Add employee_id column to reference specific employee for detail lines
ALTER TABLE invoice_lines ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;

-- Add allowable_benefit_cents to store the calculated allowable benefit amount
ALTER TABLE invoice_lines ADD COLUMN IF NOT EXISTS allowable_benefit_cents BIGINT DEFAULT 0;

-- Update kind constraint to include new types
ALTER TABLE invoice_lines DROP CONSTRAINT IF EXISTS invoice_lines_kind_check;
ALTER TABLE invoice_lines ADD CONSTRAINT invoice_lines_kind_check
  CHECK (kind IN (
    'base_fee', 'per_employee_active', 'per_report', 'maintenance',
    'profit_share', 'credit', 'adjustment', 'tax',
    'employer_fee', 'employee_fee',
    'bb_fees_summary',     -- Summary line for page 1 (combined BB fees total)
    'employee_detail'      -- Per-employee detail line for pages 2+
  ));

-- Add index for employee lookup
CREATE INDEX IF NOT EXISTS idx_invoice_lines_employee_id ON invoice_lines(employee_id);

COMMENT ON COLUMN invoice_lines.employee_id IS 'Reference to employee for detail line items';
COMMENT ON COLUMN invoice_lines.allowable_benefit_cents IS 'Calculated allowable benefit amount in cents';
