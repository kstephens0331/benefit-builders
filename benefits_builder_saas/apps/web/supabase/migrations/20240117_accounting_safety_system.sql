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
