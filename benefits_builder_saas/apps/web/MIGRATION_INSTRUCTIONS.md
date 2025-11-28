# Database Migration Instructions

## Quick Start: Run Migrations via Supabase Dashboard

The easiest way to run the database migrations is through the Supabase SQL Editor:

### Step 1: Open Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project: `stuaxikfuxzlbzneekua`
3. Click on "SQL Editor" in the left sidebar

### Step 2: Run Each Migration

Run these migrations **in order**:

#### Migration 1: QuickBooks Enhancements
```bash
File: supabase/migrations/20240115_quickbooks_enhancements.sql
```

1. Open the file in your code editor
2. Copy the entire contents
3. Paste into Supabase SQL Editor
4. Click "Run" button
5. Wait for success message

#### Migration 2: Invoice & Payment Enhancements
```bash
File: supabase/migrations/20240116_invoice_payment_enhancements.sql
```

1. Open the file in your code editor
2. Copy the entire contents
3. Paste into Supabase SQL Editor
4. Click "Run" button
5. Wait for success message

#### Migration 3: Accounting Safety System
```bash
File: supabase/migrations/20240117_accounting_safety_system.sql
```

1. Open the file in your code editor
2. Copy the entire contents
3. Paste into Supabase SQL Editor
4. Click "Run" button
5. Wait for success message

### Step 3: Verify

After running all migrations, verify the tables were created:

1. Go to "Table Editor" in Supabase dashboard
2. You should see these new tables:
   - ✅ vendors
   - ✅ bills
   - ✅ estimates
   - ✅ company_credits
   - ✅ payment_alerts
   - ✅ month_end_closings
   - ✅ bank_reconciliations
   - ✅ payment_processors
   - ✅ recurring_invoices

## Alternative: Use Consolidated Migration

If you prefer to run all three at once:

```bash
File: supabase/FULL_MIGRATION.sql
```

This file contains all three migrations combined. Simply:

1. Open `supabase/FULL_MIGRATION.sql`
2. Copy entire contents
3. Paste into Supabase SQL Editor
4. Click "Run"

**Note:** This may timeout if the SQL is very long. Use individual migrations if that happens.

## What These Migrations Add

### Migration 1: QuickBooks Integration
- Vendors table for accounts payable
- Bills table for tracking vendor bills
- Estimates table for sales quotes
- Webhook processing queues
- Sync tracking and logging

### Migration 2: Payment Processing
- Payment processors configuration
- Customer payment methods (cards, ACH)
- Invoice delivery tracking
- Recurring invoice templates
- Payment intents for async processing

### Migration 3: Accounting Safety
- Company credits for overpayments
- Payment reminder logging
- Month-end validation system
- Bank reconciliation records
- Accounting action audit trail
- Payment alerts (late, underpaid, overpaid)
- Automated triggers for:
  - Auto-applying credits to invoices
  - Preventing edits to closed months
  - Late payment alert generation

## Troubleshooting

### Error: "already exists"
✅ **Safe to ignore** - This means the table/function already exists from a previous run.

### Error: "relation does not exist"
❌ **Run migrations in order** - Migration 3 depends on tables from Migration 1 & 2.

### Error: "permission denied"
❌ **Check your role** - Make sure you're using the Service Role key, not the Anon key.

### SQL Editor Timeout
If the SQL editor times out:
1. Run migrations individually (one at a time)
2. Or split large migrations into smaller chunks

## Verification Queries

After running migrations, test with these queries in SQL Editor:

```sql
-- Check if all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'vendors', 'bills', 'estimates',
    'company_credits', 'payment_alerts',
    'month_end_closings', 'bank_reconciliations'
  )
ORDER BY table_name;

-- Check row level security is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('company_credits', 'payment_alerts');

-- Check triggers exist
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%auto_apply%';
```

Expected results:
- 7+ tables listed
- All tables show rowsecurity = true
- At least 1 trigger with "auto_apply" in the name

## Need Help?

If migrations fail or you're unsure:

1. Check the Supabase logs (Dashboard → Logs)
2. Review the error message carefully
3. Verify you're connected to the right project
4. Make sure migrations run in order (1 → 2 → 3)

The accounting safety system is now ready to use! 🎉
