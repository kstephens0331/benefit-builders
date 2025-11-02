-- Migration 008: Add Accounts Receivable (A/R) and Accounts Payable (A/P) tables
-- This enables tracking of invoices, bills, payments, and QuickBooks integration

-- QuickBooks connection settings
CREATE TABLE IF NOT EXISTS quickbooks_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id text NOT NULL, -- QuickBooks company ID
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_sync_at timestamptz,
  status text DEFAULT 'active' CHECK (status IN ('active', 'expired', 'disconnected'))
);

-- Accounts Receivable (money owed TO us by customers)
CREATE TABLE IF NOT EXISTS accounts_receivable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  invoice_number text,
  invoice_date date NOT NULL,
  due_date date NOT NULL,
  amount numeric(10,2) NOT NULL,
  amount_paid numeric(10,2) DEFAULT 0,
  amount_due numeric(10,2) GENERATED ALWAYS AS (amount - amount_paid) STORED,
  status text DEFAULT 'open' CHECK (status IN ('open', 'partial', 'paid', 'overdue', 'written_off')),
  description text,
  notes text,
  quickbooks_invoice_id text, -- QuickBooks Invoice ID
  synced_to_qb boolean DEFAULT false,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by text
);

-- Accounts Payable (money we OWE to vendors/suppliers)
CREATE TABLE IF NOT EXISTS accounts_payable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name text NOT NULL,
  bill_number text,
  bill_date date NOT NULL,
  due_date date NOT NULL,
  amount numeric(10,2) NOT NULL,
  amount_paid numeric(10,2) DEFAULT 0,
  amount_due numeric(10,2) GENERATED ALWAYS AS (amount - amount_paid) STORED,
  status text DEFAULT 'open' CHECK (status IN ('open', 'partial', 'paid', 'overdue')),
  description text,
  notes text,
  quickbooks_bill_id text, -- QuickBooks Bill ID
  synced_to_qb boolean DEFAULT false,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by text
);

-- Payment transactions (both AR and AP)
CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type text NOT NULL CHECK (transaction_type IN ('ar_payment', 'ap_payment')),
  ar_id uuid REFERENCES accounts_receivable(id) ON DELETE CASCADE,
  ap_id uuid REFERENCES accounts_payable(id) ON DELETE CASCADE,
  payment_date date NOT NULL,
  amount numeric(10,2) NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('check', 'cash', 'ach', 'wire', 'credit_card', 'other')),
  check_number text,
  reference_number text,
  notes text,
  quickbooks_payment_id text,
  synced_to_qb boolean DEFAULT false,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by text,
  CONSTRAINT valid_ar_or_ap CHECK (
    (transaction_type = 'ar_payment' AND ar_id IS NOT NULL AND ap_id IS NULL) OR
    (transaction_type = 'ap_payment' AND ap_id IS NOT NULL AND ar_id IS NULL)
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ar_company ON accounts_receivable(company_id);
CREATE INDEX IF NOT EXISTS idx_ar_status ON accounts_receivable(status);
CREATE INDEX IF NOT EXISTS idx_ar_due_date ON accounts_receivable(due_date);
CREATE INDEX IF NOT EXISTS idx_ar_qb_id ON accounts_receivable(quickbooks_invoice_id);

CREATE INDEX IF NOT EXISTS idx_ap_vendor ON accounts_payable(vendor_name);
CREATE INDEX IF NOT EXISTS idx_ap_status ON accounts_payable(status);
CREATE INDEX IF NOT EXISTS idx_ap_due_date ON accounts_payable(due_date);
CREATE INDEX IF NOT EXISTS idx_ap_qb_id ON accounts_payable(quickbooks_bill_id);

CREATE INDEX IF NOT EXISTS idx_payments_ar ON payment_transactions(ar_id);
CREATE INDEX IF NOT EXISTS idx_payments_ap ON payment_transactions(ap_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payment_transactions(payment_date);

-- Add updated_at trigger for AR
CREATE OR REPLACE FUNCTION update_ar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ar_updated_at_trigger
  BEFORE UPDATE ON accounts_receivable
  FOR EACH ROW
  EXECUTE FUNCTION update_ar_updated_at();

-- Add updated_at trigger for AP
CREATE OR REPLACE FUNCTION update_ap_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ap_updated_at_trigger
  BEFORE UPDATE ON accounts_payable
  FOR EACH ROW
  EXECUTE FUNCTION update_ap_updated_at();

-- Add trigger to auto-update status based on payments
CREATE OR REPLACE FUNCTION update_ar_status()
RETURNS TRIGGER AS $$
DECLARE
  v_ar_id uuid;
  v_transaction_type text;
BEGIN
  -- Get the AR ID and transaction type based on operation
  IF TG_OP = 'DELETE' THEN
    v_ar_id := OLD.ar_id;
    v_transaction_type := OLD.transaction_type;
  ELSE
    v_ar_id := NEW.ar_id;
    v_transaction_type := NEW.transaction_type;
  END IF;

  -- Only process AR payments
  IF v_transaction_type = 'ar_payment' AND v_ar_id IS NOT NULL THEN
    UPDATE accounts_receivable
    SET status = CASE
      WHEN amount_paid >= amount THEN 'paid'
      WHEN amount_paid > 0 THEN 'partial'
      WHEN due_date < CURRENT_DATE AND amount_paid < amount THEN 'overdue'
      ELSE 'open'
    END
    WHERE id = v_ar_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ar_payment_status_trigger
  AFTER INSERT OR UPDATE OR DELETE ON payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_ar_status();

-- Add trigger to auto-update status based on payments for AP
CREATE OR REPLACE FUNCTION update_ap_status()
RETURNS TRIGGER AS $$
DECLARE
  v_ap_id uuid;
  v_transaction_type text;
BEGIN
  -- Get the AP ID and transaction type based on operation
  IF TG_OP = 'DELETE' THEN
    v_ap_id := OLD.ap_id;
    v_transaction_type := OLD.transaction_type;
  ELSE
    v_ap_id := NEW.ap_id;
    v_transaction_type := NEW.transaction_type;
  END IF;

  -- Only process AP payments
  IF v_transaction_type = 'ap_payment' AND v_ap_id IS NOT NULL THEN
    UPDATE accounts_payable
    SET status = CASE
      WHEN amount_paid >= amount THEN 'paid'
      WHEN amount_paid > 0 THEN 'partial'
      WHEN due_date < CURRENT_DATE AND amount_paid < amount THEN 'overdue'
      ELSE 'open'
    END
    WHERE id = v_ap_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ap_payment_status_trigger
  AFTER INSERT OR UPDATE OR DELETE ON payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_ap_status();

-- Comments
COMMENT ON TABLE accounts_receivable IS 'Invoices and money owed to us by customers/companies';
COMMENT ON TABLE accounts_payable IS 'Bills and money we owe to vendors/suppliers';
COMMENT ON TABLE payment_transactions IS 'Payment records for both AR and AP';
COMMENT ON TABLE quickbooks_connections IS 'QuickBooks OAuth connection settings';

COMMENT ON COLUMN accounts_receivable.amount_due IS 'Computed column: amount - amount_paid';
COMMENT ON COLUMN accounts_payable.amount_due IS 'Computed column: amount - amount_paid';
