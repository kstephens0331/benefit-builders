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
