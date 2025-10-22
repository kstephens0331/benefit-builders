-- Seed 2025 Federal Withholding Tables (IRS Publication 15-T)
-- Note: These are simplified percentage method tables for 2025
-- For production, you should use the exact IRS tables

-- Single filer, Weekly
INSERT INTO withholding_federal_15t (tax_year, filing_status, pay_frequency, percentage_method_json) VALUES
(2025, 'single', 'weekly', '{
  "standard_deduction": 14600,
  "brackets": [
    {"max": 11925, "rate": 0.10, "base": 0},
    {"max": 48475, "rate": 0.12, "base": 1192.50},
    {"max": 103350, "rate": 0.22, "base": 5578.50},
    {"max": 197300, "rate": 0.24, "base": 17651.00},
    {"max": 250525, "rate": 0.32, "base": 40219.00},
    {"max": 626350, "rate": 0.35, "base": 57271.00},
    {"max": null, "rate": 0.37, "base": 188925.25}
  ]
}'::jsonb)
ON CONFLICT (tax_year, filing_status, pay_frequency) DO UPDATE SET
  percentage_method_json = EXCLUDED.percentage_method_json;

-- Single filer, Biweekly
INSERT INTO withholding_federal_15t (tax_year, filing_status, pay_frequency, percentage_method_json) VALUES
(2025, 'single', 'biweekly', '{
  "standard_deduction": 14600,
  "brackets": [
    {"max": 11925, "rate": 0.10, "base": 0},
    {"max": 48475, "rate": 0.12, "base": 1192.50},
    {"max": 103350, "rate": 0.22, "base": 5578.50},
    {"max": 197300, "rate": 0.24, "base": 17651.00},
    {"max": 250525, "rate": 0.32, "base": 40219.00},
    {"max": 626350, "rate": 0.35, "base": 57271.00},
    {"max": null, "rate": 0.37, "base": 188925.25}
  ]
}'::jsonb)
ON CONFLICT (tax_year, filing_status, pay_frequency) DO UPDATE SET
  percentage_method_json = EXCLUDED.percentage_method_json;

-- Single filer, Semimonthly
INSERT INTO withholding_federal_15t (tax_year, filing_status, pay_frequency, percentage_method_json) VALUES
(2025, 'single', 'semimonthly', '{
  "standard_deduction": 14600,
  "brackets": [
    {"max": 11925, "rate": 0.10, "base": 0},
    {"max": 48475, "rate": 0.12, "base": 1192.50},
    {"max": 103350, "rate": 0.22, "base": 5578.50},
    {"max": 197300, "rate": 0.24, "base": 17651.00},
    {"max": 250525, "rate": 0.32, "base": 40219.00},
    {"max": 626350, "rate": 0.35, "base": 57271.00},
    {"max": null, "rate": 0.37, "base": 188925.25}
  ]
}'::jsonb)
ON CONFLICT (tax_year, filing_status, pay_frequency) DO UPDATE SET
  percentage_method_json = EXCLUDED.percentage_method_json;

-- Single filer, Monthly
INSERT INTO withholding_federal_15t (tax_year, filing_status, pay_frequency, percentage_method_json) VALUES
(2025, 'single', 'monthly', '{
  "standard_deduction": 14600,
  "brackets": [
    {"max": 11925, "rate": 0.10, "base": 0},
    {"max": 48475, "rate": 0.12, "base": 1192.50},
    {"max": 103350, "rate": 0.22, "base": 5578.50},
    {"max": 197300, "rate": 0.24, "base": 17651.00},
    {"max": 250525, "rate": 0.32, "base": 40219.00},
    {"max": 626350, "rate": 0.35, "base": 57271.00},
    {"max": null, "rate": 0.37, "base": 188925.25}
  ]
}'::jsonb)
ON CONFLICT (tax_year, filing_status, pay_frequency) DO UPDATE SET
  percentage_method_json = EXCLUDED.percentage_method_json;

-- Married filer, Weekly
INSERT INTO withholding_federal_15t (tax_year, filing_status, pay_frequency, percentage_method_json) VALUES
(2025, 'married', 'weekly', '{
  "standard_deduction": 29200,
  "brackets": [
    {"max": 23850, "rate": 0.10, "base": 0},
    {"max": 96950, "rate": 0.12, "base": 2385.00},
    {"max": 206700, "rate": 0.22, "base": 11157.00},
    {"max": 394600, "rate": 0.24, "base": 35302.00},
    {"max": 501050, "rate": 0.32, "base": 80438.00},
    {"max": 751600, "rate": 0.35, "base": 114542.00},
    {"max": null, "rate": 0.37, "base": 202234.50}
  ]
}'::jsonb)
ON CONFLICT (tax_year, filing_status, pay_frequency) DO UPDATE SET
  percentage_method_json = EXCLUDED.percentage_method_json;

-- Married filer, Biweekly
INSERT INTO withholding_federal_15t (tax_year, filing_status, pay_frequency, percentage_method_json) VALUES
(2025, 'married', 'biweekly', '{
  "standard_deduction": 29200,
  "brackets": [
    {"max": 23850, "rate": 0.10, "base": 0},
    {"max": 96950, "rate": 0.12, "base": 2385.00},
    {"max": 206700, "rate": 0.22, "base": 11157.00},
    {"max": 394600, "rate": 0.24, "base": 35302.00},
    {"max": 501050, "rate": 0.32, "base": 80438.00},
    {"max": 751600, "rate": 0.35, "base": 114542.00},
    {"max": null, "rate": 0.37, "base": 202234.50}
  ]
}'::jsonb)
ON CONFLICT (tax_year, filing_status, pay_frequency) DO UPDATE SET
  percentage_method_json = EXCLUDED.percentage_method_json;

-- Married filer, Semimonthly
INSERT INTO withholding_federal_15t (tax_year, filing_status, pay_frequency, percentage_method_json) VALUES
(2025, 'married', 'semimonthly', '{
  "standard_deduction": 29200,
  "brackets": [
    {"max": 23850, "rate": 0.10, "base": 0},
    {"max": 96950, "rate": 0.12, "base": 2385.00},
    {"max": 206700, "rate": 0.22, "base": 11157.00},
    {"max": 394600, "rate": 0.24, "base": 35302.00},
    {"max": 501050, "rate": 0.32, "base": 80438.00},
    {"max": 751600, "rate": 0.35, "base": 114542.00},
    {"max": null, "rate": 0.37, "base": 202234.50}
  ]
}'::jsonb)
ON CONFLICT (tax_year, filing_status, pay_frequency) DO UPDATE SET
  percentage_method_json = EXCLUDED.percentage_method_json;

-- Married filer, Monthly
INSERT INTO withholding_federal_15t (tax_year, filing_status, pay_frequency, percentage_method_json) VALUES
(2025, 'married', 'monthly', '{
  "standard_deduction": 29200,
  "brackets": [
    {"max": 23850, "rate": 0.10, "base": 0},
    {"max": 96950, "rate": 0.12, "base": 2385.00},
    {"max": 206700, "rate": 0.22, "base": 11157.00},
    {"max": 394600, "rate": 0.24, "base": 35302.00},
    {"max": 501050, "rate": 0.32, "base": 80438.00},
    {"max": 751600, "rate": 0.35, "base": 114542.00},
    {"max": null, "rate": 0.37, "base": 202234.50}
  ]
}'::jsonb)
ON CONFLICT (tax_year, filing_status, pay_frequency) DO UPDATE SET
  percentage_method_json = EXCLUDED.percentage_method_json;

-- Head of Household, Weekly
INSERT INTO withholding_federal_15t (tax_year, filing_status, pay_frequency, percentage_method_json) VALUES
(2025, 'head', 'weekly', '{
  "standard_deduction": 21900,
  "brackets": [
    {"max": 17000, "rate": 0.10, "base": 0},
    {"max": 64850, "rate": 0.12, "base": 1700.00},
    {"max": 103350, "rate": 0.22, "base": 7442.00},
    {"max": 197300, "rate": 0.24, "base": 15912.00},
    {"max": 250500, "rate": 0.32, "base": 38460.00},
    {"max": 626350, "rate": 0.35, "base": 55484.00},
    {"max": null, "rate": 0.37, "base": 186971.50}
  ]
}'::jsonb)
ON CONFLICT (tax_year, filing_status, pay_frequency) DO UPDATE SET
  percentage_method_json = EXCLUDED.percentage_method_json;

-- Head of Household, Biweekly
INSERT INTO withholding_federal_15t (tax_year, filing_status, pay_frequency, percentage_method_json) VALUES
(2025, 'head', 'biweekly', '{
  "standard_deduction": 21900,
  "brackets": [
    {"max": 17000, "rate": 0.10, "base": 0},
    {"max": 64850, "rate": 0.12, "base": 1700.00},
    {"max": 103350, "rate": 0.22, "base": 7442.00},
    {"max": 197300, "rate": 0.24, "base": 15912.00},
    {"max": 250500, "rate": 0.32, "base": 38460.00},
    {"max": 626350, "rate": 0.35, "base": 55484.00},
    {"max": null, "rate": 0.37, "base": 186971.50}
  ]
}'::jsonb)
ON CONFLICT (tax_year, filing_status, pay_frequency) DO UPDATE SET
  percentage_method_json = EXCLUDED.percentage_method_json;

-- Head of Household, Semimonthly
INSERT INTO withholding_federal_15t (tax_year, filing_status, pay_frequency, percentage_method_json) VALUES
(2025, 'head', 'semimonthly', '{
  "standard_deduction": 21900,
  "brackets": [
    {"max": 17000, "rate": 0.10, "base": 0},
    {"max": 64850, "rate": 0.12, "base": 1700.00},
    {"max": 103350, "rate": 0.22, "base": 7442.00},
    {"max": 197300, "rate": 0.24, "base": 15912.00},
    {"max": 250500, "rate": 0.32, "base": 38460.00},
    {"max": 626350, "rate": 0.35, "base": 55484.00},
    {"max": null, "rate": 0.37, "base": 186971.50}
  ]
}'::jsonb)
ON CONFLICT (tax_year, filing_status, pay_frequency) DO UPDATE SET
  percentage_method_json = EXCLUDED.percentage_method_json;

-- Head of Household, Monthly
INSERT INTO withholding_federal_15t (tax_year, filing_status, pay_frequency, percentage_method_json) VALUES
(2025, 'head', 'monthly', '{
  "standard_deduction": 21900,
  "brackets": [
    {"max": 17000, "rate": 0.10, "base": 0},
    {"max": 64850, "rate": 0.12, "base": 1700.00},
    {"max": 103350, "rate": 0.22, "base": 7442.00},
    {"max": 197300, "rate": 0.24, "base": 15912.00},
    {"max": 250500, "rate": 0.32, "base": 38460.00},
    {"max": 626350, "rate": 0.35, "base": 55484.00},
    {"max": null, "rate": 0.37, "base": 186971.50}
  ]
}'::jsonb)
ON CONFLICT (tax_year, filing_status, pay_frequency) DO UPDATE SET
  percentage_method_json = EXCLUDED.percentage_method_json;
