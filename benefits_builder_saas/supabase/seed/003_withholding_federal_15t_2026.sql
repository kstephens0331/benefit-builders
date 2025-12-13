-- Seed 2026 Federal Withholding Tables (IRS Publication 15-T)
-- Source: IRS Publication 15-T for 2026, Tax Foundation 2026 Tax Brackets
-- Standard Deductions: Single $16,100, Married $32,200, Head of Household $24,150
-- SS Wage Base: $184,500 (up from $176,100 in 2025)

-- Single filer, Weekly
INSERT INTO withholding_federal_15t (tax_year, filing_status, pay_frequency, percentage_method_json) VALUES
(2026, 'single', 'weekly', '{
  "standard_deduction": 16100,
  "brackets": [
    {"max": 12400, "rate": 0.10, "base": 0},
    {"max": 50400, "rate": 0.12, "base": 1240.00},
    {"max": 105700, "rate": 0.22, "base": 5800.00},
    {"max": 201775, "rate": 0.24, "base": 17966.00},
    {"max": 256225, "rate": 0.32, "base": 41024.00},
    {"max": 640600, "rate": 0.35, "base": 58448.00},
    {"max": null, "rate": 0.37, "base": 192979.25}
  ]
}'::jsonb)
ON CONFLICT (tax_year, filing_status, pay_frequency) DO UPDATE SET
  percentage_method_json = EXCLUDED.percentage_method_json;

-- Single filer, Biweekly
INSERT INTO withholding_federal_15t (tax_year, filing_status, pay_frequency, percentage_method_json) VALUES
(2026, 'single', 'biweekly', '{
  "standard_deduction": 16100,
  "brackets": [
    {"max": 12400, "rate": 0.10, "base": 0},
    {"max": 50400, "rate": 0.12, "base": 1240.00},
    {"max": 105700, "rate": 0.22, "base": 5800.00},
    {"max": 201775, "rate": 0.24, "base": 17966.00},
    {"max": 256225, "rate": 0.32, "base": 41024.00},
    {"max": 640600, "rate": 0.35, "base": 58448.00},
    {"max": null, "rate": 0.37, "base": 192979.25}
  ]
}'::jsonb)
ON CONFLICT (tax_year, filing_status, pay_frequency) DO UPDATE SET
  percentage_method_json = EXCLUDED.percentage_method_json;

-- Single filer, Semimonthly
INSERT INTO withholding_federal_15t (tax_year, filing_status, pay_frequency, percentage_method_json) VALUES
(2026, 'single', 'semimonthly', '{
  "standard_deduction": 16100,
  "brackets": [
    {"max": 12400, "rate": 0.10, "base": 0},
    {"max": 50400, "rate": 0.12, "base": 1240.00},
    {"max": 105700, "rate": 0.22, "base": 5800.00},
    {"max": 201775, "rate": 0.24, "base": 17966.00},
    {"max": 256225, "rate": 0.32, "base": 41024.00},
    {"max": 640600, "rate": 0.35, "base": 58448.00},
    {"max": null, "rate": 0.37, "base": 192979.25}
  ]
}'::jsonb)
ON CONFLICT (tax_year, filing_status, pay_frequency) DO UPDATE SET
  percentage_method_json = EXCLUDED.percentage_method_json;

-- Single filer, Monthly
INSERT INTO withholding_federal_15t (tax_year, filing_status, pay_frequency, percentage_method_json) VALUES
(2026, 'single', 'monthly', '{
  "standard_deduction": 16100,
  "brackets": [
    {"max": 12400, "rate": 0.10, "base": 0},
    {"max": 50400, "rate": 0.12, "base": 1240.00},
    {"max": 105700, "rate": 0.22, "base": 5800.00},
    {"max": 201775, "rate": 0.24, "base": 17966.00},
    {"max": 256225, "rate": 0.32, "base": 41024.00},
    {"max": 640600, "rate": 0.35, "base": 58448.00},
    {"max": null, "rate": 0.37, "base": 192979.25}
  ]
}'::jsonb)
ON CONFLICT (tax_year, filing_status, pay_frequency) DO UPDATE SET
  percentage_method_json = EXCLUDED.percentage_method_json;

-- Married filer, Weekly
INSERT INTO withholding_federal_15t (tax_year, filing_status, pay_frequency, percentage_method_json) VALUES
(2026, 'married', 'weekly', '{
  "standard_deduction": 32200,
  "brackets": [
    {"max": 24800, "rate": 0.10, "base": 0},
    {"max": 100800, "rate": 0.12, "base": 2480.00},
    {"max": 211400, "rate": 0.22, "base": 11600.00},
    {"max": 403550, "rate": 0.24, "base": 35932.00},
    {"max": 512450, "rate": 0.32, "base": 82048.00},
    {"max": 768700, "rate": 0.35, "base": 116896.00},
    {"max": null, "rate": 0.37, "base": 206583.50}
  ]
}'::jsonb)
ON CONFLICT (tax_year, filing_status, pay_frequency) DO UPDATE SET
  percentage_method_json = EXCLUDED.percentage_method_json;

-- Married filer, Biweekly
INSERT INTO withholding_federal_15t (tax_year, filing_status, pay_frequency, percentage_method_json) VALUES
(2026, 'married', 'biweekly', '{
  "standard_deduction": 32200,
  "brackets": [
    {"max": 24800, "rate": 0.10, "base": 0},
    {"max": 100800, "rate": 0.12, "base": 2480.00},
    {"max": 211400, "rate": 0.22, "base": 11600.00},
    {"max": 403550, "rate": 0.24, "base": 35932.00},
    {"max": 512450, "rate": 0.32, "base": 82048.00},
    {"max": 768700, "rate": 0.35, "base": 116896.00},
    {"max": null, "rate": 0.37, "base": 206583.50}
  ]
}'::jsonb)
ON CONFLICT (tax_year, filing_status, pay_frequency) DO UPDATE SET
  percentage_method_json = EXCLUDED.percentage_method_json;

-- Married filer, Semimonthly
INSERT INTO withholding_federal_15t (tax_year, filing_status, pay_frequency, percentage_method_json) VALUES
(2026, 'married', 'semimonthly', '{
  "standard_deduction": 32200,
  "brackets": [
    {"max": 24800, "rate": 0.10, "base": 0},
    {"max": 100800, "rate": 0.12, "base": 2480.00},
    {"max": 211400, "rate": 0.22, "base": 11600.00},
    {"max": 403550, "rate": 0.24, "base": 35932.00},
    {"max": 512450, "rate": 0.32, "base": 82048.00},
    {"max": 768700, "rate": 0.35, "base": 116896.00},
    {"max": null, "rate": 0.37, "base": 206583.50}
  ]
}'::jsonb)
ON CONFLICT (tax_year, filing_status, pay_frequency) DO UPDATE SET
  percentage_method_json = EXCLUDED.percentage_method_json;

-- Married filer, Monthly
INSERT INTO withholding_federal_15t (tax_year, filing_status, pay_frequency, percentage_method_json) VALUES
(2026, 'married', 'monthly', '{
  "standard_deduction": 32200,
  "brackets": [
    {"max": 24800, "rate": 0.10, "base": 0},
    {"max": 100800, "rate": 0.12, "base": 2480.00},
    {"max": 211400, "rate": 0.22, "base": 11600.00},
    {"max": 403550, "rate": 0.24, "base": 35932.00},
    {"max": 512450, "rate": 0.32, "base": 82048.00},
    {"max": 768700, "rate": 0.35, "base": 116896.00},
    {"max": null, "rate": 0.37, "base": 206583.50}
  ]
}'::jsonb)
ON CONFLICT (tax_year, filing_status, pay_frequency) DO UPDATE SET
  percentage_method_json = EXCLUDED.percentage_method_json;

-- Head of Household, Weekly
INSERT INTO withholding_federal_15t (tax_year, filing_status, pay_frequency, percentage_method_json) VALUES
(2026, 'head', 'weekly', '{
  "standard_deduction": 24150,
  "brackets": [
    {"max": 17700, "rate": 0.10, "base": 0},
    {"max": 67450, "rate": 0.12, "base": 1770.00},
    {"max": 105700, "rate": 0.22, "base": 7740.00},
    {"max": 201775, "rate": 0.24, "base": 16155.00},
    {"max": 256200, "rate": 0.32, "base": 39213.00},
    {"max": 640600, "rate": 0.35, "base": 56629.00},
    {"max": null, "rate": 0.37, "base": 191169.00}
  ]
}'::jsonb)
ON CONFLICT (tax_year, filing_status, pay_frequency) DO UPDATE SET
  percentage_method_json = EXCLUDED.percentage_method_json;

-- Head of Household, Biweekly
INSERT INTO withholding_federal_15t (tax_year, filing_status, pay_frequency, percentage_method_json) VALUES
(2026, 'head', 'biweekly', '{
  "standard_deduction": 24150,
  "brackets": [
    {"max": 17700, "rate": 0.10, "base": 0},
    {"max": 67450, "rate": 0.12, "base": 1770.00},
    {"max": 105700, "rate": 0.22, "base": 7740.00},
    {"max": 201775, "rate": 0.24, "base": 16155.00},
    {"max": 256200, "rate": 0.32, "base": 39213.00},
    {"max": 640600, "rate": 0.35, "base": 56629.00},
    {"max": null, "rate": 0.37, "base": 191169.00}
  ]
}'::jsonb)
ON CONFLICT (tax_year, filing_status, pay_frequency) DO UPDATE SET
  percentage_method_json = EXCLUDED.percentage_method_json;

-- Head of Household, Semimonthly
INSERT INTO withholding_federal_15t (tax_year, filing_status, pay_frequency, percentage_method_json) VALUES
(2026, 'head', 'semimonthly', '{
  "standard_deduction": 24150,
  "brackets": [
    {"max": 17700, "rate": 0.10, "base": 0},
    {"max": 67450, "rate": 0.12, "base": 1770.00},
    {"max": 105700, "rate": 0.22, "base": 7740.00},
    {"max": 201775, "rate": 0.24, "base": 16155.00},
    {"max": 256200, "rate": 0.32, "base": 39213.00},
    {"max": 640600, "rate": 0.35, "base": 56629.00},
    {"max": null, "rate": 0.37, "base": 191169.00}
  ]
}'::jsonb)
ON CONFLICT (tax_year, filing_status, pay_frequency) DO UPDATE SET
  percentage_method_json = EXCLUDED.percentage_method_json;

-- Head of Household, Monthly
INSERT INTO withholding_federal_15t (tax_year, filing_status, pay_frequency, percentage_method_json) VALUES
(2026, 'head', 'monthly', '{
  "standard_deduction": 24150,
  "brackets": [
    {"max": 17700, "rate": 0.10, "base": 0},
    {"max": 67450, "rate": 0.12, "base": 1770.00},
    {"max": 105700, "rate": 0.22, "base": 7740.00},
    {"max": 201775, "rate": 0.24, "base": 16155.00},
    {"max": 256200, "rate": 0.32, "base": 39213.00},
    {"max": 640600, "rate": 0.35, "base": 56629.00},
    {"max": null, "rate": 0.37, "base": 191169.00}
  ]
}'::jsonb)
ON CONFLICT (tax_year, filing_status, pay_frequency) DO UPDATE SET
  percentage_method_json = EXCLUDED.percentage_method_json;
