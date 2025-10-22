# Benefits Builder SaaS - Setup Guide

## Overview

Benefits Builder is a pre-tax benefits optimization and management SaaS platform for employers and employees. The system helps companies manage Section 125 cafeteria plan benefits, calculate tax savings, and generate monthly billing based on flexible revenue-sharing models.

## Prerequisites

- Node.js 18+ (recommended: Node.js 20)
- pnpm package manager
- Supabase account (free tier works for development)

## Initial Setup

### 1. Install Dependencies

```bash
# Install pnpm if not already installed
npm install -g pnpm

# Install project dependencies
pnpm install
```

### 2. Configure Environment Variables

The environment files are already configured at `apps/web/.env.local`. Verify the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://stuaxikfuxzlbzneekua.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SITE_URL=http://localhost:3002
```

### 3. Initialize Database

The database schema has already been created in Supabase. To seed with essential data:

```bash
cd apps/web
npm run seed
```

This will populate:
- Plan models (billing models: 5/3, 4/3, 5/1, 4/4)
- 2025 Federal tax parameters (FICA rates, wage bases)
- IRS Publication 15-T withholding tables
- Sample state tax parameters (TX, FL, IL, PA, etc.)

### 4. Build and Run

```bash
# Development mode (recommended for testing)
cd apps/web
npm run dev

# Production build
npm run build
npm run start
```

The application will be available at: **http://localhost:3002**

## Application Structure

```
apps/web/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx            # Dashboard (Analytics overview)
│   │   ├── admin/              # Admin interfaces
│   │   │   ├── billing/        # Billing management
│   │   │   ├── catalog/        # Benefit catalog management
│   │   │   └── tax/            # Tax configuration
│   │   ├── companies/          # Company management
│   │   ├── reports/            # Reporting & analytics
│   │   └── api/                # API routes
│   │       ├── analytics/      # Dashboard KPIs
│   │       ├── billing/        # Invoice generation
│   │       ├── optimizer/      # Tax calculation engine
│   │       └── reports/        # CSV/PDF exports
│   ├── lib/                    # Business logic
│   │   ├── tax.ts             # Tax calculation functions
│   │   ├── fees.ts            # Fee calculation functions
│   │   ├── models.ts          # Billing model definitions
│   │   └── supabase.ts        # Database client
│   └── components/             # Reusable React components
├── scripts/
│   └── seed.ts                # Database seeding script
└── package.json

supabase/
├── schema.sql                 # Complete database schema
└── seed/                      # SQL seed scripts
    ├── 001_plan_models.sql
    ├── 002_federal_tax_2025.sql
    ├── 003_withholding_federal_15t_2025.sql
    └── 004_state_tax_sample.sql
```

## Key Features

### 1. Dashboard (Home Page)
- **URL**: `/`
- Real-time KPIs:
  - Number of companies and active employees
  - Enrollment percentage
  - Month-to-date and year-to-date revenue
  - Revenue projections
  - 6-month revenue trend

### 2. Company Management
- **URL**: `/companies`
- Add/manage client companies
- Configure:
  - Company name, state, contact email
  - Pay frequency (weekly, biweekly, semimonthly, monthly)
  - Billing model (5/3, 4/3, 5/1, 4/4)

### 3. Employee Management
- **URL**: `/companies/[id]`
- Add employees to companies
- Configure:
  - Personal info (name, DOB, tobacco use)
  - Tax info (filing status, dependents, state)
  - Gross pay per pay period
  - Consent status (elected, don't want, pending)

### 4. Pre-Tax Benefits
- **URL**: `/companies/[id]/employees/[empId]/benefits`
- Add benefit elections for employees
- Each benefit specifies:
  - Plan code (HSA, FSA, etc.)
  - Per-pay amount
  - Tax effects (reduces FIT and/or FICA)

### 5. Tax Optimizer
- **API**: `POST /api/optimizer/preview`
- Calculates paycheck comparison:
  - Current taxes (before pre-tax benefits)
  - After taxes (with pre-tax benefits)
  - Employee savings (tax savings - fees)
  - Employer FICA savings
  - Benefits Builder profit

### 6. Billing Models

Four revenue-sharing models available:

| Model | Employee Fee | Employer Fee | Total Fee |
|-------|--------------|--------------|-----------|
| 5/3   | 5.0%         | 3.0%         | 8.0%      |
| 4/3   | 4.0%         | 3.0%         | 7.0%      |
| 5/1   | 5.0%         | 1.0%         | 6.0%      |
| 4/4   | 4.0%         | 4.0%         | 8.0%      |

Fees are calculated as a percentage of monthly pre-tax contributions.

### 7. Reports
- **URL**: `/reports`
- **Exports**:
  - Company summary (CSV, JSON)
  - Employee enrollment (CSV, JSON)
  - PDF proposals and invoices

### 8. Admin - Tax Configuration
- **URL**: `/admin/tax`
- Configure federal tax parameters
- Import IRS 15-T withholding tables
- Manage state tax rules by state and tax year

### 9. Admin - Billing
- **URL**: `/admin/billing`
- View monthly billing snapshots
- Generate invoices
- Export billing data

## Tax Calculation Engine

### Federal Taxes

**FICA (Social Security + Medicare)**:
- Social Security: 6.2% up to wage base ($176,100 for 2025)
- Medicare: 1.45% on all wages
- Additional Medicare: 0.9% over threshold ($200,000)

**Federal Income Tax (FIT)**:
- Uses IRS Publication 15-T percentage method
- Supports all filing statuses: Single, Married, Head of Household
- Adjusts for pay frequency (weekly, biweekly, semimonthly, monthly)

### State Taxes

Configured per state with support for:
- **Flat rate** (e.g., Illinois: 4.95%, Pennsylvania: 3.07%)
- **No tax** (e.g., Texas, Florida)
- **Bracket systems** (e.g., California, New York)
- Locality taxes (city, county, school district)

### Pre-Tax Benefits Impact

Section 125 benefits reduce:
- **FIT**: Based on benefit configuration
- **FICA**: Based on benefit configuration
- **State Income Tax**: In most states

## Billing Workflow

1. **Employee elects benefits** → reduces taxable income
2. **System calculates**:
   - Employee tax savings
   - Employer FICA savings (7.65% on pre-tax amount)
   - Monthly pre-tax total
3. **Fees applied** based on company's model
4. **Monthly invoice generated** with:
   - Base fees
   - Per-employee fees
   - Optional profit-sharing on employer savings
5. **Benefits Builder revenue** = Total fees collected

## Database Schema

### Core Tables

- **companies**: Client companies contracting with Benefits Builder
- **employees**: Employees of client companies
- **employee_benefits**: Individual benefit elections
- **plan_models**: Billing models (5/3, 4/3, etc.)

### Tax Tables

- **tax_federal_params**: FICA rates and wage bases
- **withholding_federal_15t**: IRS withholding tables
- **tax_state_params**: State-specific tax rules

### Billing Tables

- **company_billing_settings**: Billing configuration per company
- **billing_usage_snapshots**: Monthly metrics
- **invoices**: Generated invoices
- **invoice_lines**: Line items per invoice

### Reporting Tables

- **pay_scenarios**: Calculated tax scenarios (before/after)
- **audit_logs**: Activity tracking

## API Endpoints

### Analytics
- `GET /api/analytics/summary` - Dashboard KPIs

### Companies
- `GET /api/companies` - List all companies
- `POST /api/companies` - Create company

### Optimizer (Tax Calculator)
- `POST /api/optimizer/preview` - Calculate paycheck comparison

### Billing
- `GET /api/billing/invoices` - List invoices
- `GET /api/billing/[period]` - Get monthly snapshot
- `GET /api/billing/[period]/pdf` - Generate PDF invoice

### Reports
- `GET /api/reports/summary` - Company summary data
- `GET /api/reports/employees` - Employee enrollment data
- `GET /api/reports/summary.csv` - CSV export
- `GET /api/reports/employees.csv` - CSV export
- `GET /api/reports/pdf` - Generate PDF report

### Health
- `GET /api/health` - Service status check

## Development Workflow

### Running the App

```bash
cd apps/web
npm run dev
```

Visit: http://localhost:3002

### Building for Production

```bash
cd apps/web
npm run build
npm run start
```

### Re-seeding Database

If you need to reset or update seed data:

```bash
cd apps/web
npm run seed
```

### Adding a New State

1. Go to `/admin/tax/states`
2. Click "Add State"
3. Configure:
   - State code (2 letters)
   - Tax year
   - Method (none, flat, brackets)
   - Rates, deductions, exemptions
   - Bracket structure (if applicable)

### Adding a Company

1. Go to `/companies`
2. Click "Add Company"
3. Fill in:
   - Company name
   - State
   - Pay frequency
   - Billing model
   - Contact email

### Adding Employees

1. Navigate to company detail page: `/companies/[id]`
2. Click "Add Employee"
3. Enter employee details
4. Add benefit elections at `/companies/[id]/employees/[empId]/benefits`

## Troubleshooting

### Build Errors

If you encounter build errors:

```bash
# Clear Next.js cache
cd apps/web
rm -rf .next

# Rebuild
npm run build
```

### Database Connection Issues

Verify environment variables in `apps/web/.env.local`:
- Ensure Supabase URL is correct
- Check that API keys are valid
- Test connection: `curl http://localhost:3002/api/health`

### Seed Script Fails

Make sure you're in the correct directory:

```bash
cd apps/web
npm run seed
```

If tables don't exist, check that the schema has been applied in Supabase dashboard.

## Next Steps for Bill (Owner of Benefits Builder)

### 1. Verify Tax Tables
- Review federal withholding tables in `/admin/tax`
- Confirm 2025 IRS Publication 15-T data is accurate
- Add/update state tax parameters for target states

### 2. Configure Benefit Catalog
- Go to `/admin/catalog`
- Add all Section 125 benefits offered
- Specify which benefits reduce FIT vs FICA

### 3. Add Client Companies
- Import or manually add client companies
- Assign appropriate billing models
- Configure billing settings (base fees, profit-sharing)

### 4. Test Tax Calculations
- Add a test employee
- Elect benefits
- Run optimizer to verify calculations
- Compare with manual calculations or existing system

### 5. Review Billing Models
- Confirm fee percentages match business model
- Test invoice generation for sample period
- Export and review PDF invoices

### 6. Production Deployment
- Set up production Supabase instance
- Configure production environment variables
- Deploy to Vercel, AWS, or preferred hosting
- Set up custom domain

## Support & Documentation

- Application runs on port **3002**
- All API responses include `{ok: boolean}` status
- Error messages are returned with appropriate HTTP status codes
- Logs are available in the browser console and server output

## Security Notes

- Supabase Row-Level Security (RLS) can be enabled for production
- Service role key should never be exposed to client-side code
- Use environment variables for all sensitive configuration
- HTTPS should be enforced in production

---

**System Status**: ✅ Fully Operational

Last Updated: October 21, 2025
