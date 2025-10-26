-- Migration: Add Goal Tracking and Advanced Analytics
-- Date: 2025-10-25
-- Description: Adds tables for goal tracking, projections, and enhanced analytics

-- GOALS TABLE
CREATE TABLE IF NOT EXISTS business_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_type text NOT NULL CHECK (goal_type IN ('monthly_revenue', 'annual_revenue', 'total_companies', 'total_employees', 'avg_employees_per_company', 'profit_margin')),
  target_value numeric(12,2) NOT NULL,
  target_date date NOT NULL,
  current_value numeric(12,2) DEFAULT 0,
  progress_percent numeric(5,2) DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- COMPANY PERFORMANCE SNAPSHOTS (for trend analysis)
CREATE TABLE IF NOT EXISTS company_performance_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  employees_active int NOT NULL DEFAULT 0,
  employees_enrolled int NOT NULL DEFAULT 0,
  enrollment_rate numeric(5,2) DEFAULT 0,
  total_pretax_monthly numeric(12,2) DEFAULT 0,
  bb_profit_monthly numeric(12,2) DEFAULT 0,
  employer_savings_monthly numeric(12,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, snapshot_date)
);

-- REVENUE PROJECTIONS
CREATE TABLE IF NOT EXISTS revenue_projections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projection_date date NOT NULL,
  projected_companies int NOT NULL,
  projected_avg_employees numeric(8,2) NOT NULL,
  projected_avg_pretax numeric(12,2) NOT NULL,
  projected_monthly_revenue numeric(12,2) NOT NULL,
  projected_annual_revenue numeric(12,2) NOT NULL,
  assumptions jsonb, -- Store projection assumptions
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  notes text
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_goals_status ON business_goals(status, target_date);
CREATE INDEX IF NOT EXISTS idx_business_goals_type ON business_goals(goal_type);
CREATE INDEX IF NOT EXISTS idx_company_performance_company_date ON company_performance_snapshots(company_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_projections_date ON revenue_projections(projection_date DESC);

-- Function to update goal progress automatically
CREATE OR REPLACE FUNCTION update_goal_progress()
RETURNS trigger AS $$
BEGIN
  NEW.progress_percent := LEAST(100, (NEW.current_value / NULLIF(NEW.target_value, 0)) * 100);

  IF NEW.progress_percent >= 100 AND NEW.status = 'active' THEN
    NEW.status := 'completed';
    NEW.completed_at := now();
  END IF;

  NEW.updated_at := now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update goal progress
DROP TRIGGER IF EXISTS trigger_update_goal_progress ON business_goals;
CREATE TRIGGER trigger_update_goal_progress
  BEFORE UPDATE ON business_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_goal_progress();

COMMENT ON TABLE business_goals IS 'Tracks business goals and KPI targets with automatic progress calculation';
COMMENT ON TABLE company_performance_snapshots IS 'Historical performance data for trend analysis and forecasting';
COMMENT ON TABLE revenue_projections IS 'Revenue projections based on growth assumptions';
