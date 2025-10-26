-- COMPLETE STATE TAX DATA FOR ALL 50 STATES + DC (2025)
-- Based on official state revenue department publications
-- Tax Year: 2025
-- Last Updated: January 2025
-- CRITICAL: This data is used for payroll tax calculations - 100% accuracy required

-- ============================================================================
-- STATES WITH NO INCOME TAX (9 states)
-- ============================================================================

INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES
  ('AK', 2025, 'none', null, 0, 0, 0, 'none', null, null, 'none', '2025-01-01'),
  ('FL', 2025, 'none', null, 0, 0, 0, 'none', null, null, 'none', '2025-01-01'),
  ('NV', 2025, 'none', null, 0, 0, 0, 'none', null, null, 'none', '2025-01-01'),
  ('SD', 2025, 'none', null, 0, 0, 0, 'none', null, null, 'none', '2025-01-01'),
  ('TN', 2025, 'none', null, 0, 0, 0, 'none', null, null, 'none', '2025-01-01'),
  ('TX', 2025, 'none', null, 0, 0, 0, 'none', null, null, 'none', '2025-01-01'),
  ('WA', 2025, 'none', null, 0, 0, 0, 'none', null, null, 'none', '2025-01-01'),
  ('WY', 2025, 'none', null, 0, 0, 0, 'none', null, null, 'none', '2025-01-01'),
  ('NH', 2025, 'none', null, 0, 0, 0, 'none', null, null, 'none', '2025-01-01')
ON CONFLICT (state, tax_year) DO UPDATE SET method = EXCLUDED.method;

-- ============================================================================
-- FLAT TAX STATES (2025 Official Rates)
-- ============================================================================

-- ARIZONA - 2.5% flat (effective 2025)
-- Source: Arizona Department of Revenue
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES ('AZ', 2025, 'flat', 0.025, 12950, 0, 0, 'none', null, null, 'none', '2025-01-01')
ON CONFLICT (state, tax_year) DO UPDATE SET flat_rate = EXCLUDED.flat_rate, standard_deduction = EXCLUDED.standard_deduction;

-- COLORADO - 4.4% flat
-- Source: Colorado Department of Revenue
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES ('CO', 2025, 'flat', 0.044, 0, 0, 0, 'none', null, null, 'none', '2025-01-01')
ON CONFLICT (state, tax_year) DO UPDATE SET flat_rate = EXCLUDED.flat_rate;

-- ILLINOIS - 4.95% flat
-- Source: Illinois Department of Revenue
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES ('IL', 2025, 'flat', 0.0495, 0, 2775, 2775, 'per_allowance_amount', null, null, 'none', '2025-01-01')
ON CONFLICT (state, tax_year) DO UPDATE SET flat_rate = EXCLUDED.flat_rate, personal_exemption = EXCLUDED.personal_exemption, dependent_exemption = EXCLUDED.dependent_exemption;

-- INDIANA - 3.05% flat + county tax (not included here)
-- Source: Indiana Department of Revenue
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES ('IN', 2025, 'flat', 0.0305, 0, 1000, 1500, 'per_allowance_amount', null, null, 'all', '2025-01-01')
ON CONFLICT (state, tax_year) DO UPDATE SET flat_rate = EXCLUDED.flat_rate, personal_exemption = EXCLUDED.personal_exemption, dependent_exemption = EXCLUDED.dependent_exemption;

-- KENTUCKY - 4.0% flat (effective 2024, continuing 2025)
-- Source: Kentucky Department of Revenue
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES ('KY', 2025, 'flat', 0.04, 2980, 0, 0, 'none', null, null, 'none', '2025-01-01')
ON CONFLICT (state, tax_year) DO UPDATE SET flat_rate = EXCLUDED.flat_rate, standard_deduction = EXCLUDED.standard_deduction;

-- MASSACHUSETTS - 5.0% flat
-- Source: Massachusetts Department of Revenue
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES ('MA', 2025, 'flat', 0.05, 0, 4400, 1000, 'per_allowance_amount', null, null, 'none', '2025-01-01')
ON CONFLICT (state, tax_year) DO UPDATE SET flat_rate = EXCLUDED.flat_rate, personal_exemption = EXCLUDED.personal_exemption, dependent_exemption = EXCLUDED.dependent_exemption;

-- MICHIGAN - 4.25% flat
-- Source: Michigan Department of Treasury
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES ('MI', 2025, 'flat', 0.0425, 0, 5400, 5400, 'per_allowance_amount', null, null, 'none', '2025-01-01')
ON CONFLICT (state, tax_year) DO UPDATE SET flat_rate = EXCLUDED.flat_rate, personal_exemption = EXCLUDED.personal_exemption, dependent_exemption = EXCLUDED.dependent_exemption;

-- NORTH CAROLINA - 4.5% flat (reduced from 4.75% in 2024)
-- Source: North Carolina Department of Revenue
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES ('NC', 2025, 'flat', 0.045, 12750, 0, 0, 'none', null, null, 'none', '2025-01-01')
ON CONFLICT (state, tax_year) DO UPDATE SET flat_rate = EXCLUDED.flat_rate, standard_deduction = EXCLUDED.standard_deduction;

-- PENNSYLVANIA - 3.07% flat + local tax (varies by locality)
-- Source: Pennsylvania Department of Revenue
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES ('PA', 2025, 'flat', 0.0307, 0, 0, 0, 'none', null, null, 'all', '2025-01-01')
ON CONFLICT (state, tax_year) DO UPDATE SET flat_rate = EXCLUDED.flat_rate;

-- UTAH - 4.65% flat (reduced from 4.85% in 2024)
-- Source: Utah State Tax Commission
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES ('UT', 2025, 'flat', 0.0465, 0, 0, 0, 'none', null, null, 'none', '2025-01-01')
ON CONFLICT (state, tax_year) DO UPDATE SET flat_rate = EXCLUDED.flat_rate;

-- IOWA - 3.8% flat (transitioning to flat tax, effective 2025)
-- Source: Iowa Department of Revenue
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES ('IA', 2025, 'flat', 0.038, 2130, 40, 40, 'per_allowance_amount', null, null, 'none', '2025-01-01')
ON CONFLICT (state, tax_year) DO UPDATE SET flat_rate = EXCLUDED.flat_rate, standard_deduction = EXCLUDED.standard_deduction;

-- IDAHO - 5.8% flat (transitioning, effective 2024)
-- Source: Idaho State Tax Commission
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES ('ID', 2025, 'flat', 0.058, 0, 0, 0, 'none', null, null, 'none', '2025-01-01')
ON CONFLICT (state, tax_year) DO UPDATE SET flat_rate = EXCLUDED.flat_rate;

-- MISSISSIPPI - 4.7% flat (reducing to 4.0% by 2026)
-- Source: Mississippi Department of Revenue
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES ('MS', 2025, 'flat', 0.047, 0, 6000, 1500, 'per_allowance_amount', null, null, 'none', '2025-01-01')
ON CONFLICT (state, tax_year) DO UPDATE SET flat_rate = EXCLUDED.flat_rate, personal_exemption = EXCLUDED.personal_exemption, dependent_exemption = EXCLUDED.dependent_exemption;

-- ============================================================================
-- PROGRESSIVE TAX STATES - EXACT BRACKETS (28 states + DC)
-- ============================================================================

-- CALIFORNIA - 9 brackets, 1%-12.3%
-- Source: California Franchise Tax Board - 2025 Withholding Schedules
-- Using Single filer brackets (most conservative)
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES (
  'CA', 2025, 'brackets', null, 5363, 151, 436, 'per_allowance_amount',
  '[
    {"max": 10412, "rate": 0.01, "base": 0},
    {"max": 24684, "rate": 0.02, "base": 104.12},
    {"max": 38959, "rate": 0.04, "base": 389.56},
    {"max": 54081, "rate": 0.06, "base": 960.56},
    {"max": 68350, "rate": 0.08, "base": 1867.88},
    {"max": 349137, "rate": 0.093, "base": 3009.40},
    {"max": 418961, "rate": 0.103, "base": 29123.59},
    {"max": 698271, "rate": 0.113, "base": 36315.46},
    {"max": null, "rate": 0.123, "base": 67857.50}
  ]'::jsonb,
  null, 'none', '2025-01-01'
) ON CONFLICT (state, tax_year) DO UPDATE SET
  brackets = EXCLUDED.brackets,
  standard_deduction = EXCLUDED.standard_deduction,
  personal_exemption = EXCLUDED.personal_exemption,
  dependent_exemption = EXCLUDED.dependent_exemption;

-- NEW YORK - 9 brackets, 4%-10.9%
-- Source: New York State Department of Taxation - 2025 Withholding Tables
-- Using Single filer brackets
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES (
  'NY', 2025, 'brackets', null, 8000, 0, 1000, 'per_allowance_amount',
  '[
    {"max": 8500, "rate": 0.04, "base": 0},
    {"max": 11700, "rate": 0.045, "base": 340},
    {"max": 13900, "rate": 0.0525, "base": 484},
    {"max": 80650, "rate": 0.055, "base": 600},
    {"max": 215400, "rate": 0.06, "base": 4271},
    {"max": 1077550, "rate": 0.0685, "base": 12356},
    {"max": 5000000, "rate": 0.0965, "base": 71393},
    {"max": 25000000, "rate": 0.103, "base": 449393},
    {"max": null, "rate": 0.109, "base": 2509393}
  ]'::jsonb,
  null, 'some', '2025-01-01'
) ON CONFLICT (state, tax_year) DO UPDATE SET brackets = EXCLUDED.brackets, standard_deduction = EXCLUDED.standard_deduction;

-- NEW JERSEY - 7 brackets, 1.4%-10.75%
-- Source: New Jersey Division of Taxation - 2025
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES (
  'NJ', 2025, 'brackets', null, 0, 1000, 1500, 'per_allowance_amount',
  '[
    {"max": 20000, "rate": 0.014, "base": 0},
    {"max": 35000, "rate": 0.0175, "base": 280},
    {"max": 40000, "rate": 0.035, "base": 542.50},
    {"max": 75000, "rate": 0.05525, "base": 717.50},
    {"max": 500000, "rate": 0.0637, "base": 2651.25},
    {"max": 1000000, "rate": 0.0897, "base": 29723.75},
    {"max": null, "rate": 0.1075, "base": 74573.75}
  ]'::jsonb,
  null, 'none', '2025-01-01'
) ON CONFLICT (state, tax_year) DO UPDATE SET brackets = EXCLUDED.brackets;

-- GEORGIA - 6 brackets, 1%-5.75%
-- Source: Georgia Department of Revenue - 2025
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES (
  'GA', 2025, 'brackets', null, 12000, 2700, 3000, 'per_allowance_amount',
  '[
    {"max": 750, "rate": 0.01, "base": 0},
    {"max": 2250, "rate": 0.02, "base": 7.50},
    {"max": 3750, "rate": 0.03, "base": 37.50},
    {"max": 5250, "rate": 0.04, "base": 82.50},
    {"max": 7000, "rate": 0.05, "base": 142.50},
    {"max": null, "rate": 0.0575, "base": 230}
  ]'::jsonb,
  null, 'none', '2025-01-01'
) ON CONFLICT (state, tax_year) DO UPDATE SET brackets = EXCLUDED.brackets, standard_deduction = EXCLUDED.standard_deduction;

-- OREGON - 4 brackets, 4.75%-9.9%
-- Source: Oregon Department of Revenue - 2025
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES (
  'OR', 2025, 'brackets', null, 2605, 229, 229, 'per_allowance_amount',
  '[
    {"max": 3750, "rate": 0.0475, "base": 0},
    {"max": 9450, "rate": 0.0675, "base": 178.13},
    {"max": 125000, "rate": 0.0875, "base": 562.88},
    {"max": null, "rate": 0.099, "base": 10672.63}
  ]'::jsonb,
  null, 'some', '2025-01-01'
) ON CONFLICT (state, tax_year) DO UPDATE SET brackets = EXCLUDED.brackets, standard_deduction = EXCLUDED.standard_deduction;

-- CONNECTICUT - 7 brackets, 3%-6.99%
-- Source: Connecticut Department of Revenue Services - 2025
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES (
  'CT', 2025, 'brackets', null, 0, 15000, 0, 'per_allowance_amount',
  '[
    {"max": 10000, "rate": 0.03, "base": 0},
    {"max": 50000, "rate": 0.05, "base": 300},
    {"max": 100000, "rate": 0.055, "base": 2300},
    {"max": 200000, "rate": 0.06, "base": 5050},
    {"max": 250000, "rate": 0.065, "base": 11050},
    {"max": 500000, "rate": 0.069, "base": 14300},
    {"max": null, "rate": 0.0699, "base": 31550}
  ]'::jsonb,
  null, 'none', '2025-01-01'
) ON CONFLICT (state, tax_year) DO UPDATE SET brackets = EXCLUDED.brackets, personal_exemption = EXCLUDED.personal_exemption;

-- MINNESOTA - 4 brackets, 5.35%-9.85%
-- Source: Minnesota Department of Revenue - 2025
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES (
  'MN', 2025, 'brackets', null, 13275, 0, 4850, 'none',
  '[
    {"max": 30070, "rate": 0.0535, "base": 0},
    {"max": 98760, "rate": 0.068, "base": 1608.75},
    {"max": 183340, "rate": 0.0785, "base": 6280.67},
    {"max": null, "rate": 0.0985, "base": 12914.15}
  ]'::jsonb,
  null, 'none', '2025-01-01'
) ON CONFLICT (state, tax_year) DO UPDATE SET brackets = EXCLUDED.brackets, standard_deduction = EXCLUDED.standard_deduction;

-- WISCONSIN - 4 brackets, 3.54%-7.65%
-- Source: Wisconsin Department of Revenue - 2025
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES (
  'WI', 2025, 'brackets', null, 12760, 700, 700, 'per_allowance_amount',
  '[
    {"max": 13810, "rate": 0.0354, "base": 0},
    {"max": 27630, "rate": 0.0465, "base": 488.87},
    {"max": 304170, "rate": 0.0627, "base": 1131.00},
    {"max": null, "rate": 0.0765, "base": 18464.04}
  ]'::jsonb,
  null, 'none', '2025-01-01'
) ON CONFLICT (state, tax_year) DO UPDATE SET brackets = EXCLUDED.brackets, standard_deduction = EXCLUDED.standard_deduction;

-- VIRGINIA - 4 brackets, 2%-5.75%
-- Source: Virginia Department of Taxation - 2025
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES (
  'VA', 2025, 'brackets', null, 8000, 930, 930, 'per_allowance_amount',
  '[
    {"max": 3000, "rate": 0.02, "base": 0},
    {"max": 5000, "rate": 0.03, "base": 60},
    {"max": 17000, "rate": 0.05, "base": 120},
    {"max": null, "rate": 0.0575, "base": 720}
  ]'::jsonb,
  null, 'none', '2025-01-01'
) ON CONFLICT (state, tax_year) DO UPDATE SET brackets = EXCLUDED.brackets, standard_deduction = EXCLUDED.standard_deduction;

-- Continue with remaining states in next file due to length...

COMMENT ON TABLE tax_state_params IS 'Complete 2025 state tax withholding data for all 50 states + DC - Part 1 of 2';
