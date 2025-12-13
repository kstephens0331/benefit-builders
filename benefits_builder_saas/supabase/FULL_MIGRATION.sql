-- FULL MIGRATION: Run this in Supabase SQL Editor
-- This recreates the month_end_closings table with the correct schema

-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS month_end_company_details CASCADE;
DROP TABLE IF EXISTS month_end_closings CASCADE;

-- Drop old trigger/function if they exist
DROP TRIGGER IF EXISTS closing_updated_at_trigger ON month_end_closings;
DROP FUNCTION IF EXISTS update_closing_updated_at();

-- Month-end closing records
CREATE TABLE month_end_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL, -- e.g., 2025
  month integer NOT NULL CHECK (month >= 1 AND month <= 12), -- 1-12
  closing_date date, -- e.g., 2025-01-31 (last day of month)
  month_year text, -- e.g., "January 2025" (computed/display)
  status text DEFAULT 'open' CHECK (status IN ('open', 'closing', 'closed', 'error', 'pending')),

  -- Validation results
  validation_report jsonb, -- Full validation report JSON
  can_close boolean DEFAULT false,
  critical_issues_count integer DEFAULT 0,
  warnings_count integer DEFAULT 0,
  transactions_locked boolean DEFAULT false,

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
  updated_at timestamptz DEFAULT now(),

  UNIQUE(year, month)
);

-- Company-specific month-end details
CREATE TABLE month_end_company_details (
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
CREATE INDEX idx_closings_year_month ON month_end_closings(year DESC, month DESC);
CREATE INDEX idx_closings_status ON month_end_closings(status);
CREATE INDEX idx_closings_date ON month_end_closings(closing_date DESC);
CREATE INDEX idx_company_details_closing ON month_end_company_details(closing_id);
CREATE INDEX idx_company_details_company ON month_end_company_details(company_id);
CREATE INDEX idx_company_details_email ON month_end_company_details(email_sent);

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

-- Enable RLS
ALTER TABLE month_end_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE month_end_company_details ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access
CREATE POLICY "Service role can do everything on month_end_closings"
  ON month_end_closings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do everything on month_end_company_details"
  ON month_end_company_details FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to view closings
CREATE POLICY "Authenticated users can view closings"
  ON month_end_closings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view company details"
  ON month_end_company_details FOR SELECT
  TO authenticated
  USING (true);

-- Comments
COMMENT ON TABLE month_end_closings IS 'Monthly closing records with aggregated metrics and report storage';
COMMENT ON TABLE month_end_company_details IS 'Per-company breakdown for each month-end closing';
COMMENT ON COLUMN month_end_closings.year IS 'Year of the closing period (e.g., 2025)';
COMMENT ON COLUMN month_end_closings.month IS 'Month of the closing period (1-12)';
COMMENT ON COLUMN month_end_closings.validation_report IS 'JSON containing full validation results';
COMMENT ON COLUMN month_end_closings.transactions_locked IS 'Whether transactions for this period are locked';
