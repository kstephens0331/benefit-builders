-- ========== 000_init.sql ==========
-- Core tables

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  state char(2) not null,
  address text,
  city text,
  zip text,
  phone text,
  contact_email text,
  contact_name text,
  pay_period text not null check (pay_period in ('weekly','biweekly','semimonthly','monthly')),
  employee_fee numeric(12,2) not null default 0,
  employer_fee numeric(12,2) not null default 0,
  active boolean not null default true,
  date_joined date default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists company_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,                -- from auth.users
  company_id uuid not null references companies(id) on delete cascade,
  role text not null check (role in ('admin','manager')),
  unique (user_id, company_id)
);

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  address text,
  state char(2),
  dob date,
  hire_date date,
  pay_period text check (pay_period in ('weekly','biweekly','semimonthly','monthly')),
  gross_pay numeric(12,2) check (gross_pay >= 0),
  marital_status text check (marital_status in ('single','married','head')),
  dependents int check (dependents >= 0),
  active boolean not null default true,
  inactive_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists benefits (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  plan_name text not null,
  deduction numeric(12,2) not null default 0,   -- employee deduction
  cost numeric(12,2) not null default 0,        -- employer cost
  effective_date date not null,
  created_at timestamptz default now()
);

create table if not exists tax_years (
  id serial primary key,
  year int not null unique
);
insert into tax_years (year) values (extract(year from now())::int)
on conflict do nothing;

create table if not exists federal_tax_brackets (
  id serial primary key,
  tax_year int references tax_years(year) on delete cascade,
  filing_status text not null check (filing_status in ('single','married','head')),
  bracket_min numeric(12,2) not null,
  bracket_max numeric(12,2),
  rate numeric(5,4) not null
);

create table if not exists state_tax_rules (
  id serial primary key,
  tax_year int references tax_years(year) on delete cascade,
  state char(2) not null,
  rule jsonb not null
);

create table if not exists billing_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  run_month date not null,
  status text not null check (status in ('pending','completed','failed','partial')),
  exception_count int not null default 0,
  created_at timestamptz default now()
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  billing_run_id uuid not null references billing_runs(id) on delete cascade,
  invoice_number text not null,
  total numeric(12,2) not null default 0,
  pdf_path text,
  csv_path text,
  created_at timestamptz default now()
);

create table if not exists invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  employee_id uuid,
  line_type text not null check (line_type in ('employee_fee','employer_fee','benefit','tax','adjustment')),
  description text,
  amount numeric(12,2) not null default 0
);

create table if not exists exceptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  employee_id uuid references employees(id) on delete set null,
  code text not null,
  message text not null,
  severity text not null check (severity in ('warning','blocker')),
  run_month date,
  resolved boolean not null default false,
  created_at timestamptz default now(),
  resolved_at timestamptz
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user uuid, -- auth user id
  action text not null,
  entity text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz default now()
);

-- Row Level Security
alter table companies enable row level security;
alter table company_users enable row level security;
alter table employees enable row level security;
alter table benefits enable row level security;
alter table billing_runs enable row level security;
alter table invoices enable row level security;
alter table invoice_lines enable row level security;
alter table exceptions enable row level security;

-- Base policies
create policy cu_self on company_users
  for select using (user_id = auth.uid());

create policy companies_by_mapping on companies
  for select using (exists (
    select 1 from company_users cu
    where cu.company_id = companies.id and cu.user_id = auth.uid()
  ));

create policy employees_by_company on employees
  for select using (exists (
    select 1 from company_users cu
    where cu.company_id = employees.company_id and cu.user_id = auth.uid()
  ));

-- Benefits (via employee->company relation)
create policy benefits_by_company on benefits
  for select using (exists (
    select 1 from employees e
    join company_users cu on cu.company_id = e.company_id
    where e.id = benefits.employee_id and cu.user_id = auth.uid()
  ));

create policy billing_runs_by_company on billing_runs
  for select using (exists (
    select 1 from company_users cu
    where cu.company_id = billing_runs.company_id and cu.user_id = auth.uid()
  ));

create policy invoices_by_company on invoices
  for select using (exists (
    select 1 from billing_runs br
    join company_users cu on cu.company_id = br.company_id
    where br.id = invoices.billing_run_id and cu.user_id = auth.uid()
  ));

create policy invoice_lines_by_company on invoice_lines
  for select using (exists (
    select 1 from invoices i
    join billing_runs br on br.id = i.billing_run_id
    join company_users cu on cu.company_id = br.company_id
    where i.id = invoice_lines.invoice_id and cu.user_id = auth.uid()
  ));

create policy exceptions_by_company on exceptions
  for select using (exists (
    select 1 from company_users cu
    where cu.company_id = exceptions.company_id and cu.user_id = auth.uid()
  ));

-- Optional admin RPC (service_role only) to upsert an employee
create or replace function admin_upsert_employee(emp jsonb)
returns uuid
language plpgsql
security definer
as $$
declare newid uuid;
begin
  insert into employees (
    id, company_id, first_name, last_name, address, state, dob, hire_date,
    pay_period, gross_pay, marital_status, dependents, active
  )
  values (
    coalesce((emp->>'id')::uuid, gen_random_uuid()),
    (emp->>'company_id')::uuid,
    emp->>'first_name', emp->>'last_name', emp->>'address', emp->>'state',
    (emp->>'dob')::date, (emp->>'hire_date')::date,
    emp->>'pay_period', (emp->>'gross_pay')::numeric,
    emp->>'marital_status', coalesce((emp->>'dependents')::int,0),
    coalesce((emp->>'active')::boolean,true)
  )
  on conflict (id) do update set
    first_name=excluded.first_name, last_name=excluded.last_name,
    address=excluded.address, state=excluded.state, dob=excluded.dob,
    hire_date=excluded.hire_date, pay_period=excluded.pay_period,
    gross_pay=excluded.gross_pay, marital_status=excluded.marital_status,
    dependents=excluded.dependents, active=excluded.active,
    updated_at=now()
  returning id into newid;
  return newid;
end$$;

revoke all on function admin_upsert_employee(jsonb) from anon, authenticated;
grant execute on function admin_upsert_employee(jsonb) to service_role;
-- ========== /000_init.sql ==========
