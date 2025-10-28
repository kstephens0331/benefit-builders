# Section 125 Auto-Calculation Migration Instructions

## Overview
This migration adds automatic Section 125 benefit amount calculation based on company tier and employee details (filing status + dependents).

## Step 1: Run Database Migration

**IMPORTANT**: You must run this migration in Supabase **BEFORE** deploying the code changes.

### Migration SQL File
`supabase/migrations/007_add_company_tier.sql`

### How to Run the Migration

1. **Log into Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar

3. **Copy and Paste the Migration SQL**
   - Open `supabase/migrations/007_add_company_tier.sql`
   - Copy the entire contents
   - Paste into the SQL Editor

4. **Run the Migration**
   - Click "Run" button
   - Verify you see "Success. No rows returned"

5. **Verify the Migration**
   Run this query to confirm the `tier` column was added:
   ```sql
   SELECT column_name, data_type, column_default
   FROM information_schema.columns
   WHERE table_name = 'companies' AND column_name = 'tier';
   ```

## Step 2: Set Company Tiers

After running the migration, all existing companies will have tier = '2025' (default).

You need to update each company's tier based on their contract:

```sql
-- Example: Set a company to State School tier
UPDATE companies
SET tier = 'state_school'
WHERE name LIKE '%School District%';

-- Example: Set a company to Pre-2025 tier
UPDATE companies
SET tier = 'pre_2025'
WHERE id = 'company-uuid-here';

-- Example: Set a company to Original 6% tier
UPDATE companies
SET tier = 'original_6pct'
WHERE id = 'company-uuid-here';
```

### Tier Options:
- **`state_school`** - State schools (all $1,300/month, 6% EE / 0% ER)
- **`2025`** - Standard 2025 clients (S/0=$1,300, others=$1,700) **[DEFAULT]**
- **`pre_2025`** - Legacy pre-2025 clients (S/0=$800, S/1+=$1,200, M/0=$1,200, M/1+=$1,600)
- **`original_6pct`** - Original 6% clients (S/0=$700, S/1+=$1,100, M/0+=$1,500)

## Step 3: Deploy Code Changes

After the migration is complete and tiers are set, deploy the code:

```bash
cd apps/web
vercel --prod --token YOUR_TOKEN --yes
```

## How It Works

### Automatic Calculation
When viewing an employee page, the system now:

1. Looks at the company's `tier` field
2. Looks at the employee's `filing_status` and `dependents`
3. Automatically calculates the monthly Section 125 amount based on the tier rules
4. Converts to per-paycheck amount based on pay frequency
5. Displays the calculated amount in the benefits calculator

### Example Calculations

**Company Tier: `2025`**
- Employee: Single, 0 dependents → $1,300/month
- Employee: Single, 2 dependents → $1,700/month
- Employee: Married, 0 dependents → $1,700/month
- Employee: Married, 3 dependents → $1,700/month

**Company Tier: `state_school`**
- All employees → $1,300/month

**Company Tier: `pre_2025`**
- Employee: Single, 0 dependents → $800/month
- Employee: Single, 1 dependent → $1,200/month
- Employee: Married, 0 dependents → $1,200/month
- Employee: Married, 2 dependents → $1,600/month

**Company Tier: `original_6pct`**
- Employee: Single, 0 dependents → $700/month
- Employee: Single, 2 dependents → $1,100/month
- Employee: Married, any dependents → $1,500/month

### Per-Paycheck Conversion
The monthly amount is automatically converted based on pay frequency:
- **Weekly (w)**: Monthly ÷ 4.33
- **Biweekly (b)**: Monthly ÷ 2.17
- **Semimonthly (s)**: Monthly ÷ 2
- **Monthly (m)**: Monthly ÷ 1

## Troubleshooting

### Issue: Column already exists error
If you see "column 'tier' already exists", the migration was already run. Skip to Step 2.

### Issue: Invalid tier value error
Make sure you're using one of the four valid tier values:
- `state_school`
- `2025`
- `pre_2025`
- `original_6pct`

### Issue: Employee page shows $0.00
1. Verify the company has a valid `tier` value
2. Verify the employee has `filing_status` and `dependents` set
3. Check browser console for errors

## Future: Adding Tiers to Bulk Upload

When using bulk upload, you can add a field to set the tier during import, or manually update after import.

Example SQL to set tier after bulk upload:
```sql
UPDATE companies
SET tier = 'state_school'
WHERE name = 'Imported Company Name';
```
