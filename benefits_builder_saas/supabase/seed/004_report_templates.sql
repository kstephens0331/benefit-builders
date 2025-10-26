-- Seed Default Report Templates
-- Pre-built report templates for common use cases

-- 1. Monthly Billing Summary Report
INSERT INTO report_templates (name, description, report_type, columns, sort_by, sort_order, is_public)
VALUES (
  'Monthly Billing Summary',
  'Complete billing summary by company for a specific period',
  'billing_summary',
  '[
    {"key": "company_name", "label": "Company", "type": "text"},
    {"key": "period", "label": "Period", "type": "text"},
    {"key": "employees_active", "label": "Active Employees", "type": "number"},
    {"key": "total_pretax", "label": "Total Pre-Tax", "type": "currency"},
    {"key": "employer_savings", "label": "Employer FICA Savings", "type": "currency"},
    {"key": "bb_profit", "label": "BB Profit", "type": "currency"},
    {"key": "invoice_total", "label": "Invoice Total", "type": "currency"},
    {"key": "net_savings", "label": "Net Savings", "type": "currency"}
  ]'::jsonb,
  'bb_profit',
  'desc',
  true
) ON CONFLICT DO NOTHING;

-- 2. Employee Enrollment Report
INSERT INTO report_templates (name, description, report_type, columns, sort_by, sort_order, is_public)
VALUES (
  'Employee Enrollment Status',
  'Enrollment status and benefit details by employee',
  'employee_enrollment',
  '[
    {"key": "company_name", "label": "Company", "type": "text"},
    {"key": "employee_name", "label": "Employee", "type": "text"},
    {"key": "enrollment_status", "label": "Status", "type": "badge"},
    {"key": "benefit_count", "label": "Benefits", "type": "number"},
    {"key": "total_pretax", "label": "Total Pre-Tax/Pay", "type": "currency"},
    {"key": "annual_savings", "label": "Annual Tax Savings", "type": "currency"}
  ]'::jsonb,
  'company_name',
  'asc',
  true
) ON CONFLICT DO NOTHING;

-- 3. Company Performance Report
INSERT INTO report_templates (name, description, report_type, columns, sort_by, sort_order, is_public)
VALUES (
  'Company Performance Overview',
  'Key performance metrics for each company',
  'company_performance',
  '[
    {"key": "company_name", "label": "Company", "type": "text"},
    {"key": "total_employees", "label": "Employees", "type": "number"},
    {"key": "enrolled_employees", "label": "Enrolled", "type": "number"},
    {"key": "enrollment_rate", "label": "Enrollment %", "type": "percent"},
    {"key": "avg_pretax_per_employee", "label": "Avg Pre-Tax/Employee", "type": "currency"},
    {"key": "total_employer_savings", "label": "Total FICA Savings", "type": "currency"},
    {"key": "total_bb_revenue", "label": "BB Revenue", "type": "currency"}
  ]'::jsonb,
  'total_bb_revenue',
  'desc',
  true
) ON CONFLICT DO NOTHING;

-- 4. Tax Savings Analysis
INSERT INTO report_templates (name, description, report_type, columns, sort_by, sort_order, is_public)
VALUES (
  'Tax Savings Analysis',
  'Detailed breakdown of employer and employee tax savings',
  'tax_savings',
  '[
    {"key": "company_name", "label": "Company", "type": "text"},
    {"key": "period", "label": "Period", "type": "text"},
    {"key": "gross_payroll", "label": "Gross Payroll", "type": "currency"},
    {"key": "total_pretax", "label": "Pre-Tax Deductions", "type": "currency"},
    {"key": "employer_fica_savings", "label": "Employer FICA Savings", "type": "currency"},
    {"key": "employee_income_savings", "label": "Employee Income Tax Savings", "type": "currency"},
    {"key": "total_savings", "label": "Combined Savings", "type": "currency"},
    {"key": "roi_percent", "label": "ROI %", "type": "percent"}
  ]'::jsonb,
  'total_savings',
  'desc',
  true
) ON CONFLICT DO NOTHING;

-- 5. Profitability Analysis
INSERT INTO report_templates (name, description, report_type, columns, sort_by, sort_order, is_public)
VALUES (
  'Benefits Builder Profit Analysis',
  'Revenue and profitability metrics for Benefits Builder',
  'profit_analysis',
  '[
    {"key": "period", "label": "Period", "type": "text"},
    {"key": "total_companies", "label": "Companies", "type": "number"},
    {"key": "total_employees", "label": "Employees", "type": "number"},
    {"key": "total_pretax", "label": "Total Pre-Tax Processed", "type": "currency"},
    {"key": "employee_fees", "label": "Employee Fees", "type": "currency"},
    {"key": "employer_fees", "label": "Employer Fees", "type": "currency"},
    {"key": "total_revenue", "label": "Total Revenue", "type": "currency"},
    {"key": "avg_revenue_per_company", "label": "Avg Revenue/Company", "type": "currency"},
    {"key": "avg_revenue_per_employee", "label": "Avg Revenue/Employee", "type": "currency"}
  ]'::jsonb,
  'period',
  'desc',
  true
) ON CONFLICT DO NOTHING;

COMMENT ON TABLE report_templates IS 'Contains 5 pre-built report templates for common reporting needs';
