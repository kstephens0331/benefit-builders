-- Migration 009: Add Month-End Closing tables
-- This enables monthly closing process with automated reports

-- Month-end closing records
CREATE TABLE IF NOT EXISTS month_end_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  closing_date date NOT NULL UNIQUE, -- e.g., 2025-01-31 (last day of month)
  month_year text NOT NULL, -- e.g., "January 2025"
  status text DEFAULT 'open' CHECK (status IN ('open', 'closing', 'closed', 'error')),

  -- Summary totals
  total_companies integer DEFAULT 0,
  total_employees integer DEFAULT 0,
  total_pretax_deductions numeric(12,2) DEFAULT 0,
  total_bb_fees numeric(12,2) DEFAULT 0,
  total_employer_savings numeric(12,2) DEFAULT 0,
  total_employee_savings numeric(12,2) DEFAULT 0,

  -- AR/AP snapshot
  total_ar_open numeric(12,2) DEFAULT 0,
  total_ar_overdue numeric(12,2) DEFAULT 0,
  total_ap_open numeric(12,2) DEFAULT 0,
  total_ap_overdue numeric(12,2) DEFAULT 0,

  -- Report details
  report_generated boolean DEFAULT false,
  report_url text, -- S3/storage URL for PDF report
  report_pdf_data bytea, -- Store PDF directly in database as backup
  emails_sent integer DEFAULT 0,
  emails_failed integer DEFAULT 0,

  -- Audit
  closed_at timestamptz,
  closed_by text,
  error_message text,
  notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Company-specific month-end details
CREATE TABLE IF NOT EXISTS month_end_company_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  closing_id uuid REFERENCES month_end_closings(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,

  -- Company info snapshot
  company_name text NOT NULL,
  contact_email text,

  -- Metrics
  employee_count integer DEFAULT 0,
  enrolled_count integer DEFAULT 0,
  enrollment_rate numeric(5,2) DEFAULT 0, -- percentage

  -- Financial
  pretax_deductions numeric(10,2) DEFAULT 0,
  bb_fees numeric(10,2) DEFAULT 0,
  employer_fica_savings numeric(10,2) DEFAULT 0,
  employee_tax_savings numeric(10,2) DEFAULT 0,
  net_savings numeric(10,2) DEFAULT 0, -- employer savings - BB fees

  -- Email tracking
  email_sent boolean DEFAULT false,
  email_sent_at timestamptz,
  email_error text,

  created_at timestamptz DEFAULT now(),

  UNIQUE(closing_id, company_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_closings_date ON month_end_closings(closing_date DESC);
CREATE INDEX IF NOT EXISTS idx_closings_status ON month_end_closings(status);
CREATE INDEX IF NOT EXISTS idx_closings_month_year ON month_end_closings(month_year);
CREATE INDEX IF NOT EXISTS idx_company_details_closing ON month_end_company_details(closing_id);
CREATE INDEX IF NOT EXISTS idx_company_details_company ON month_end_company_details(company_id);
CREATE INDEX IF NOT EXISTS idx_company_details_email ON month_end_company_details(email_sent);

-- Updated_at trigger for closings
CREATE OR REPLACE FUNCTION update_closing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER closing_updated_at_trigger
  BEFORE UPDATE ON month_end_closings
  FOR EACH ROW
  EXECUTE FUNCTION update_closing_updated_at();

-- Comments
COMMENT ON TABLE month_end_closings IS 'Monthly closing records with aggregated metrics and report storage';
COMMENT ON TABLE month_end_company_details IS 'Per-company breakdown for each month-end closing';
COMMENT ON COLUMN month_end_closings.closing_date IS 'Last day of the month being closed (e.g., 2025-01-31)';
COMMENT ON COLUMN month_end_closings.month_year IS 'Human-readable period (e.g., "January 2025")';
COMMENT ON COLUMN month_end_closings.report_pdf_data IS 'Actual PDF binary data stored in database';
COMMENT ON COLUMN month_end_company_details.enrollment_rate IS 'Percentage of employees enrolled in benefits';
