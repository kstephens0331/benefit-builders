-- ============
-- Core schema
-- ============

create extension if not exists "pgcrypto";

-- COMPANIES
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  state char(2) not null,
  model text not null, -- e.g., "5/1"
  pay_frequency text not null check (pay_frequency in ('weekly','biweekly','semimonthly','monthly')),
  contact_email text,
  contact_name text,  -- Primary point of contact
  contact_phone text, -- Primary contact phone number
  address text,       -- Street address
  city text,          -- City
  zip text,           -- ZIP/Postal code
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now()
);

-- EMPLOYEES
create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  filing_status text not null default 'single' check (filing_status in ('single','married','head')),
  dependents int not null default 0,
  dob date,
  tobacco_use boolean not null default false,
  gross_pay numeric(12,2) not null default 0,  -- per-pay
  consent_status text not null default 'pending' check (consent_status in ('elect','dont','pending')),
  active boolean not null default true,
  inactive_date date,
  created_at timestamptz not null default now()
);

-- PLAN MODELS
create table if not exists plan_models (
  id text primary key,         -- "5_1"
  name text not null,          -- "5/1"
  employee_cap_pct numeric(6,4) not null,
  employer_cap_pct numeric(6,4) not null
);

-- EMPLOYEE BENEFITS
create table if not exists employee_benefits (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  plan_code text not null,
  reduces_fit boolean not null default true,
  reduces_fica boolean not null default true,
  per_pay_amount numeric(12,2) not null default 0,
  effective_date date not null default current_date
);

-- PAY SCENARIOS
create table if not exists pay_scenarios (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  scenario_type text not null check (scenario_type in ('current','after')),
  tax_year int not null,
  fit numeric(12,2) not null default 0,
  fica_ss numeric(12,2) not null default 0,
  fica_med numeric(12,2) not null default 0,
  sit numeric(12,2) not null default 0,
  taxable_income numeric(12,2) not null default 0,
  net_pay numeric(12,2) not null default 0,
  employer_fica_savings_cents bigint not null default 0,
  bb_profit_cents bigint not null default 0,
  period text, -- 'YYYY-MM'
  created_at timestamptz not null default now()
);

-- COMPANY BILLING SETTINGS
create table if not exists company_billing_settings (
  company_id uuid primary key references companies(id) on delete cascade,
  plan_tier text not null default 'standard' check (plan_tier in ('starter','standard','enterprise','custom')),
  base_fee_cents int not null default 0,
  per_employee_active_cents int not null default 0,
  per_report_cents int not null default 0,
  profit_share_mode text not null default 'none' check (profit_share_mode in ('none','percent_er_savings','percent_bb_profit')),
  profit_share_percent numeric(5,2) not null default 0.00 check (profit_share_percent >= 0 and profit_share_percent <= 50),  -- Cap at 50% to prevent negative invoices
  maintenance_cents int not null default 0,
  tax_rate_percent numeric(5,2) not null default 0.00 check (tax_rate_percent >= 0 and tax_rate_percent <= 100),
  effective_from date not null default current_date
);

-- BILLING SNAPSHOTS
create table if not exists billing_usage_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  period text not null, -- 'YYYY-MM'
  employees_active int not null default 0,
  reports_generated int not null default 0,
  employer_savings_cents bigint not null default 0,
  bb_profit_cents bigint not null default 0,
  created_at timestamptz not null default now(),
  unique (company_id, period)
);

-- INVOICES
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  period text not null,
  status text not null default 'open' check (status in ('open','sent','paid','void')),
  subtotal_cents bigint not null default 0,
  tax_cents bigint not null default 0,
  total_cents bigint not null default 0,
  issued_at timestamptz not null default now(),
  unique (company_id, period)  -- Prevent duplicate invoices for same company/period
);

create table if not exists invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  kind text not null check (kind in ('base_fee','per_employee_active','per_report','maintenance','profit_share','credit','adjustment','tax')),
  description text not null,
  quantity numeric(18,2) not null default 1,
  unit_price_cents bigint not null default 0,
  amount_cents bigint not null default 0
);

-- FEDERAL / STATE TAX PARAMS (shells; will import real data)
create table if not exists tax_federal_params (
  tax_year int primary key,
  ss_rate numeric(6,5) not null,
  med_rate numeric(6,5) not null,
  ss_wage_base bigint not null,
  addl_medicare_threshold bigint not null
);

create table if not exists withholding_federal_15t (
  id bigserial primary key,
  tax_year int not null references tax_federal_params(tax_year),
  filing_status text not null check (filing_status in ('single','married','head')),
  pay_frequency text not null check (pay_frequency in ('weekly','biweekly','semimonthly','monthly','annual')),
  percentage_method_json jsonb not null,
  unique (tax_year, filing_status, pay_frequency)
);

create table if not exists tax_state_params (
  id bigserial primary key,
  state char(2) not null,
  tax_year int not null,
  method text not null check (method in ('none','flat','brackets')),
  flat_rate numeric(7,5),
  standard_deduction numeric(12,2) default 0,
  personal_exemption numeric(12,2) default 0,
  dependent_exemption numeric(12,2) default 0,
  allowances_method text not null default 'none' check (allowances_method in ('none','per_allowance_amount','pct_method')),
  per_allowance_amount numeric(12,2),
  brackets jsonb,
  credits jsonb,
  locality_mode text not null default 'none' check (locality_mode in ('none','county','city','school_district')),
  effective_from date not null default current_date,
  effective_to date,
  unique (state, tax_year)
);

-- AUDIT
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  company_id uuid,
  action text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);
