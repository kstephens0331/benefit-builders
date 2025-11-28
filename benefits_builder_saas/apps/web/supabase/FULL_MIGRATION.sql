-- QuickBooks Integration Enhanced Tables
-- Adds support for vendors, bills, estimates, webhooks, and sync tracking

-- =====================================================
-- VENDORS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,

  -- QuickBooks Integration
  qb_vendor_id TEXT UNIQUE,
  qb_synced_at TIMESTAMPTZ,
  qb_sync_pending BOOLEAN DEFAULT FALSE,
  qb_last_modified TIMESTAMPTZ,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendors_company_id ON vendors(company_id);
CREATE INDEX IF NOT EXISTS idx_vendors_qb_vendor_id ON vendors(qb_vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status);

-- =====================================================
-- BILLS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- Bill Details
  bill_number TEXT,
  bill_date DATE NOT NULL,
  due_date DATE NOT NULL,

  -- Amounts (in dollars)
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(12, 2) DEFAULT 0,
  amount_due DECIMAL(12, 2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,

  -- QuickBooks Integration
  qb_bill_id TEXT UNIQUE,
  qb_synced_at TIMESTAMPTZ,
  qb_sync_status TEXT DEFAULT 'pending' CHECK (qb_sync_status IN ('pending', 'synced', 'failed', 'deleted_in_qb')),

  -- Status
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'overdue')),

  -- Notes
  memo TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bills_vendor_id ON bills(vendor_id);
CREATE INDEX IF NOT EXISTS idx_bills_company_id ON bills(company_id);
CREATE INDEX IF NOT EXISTS idx_bills_qb_bill_id ON bills(qb_bill_id);
CREATE INDEX IF NOT EXISTS idx_bills_payment_status ON bills(payment_status);
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills(due_date);

-- =====================================================
-- BILL LINE ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS bill_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,

  -- Line Item Details
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,

  -- Expense Tracking
  account_ref TEXT, -- QuickBooks account ID for expense categorization
  category TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bill_line_items_bill_id ON bill_line_items(bill_id);

-- =====================================================
-- BILL PAYMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS bill_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,

  -- Payment Details
  payment_date DATE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_method TEXT DEFAULT 'check' CHECK (payment_method IN ('check', 'ach', 'wire', 'credit_card', 'cash', 'other')),
  reference_number TEXT,
  notes TEXT,

  -- QuickBooks Integration
  qb_payment_id TEXT UNIQUE,
  qb_synced_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bill_payments_bill_id ON bill_payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_payments_qb_payment_id ON bill_payments(qb_payment_id);

-- =====================================================
-- ESTIMATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- Estimate Details
  estimate_number TEXT UNIQUE,
  estimate_date DATE NOT NULL,
  expiration_date DATE,

  -- Amounts (in dollars)
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,

  -- Customer Communication
  customer_memo TEXT,
  internal_notes TEXT,

  -- QuickBooks Integration
  qb_estimate_id TEXT UNIQUE,
  qb_synced_at TIMESTAMPTZ,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted')),

  -- Conversion tracking
  converted_to_invoice_id UUID,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_estimates_company_id ON estimates(company_id);
CREATE INDEX IF NOT EXISTS idx_estimates_qb_estimate_id ON estimates(qb_estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status);
CREATE INDEX IF NOT EXISTS idx_estimates_estimate_date ON estimates(estimate_date);

-- =====================================================
-- ESTIMATE LINE ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS estimate_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID REFERENCES estimates(id) ON DELETE CASCADE,

  -- Line Item Details
  description TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(12, 2) NOT NULL,
  amount DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,

  -- Item reference
  item_name TEXT,

  -- Display order
  line_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_estimate_line_items_estimate_id ON estimate_line_items(estimate_id);

-- =====================================================
-- QUICKBOOKS WEBHOOK QUEUE
-- =====================================================
CREATE TABLE IF NOT EXISTS quickbooks_webhook_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID,
  realm_id TEXT NOT NULL,

  -- Webhook Event Details
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('Create', 'Update', 'Delete', 'Merge', 'Void')),

  -- Processing
  received_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Raw payload for debugging
  raw_payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_webhook_queue_processed ON quickbooks_webhook_queue(processed, received_at);
CREATE INDEX IF NOT EXISTS idx_webhook_queue_entity ON quickbooks_webhook_queue(entity_type, entity_id);

-- =====================================================
-- QUICKBOOKS PAYMENT QUEUE (for immediate processing)
-- =====================================================
CREATE TABLE IF NOT EXISTS quickbooks_payment_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID,
  qb_payment_id TEXT NOT NULL,

  -- Processing
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_payment_queue_processed ON quickbooks_payment_queue(processed, queued_at);

-- =====================================================
-- QUICKBOOKS SYNC LOG (enhanced)
-- =====================================================
CREATE TABLE IF NOT EXISTS quickbooks_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID,

  -- Sync Details
  sync_type TEXT NOT NULL CHECK (sync_type IN ('manual', 'bidirectional', 'webhook', 'scheduled')),

  -- Entity Counts
  customers_pushed INTEGER DEFAULT 0,
  customers_pulled INTEGER DEFAULT 0,
  invoices_pushed INTEGER DEFAULT 0,
  invoices_pulled INTEGER DEFAULT 0,
  payments_pushed INTEGER DEFAULT 0,
  payments_pulled INTEGER DEFAULT 0,
  vendors_pushed INTEGER DEFAULT 0,
  vendors_pulled INTEGER DEFAULT 0,
  bills_pushed INTEGER DEFAULT 0,
  bills_pulled INTEGER DEFAULT 0,
  estimates_pushed INTEGER DEFAULT 0,
  estimates_pulled INTEGER DEFAULT 0,

  -- Error tracking
  errors JSONB,
  warnings JSONB,

  -- Performance
  duration_ms INTEGER,

  -- Timestamps
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_log_synced_at ON quickbooks_sync_log(synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_log_connection ON quickbooks_sync_log(connection_id);

-- =====================================================
-- UPDATE EXISTING COMPANIES TABLE
-- =====================================================
-- Add QB sync tracking columns to companies if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'companies' AND column_name = 'qb_sync_pending') THEN
    ALTER TABLE companies ADD COLUMN qb_sync_pending BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'companies' AND column_name = 'qb_last_modified') THEN
    ALTER TABLE companies ADD COLUMN qb_last_modified TIMESTAMPTZ;
  END IF;
END $$;

-- =====================================================
-- UPDATE EXISTING INVOICES TABLE
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'invoices' AND column_name = 'qb_sync_pending') THEN
    ALTER TABLE invoices ADD COLUMN qb_sync_pending BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'invoices' AND column_name = 'qb_last_modified') THEN
    ALTER TABLE invoices ADD COLUMN qb_last_modified TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'invoices' AND column_name = 'qb_sync_status') THEN
    ALTER TABLE invoices ADD COLUMN qb_sync_status TEXT DEFAULT 'pending';
  END IF;
END $$;

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
DROP TRIGGER IF EXISTS update_vendors_updated_at ON vendors;
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bills_updated_at ON bills;
CREATE TRIGGER update_bills_updated_at BEFORE UPDATE ON bills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_estimates_updated_at ON estimates;
CREATE TRIGGER update_estimates_updated_at BEFORE UPDATE ON estimates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-update bill payment status
CREATE OR REPLACE FUNCTION update_bill_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE bills
  SET payment_status = CASE
    WHEN amount_due <= 0 THEN 'paid'
    WHEN amount_paid > 0 THEN 'partial'
    WHEN due_date < CURRENT_DATE THEN 'overdue'
    ELSE 'unpaid'
  END
  WHERE id = NEW.bill_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_bill_status_on_payment ON bill_payments;
CREATE TRIGGER update_bill_status_on_payment AFTER INSERT OR UPDATE ON bill_payments
  FOR EACH ROW EXECUTE FUNCTION update_bill_payment_status();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_line_items ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for API routes)
CREATE POLICY "Service role has full access to vendors" ON vendors
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to bills" ON bills
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to bill_line_items" ON bill_line_items
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to bill_payments" ON bill_payments
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to estimates" ON estimates
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to estimate_line_items" ON estimate_line_items
  FOR ALL USING (auth.role() = 'service_role');

-- Authenticated users can view their company's data
-- (Add more specific policies based on your auth setup)

-- =====================================================
-- INITIAL DATA / SEED (Optional)
-- =====================================================

-- You can add default expense categories, payment methods, etc. here if needed

COMMENT ON TABLE vendors IS 'Vendors for accounts payable management';
COMMENT ON TABLE bills IS 'Bills from vendors to be paid';
COMMENT ON TABLE estimates IS 'Sales estimates/quotes for proposals';
COMMENT ON TABLE quickbooks_webhook_queue IS 'Queue for processing QuickBooks webhook events';
COMMENT ON TABLE quickbooks_payment_queue IS 'Priority queue for immediate payment processing';
-- Invoice and Payment Processing Enhancements
-- Adds support for ACH, credit card, and check payments
-- Includes invoice delivery tracking and payment processor integration

-- =====================================================
-- PAYMENT PROCESSORS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_processors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Processor Details
  processor_name TEXT NOT NULL CHECK (processor_name IN ('stripe', 'plaid', 'square', 'authorize_net', 'manual')),
  processor_type TEXT NOT NULL CHECK (processor_type IN ('card', 'ach', 'both')),

  -- Credentials (encrypted)
  api_key_encrypted TEXT,
  api_secret_encrypted TEXT,
  webhook_secret TEXT,

  -- Configuration
  config JSONB DEFAULT '{}',

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_default_for_cards BOOLEAN DEFAULT FALSE,
  is_default_for_ach BOOLEAN DEFAULT FALSE,

  -- Test mode
  test_mode BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_processors_active ON payment_processors(is_active);

-- =====================================================
-- ENHANCE INVOICES TABLE
-- =====================================================
DO $$
BEGIN
  -- Add invoice delivery tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'invoices' AND column_name = 'delivery_method') THEN
    ALTER TABLE invoices ADD COLUMN delivery_method TEXT CHECK (delivery_method IN ('email', 'mail', 'both', 'portal'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'invoices' AND column_name = 'emailed_at') THEN
    ALTER TABLE invoices ADD COLUMN emailed_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'invoices' AND column_name = 'mailed_at') THEN
    ALTER TABLE invoices ADD COLUMN mailed_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'invoices' AND column_name = 'last_viewed_at') THEN
    ALTER TABLE invoices ADD COLUMN last_viewed_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'invoices' AND column_name = 'view_count') THEN
    ALTER TABLE invoices ADD COLUMN view_count INTEGER DEFAULT 0;
  END IF;

  -- Payment preferences
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'invoices' AND column_name = 'payment_terms_days') THEN
    ALTER TABLE invoices ADD COLUMN payment_terms_days INTEGER DEFAULT 30;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'invoices' AND column_name = 'late_fee_enabled') THEN
    ALTER TABLE invoices ADD COLUMN late_fee_enabled BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'invoices' AND column_name = 'late_fee_percentage') THEN
    ALTER TABLE invoices ADD COLUMN late_fee_percentage DECIMAL(5, 2) DEFAULT 0;
  END IF;

  -- PDF storage
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'invoices' AND column_name = 'pdf_url') THEN
    ALTER TABLE invoices ADD COLUMN pdf_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'invoices' AND column_name = 'pdf_generated_at') THEN
    ALTER TABLE invoices ADD COLUMN pdf_generated_at TIMESTAMPTZ;
  END IF;
END $$;

-- =====================================================
-- PAYMENT METHODS TABLE (Customer saved payment methods)
-- =====================================================
CREATE TABLE IF NOT EXISTS customer_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  processor_id UUID REFERENCES payment_processors(id),

  -- Payment Method Details
  payment_type TEXT NOT NULL CHECK (payment_type IN ('card', 'ach', 'check')),

  -- For Cards
  card_last_four TEXT,
  card_brand TEXT, -- visa, mastercard, amex, etc.
  card_exp_month INTEGER,
  card_exp_year INTEGER,

  -- For ACH
  account_last_four TEXT,
  account_type TEXT CHECK (account_type IN ('checking', 'savings')),
  bank_name TEXT,
  routing_number_last_four TEXT,

  -- External References
  processor_customer_id TEXT, -- Stripe customer ID, etc.
  processor_payment_method_id TEXT, -- Stripe payment method ID, etc.

  -- Status
  is_default BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  nickname TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_customer_payment_methods_company ON customer_payment_methods(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_payment_methods_default ON customer_payment_methods(is_default, is_active);

-- =====================================================
-- ENHANCE PAYMENT TRANSACTIONS TABLE
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'payment_transactions' AND column_name = 'invoice_id') THEN
    ALTER TABLE payment_transactions ADD COLUMN invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'payment_transactions' AND column_name = 'payment_type') THEN
    ALTER TABLE payment_transactions ADD COLUMN payment_type TEXT DEFAULT 'check' CHECK (payment_type IN ('card', 'ach', 'check', 'wire', 'cash', 'other'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'payment_transactions' AND column_name = 'processor_id') THEN
    ALTER TABLE payment_transactions ADD COLUMN processor_id UUID REFERENCES payment_processors(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'payment_transactions' AND column_name = 'processor_transaction_id') THEN
    ALTER TABLE payment_transactions ADD COLUMN processor_transaction_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'payment_transactions' AND column_name = 'processor_fee_cents') THEN
    ALTER TABLE payment_transactions ADD COLUMN processor_fee_cents INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'payment_transactions' AND column_name = 'status') THEN
    ALTER TABLE payment_transactions ADD COLUMN status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'disputed'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'payment_transactions' AND column_name = 'failure_reason') THEN
    ALTER TABLE payment_transactions ADD COLUMN failure_reason TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'payment_transactions' AND column_name = 'metadata') THEN
    ALTER TABLE payment_transactions ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_invoice ON payment_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_processor_txn ON payment_transactions(processor_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);

-- =====================================================
-- INVOICE DELIVERY LOG
-- =====================================================
CREATE TABLE IF NOT EXISTS invoice_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,

  -- Delivery Details
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('email', 'mail', 'portal')),

  -- Email specific
  email_to TEXT,
  email_subject TEXT,
  email_sent_at TIMESTAMPTZ,
  email_opened_at TIMESTAMPTZ,
  email_clicked_at TIMESTAMPTZ,

  -- Mail specific
  mailing_address TEXT,
  mailed_date DATE,
  tracking_number TEXT,

  -- Status
  delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_delivery_log_invoice ON invoice_delivery_log(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_delivery_log_status ON invoice_delivery_log(delivery_status);

-- =====================================================
-- RECURRING INVOICES (for monthly billing)
-- =====================================================
CREATE TABLE IF NOT EXISTS recurring_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- Schedule Details
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'annually')),
  start_date DATE NOT NULL,
  end_date DATE,
  next_invoice_date DATE NOT NULL,

  -- Invoice Template
  invoice_template JSONB NOT NULL, -- Contains line items, amounts, etc.

  -- Delivery Settings
  delivery_method TEXT DEFAULT 'email' CHECK (delivery_method IN ('email', 'mail', 'both', 'portal')),
  auto_send BOOLEAN DEFAULT TRUE,

  -- Payment Settings
  auto_charge BOOLEAN DEFAULT FALSE,
  payment_method_id UUID REFERENCES customer_payment_methods(id),

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_generated_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_invoices_company ON recurring_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_next_date ON recurring_invoices(next_invoice_date, is_active);

-- =====================================================
-- PAYMENT INTENTS (for async payment processing)
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id),

  -- Intent Details
  amount_cents INTEGER NOT NULL,
  payment_method_id UUID REFERENCES customer_payment_methods(id),
  processor_id UUID REFERENCES payment_processors(id),

  -- Processor References
  processor_intent_id TEXT,
  processor_client_secret TEXT,

  -- Status
  status TEXT DEFAULT 'created' CHECK (status IN ('created', 'requires_action', 'processing', 'succeeded', 'failed', 'canceled')),
  failure_reason TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  succeeded_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_intents_invoice ON payment_intents(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON payment_intents(status);
CREATE INDEX IF NOT EXISTS idx_payment_intents_processor ON payment_intents(processor_intent_id);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Auto-update updated_at
DROP TRIGGER IF EXISTS update_payment_processors_updated_at ON payment_processors;
CREATE TRIGGER update_payment_processors_updated_at BEFORE UPDATE ON payment_processors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customer_payment_methods_updated_at ON customer_payment_methods;
CREATE TRIGGER update_customer_payment_methods_updated_at BEFORE UPDATE ON customer_payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_recurring_invoices_updated_at ON recurring_invoices;
CREATE TRIGGER update_recurring_invoices_updated_at BEFORE UPDATE ON recurring_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Ensure only one default payment method per company
CREATE OR REPLACE FUNCTION ensure_single_default_payment_method()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE customer_payment_methods
    SET is_default = FALSE
    WHERE company_id = NEW.company_id
      AND id != NEW.id
      AND payment_type = NEW.payment_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_single_default_payment ON customer_payment_methods;
CREATE TRIGGER enforce_single_default_payment BEFORE INSERT OR UPDATE ON customer_payment_methods
  FOR EACH ROW EXECUTE FUNCTION ensure_single_default_payment_method();

-- Update invoice status based on payments
CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_total DECIMAL;
  v_total_paid DECIMAL;
BEGIN
  -- Get invoice total
  SELECT total_cents / 100.0 INTO v_invoice_total
  FROM invoices
  WHERE id = NEW.invoice_id;

  -- Calculate total paid for this invoice
  SELECT COALESCE(SUM(amount / 100.0), 0) INTO v_total_paid
  FROM payment_transactions
  WHERE invoice_id = NEW.invoice_id
    AND status = 'completed';

  -- Update invoice status
  UPDATE invoices
  SET payment_status = CASE
    WHEN v_total_paid >= v_invoice_total THEN 'paid'
    WHEN v_total_paid > 0 THEN 'partial'
    ELSE 'unpaid'
  END
  WHERE id = NEW.invoice_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_invoice_status_on_payment ON payment_transactions;
CREATE TRIGGER update_invoice_status_on_payment AFTER INSERT OR UPDATE ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION update_invoice_payment_status();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE payment_processors ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_delivery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to payment_processors" ON payment_processors
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to customer_payment_methods" ON customer_payment_methods
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to invoice_delivery_log" ON invoice_delivery_log
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to recurring_invoices" ON recurring_invoices
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to payment_intents" ON payment_intents
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert manual payment processor (for checks)
INSERT INTO payment_processors (processor_name, processor_type, is_active, is_default_for_cards, is_default_for_ach, test_mode)
VALUES ('manual', 'both', TRUE, FALSE, FALSE, FALSE)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE payment_processors IS 'Payment processor configurations (Stripe, Plaid, etc.)';
COMMENT ON TABLE customer_payment_methods IS 'Saved customer payment methods (cards, bank accounts)';
COMMENT ON TABLE invoice_delivery_log IS 'Tracks invoice delivery via email and mail';
COMMENT ON TABLE recurring_invoices IS 'Monthly recurring invoice templates';
COMMENT ON TABLE payment_intents IS 'Async payment processing intents';
-- Accounting Safety & Guidance System
-- Adds credits, alerts, month-end validation, and bank reconciliation

-- =====================================================
-- COMPANY CREDITS (for overpayments)
-- =====================================================
CREATE TABLE IF NOT EXISTS company_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- Credit Details
  amount INTEGER NOT NULL, -- in cents
  source TEXT NOT NULL CHECK (source IN ('overpayment', 'refund', 'adjustment', 'goodwill')),
  source_invoice_id UUID REFERENCES invoices(id),

  -- Application
  applied_to_invoice_id UUID REFERENCES invoices(id),
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'applied', 'expired')),

  -- Lifecycle
  expires_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_credits_company ON company_credits(company_id);
CREATE INDEX IF NOT EXISTS idx_company_credits_status ON company_credits(status, expires_at);

-- =====================================================
-- PAYMENT REMINDERS LOG
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,

  -- Reminder Details
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('gentle', 'firm', 'final', 'auto')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  sent_to TEXT NOT NULL,

  -- Email tracking
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,

  -- Response
  payment_received_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_reminders_invoice ON payment_reminders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_sent_at ON payment_reminders(sent_at DESC);

-- =====================================================
-- MONTH-END CLOSING LOG
-- =====================================================
CREATE TABLE IF NOT EXISTS month_end_closings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Period
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),

  -- Validation Results
  validation_report JSONB NOT NULL,
  can_close BOOLEAN NOT NULL,
  critical_issues_count INTEGER DEFAULT 0,
  warnings_count INTEGER DEFAULT 0,

  -- Closing Details
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'closed', 'rejected')),
  closed_by UUID, -- User ID
  closed_at TIMESTAMPTZ,
  approved_by UUID, -- User ID (if different from closer)
  approved_at TIMESTAMPTZ,

  -- Lock enforcement
  transactions_locked BOOLEAN DEFAULT FALSE,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_month_end_closings_period ON month_end_closings(year, month);
CREATE INDEX IF NOT EXISTS idx_month_end_closings_status ON month_end_closings(status);

-- =====================================================
-- BANK RECONCILIATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS bank_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Period
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),

  -- Bank Details
  bank_account_name TEXT NOT NULL,
  bank_account_last_four TEXT,

  -- Balances
  beginning_book_balance DECIMAL(12, 2) NOT NULL,
  ending_book_balance DECIMAL(12, 2) NOT NULL,
  ending_bank_balance DECIMAL(12, 2) NOT NULL,

  -- Reconciliation
  total_deposits DECIMAL(12, 2) DEFAULT 0,
  total_withdrawals DECIMAL(12, 2) DEFAULT 0,
  outstanding_checks DECIMAL(12, 2) DEFAULT 0,
  outstanding_deposits DECIMAL(12, 2) DEFAULT 0,
  adjustments DECIMAL(12, 2) DEFAULT 0,

  -- Status
  reconciled BOOLEAN DEFAULT FALSE,
  difference DECIMAL(12, 2) GENERATED ALWAYS AS (
    ending_bank_balance + outstanding_deposits - outstanding_checks - ending_book_balance
  ) STORED,

  -- Who reconciled
  reconciled_by UUID,
  reconciled_at TIMESTAMPTZ,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_reconciliations_period ON bank_reconciliations(year, month);
CREATE INDEX IF NOT EXISTS idx_bank_reconciliations_reconciled ON bank_reconciliations(reconciled);

-- =====================================================
-- BANK TRANSACTIONS (for matching/import)
-- =====================================================
CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Transaction Details
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  transaction_type TEXT CHECK (transaction_type IN ('debit', 'credit')),

  -- Bank Details
  bank_account_last_four TEXT,
  reference_number TEXT,

  -- Matching
  matched_payment_id UUID REFERENCES payment_transactions(id),
  matched_at TIMESTAMPTZ,
  matched_by UUID,

  -- Categorization
  category TEXT,
  notes TEXT,

  -- Import tracking
  import_batch_id UUID,
  imported_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_unmatched ON bank_transactions(matched_payment_id) WHERE matched_payment_id IS NULL;

-- =====================================================
-- ACCOUNTING ACTION LOG (audit trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS accounting_action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Action Details
  action_type TEXT NOT NULL,
  action_category TEXT CHECK (action_category IN ('create', 'update', 'delete', 'void', 'close')),
  entity_type TEXT NOT NULL, -- 'invoice', 'payment', 'bill', etc.
  entity_id UUID,

  -- User
  performed_by UUID NOT NULL,
  performed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Details
  before_state JSONB,
  after_state JSONB,
  changes JSONB,

  -- Approval (for high-risk actions)
  requires_approval BOOLEAN DEFAULT FALSE,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,

  -- Notes
  reason TEXT,
  ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_accounting_action_log_entity ON accounting_action_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_accounting_action_log_performed ON accounting_action_log(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_accounting_action_log_approval ON accounting_action_log(requires_approval, approved_at) WHERE requires_approval = TRUE;

-- =====================================================
-- PAYMENT ALERTS
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Alert Details
  alert_type TEXT NOT NULL CHECK (alert_type IN ('late', 'underpaid', 'overpaid', 'failed', 'reminder')),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),

  -- Related Entities
  company_id UUID REFERENCES companies(id),
  invoice_id UUID REFERENCES invoices(id),
  payment_id UUID REFERENCES payment_transactions(id),

  -- Alert Content
  message TEXT NOT NULL,
  action_required TEXT,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'ignored')),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_alerts_company ON payment_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_alerts_status ON payment_alerts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_alerts_severity ON payment_alerts(severity, status);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Auto-create alerts for late payments
CREATE OR REPLACE FUNCTION check_and_create_late_payment_alerts()
RETURNS void AS $$
BEGIN
  -- Create alerts for invoices that became overdue
  INSERT INTO payment_alerts (alert_type, severity, company_id, invoice_id, message, action_required)
  SELECT
    'late',
    CASE
      WHEN CURRENT_DATE - due_date > 60 THEN 'critical'
      WHEN CURRENT_DATE - due_date > 30 THEN 'warning'
      ELSE 'info'
    END,
    company_id,
    id,
    'Invoice ' || invoice_number || ' is ' || (CURRENT_DATE - due_date) || ' days overdue',
    'Send payment reminder'
  FROM invoices
  WHERE due_date < CURRENT_DATE
    AND payment_status != 'paid'
    AND NOT EXISTS (
      SELECT 1 FROM payment_alerts
      WHERE alert_type = 'late'
        AND invoice_id = invoices.id
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql;

-- Auto-apply available credits to new invoices
CREATE OR REPLACE FUNCTION auto_apply_credits_on_invoice_create()
RETURNS TRIGGER AS $$
DECLARE
  v_credit RECORD;
  v_remaining_amount INTEGER;
BEGIN
  v_remaining_amount := NEW.total_cents;

  -- Loop through available credits for this company
  FOR v_credit IN
    SELECT * FROM company_credits
    WHERE company_id = NEW.company_id
      AND status = 'available'
      AND amount > 0
      AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY created_at
  LOOP
    EXIT WHEN v_remaining_amount <= 0;

    -- Apply credit
    DECLARE
      v_amount_to_apply INTEGER;
    BEGIN
      v_amount_to_apply := LEAST(v_credit.amount, v_remaining_amount);

      -- Update credit
      UPDATE company_credits
      SET
        amount = amount - v_amount_to_apply,
        applied_to_invoice_id = NEW.id,
        status = CASE WHEN amount - v_amount_to_apply <= 0 THEN 'applied' ELSE 'available' END,
        applied_at = NOW()
      WHERE id = v_credit.id;

      -- Create payment transaction
      INSERT INTO payment_transactions (
        invoice_id,
        amount,
        payment_type,
        payment_date,
        status,
        notes,
        metadata
      ) VALUES (
        NEW.id,
        v_amount_to_apply,
        'credit',
        CURRENT_DATE,
        'completed',
        'Auto-applied credit from previous overpayment',
        jsonb_build_object('credit_id', v_credit.id)
      );

      -- Update invoice
      v_remaining_amount := v_remaining_amount - v_amount_to_apply;
      UPDATE invoices
      SET amount_paid_cents = amount_paid_cents + v_amount_to_apply
      WHERE id = NEW.id;
    END;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-apply credits
DROP TRIGGER IF EXISTS trigger_auto_apply_credits ON invoices;
CREATE TRIGGER trigger_auto_apply_credits
  AFTER INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION auto_apply_credits_on_invoice_create();

-- Prevent editing closed months
CREATE OR REPLACE FUNCTION prevent_closed_month_edits()
RETURNS TRIGGER AS $$
DECLARE
  v_closed BOOLEAN;
  v_year INTEGER;
  v_month INTEGER;
BEGIN
  -- Extract year and month from transaction date
  v_year := EXTRACT(YEAR FROM COALESCE(NEW.payment_date, NEW.invoice_date, NEW.bill_date));
  v_month := EXTRACT(MONTH FROM COALESCE(NEW.payment_date, NEW.invoice_date, NEW.bill_date));

  -- Check if month is closed
  SELECT transactions_locked INTO v_closed
  FROM month_end_closings
  WHERE year = v_year
    AND month = v_month
    AND status = 'closed';

  IF v_closed THEN
    RAISE EXCEPTION 'Cannot modify transactions in a closed accounting period (% - %)', v_year, v_month;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
DROP TRIGGER IF EXISTS prevent_invoice_edits_closed_month ON invoices;
CREATE TRIGGER prevent_invoice_edits_closed_month
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION prevent_closed_month_edits();

DROP TRIGGER IF EXISTS prevent_payment_edits_closed_month ON payment_transactions;
CREATE TRIGGER prevent_payment_edits_closed_month
  BEFORE INSERT OR UPDATE ON payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_closed_month_edits();

-- Only create bill trigger if bills table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bills') THEN
    DROP TRIGGER IF EXISTS prevent_bill_edits_closed_month ON bills;
    CREATE TRIGGER prevent_bill_edits_closed_month
      BEFORE INSERT OR UPDATE ON bills
      FOR EACH ROW
      EXECUTE FUNCTION prevent_closed_month_edits();
  END IF;
END $$;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE company_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE month_end_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_action_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to company_credits" ON company_credits
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to payment_reminders" ON payment_reminders
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to month_end_closings" ON month_end_closings
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to bank_reconciliations" ON bank_reconciliations
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to bank_transactions" ON bank_transactions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to accounting_action_log" ON accounting_action_log
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to payment_alerts" ON payment_alerts
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE company_credits IS 'Customer credits from overpayments/refunds that can be applied to future invoices';
COMMENT ON TABLE payment_reminders IS 'Log of payment reminder emails sent to customers';
COMMENT ON TABLE month_end_closings IS 'Month-end closing validation and lock records';
COMMENT ON TABLE bank_reconciliations IS 'Monthly bank account reconciliation records';
COMMENT ON TABLE bank_transactions IS 'Imported bank transactions for matching';
COMMENT ON TABLE accounting_action_log IS 'Complete audit trail of all accounting actions';
COMMENT ON TABLE payment_alerts IS 'Automated alerts for late payments, underpayments, failures, etc.';
