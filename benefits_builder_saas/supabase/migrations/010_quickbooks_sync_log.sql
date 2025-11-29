-- QuickBooks Sync Log Enhancements
-- Adds bidirectional sync tracking to the existing quickbooks_sync_log table

-- Drop the old sync log table if it exists (from migration 005)
DROP TABLE IF EXISTS quickbooks_sync_log CASCADE;

-- Create new enhanced sync log table (references quickbooks_connections from migration 008)
CREATE TABLE quickbooks_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES quickbooks_connections(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('bidirectional', 'push', 'pull', 'manual')),

  -- Sync counts
  customers_pushed INT NOT NULL DEFAULT 0,
  customers_pulled INT NOT NULL DEFAULT 0,
  invoices_pushed INT NOT NULL DEFAULT 0,
  invoices_pulled INT NOT NULL DEFAULT 0,
  payments_pushed INT NOT NULL DEFAULT 0,
  payments_pulled INT NOT NULL DEFAULT 0,

  -- Error tracking
  errors JSONB,

  -- Metadata
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_ms INT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_qb_sync_log_connection ON quickbooks_sync_log(connection_id);
CREATE INDEX IF NOT EXISTS idx_qb_sync_log_synced_at ON quickbooks_sync_log(synced_at DESC);

-- Add sync tracking columns to invoices table if they don't exist
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS qb_invoice_id TEXT,
ADD COLUMN IF NOT EXISTS qb_synced BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS qb_synced_at TIMESTAMPTZ;

-- Add QuickBooks tracking to companies
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS qb_synced_at TIMESTAMPTZ;

-- Add QuickBooks payment ID to payment_transactions
ALTER TABLE payment_transactions
ADD COLUMN IF NOT EXISTS qb_payment_id TEXT;

-- Create index on QB IDs for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoices_qb_invoice_id ON invoices(qb_invoice_id) WHERE qb_invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_transactions_qb_payment_id ON payment_transactions(qb_payment_id) WHERE qb_payment_id IS NOT NULL;

COMMENT ON TABLE quickbooks_sync_log IS 'Audit log for QuickBooks synchronization operations';
COMMENT ON COLUMN invoices.qb_invoice_id IS 'QuickBooks Invoice ID';
COMMENT ON COLUMN invoices.qb_synced IS 'Whether invoice has been synced to QuickBooks';
COMMENT ON COLUMN invoices.qb_synced_at IS 'Timestamp of last sync to QuickBooks';
