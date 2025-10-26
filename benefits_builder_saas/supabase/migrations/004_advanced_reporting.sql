-- Migration: Advanced Reporting System
-- Date: 2025-10-25
-- Description: Custom report templates, scheduled reports, and report history

-- REPORT TEMPLATES
CREATE TABLE IF NOT EXISTS report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  report_type text NOT NULL CHECK (report_type IN (
    'billing_summary',
    'employee_enrollment',
    'company_performance',
    'tax_savings',
    'profit_analysis',
    'custom_query'
  )),
  filters jsonb DEFAULT '{}',
  columns jsonb NOT NULL, -- Array of column definitions
  sort_by text,
  sort_order text CHECK (sort_order IN ('asc', 'desc')) DEFAULT 'desc',
  is_public boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES internal_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- SCHEDULED REPORTS
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  schedule text NOT NULL CHECK (schedule IN ('daily', 'weekly', 'monthly', 'quarterly')),
  day_of_week int CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  day_of_month int CHECK (day_of_month BETWEEN 1 AND 31),
  recipients text[] NOT NULL, -- Array of email addresses
  format text NOT NULL DEFAULT 'pdf' CHECK (format IN ('pdf', 'excel', 'csv', 'email')),
  active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_by uuid REFERENCES internal_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- REPORT HISTORY
CREATE TABLE IF NOT EXISTS report_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES report_templates(id) ON DELETE SET NULL,
  scheduled_report_id uuid REFERENCES scheduled_reports(id) ON DELETE SET NULL,
  report_type text NOT NULL,
  title text NOT NULL,
  parameters jsonb, -- Filters, date range, etc.
  generated_by uuid REFERENCES internal_users(id) ON DELETE SET NULL,
  file_url text, -- S3/storage URL if saved
  row_count int,
  execution_time_ms int,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- SAVED FILTERS (for quick access)
CREATE TABLE IF NOT EXISTS saved_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES internal_users(id) ON DELETE CASCADE,
  name text NOT NULL,
  filter_type text NOT NULL, -- 'company', 'employee', 'billing', etc.
  filters jsonb NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_report_templates_type ON report_templates(report_type);
CREATE INDEX IF NOT EXISTS idx_report_templates_created_by ON report_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_active ON scheduled_reports(active, next_run_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_template ON scheduled_reports(template_id);
CREATE INDEX IF NOT EXISTS idx_report_history_created_at ON report_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_history_template ON report_history(template_id);
CREATE INDEX IF NOT EXISTS idx_report_history_generated_by ON report_history(generated_by);
CREATE INDEX IF NOT EXISTS idx_saved_filters_user ON saved_filters(user_id);

-- Function to calculate next run time for scheduled reports
CREATE OR REPLACE FUNCTION calculate_next_run(
  schedule_type text,
  day_of_week int,
  day_of_month int
)
RETURNS timestamptz AS $$
DECLARE
  next_run timestamptz;
BEGIN
  IF schedule_type = 'daily' THEN
    next_run := (now() + interval '1 day')::date + time '00:00:00';
  ELSIF schedule_type = 'weekly' THEN
    next_run := (now() + ((7 + day_of_week - EXTRACT(DOW FROM now()))::int % 7 + 1) * interval '1 day')::date + time '00:00:00';
  ELSIF schedule_type = 'monthly' THEN
    next_run := (date_trunc('month', now()) + interval '1 month' + (day_of_month - 1) * interval '1 day')::date + time '00:00:00';
  ELSIF schedule_type = 'quarterly' THEN
    next_run := (date_trunc('quarter', now()) + interval '3 month' + (day_of_month - 1) * interval '1 day')::date + time '00:00:00';
  ELSE
    next_run := now() + interval '1 day';
  END IF;

  RETURN next_run;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update next_run_at when schedule changes
CREATE OR REPLACE FUNCTION update_scheduled_report_next_run()
RETURNS trigger AS $$
BEGIN
  NEW.next_run_at := calculate_next_run(NEW.schedule, NEW.day_of_week, NEW.day_of_month);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_scheduled_report ON scheduled_reports;
CREATE TRIGGER trigger_update_scheduled_report
  BEFORE INSERT OR UPDATE ON scheduled_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_report_next_run();

COMMENT ON TABLE report_templates IS 'Custom report templates with column and filter definitions';
COMMENT ON TABLE scheduled_reports IS 'Automated report generation and email delivery schedules';
COMMENT ON TABLE report_history IS 'Historical record of all generated reports with parameters and results';
COMMENT ON TABLE saved_filters IS 'User-saved filter presets for quick report filtering';
