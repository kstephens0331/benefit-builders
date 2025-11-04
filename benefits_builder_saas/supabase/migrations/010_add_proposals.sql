-- Migration 010: Add Proposals System
-- Store client proposals generated from census data

-- Proposals table
CREATE TABLE IF NOT EXISTS proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,

  -- Proposal metadata
  proposal_name text NOT NULL,
  company_name text NOT NULL,
  company_address text,
  company_city text,
  company_state text,
  company_phone text,
  company_email text,
  company_contact text,

  -- Proposal settings
  effective_date date NOT NULL,
  model_percentage text NOT NULL, -- e.g., "5/1" for 5% employee, 1% employer
  pay_period text NOT NULL, -- Weekly, Bi-Weekly, Semi-Monthly, Monthly

  -- Calculated totals
  total_employees integer DEFAULT 0,
  qualified_employees integer DEFAULT 0,
  total_monthly_savings numeric(10,2) DEFAULT 0,
  total_annual_savings numeric(10,2) DEFAULT 0,

  -- PDF storage
  pdf_data bytea,
  pdf_url text,

  -- Census data (JSON)
  census_data jsonb,

  -- Status
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  sent_at timestamptz,
  accepted_at timestamptz,

  -- Audit
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Proposal employees (detailed breakdown)
CREATE TABLE IF NOT EXISTS proposal_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES proposals(id) ON DELETE CASCADE,

  -- Employee info
  employee_name text NOT NULL,
  state text NOT NULL,
  pay_frequency text NOT NULL,
  paycheck_gross numeric(10,2) NOT NULL,
  marital_status text NOT NULL,
  dependents integer DEFAULT 0,

  -- Calculated amounts
  gross_benefit_allotment numeric(10,2) DEFAULT 0,
  net_monthly_employer_savings numeric(10,2) DEFAULT 0,
  net_annual_employer_savings numeric(10,2) DEFAULT 0,

  -- Qualification
  qualifies boolean DEFAULT true,
  disqualification_reason text,

  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_proposals_company ON proposals(company_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_effective_date ON proposals(effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_proposal_employees_proposal ON proposal_employees(proposal_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_proposal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER proposal_updated_at_trigger
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_proposal_updated_at();

-- Comments
COMMENT ON TABLE proposals IS 'Client proposals generated from census uploads';
COMMENT ON TABLE proposal_employees IS 'Employee-level breakdown for each proposal';
COMMENT ON COLUMN proposals.model_percentage IS 'Format: "5/1" means 5% employee rate, 1% employer rate';
COMMENT ON COLUMN proposals.census_data IS 'Original census data in JSON format for re-generation';
