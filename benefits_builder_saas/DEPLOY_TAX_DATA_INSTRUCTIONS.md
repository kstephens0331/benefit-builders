# Tax Data Deployment Instructions

## ✅ SQL Files Ready for Deployment

The complete 2025 tax data for all 51 jurisdictions (50 states + DC) has been prepared in:
- `supabase/seed/006_complete_state_tax_2025.sql`
- `supabase/seed/007_complete_state_tax_2025_part2.sql`

## 🚀 Deployment Steps

### Option 1: Supabase SQL Editor (Recommended)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/stuaxikfuxzlbzneekua
   - Click "SQL Editor" in the left sidebar

2. **Deploy Part 1**
   - Click "New query"
   - Copy entire contents of `supabase/seed/006_complete_state_tax_2025.sql`
   - Paste into SQL Editor
   - Click "Run"
   - Wait for success message

3. **Deploy Part 2**
   - Click "New query" again
   - Copy entire contents of `supabase/seed/007_complete_state_tax_2025_part2.sql`
   - Paste into SQL Editor
   - Click "Run"
   - Wait for success message

4. **Verify Deployment**
   - Run this query in SQL Editor:
   ```sql
   SELECT
     method,
     COUNT(*) as count
   FROM tax_state_params
   WHERE tax_year = 2025
   GROUP BY method
   ORDER BY method;
   ```
   - Expected results:
     - `brackets`: 28 states + DC = 29
     - `flat`: 13 states
     - `none`: 9 states
     - **TOTAL: 51 jurisdictions**

### Option 2: Automated Script

Run the deployment script:
```bash
node scripts/deploy-tax-data-simple.mjs
```

This script will:
- Connect to Supabase
- Show current tax data count
- Provide instructions for SQL Editor deployment

## 📊 What Gets Deployed

### No-Income-Tax States (9)
AK, FL, NV, SD, TN, TX, WA, WY, NH

### Flat-Tax States (13)
- AZ: 2.5%
- CO: 4.4%
- IL: 4.95%
- IN: 3.05%
- KY: 4.0%
- MA: 5.0%
- MI: 4.25%
- NC: 4.5%
- PA: 3.07%
- UT: 4.65%
- IA: 3.8%
- ID: 5.8%
- MS: 4.7%

### Progressive-Tax States (28 + DC = 29)
CA, NY, NJ, GA, OR, CT, MN, WI, VA, VT, SC, RI, OK, OH, ND, NM, MT, MO, MD, ME, LA, KS, HI, DE, AR, AL, WV, NE, DC

Each progressive state includes:
- Exact tax brackets for 2025
- Standard deductions
- Personal/dependent exemptions
- Official state source documentation

## ✅ Post-Deployment Verification

After deployment, verify the data:

```sql
-- Check all states are present
SELECT state, method, flat_rate
FROM tax_state_params
WHERE tax_year = 2025
ORDER BY state;

-- Should return 51 rows (50 states + DC)

-- Check a few sample states
SELECT
  state,
  method,
  CASE
    WHEN method = 'flat' THEN CONCAT(ROUND(flat_rate * 100, 2), '%')
    WHEN method = 'brackets' THEN CONCAT(jsonb_array_length(brackets), ' brackets')
    ELSE 'No income tax'
  END as tax_info
FROM tax_state_params
WHERE tax_year = 2025
  AND state IN ('CA', 'TX', 'IL', 'NY', 'FL')
ORDER BY state;
```

Expected output:
```
CA | brackets | 9 brackets
FL | none     | No income tax
IL | flat     | 4.95%
NY | brackets | 9 brackets
TX | none     | No income tax
```

## ⚠️ Important Notes

- **Idempotent**: SQL uses `ON CONFLICT DO UPDATE`, safe to run multiple times
- **No Data Loss**: Existing tax years remain unchanged
- **Effective Date**: All 2025 data effective from 2025-01-01
- **Sources**: Each state's data sourced from official revenue department publications
- **Historical Data**: Does not delete or modify existing 2024 or earlier tax data

## 🎯 Success Criteria

✅ All 51 jurisdictions present in database
✅ No SQL errors during deployment
✅ Tax calculations use 2025 rates
✅ Historical 2024 data still accessible

## Next Steps After Deployment

1. Run test calculations for each state type (none, flat, progressive)
2. Compare results to official state withholding tables
3. Update `DEPLOYMENT_GUIDE.md` status from "BLOCKED" to "READY"
4. Mark tax data deployment as complete in project documentation

---

**Last Updated**: January 2025
**Status**: Ready for deployment
**Files**: 2 SQL files, 51 jurisdictions, 100% coverage
