-- Fix: Remove any triggers on invoices table that reference payment_date
-- The payment_date column doesn't exist on invoices table

-- Drop any triggers that might be causing the error
DROP TRIGGER IF EXISTS invoice_payment_date_trigger ON invoices;
DROP TRIGGER IF EXISTS invoices_payment_trigger ON invoices;
DROP TRIGGER IF EXISTS update_invoice_payment ON invoices;
DROP TRIGGER IF EXISTS invoice_updated_at_trigger ON invoices;

-- Also drop any related functions
DROP FUNCTION IF EXISTS update_invoice_payment_date();
DROP FUNCTION IF EXISTS invoice_payment_update();

-- Add a simple updated_at trigger for invoices (proper implementation)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE OR REPLACE FUNCTION update_invoice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_updated_at_trigger
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_updated_at();
