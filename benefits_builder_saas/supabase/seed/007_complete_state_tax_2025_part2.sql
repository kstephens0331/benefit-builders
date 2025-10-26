-- COMPLETE STATE TAX DATA - PART 2
-- Remaining Progressive Tax States

-- VERMONT - 4 brackets, 3.35%-8.75%
-- Source: Vermont Department of Taxes - 2025
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES (
  'VT', 2025, 'brackets', null, 7100, 0, 0, 'none',
  '[
    {"max": 45400, "rate": 0.0335, "base": 0},
    {"max": 110050, "rate": 0.066, "base": 1520.90},
    {"max": 229550, "rate": 0.076, "base": 5788.80},
    {"max": null, "rate": 0.0875, "base": 14871.80}
  ]'::jsonb,
  null, 'none', '2025-01-01'
) ON CONFLICT (state, tax_year) DO UPDATE SET brackets = EXCLUDED.brackets, standard_deduction = EXCLUDED.standard_deduction;

-- SOUTH CAROLINA - 6 brackets, 0%-6.4%
-- Source: South Carolina Department of Revenue - 2025
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES (
  'SC', 2025, 'brackets', null, 12760, 0, 4260, 'none',
  '[
    {"max": 3200, "rate": 0, "base": 0},
    {"max": 6410, "rate": 0.03, "base": 0},
    {"max": 9620, "rate": 0.04, "base": 96.30},
    {"max": 12820, "rate": 0.05, "base": 224.70},
    {"max": 16040, "rate": 0.06, "base": 384.70},
    {"max": null, "rate": 0.064, "base": 577.90}
  ]'::jsonb,
  null, 'none', '2025-01-01'
) ON CONFLICT (state, tax_year) DO UPDATE SET brackets = EXCLUDED.brackets, standard_deduction = EXCLUDED.standard_deduction;

-- RHODE ISLAND - 3 brackets, 3.75%-5.99%
-- Source: Rhode Island Division of Taxation - 2025
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES (
  'RI', 2025, 'brackets', null, 9800, 0, 0, 'none',
  '[
    {"max": 73450, "rate": 0.0375, "base": 0},
    {"max": 166950, "rate": 0.0475, "base": 2754.38},
    {"max": null, "rate": 0.0599, "base": 7195.63}
  ]'::jsonb,
  null, 'none', '2025-01-01'
) ON CONFLICT (state, tax_year) DO UPDATE SET brackets = EXCLUDED.brackets, standard_deduction = EXCLUDED.standard_deduction;

-- OKLAHOMA - 6 brackets, 0.25%-4.75%
-- Source: Oklahoma Tax Commission - 2025
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES (
  'OK', 2025, 'brackets', null, 6350, 1000, 1000, 'per_allowance_amount',
  '[
    {"max": 1000, "rate": 0.0025, "base": 0},
    {"max": 2500, "rate": 0.0075, "base": 2.50},
    {"max": 3750, "rate": 0.0175, "base": 13.75},
    {"max": 4900, "rate": 0.0275, "base": 35.63},
    {"max": 7200, "rate": 0.0375, "base": 67.25},
    {"max": null, "rate": 0.0475, "base": 153.50}
  ]'::jsonb,
  null, 'none', '2025-01-01'
) ON CONFLICT (state, tax_year) DO UPDATE SET brackets = EXCLUDED.brackets, standard_deduction = EXCLUDED.standard_deduction;

-- OHIO - Progressive (phasing to flat), currently 2.75%-3.75%
-- Source: Ohio Department of Taxation - 2025
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES (
  'OH', 2025, 'brackets', null, 0, 0, 0, 'none',
  '[
    {"max": 26050, "rate": 0.0275, "base": 0},
    {"max": 46100, "rate": 0.03166, "base": 716.38},
    {"max": 92150, "rate": 0.03509, "base": 1350.61},
    {"max": null, "rate": 0.0375, "base": 2966.46}
  ]'::jsonb,
  null, 'city', '2025-01-01'
) ON CONFLICT (state, tax_year) DO UPDATE SET brackets = EXCLUDED.brackets;

-- NORTH DAKOTA - 5 brackets, 1.1%-2.9%
-- Source: North Dakota Office of State Tax Commissioner - 2025
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES (
  'ND', 2025, 'brackets', null, 0, 0, 0, 'none',
  '[
    {"max": 44725, "rate": 0.011, "base": 0},
    {"max": 105625, "rate": 0.0204, "base": 491.98},
    {"max": 195850, "rate": 0.0227, "base": 1733.34},
    {"max": 458350, "rate": 0.0264, "base": 3781.85},
    {"max": null, "rate": 0.029, "base": 10709.85}
  ]'::jsonb,
  null, 'none', '2025-01-01'
) ON CONFLICT (state, tax_year) DO UPDATE SET brackets = EXCLUDED.brackets;

-- NEW MEXICO - 5 brackets, 1.7%-5.9%
-- Source: New Mexico Taxation and Revenue Department - 2025
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES (
  'NM', 2025, 'brackets', null, 13850, 0, 0, 'none',
  '[
    {"max": 5500, "rate": 0.017, "base": 0},
    {"max": 11000, "rate": 0.032, "base": 93.50},
    {"max": 16000, "rate": 0.047, "base": 269.50},
    {"max": 210000, "rate": 0.049, "base": 504.50},
    {"max": null, "rate": 0.059, "base": 10010.50}
  ]'::jsonb,
  null, 'none', '2025-01-01'
) ON CONFLICT (state, tax_year) DO UPDATE SET brackets = EXCLUDED.brackets, standard_deduction = EXCLUDED.standard_deduction;

-- MONTANA - 7 brackets, 1%-6.75%
-- Source: Montana Department of Revenue - 2025
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES (
  'MT', 2025, 'brackets', null, 5340, 0, 0, 'none',
  '[
    {"max": 3600, "rate": 0.01, "base": 0},
    {"max": 6900, "rate": 0.02, "base": 36},
    {"max": 10800, "rate": 0.03, "base": 102},
    {"max": 14700, "rate": 0.04, "base": 219},
    {"max": 18900, "rate": 0.05, "base": 375},
    {"max": 23100, "rate": 0.06, "base": 585},
    {"max": null, "rate": 0.0675, "base": 837}
  ]'::jsonb,
  null, 'none', '2025-01-01'
) ON CONFLICT (state, tax_year) DO UPDATE SET brackets = EXCLUDED.brackets, standard_deduction = EXCLUDED.standard_deduction;

-- MISSOURI - 9 brackets, 0%-4.8%
-- Source: Missouri Department of Revenue - 2025
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES (
  'MO', 2025, 'brackets', null, 0, 1200, 1200, 'per_allowance_amount',
  '[
    {"max": 1207, "rate": 0, "base": 0},
    {"max": 2414, "rate": 0.015, "base": 0},
    {"max": 3621, "rate": 0.02, "base": 18.11},
    {"max": 4828, "rate": 0.025, "base": 42.25},
    {"max": 6035, "rate": 0.03, "base": 72.43},
    {"max": 7242, "rate": 0.035, "base": 108.64},
    {"max": 8449, "rate": 0.04, "base": 150.88},
    {"max": 9656, "rate": 0.045, "base": 199.16},
    {"max": null, "rate": 0.048, "base": 253.48}
  ]'::jsonb,
  null, 'city', '2025-01-01'
) ON CONFLICT (state, tax_year) DO UPDATE SET brackets = EXCLUDED.brackets;

-- MARYLAND - 8 brackets, 2%-5.75% (state) + county tax (0.0225-0.032)
-- Source: Comptroller of Maryland - 2025
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES (
  'MD', 2025, 'brackets', null, 2350, 3200, 3200, 'per_allowance_amount',
  '[
    {"max": 1000, "rate": 0.02, "base": 0},
    {"max": 2000, "rate": 0.03, "base": 20},
    {"max": 3000, "rate": 0.04, "base": 50},
    {"max": 100000, "rate": 0.0475, "base": 90},
    {"max": 125000, "rate": 0.05, "base": 4697.50},
    {"max": 150000, "rate": 0.0525, "base": 5947.50},
    {"max": 250000, "rate": 0.055, "base": 7260},
    {"max": null, "rate": 0.0575, "base": 12760}
  ]'::jsonb,
  null, 'county', '2025-01-01'
) ON CONFLICT (state, tax_year) DO UPDATE SET brackets = EXCLUDED.brackets;

-- MAINE - 3 brackets, 5.8%-7.15%
-- Source: Maine Revenue Services - 2025
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES (
  'ME', 2025, 'brackets', null, 13850, 4700, 4700, 'per_allowance_amount',
  '[
    {"max": 24500, "rate": 0.058, "base": 0},
    {"max": 58050, "rate": 0.0675, "base": 1421},
    {"max": null, "rate": 0.0715, "base": 3686.88}
  ]'::jsonb,
  null, 'none', '2025-01-01'
) ON CONFLICT (state, tax_year) DO UPDATE SET brackets = EXCLUDED.brackets, standard_deduction = EXCLUDED.standard_deduction;

-- LOUISIANA - 3 brackets, 1.85%-4.25%
-- Source: Louisiana Department of Revenue - 2025
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES (
  'LA', 2025, 'brackets', null, 0, 4500, 1000, 'per_allowance_amount',
  '[
    {"max": 12500, "rate": 0.0185, "base": 0},
    {"max": 50000, "rate": 0.0350, "base": 231.25},
    {"max": null, "rate": 0.0425, "base": 1543.75}
  ]'::jsonb,
  null, 'none', '2025-01-01'
) ON CONFLICT (state, tax_year) DO UPDATE SET brackets = EXCLUDED.brackets;

-- KANSAS - 3 brackets, 3.1%-5.7%
-- Source: Kansas Department of Revenue - 2025
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES (
  'KS', 2025, 'brackets', null, 3500, 2250, 2250, 'per_allowance_amount',
  '[
    {"max": 15000, "rate": 0.031, "base": 0},
    {"max": 30000, "rate": 0.0525, "base": 465},
    {"max": null, "rate": 0.057, "base": 1252.50}
  ]'::jsonb,
  null, 'none', '2025-01-01'
) ON CONFLICT (state, tax_year) DO UPDATE SET brackets = EXCLUDED.brackets, standard_deduction = EXCLUDED.standard_deduction;

-- HAWAII - 12 brackets, 1.4%-11% (highest in US)
-- Source: Hawaii Department of Taxation - 2025
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES (
  'HI', 2025, 'brackets', null, 4400, 1144, 1144, 'per_allowance_amount',
  '[
    {"max": 2400, "rate": 0.014, "base": 0},
    {"max": 4800, "rate": 0.032, "base": 33.60},
    {"max": 9600, "rate": 0.055, "base": 110.40},
    {"max": 14400, "rate": 0.064, "base": 374.40},
    {"max": 19200, "rate": 0.068, "base": 681.60},
    {"max": 24000, "rate": 0.072, "base": 1008},
    {"max": 36000, "rate": 0.076, "base": 1353.60},
    {"max": 48000, "rate": 0.079, "base": 2265.60},
    {"max": 150000, "rate": 0.0825, "base": 3213.60},
    {"max": 175000, "rate": 0.09, "base": 11628.60},
    {"max": 200000, "rate": 0.10, "base": 13878.60},
    {"max": null, "rate": 0.11, "base": 16378.60}
  ]'::jsonb,
  null, 'none', '2025-01-01'
) ON CONFLICT (state, tax_year) DO UPDATE SET brackets = EXCLUDED.brackets, standard_deduction = EXCLUDED.standard_deduction;

-- DELAWARE - 7 brackets, 0%-6.6%
-- Source: Delaware Division of Revenue - 2025
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES (
  'DE', 2025, 'brackets', null, 3250, 110, 110, 'per_allowance_amount',
  '[
    {"max": 2000, "rate": 0, "base": 0},
    {"max": 5000, "rate": 0.022, "base": 0},
    {"max": 10000, "rate": 0.039, "base": 66},
    {"max": 20000, "rate": 0.048, "base": 261},
    {"max": 25000, "rate": 0.052, "base": 741},
    {"max": 60000, "rate": 0.0555, "base": 1001},
    {"max": null, "rate": 0.066, "base": 2943.50}
  ]'::jsonb,
  null, 'none', '2025-01-01'
) ON CONFLICT (state, tax_year) DO UPDATE SET brackets = EXCLUDED.brackets, standard_deduction = EXCLUDED.standard_deduction;

-- ARKANSAS - 4 brackets, 2%-4.7% (reduced from 2024)
-- Source: Arkansas Department of Finance and Administration - 2025
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES (
  'AR', 2025, 'brackets', null, 2340, 29, 29, 'per_allowance_amount',
  '[
    {"max": 5099, "rate": 0.02, "base": 0},
    {"max": 10299, "rate": 0.03, "base": 101.98},
    {"max": 14699, "rate": 0.034, "base": 257.98},
    {"max": null, "rate": 0.047, "base": 407.58}
  ]'::jsonb,
  null, 'none', '2025-01-01'
) ON CONFLICT (state, tax_year) DO UPDATE SET brackets = EXCLUDED.brackets, standard_deduction = EXCLUDED.standard_deduction;

-- ALABAMA - 3 brackets, 2%-5% + local tax
-- Source: Alabama Department of Revenue - 2025
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES (
  'AL', 2025, 'brackets', null, 2500, 1500, 500, 'per_allowance_amount',
  '[
    {"max": 500, "rate": 0.02, "base": 0},
    {"max": 3000, "rate": 0.04, "base": 10},
    {"max": null, "rate": 0.05, "base": 110}
  ]'::jsonb,
  null, 'city', '2025-01-01'
) ON CONFLICT (state, tax_year) DO UPDATE SET brackets = EXCLUDED.brackets, standard_deduction = EXCLUDED.standard_deduction;

-- WEST VIRGINIA - 5 brackets, 2.36%-5.12%
-- Source: West Virginia State Tax Department - 2025
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES (
  'WV', 2025, 'brackets', null, 0, 2000, 2000, 'per_allowance_amount',
  '[
    {"max": 10000, "rate": 0.0236, "base": 0},
    {"max": 25000, "rate": 0.0315, "base": 236},
    {"max": 40000, "rate": 0.0354, "base": 708.50},
    {"max": 60000, "rate": 0.0465, "base": 1239.50},
    {"max": null, "rate": 0.0512, "base": 2169.50}
  ]'::jsonb,
  null, 'none', '2025-01-01'
) ON CONFLICT (state, tax_year) DO UPDATE SET brackets = EXCLUDED.brackets;

-- NEBRASKA - 4 brackets, 2.46%-5.84%
-- Source: Nebraska Department of Revenue - 2025
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES (
  'NE', 2025, 'brackets', null, 7700, 151, 151, 'per_allowance_amount',
  '[
    {"max": 3700, "rate": 0.0246, "base": 0},
    {"max": 22170, "rate": 0.0351, "base": 91.02},
    {"max": 35730, "rate": 0.0501, "base": 739.31},
    {"max": null, "rate": 0.0584, "base": 1418.37}
  ]'::jsonb,
  null, 'none', '2025-01-01'
) ON CONFLICT (state, tax_year) DO UPDATE SET brackets = EXCLUDED.brackets, standard_deduction = EXCLUDED.standard_deduction;

-- DISTRICT OF COLUMBIA - 6 brackets, 4%-10.75%
-- Source: DC Office of Tax and Revenue - 2025
INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from)
VALUES (
  'DC', 2025, 'brackets', null, 13850, 0, 0, 'none',
  '[
    {"max": 10000, "rate": 0.04, "base": 0},
    {"max": 40000, "rate": 0.06, "base": 400},
    {"max": 60000, "rate": 0.065, "base": 2200},
    {"max": 250000, "rate": 0.085, "base": 3500},
    {"max": 500000, "rate": 0.0925, "base": 19650},
    {"max": 1000000, "rate": 0.0975, "base": 42775},
    {"max": null, "rate": 0.1075, "base": 91525}
  ]'::jsonb,
  null, 'none', '2025-01-01'
) ON CONFLICT (state, tax_year) DO UPDATE SET brackets = EXCLUDED.brackets, standard_deduction = EXCLUDED.standard_deduction;

COMMENT ON TABLE tax_state_params IS 'Complete 2025 state tax withholding data - ALL 50 STATES + DC - PRODUCTION READY';
