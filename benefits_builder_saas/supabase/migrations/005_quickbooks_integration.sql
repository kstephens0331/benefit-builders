-- Migration: QuickBooks Integration
-- Date: 2025-10-25
-- Description: Store QuickBooks OAuth tokens and sync mappings

-- COMPANY INTEGRATIONS (Store QuickBooks connection per company if needed, or global)
CREATE TABLE IF NOT EXISTS quickbooks_integration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id text UNIQUE NOT NULL, -- QuickBooks Company ID
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  access_token_expiry timestamptz NOT NULL,
  refresh_token_expiry timestamptz NOT NULL,
  company_info jsonb, -- Store QB company info
  is_active boolean NOT NULL DEFAULT true,
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- SYNC MAPPINGS (Map local IDs to QuickBooks IDs)
CREATE TABLE IF NOT EXISTS quickbooks_sync_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  local_entity_type text NOT NULL, -- 'company', 'invoice', 'payment'
  local_entity_id uuid NOT NULL,
  qb_entity_type text NOT NULL, -- 'Customer', 'Invoice', 'Payment'
  qb_entity_id text NOT NULL,
  sync_status text NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('pending', 'synced', 'failed', 'conflict')),
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  sync_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (local_entity_type, local_entity_id)
);

-- SYNC LOGS (Track all sync operations)
CREATE TABLE IF NOT EXISTS quickbooks_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation text NOT NULL, -- 'create_customer', 'create_invoice', 'update_invoice', etc.
  entity_type text NOT NULL,
  local_id uuid,
  qb_id text,
  status text NOT NULL CHECK (status IN ('success', 'failed')),
  request_payload jsonb,
  response_payload jsonb,
  error_message text,
  execution_time_ms int,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_qb_integration_realm ON quickbooks_integration(realm_id);
CREATE INDEX IF NOT EXISTS idx_qb_integration_active ON quickbooks_integration(is_active);
CREATE INDEX IF NOT EXISTS idx_qb_mappings_local ON quickbooks_sync_mappings(local_entity_type, local_entity_id);
CREATE INDEX IF NOT EXISTS idx_qb_mappings_qb ON quickbooks_sync_mappings(qb_entity_type, qb_entity_id);
CREATE INDEX IF NOT EXISTS idx_qb_mappings_status ON quickbooks_sync_mappings(sync_status);
CREATE INDEX IF NOT EXISTS idx_qb_sync_log_created ON quickbooks_sync_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qb_sync_log_entity ON quickbooks_sync_log(entity_type, local_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_qb_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trigger_qb_integration_updated ON quickbooks_integration;
CREATE TRIGGER trigger_qb_integration_updated
  BEFORE UPDATE ON quickbooks_integration
  FOR EACH ROW
  EXECUTE FUNCTION update_qb_updated_at();

DROP TRIGGER IF EXISTS trigger_qb_mappings_updated ON quickbooks_sync_mappings;
CREATE TRIGGER trigger_qb_mappings_updated
  BEFORE UPDATE ON quickbooks_sync_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_qb_updated_at();

COMMENT ON TABLE quickbooks_integration IS 'QuickBooks Online OAuth tokens and connection settings';
COMMENT ON TABLE quickbooks_sync_mappings IS 'Maps local entities to QuickBooks entities for bidirectional sync';
COMMENT ON TABLE quickbooks_sync_log IS 'Complete audit trail of all QuickBooks sync operations';
