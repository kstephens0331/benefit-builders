# Benefits Builder SaaS - Complete Deployment Checklist

## ✅ What You've Already Done

1. **Tax Data Deployed** ✅
   - Ran `006_complete_state_tax_2025.sql`
   - Ran `007_complete_state_tax_2025_part2.sql`
   - **Verification**: All 51 jurisdictions (50 states + DC) confirmed present

---

## 📋 Complete Deployment Steps (In Order)

### Phase 1: Database Migrations ⚠️ **REQUIRED**

These create additional tables for authentication, reporting, and integrations:

**Run in Supabase SQL Editor** (https://supabase.com/dashboard/project/stuaxikfuxzlbzneekua/sql/new):

1. ✅ **001_add_constraints.sql** - Database integrity constraints
   ```sql
   -- Run this first: creates foreign key constraints
   ```

2. ✅ **002_add_goals_tracking.sql** - Goals tracking tables
   ```sql
   -- Creates goals tables (optional feature, not used in current UI)
   ```

3. ⚠️ **003_add_auth_users.sql** - Authentication system
   ```sql
   -- CRITICAL: Creates internal_users and auth_sessions tables
   -- Required for login functionality
   ```

4. ⚠️ **004_advanced_reporting.sql** - Advanced reporting system
   ```sql
   -- Creates report_templates, scheduled_reports, report_history tables
   -- Required for /reports/advanced page
   ```

5. ⚠️ **005_quickbooks_integration.sql** - QuickBooks sync tables
   ```sql
   -- Creates quickbooks_connections, sync mappings, sync logs
   -- Required for QuickBooks integration
   ```

**To run migrations:**
1. Open each file from `supabase/migrations/` folder
2. Copy entire contents
3. Paste into Supabase SQL Editor
4. Click **RUN**
5. Repeat for each file in order

---

### Phase 2: Seed Data ⚠️ **REQUIRED**

**Run in Supabase SQL Editor**:

1. ✅ **001_plan_models.sql** - Billing models (5/3, 4/3, 5/1, 4/4)
   ```sql
   -- Inserts the 4 plan models
   ```

2. ✅ **002_federal_tax_2025.sql** - Federal FICA rates
   ```sql
   -- 2025 Social Security & Medicare rates, wage base limits
   ```

3. ✅ **003_withholding_federal_15t_2025.sql** - Federal withholding tables
   ```sql
   -- IRS Publication 15-T withholding brackets
   ```

4. ⚠️ **003_internal_users.sql** - User accounts
   ```sql
   -- Creates your 4 internal user accounts
   -- Required to login to the system
   ```

5. ⚠️ **004_report_templates.sql** - Report templates
   ```sql
   -- Creates 5 pre-built report templates
   -- Required for /reports/advanced page
   ```

6. ✅ **006_complete_state_tax_2025.sql** - State tax data (Part 1)
   - ✅ **ALREADY DONE**

7. ✅ **007_complete_state_tax_2025_part2.sql** - State tax data (Part 2)
   - ✅ **ALREADY DONE**

**Optional seed files (can skip)**:
- ~~004_state_tax_sample.sql~~ - Old sample data (replaced by 006/007)
- ~~005_all_states_tax_2025.sql~~ - Incomplete data (replaced by 006/007)
- ~~005_benefit_catalog.sql~~ - Not used in current version

---

### Phase 3: Environment Variables ⚠️ **REQUIRED**

**Check Production Environment (Vercel Dashboard)**:

Go to: https://vercel.com/dashboard → Your Project → Settings → Environment Variables

**Required Variables:**
```bash
# Supabase (should already be set)
NEXT_PUBLIC_SUPABASE_URL=https://stuaxikfuxzlbzneekua.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Site URL
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app

# Gemini AI (for bulk upload) - CRITICAL
GEMINI_API_KEY=AIzaSyCdoZsUU3fuGcJtKSXr3_v6uTRZMkNbBe4
```

**Optional Variables (for future use):**
```bash
# Email (for notifications) - Pending from Bill
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=

# QuickBooks (for integration) - Pending from Bill
QUICKBOOKS_CLIENT_ID=
QUICKBOOKS_CLIENT_SECRET=
QUICKBOOKS_REDIRECT_URI=
```

---

### Phase 4: Testing ✅ **READY TO TEST**

**Test Login:**
1. Go to: https://your-domain.vercel.app/login
2. Use credentials:
   - Email: `info@stephenscode.dev`
   - Password: `78410889Ks!`
3. Should redirect to `/dashboard`

**Test Tax Calculations:**
1. Create a test company in TX (or any state)
2. Add an employee with gross pay $3,000
3. Run optimizer preview
4. Verify state tax is calculated correctly:
   - TX = $0 (no state income tax)
   - IL = 4.95% flat
   - CA = Progressive brackets

**Test Bulk Upload:**
1. Go to `/companies`
2. Click "Bulk Upload"
3. Upload sample Excel/CSV with employee census
4. Verify Gemini AI parses data correctly

**Test Advanced Reporting:**
1. Go to `/reports/advanced`
2. View report templates (should see 5 templates)
3. Generate a test report

---

## 🎯 Complete Deployment Order

### Minimal Required (To Make System Functional):

**Migrations (Run First):**
1. `001_add_constraints.sql`
2. `003_add_auth_users.sql` ⚠️ **CRITICAL - For Login**
3. `004_advanced_reporting.sql` ⚠️ **For Reports Page**
4. `005_quickbooks_integration.sql` (optional if not using QB)

**Seed Data (Run Second):**
1. `001_plan_models.sql`
2. `002_federal_tax_2025.sql`
3. `003_withholding_federal_15t_2025.sql`
4. `003_internal_users.sql` ⚠️ **CRITICAL - Creates Login Accounts**
5. `004_report_templates.sql` ⚠️ **For Reports Page**
6. ✅ `006_complete_state_tax_2025.sql` - **DONE**
7. ✅ `007_complete_state_tax_2025_part2.sql` - **DONE**

---

## 🚨 Critical Files Still Needed

### Must Run Before Testing:

1. **`supabase/migrations/003_add_auth_users.sql`**
   - Creates `internal_users` table
   - Creates `auth_sessions` table
   - **Without this**: Login page will fail with database errors

2. **`supabase/seed/003_internal_users.sql`**
   - Inserts your 4 user accounts (including admin)
   - **Without this**: Cannot login (no users exist)

3. **`supabase/migrations/004_advanced_reporting.sql`**
   - Creates reporting tables
   - **Without this**: `/reports/advanced` page will crash

4. **`supabase/seed/004_report_templates.sql`**
   - Inserts 5 pre-built report templates
   - **Without this**: Reports page will be empty

5. **`supabase/seed/001_plan_models.sql`**
   - Inserts billing models (5/3, 4/3, 5/1, 4/4)
   - **Without this**: Cannot create companies

6. **`supabase/seed/002_federal_tax_2025.sql`**
   - Federal FICA rates
   - **Without this**: Tax calculations will fail

7. **`supabase/seed/003_withholding_federal_15t_2025.sql`**
   - Federal withholding brackets
   - **Without this**: Federal tax withholding will be wrong

---

## ✅ Status Summary

| Item | Status | Required? |
|------|--------|-----------|
| State tax data (51 jurisdictions) | ✅ Complete | Yes |
| Schema constraints | ⚠️ Pending | Yes |
| Authentication tables | ⚠️ Pending | **CRITICAL** |
| User accounts seed data | ⚠️ Pending | **CRITICAL** |
| Reporting tables | ⚠️ Pending | Yes |
| Report templates | ⚠️ Pending | Yes |
| Plan models | ⚠️ Pending | Yes |
| Federal tax data | ⚠️ Pending | Yes |
| Federal withholding tables | ⚠️ Pending | Yes |
| QuickBooks tables | ⚠️ Pending | Optional |
| Goals tables | ⚠️ Pending | Optional |

---

## 📝 Quick Deploy Script

**Copy/paste this into Supabase SQL Editor** (runs everything in order):

```sql
-- NOTE: You'll need to run each migration file separately
-- Supabase SQL Editor can only run one file at a time
-- But you can copy/paste multiple seed INSERTs together

-- After running all migrations (001-005), run this:
-- (Combines all seed data into one script)
```

---

## 🎯 Next Steps (In Order)

1. ⚠️ **Run remaining migrations** (003, 004, 005)
2. ⚠️ **Run remaining seed files** (001, 002, 003_internal, 003_withholding, 004_templates)
3. ✅ **Test login** at /login
4. ✅ **Test tax calculations** by creating company/employee
5. ✅ **Test bulk upload** with sample file
6. ✅ **Verify reports page** works

**Estimated Time**: 15-20 minutes

---

## 🆘 Troubleshooting

**Login fails:**
- Check `003_add_auth_users.sql` migration ran
- Check `003_internal_users.sql` seed data ran
- Verify user exists: `SELECT * FROM internal_users;`

**Reports page crashes:**
- Check `004_advanced_reporting.sql` migration ran
- Check `004_report_templates.sql` seed data ran

**Tax calculations wrong:**
- Check `002_federal_tax_2025.sql` ran
- Check `003_withholding_federal_15t_2025.sql` ran
- Check state tax data deployed (already done ✅)

**Cannot create company:**
- Check `001_plan_models.sql` ran
- Verify models: `SELECT * FROM plan_models;`

---

**Last Updated**: January 2025
**Tax Data**: ✅ Complete (51/51)
**Ready for Testing**: ⚠️ After running remaining migrations/seeds
