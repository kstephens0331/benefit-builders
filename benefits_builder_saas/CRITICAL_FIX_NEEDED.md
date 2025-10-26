# CRITICAL DATABASE FIX REQUIRED

## Issue
The `companies` table is missing `employer_rate` and `employee_rate` columns that the application code requires.

**Error**: `column companies.employer_rate does not exist`

## Impact
- Employee detail pages showing "Model: N/A (0% Employee / 0% Employer)"
- Deductions page failing with database error
- Dashboard analytics may be affected
- Any page querying these columns will fail

## Fix Required
You MUST run the following SQL migration in Supabase SQL Editor:

### Step 1: Go to Supabase Dashboard
1. Navigate to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in the left sidebar
4. Click "New query"

### Step 2: Run this SQL

```sql
-- Migration: Add employer_rate and employee_rate columns to companies table
-- These columns store the parsed rates from the model field for easier querying

-- Add the new columns
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS employee_rate numeric(5,2) DEFAULT 0.00 CHECK (employee_rate >= 0 AND employee_rate <= 100),
ADD COLUMN IF NOT EXISTS employer_rate numeric(5,2) DEFAULT 0.00 CHECK (employer_rate >= 0 AND employer_rate <= 100);

-- Update existing rows by parsing the model field
-- Model format is "employee/employer" (e.g., "5/3" means 5% employee, 3% employer)
-- Cast model to text first since it may be a custom type
UPDATE companies
SET
  employee_rate = CAST(SPLIT_PART(model::text, '/', 1) AS numeric(5,2)),
  employer_rate = CAST(SPLIT_PART(model::text, '/', 2) AS numeric(5,2))
WHERE employee_rate = 0 AND employer_rate = 0;

-- Add comment for documentation
COMMENT ON COLUMN companies.employee_rate IS 'Employee contribution rate (%) - parsed from model field';
COMMENT ON COLUMN companies.employer_rate IS 'Employer contribution rate (%) - parsed from model field';
```

### Step 3: Verify
After running the migration, verify it worked:

```sql
SELECT id, name, model, employee_rate, employer_rate
FROM companies
LIMIT 10;
```

You should see the `employee_rate` and `employer_rate` columns populated based on the `model` value.

For example:
- Model "5/3" → employee_rate: 5.00, employer_rate: 3.00
- Model "4/4" → employee_rate: 4.00, employer_rate: 4.00

## Files
The migration SQL is also saved at:
`supabase/migrations/006_add_rate_columns_to_companies.sql`

## Status
⚠️ **ACTION REQUIRED** - This migration has NOT been run yet.

Once you've run this in Supabase, all the model display issues should be resolved.
