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
