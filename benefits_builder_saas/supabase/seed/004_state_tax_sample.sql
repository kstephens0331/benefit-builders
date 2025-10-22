-- Sample State Tax Parameters for common states
-- These are examples - you should verify current rates with state tax authorities

-- California (flat brackets method - simplified)
INSERT INTO tax_state_params (
  state, tax_year, method, flat_rate, standard_deduction, personal_exemption,
  dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from
) VALUES (
  'CA', 2025, 'brackets', null, 5363, 151, 436,
  'per_allowance_amount',
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
  null,
  'none',
  '2025-01-01'
)
ON CONFLICT (state, tax_year) DO UPDATE SET
  method = EXCLUDED.method,
  flat_rate = EXCLUDED.flat_rate,
  standard_deduction = EXCLUDED.standard_deduction,
  personal_exemption = EXCLUDED.personal_exemption,
  dependent_exemption = EXCLUDED.dependent_exemption,
  brackets = EXCLUDED.brackets;

-- Texas (no state income tax)
INSERT INTO tax_state_params (
  state, tax_year, method, flat_rate, standard_deduction, personal_exemption,
  dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from
) VALUES (
  'TX', 2025, 'none', null, 0, 0, 0, 'none', null, null, 'none', '2025-01-01'
)
ON CONFLICT (state, tax_year) DO UPDATE SET
  method = EXCLUDED.method;

-- Florida (no state income tax)
INSERT INTO tax_state_params (
  state, tax_year, method, flat_rate, standard_deduction, personal_exemption,
  dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from
) VALUES (
  'FL', 2025, 'none', null, 0, 0, 0, 'none', null, null, 'none', '2025-01-01'
)
ON CONFLICT (state, tax_year) DO UPDATE SET
  method = EXCLUDED.method;

-- Illinois (flat rate)
INSERT INTO tax_state_params (
  state, tax_year, method, flat_rate, standard_deduction, personal_exemption,
  dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from
) VALUES (
  'IL', 2025, 'flat', 0.0495, 0, 2425, 2425, 'per_allowance_amount', null, null, 'none', '2025-01-01'
)
ON CONFLICT (state, tax_year) DO UPDATE SET
  method = EXCLUDED.method,
  flat_rate = EXCLUDED.flat_rate,
  personal_exemption = EXCLUDED.personal_exemption,
  dependent_exemption = EXCLUDED.dependent_exemption;

-- New York (brackets - simplified)
INSERT INTO tax_state_params (
  state, tax_year, method, flat_rate, standard_deduction, personal_exemption,
  dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from
) VALUES (
  'NY', 2025, 'brackets', null, 8000, 0, 1000, 'none',
  '[
    {"max": 8500, "rate": 0.04, "base": 0},
    {"max": 11700, "rate": 0.045, "base": 340},
    {"max": 13900, "rate": 0.0525, "base": 484},
    {"max": 80650, "rate": 0.055, "base": 599.50},
    {"max": 215400, "rate": 0.06, "base": 4270.75},
    {"max": 1077550, "rate": 0.0685, "base": 12355.75},
    {"max": null, "rate": 0.0965, "base": 71412.03}
  ]'::jsonb,
  null,
  'city',
  '2025-01-01'
)
ON CONFLICT (state, tax_year) DO UPDATE SET
  method = EXCLUDED.method,
  standard_deduction = EXCLUDED.standard_deduction,
  dependent_exemption = EXCLUDED.dependent_exemption,
  brackets = EXCLUDED.brackets,
  locality_mode = EXCLUDED.locality_mode;

-- Pennsylvania (flat rate)
INSERT INTO tax_state_params (
  state, tax_year, method, flat_rate, standard_deduction, personal_exemption,
  dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from
) VALUES (
  'PA', 2025, 'flat', 0.0307, 0, 0, 0, 'none', null, null, 'none', '2025-01-01'
)
ON CONFLICT (state, tax_year) DO UPDATE SET
  method = EXCLUDED.method,
  flat_rate = EXCLUDED.flat_rate;

-- Ohio (brackets - simplified)
INSERT INTO tax_state_params (
  state, tax_year, method, flat_rate, standard_deduction, personal_exemption,
  dependent_exemption, allowances_method, brackets, credits, locality_mode, effective_from
) VALUES (
  'OH', 2025, 'brackets', null, 0, 0, 0, 'none',
  '[
    {"max": 26050, "rate": 0.0, "base": 0},
    {"max": 46100, "rate": 0.02765, "base": 0},
    {"max": 92150, "rate": 0.03226, "base": 554.08},
    {"max": 115300, "rate": 0.03688, "base": 2039.69},
    {"max": null, "rate": 0.03990, "base": 2893.21}
  ]'::jsonb,
  null,
  'none',
  '2025-01-01'
)
ON CONFLICT (state, tax_year) DO UPDATE SET
  method = EXCLUDED.method,
  brackets = EXCLUDED.brackets;
