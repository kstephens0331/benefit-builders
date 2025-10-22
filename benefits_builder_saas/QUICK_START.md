# Benefits Builder - Quick Start Guide

## Get Up and Running in 3 Steps

### Step 1: Install & Seed Database

```bash
# Install dependencies (if not already done)
pnpm install

# Seed the database with essential data
cd apps/web
npm run seed
```

**What this does:**
- Creates billing models (5/3, 4/3, 5/1, 4/4)
- Loads 2025 federal tax tables
- Loads IRS withholding tables for all filing statuses
- Adds sample state tax parameters

### Step 2: Start the Application

```bash
# From apps/web directory
npm run dev
```

The app will start on **http://localhost:3002**

### Step 3: Add Your First Company

1. Visit http://localhost:3002
2. Click **Companies** in the navigation
3. Click **Add Company**
4. Fill in:
   - Company name
   - State (2-letter code)
   - Pay frequency (weekly, biweekly, semimonthly, or monthly)
   - Billing model (5/3, 4/3, 5/1, or 4/4)
5. Click **Save**

## Quick Navigation

| Feature | URL | Purpose |
|---------|-----|---------|
| Dashboard | `/` | View KPIs and revenue trends |
| Companies | `/companies` | Manage client companies |
| Company Details | `/companies/[id]` | View company employees and settings |
| Add Employee | `/companies/[id]/add-employee` | Add employee to company |
| Employee Benefits | `/companies/[id]/employees/[empId]/benefits` | Manage benefit elections |
| Tax Calculator | `/companies/[id]/employees/[empId]/compare` | See paycheck comparison |
| Reports | `/reports` | Generate and export reports |
| Billing | `/admin/billing` | View invoices and billing data |
| Tax Config | `/admin/tax` | Configure federal and state taxes |

## Common Tasks

### Add an Employee

1. Go to `/companies` and select a company
2. Click **Add Employee**
3. Enter:
   - Name
   - Filing status (single, married, head of household)
   - Number of dependents
   - Gross pay per paycheck
4. Click **Save**

### Add Benefit Elections

1. Go to employee detail page
2. Click **Benefits** tab
3. Click **Add Benefit**
4. Select:
   - Plan code (e.g., HSA, FSA)
   - Per-pay amount
   - Tax effects (reduces FIT/FICA checkboxes)
5. Click **Save**

### Calculate Tax Savings

1. Navigate to employee page
2. Click **Compare** or **Calculator**
3. View:
   - Current paycheck (no benefits)
   - After paycheck (with benefits)
   - Employee savings (after fees)
   - Employer FICA savings
   - Benefits Builder revenue

### Generate Reports

1. Go to `/reports`
2. Select report type:
   - **Summary** - Company-level data
   - **Employees** - Employee enrollment data
3. Choose export format:
   - View in browser (JSON)
   - Download CSV
   - Generate PDF

### Configure State Taxes

1. Go to `/admin/tax`
2. Click **States** tab
3. Click **Add State** or select existing state
4. Configure:
   - Tax method (none, flat, brackets)
   - Standard deduction
   - Personal/dependent exemptions
   - Tax brackets (if applicable)
5. Click **Save**

## Billing Models Explained

Benefits Builder charges fees as a percentage of monthly pre-tax contributions:

**Example: Employee contributes $200/month to HSA**

| Model | Employee Fee | Employer Fee | Employee Net Savings | BB Revenue |
|-------|--------------|--------------|---------------------|------------|
| 5/3   | $10.00 (5%) | $6.00 (3%)   | Tax Savings - $10   | $16.00     |
| 4/3   | $8.00 (4%)  | $6.00 (3%)   | Tax Savings - $8    | $14.00     |
| 5/1   | $10.00 (5%) | $2.00 (1%)   | Tax Savings - $10   | $12.00     |
| 4/4   | $8.00 (4%)  | $8.00 (4%)   | Tax Savings - $8    | $16.00     |

## API Testing

### Health Check
```bash
curl http://localhost:3002/api/health
```

### Get Dashboard Data
```bash
curl http://localhost:3002/api/analytics/summary
```

### Test Tax Optimizer
```bash
curl -X POST http://localhost:3002/api/optimizer/preview \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "your-employee-uuid"
  }'
```

## Troubleshooting

### "Missing environment variables"
- Check that `apps/web/.env.local` exists
- Verify Supabase URL and keys are set

### "Database connection failed"
- Confirm Supabase project is active
- Check that schema has been applied
- Run seed script: `npm run seed`

### "Build errors"
```bash
# Clear cache and rebuild
cd apps/web
rm -rf .next
npm run build
```

### "Port 3002 already in use"
```bash
# Kill existing process
lsof -ti:3002 | xargs kill -9  # Mac/Linux
# or change port in package.json
```

## Production Checklist

Before deploying to production:

- [ ] Update all tax tables to current year
- [ ] Add all states where clients operate
- [ ] Configure production Supabase instance
- [ ] Set production environment variables
- [ ] Enable Supabase Row-Level Security (RLS)
- [ ] Test all billing models with real data
- [ ] Verify tax calculations against manual calculations
- [ ] Set up automated backups
- [ ] Configure custom domain
- [ ] Enable HTTPS/SSL

## Key Files

- `SETUP.md` - Comprehensive setup documentation
- `apps/web/.env.local` - Environment configuration
- `apps/web/src/lib/tax.ts` - Tax calculation engine
- `apps/web/src/lib/fees.ts` - Fee calculation logic
- `supabase/schema.sql` - Database schema
- `apps/web/scripts/seed.ts` - Database seed script

## Getting Help

If you encounter issues:

1. Check the console for error messages
2. Review `SETUP.md` for detailed documentation
3. Verify database schema in Supabase dashboard
4. Test API endpoints with curl
5. Check browser network tab for failed requests

---

**Status**: ✅ System Operational

**Next Meeting with Bill**: Review this setup and confirm business logic
