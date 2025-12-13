-- FIX TRIGGERS: Run this in Supabase SQL Editor to fix the payment_date trigger error
-- This removes any triggers that reference payment_date on tables that don't have that column

-- =====================================================
-- FIX INVOICES TABLE TRIGGERS
-- =====================================================

-- Drop all potentially problematic triggers on invoices
DROP TRIGGER IF EXISTS invoice_payment_date_trigger ON invoices;
DROP TRIGGER IF EXISTS invoices_payment_trigger ON invoices;
DROP TRIGGER IF EXISTS update_invoice_payment ON invoices;
DROP TRIGGER IF EXISTS invoice_updated_at_trigger ON invoices;
DROP TRIGGER IF EXISTS invoices_updated_trigger ON invoices;
DROP TRIGGER IF EXISTS set_invoice_updated_at ON invoices;

-- Drop related functions
DROP FUNCTION IF EXISTS update_invoice_payment_date() CASCADE;
DROP FUNCTION IF EXISTS invoice_payment_update() CASCADE;
DROP FUNCTION IF EXISTS set_invoice_payment_date() CASCADE;

-- Recreate a simple updated_at trigger for invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE OR REPLACE FUNCTION update_invoice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invoice_updated_at_trigger ON invoices;
CREATE TRIGGER invoice_updated_at_trigger
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_updated_at();

-- =====================================================
-- FIX PAYMENT_TRANSACTIONS TABLE TRIGGERS (if any)
-- =====================================================

-- Drop any old triggers that might cause issues
DROP TRIGGER IF EXISTS payment_transactions_updated_trigger ON payment_transactions;

-- =====================================================
-- FIX ANY OTHER TABLES WITH BAD TRIGGERS
-- =====================================================

-- List all triggers to help debug
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Verify invoices table columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'invoices'
ORDER BY ordinal_position;
