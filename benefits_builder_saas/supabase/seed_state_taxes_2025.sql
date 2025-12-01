-- State Tax Rates for 2025
-- Source: Various state tax authorities and IRS guidelines
-- Note: These are simplified rates. Some states have complex bracket systems.

INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, brackets, effective_from)
VALUES
-- States with NO income tax
('AK', 2025, 'none', NULL, 0, 0, 0, NULL, '2025-01-01'),
('FL', 2025, 'none', NULL, 0, 0, 0, NULL, '2025-01-01'),
('NV', 2025, 'none', NULL, 0, 0, 0, NULL, '2025-01-01'),
('NH', 2025, 'none', NULL, 0, 0, 0, NULL, '2025-01-01'), -- Only taxes interest/dividends
('SD', 2025, 'none', NULL, 0, 0, 0, NULL, '2025-01-01'),
('TN', 2025, 'none', NULL, 0, 0, 0, NULL, '2025-01-01'), -- Phased out income tax
('TX', 2025, 'none', NULL, 0, 0, 0, NULL, '2025-01-01'),
('WA', 2025, 'none', NULL, 0, 0, 0, NULL, '2025-01-01'),
('WY', 2025, 'none', NULL, 0, 0, 0, NULL, '2025-01-01'),

-- States with FLAT tax rates
('AZ', 2025, 'flat', 0.025, 14600, 0, 0, NULL, '2025-01-01'),  -- 2.5% flat rate
('CO', 2025, 'flat', 0.044, 0, 0, 0, NULL, '2025-01-01'),      -- 4.4% flat rate
('IL', 2025, 'flat', 0.0495, 0, 2625, 2625, NULL, '2025-01-01'), -- 4.95% flat rate
('IN', 2025, 'flat', 0.0305, 0, 1000, 1000, NULL, '2025-01-01'), -- 3.05% flat rate
('KY', 2025, 'flat', 0.04, 3160, 0, 0, NULL, '2025-01-01'),    -- 4% flat rate
('MA', 2025, 'flat', 0.05, 0, 4400, 1000, NULL, '2025-01-01'), -- 5% flat rate (9% surtax on income over $1M)
('MI', 2025, 'flat', 0.0405, 0, 5600, 5600, NULL, '2025-01-01'), -- 4.05% flat rate
('NC', 2025, 'flat', 0.0475, 14600, 0, 0, NULL, '2025-01-01'), -- 4.75% flat rate
('PA', 2025, 'flat', 0.0307, 0, 0, 0, NULL, '2025-01-01'),     -- 3.07% flat rate
('UT', 2025, 'flat', 0.0465, 0, 0, 0, NULL, '2025-01-01'),     -- 4.65% flat rate

-- States with BRACKET/Progressive tax rates (simplified - using approximate effective rates for common income ranges)
-- Note: These are approximations. Real implementation would need full bracket tables.

('AL', 2025, 'brackets', NULL, 3000, 1500, 500, '[{"over":0,"rate":0.02},{"over":500,"rate":0.04},{"over":3000,"rate":0.05}]', '2025-01-01'),
('AR', 2025, 'brackets', NULL, 2340, 29, 29, '[{"over":0,"rate":0.02},{"over":5099,"rate":0.04},{"over":10299,"rate":0.044}]', '2025-01-01'),
('CA', 2025, 'brackets', NULL, 5540, 144, 446, '[{"over":0,"rate":0.01},{"over":10412,"rate":0.02},{"over":24684,"rate":0.04},{"over":38959,"rate":0.06},{"over":54081,"rate":0.08},{"over":68350,"rate":0.093},{"over":349137,"rate":0.103},{"over":418961,"rate":0.113},{"over":698271,"rate":0.123}]', '2025-01-01'),
('CT', 2025, 'brackets', NULL, 0, 15000, 0, '[{"over":0,"rate":0.02},{"over":10000,"rate":0.045},{"over":50000,"rate":0.055},{"over":100000,"rate":0.06},{"over":200000,"rate":0.065},{"over":250000,"rate":0.069},{"over":500000,"rate":0.0699}]', '2025-01-01'),
('DE', 2025, 'brackets', NULL, 3250, 110, 110, '[{"over":2000,"rate":0.022},{"over":5000,"rate":0.039},{"over":10000,"rate":0.048},{"over":20000,"rate":0.052},{"over":25000,"rate":0.0555},{"over":60000,"rate":0.066}]', '2025-01-01'),
('GA', 2025, 'flat', 0.0549, 14600, 0, 0, NULL, '2025-01-01'), -- GA moved to flat 5.49% in 2024
('HI', 2025, 'brackets', NULL, 4400, 1144, 1144, '[{"over":0,"rate":0.014},{"over":2400,"rate":0.032},{"over":4800,"rate":0.055},{"over":9600,"rate":0.064},{"over":14400,"rate":0.068},{"over":19200,"rate":0.072},{"over":24000,"rate":0.076},{"over":36000,"rate":0.079},{"over":48000,"rate":0.0825},{"over":150000,"rate":0.09},{"over":175000,"rate":0.10},{"over":200000,"rate":0.11}]', '2025-01-01'),
('ID', 2025, 'flat', 0.058, 14600, 0, 0, NULL, '2025-01-01'), -- ID moved to 5.8% flat in 2023
('IA', 2025, 'flat', 0.038, 0, 40, 40, NULL, '2025-01-01'), -- IA moving to 3.8% flat
('KS', 2025, 'brackets', NULL, 3500, 2250, 2250, '[{"over":0,"rate":0.031},{"over":15000,"rate":0.0525},{"over":30000,"rate":0.057}]', '2025-01-01'),
('LA', 2025, 'brackets', NULL, 0, 4500, 1000, '[{"over":0,"rate":0.0185},{"over":12500,"rate":0.035},{"over":50000,"rate":0.0425}]', '2025-01-01'),
('ME', 2025, 'brackets', NULL, 14600, 0, 0, '[{"over":0,"rate":0.058},{"over":26050,"rate":0.0675},{"over":61600,"rate":0.0715}]', '2025-01-01'),
('MD', 2025, 'brackets', NULL, 2550, 3200, 3200, '[{"over":0,"rate":0.02},{"over":1000,"rate":0.03},{"over":2000,"rate":0.04},{"over":3000,"rate":0.0475},{"over":100000,"rate":0.05},{"over":125000,"rate":0.0525},{"over":150000,"rate":0.055},{"over":250000,"rate":0.0575}]', '2025-01-01'),
('MN', 2025, 'brackets', NULL, 14575, 0, 0, '[{"over":0,"rate":0.0535},{"over":31690,"rate":0.068},{"over":104090,"rate":0.0785},{"over":183340,"rate":0.0985}]', '2025-01-01'),
('MS', 2025, 'flat', 0.047, 2300, 6000, 1500, NULL, '2025-01-01'), -- MS moving to 4.7% flat
('MO', 2025, 'brackets', NULL, 14600, 0, 0, '[{"over":0,"rate":0.0},{"over":1207,"rate":0.02},{"over":2414,"rate":0.025},{"over":3621,"rate":0.03},{"over":4828,"rate":0.035},{"over":6035,"rate":0.04},{"over":7242,"rate":0.045},{"over":8449,"rate":0.048}]', '2025-01-01'),
('MT', 2025, 'brackets', NULL, 5730, 3200, 3200, '[{"over":0,"rate":0.01},{"over":3600,"rate":0.02},{"over":6500,"rate":0.03},{"over":10100,"rate":0.04},{"over":13700,"rate":0.05},{"over":17600,"rate":0.06},{"over":22700,"rate":0.065}]', '2025-01-01'),
('NE', 2025, 'brackets', NULL, 0, 157, 157, '[{"over":0,"rate":0.0246},{"over":3700,"rate":0.0351},{"over":22170,"rate":0.0501},{"over":35730,"rate":0.0584}]', '2025-01-01'),
('NJ', 2025, 'brackets', NULL, 0, 1000, 1500, '[{"over":0,"rate":0.014},{"over":20000,"rate":0.0175},{"over":35000,"rate":0.035},{"over":40000,"rate":0.05525},{"over":75000,"rate":0.0637},{"over":500000,"rate":0.0897},{"over":1000000,"rate":0.1075}]', '2025-01-01'),
('NM', 2025, 'brackets', NULL, 14600, 0, 0, '[{"over":0,"rate":0.017},{"over":5500,"rate":0.032},{"over":11000,"rate":0.047},{"over":16000,"rate":0.049},{"over":210000,"rate":0.059}]', '2025-01-01'),
('NY', 2025, 'brackets', NULL, 8500, 0, 0, '[{"over":0,"rate":0.04},{"over":8500,"rate":0.045},{"over":11700,"rate":0.0525},{"over":13900,"rate":0.055},{"over":80650,"rate":0.06},{"over":215400,"rate":0.0685},{"over":1077550,"rate":0.0965},{"over":5000000,"rate":0.103},{"over":25000000,"rate":0.109}]', '2025-01-01'),
('ND', 2025, 'flat', 0.019, 0, 0, 0, NULL, '2025-01-01'), -- ND effectively flat at 1.9% max
('OH', 2025, 'flat', 0.035, 0, 0, 0, NULL, '2025-01-01'), -- OH simplified to near-flat 3.5% max
('OK', 2025, 'brackets', NULL, 6350, 1000, 1000, '[{"over":0,"rate":0.0025},{"over":1000,"rate":0.0075},{"over":2500,"rate":0.0175},{"over":3750,"rate":0.0275},{"over":4900,"rate":0.0375},{"over":7200,"rate":0.0475}]', '2025-01-01'),
('OR', 2025, 'brackets', NULL, 2745, 236, 236, '[{"over":0,"rate":0.0475},{"over":4300,"rate":0.0675},{"over":10750,"rate":0.0875},{"over":125000,"rate":0.099}]', '2025-01-01'),
('RI', 2025, 'brackets', NULL, 10550, 4850, 0, '[{"over":0,"rate":0.0375},{"over":77450,"rate":0.0475},{"over":176050,"rate":0.0599}]', '2025-01-01'),
('SC', 2025, 'brackets', NULL, 14600, 0, 0, '[{"over":0,"rate":0.0},{"over":3460,"rate":0.03},{"over":17330,"rate":0.064}]', '2025-01-01'),
('VT', 2025, 'brackets', NULL, 7200, 4850, 4850, '[{"over":0,"rate":0.0335},{"over":45400,"rate":0.066},{"over":110050,"rate":0.076},{"over":229550,"rate":0.0875}]', '2025-01-01'),
('VA', 2025, 'brackets', NULL, 4500, 930, 930, '[{"over":0,"rate":0.02},{"over":3000,"rate":0.03},{"over":5000,"rate":0.05},{"over":17000,"rate":0.0575}]', '2025-01-01'),
('WV', 2025, 'brackets', NULL, 0, 2000, 2000, '[{"over":0,"rate":0.0236},{"over":10000,"rate":0.0315},{"over":25000,"rate":0.0354},{"over":40000,"rate":0.0472},{"over":60000,"rate":0.0512}]', '2025-01-01'),
('WI', 2025, 'brackets', NULL, 13230, 700, 700, '[{"over":0,"rate":0.0354},{"over":14320,"rate":0.0465},{"over":28640,"rate":0.0530},{"over":315310,"rate":0.0765}]', '2025-01-01'),
('DC', 2025, 'brackets', NULL, 14600, 0, 0, '[{"over":0,"rate":0.04},{"over":10000,"rate":0.06},{"over":40000,"rate":0.065},{"over":60000,"rate":0.085},{"over":250000,"rate":0.0925},{"over":500000,"rate":0.0975},{"over":1000000,"rate":0.1075}]', '2025-01-01')

ON CONFLICT (state, tax_year) DO UPDATE SET
  method = EXCLUDED.method,
  flat_rate = EXCLUDED.flat_rate,
  standard_deduction = EXCLUDED.standard_deduction,
  personal_exemption = EXCLUDED.personal_exemption,
  dependent_exemption = EXCLUDED.dependent_exemption,
  brackets = EXCLUDED.brackets,
  effective_from = EXCLUDED.effective_from;

-- Also add federal tax params for 2025 if not exists
INSERT INTO tax_federal_params (tax_year, ss_rate, med_rate, ss_wage_base, addl_medicare_threshold)
VALUES (2025, 0.0620, 0.0145, 176100, 200000)
ON CONFLICT (tax_year) DO UPDATE SET
  ss_rate = EXCLUDED.ss_rate,
  med_rate = EXCLUDED.med_rate,
  ss_wage_base = EXCLUDED.ss_wage_base,
  addl_medicare_threshold = EXCLUDED.addl_medicare_threshold;
