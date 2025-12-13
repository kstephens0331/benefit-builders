-- State Tax Rates for 2026
-- Source: Various state tax authorities and IRS guidelines
-- Note: Standard deductions and brackets adjusted for ~2.7% inflation where applicable
-- Missouri updated to 4.7% flat rate per HB 798
-- Federal standard deductions: Single $16,100, Married $32,200, Head $24,150

INSERT INTO tax_state_params (state, tax_year, method, flat_rate, standard_deduction, personal_exemption, dependent_exemption, brackets, effective_from)
VALUES
-- States with NO income tax
('AK', 2026, 'none', NULL, 0, 0, 0, NULL, '2026-01-01'),
('FL', 2026, 'none', NULL, 0, 0, 0, NULL, '2026-01-01'),
('NV', 2026, 'none', NULL, 0, 0, 0, NULL, '2026-01-01'),
('NH', 2026, 'none', NULL, 0, 0, 0, NULL, '2026-01-01'), -- Only taxes interest/dividends
('SD', 2026, 'none', NULL, 0, 0, 0, NULL, '2026-01-01'),
('TN', 2026, 'none', NULL, 0, 0, 0, NULL, '2026-01-01'), -- Phased out income tax
('TX', 2026, 'none', NULL, 0, 0, 0, NULL, '2026-01-01'),
('WA', 2026, 'none', NULL, 0, 0, 0, NULL, '2026-01-01'),
('WY', 2026, 'none', NULL, 0, 0, 0, NULL, '2026-01-01'),

-- States with FLAT tax rates (updated for 2026)
('AZ', 2026, 'flat', 0.025, 16100, 0, 0, NULL, '2026-01-01'),  -- 2.5% flat rate, federal std deduction
('CO', 2026, 'flat', 0.044, 0, 0, 0, NULL, '2026-01-01'),      -- 4.4% flat rate
('IL', 2026, 'flat', 0.0495, 0, 2700, 2700, NULL, '2026-01-01'), -- 4.95% flat rate
('IN', 2026, 'flat', 0.0305, 0, 1030, 1030, NULL, '2026-01-01'), -- 3.05% flat rate
('KY', 2026, 'flat', 0.04, 3250, 0, 0, NULL, '2026-01-01'),    -- 4% flat rate
('MA', 2026, 'flat', 0.05, 0, 4520, 1030, NULL, '2026-01-01'), -- 5% flat rate (9% surtax on income over $1M)
('MI', 2026, 'flat', 0.0405, 0, 5750, 5750, NULL, '2026-01-01'), -- 4.05% flat rate
('NC', 2026, 'flat', 0.0475, 16100, 0, 0, NULL, '2026-01-01'), -- 4.75% flat rate, federal std deduction
('PA', 2026, 'flat', 0.0307, 0, 0, 0, NULL, '2026-01-01'),     -- 3.07% flat rate
('UT', 2026, 'flat', 0.0465, 0, 0, 0, NULL, '2026-01-01'),     -- 4.65% flat rate

-- States with BRACKET/Progressive tax rates (adjusted for 2026)

('AL', 2026, 'brackets', NULL, 3080, 1540, 515, '[{"over":0,"rate":0.02},{"over":515,"rate":0.04},{"over":3080,"rate":0.05}]', '2026-01-01'),
('AR', 2026, 'brackets', NULL, 2400, 30, 30, '[{"over":0,"rate":0.02},{"over":5240,"rate":0.04},{"over":10580,"rate":0.044}]', '2026-01-01'),
('CA', 2026, 'brackets', NULL, 5690, 148, 458, '[{"over":0,"rate":0.01},{"over":10700,"rate":0.02},{"over":25350,"rate":0.04},{"over":40020,"rate":0.06},{"over":55540,"rate":0.08},{"over":70200,"rate":0.093},{"over":358570,"rate":0.103},{"over":430270,"rate":0.113},{"over":717120,"rate":0.123}]', '2026-01-01'),
('CT', 2026, 'brackets', NULL, 0, 15400, 0, '[{"over":0,"rate":0.02},{"over":10270,"rate":0.045},{"over":51350,"rate":0.055},{"over":102700,"rate":0.06},{"over":205400,"rate":0.065},{"over":256750,"rate":0.069},{"over":513500,"rate":0.0699}]', '2026-01-01'),
('DE', 2026, 'brackets', NULL, 3340, 113, 113, '[{"over":2055,"rate":0.022},{"over":5135,"rate":0.039},{"over":10270,"rate":0.048},{"over":20540,"rate":0.052},{"over":25675,"rate":0.0555},{"over":61620,"rate":0.066}]', '2026-01-01'),
('GA', 2026, 'flat', 0.0539, 16100, 0, 0, NULL, '2026-01-01'), -- GA reducing to 5.39% for 2026
('HI', 2026, 'brackets', NULL, 4520, 1175, 1175, '[{"over":0,"rate":0.014},{"over":2465,"rate":0.032},{"over":4930,"rate":0.055},{"over":9860,"rate":0.064},{"over":14790,"rate":0.068},{"over":19720,"rate":0.072},{"over":24650,"rate":0.076},{"over":36975,"rate":0.079},{"over":49300,"rate":0.0825},{"over":154050,"rate":0.09},{"over":179725,"rate":0.10},{"over":205400,"rate":0.11}]', '2026-01-01'),
('ID', 2026, 'flat', 0.058, 16100, 0, 0, NULL, '2026-01-01'), -- ID 5.8% flat
('IA', 2026, 'flat', 0.038, 0, 41, 41, NULL, '2026-01-01'), -- IA 3.8% flat
('KS', 2026, 'brackets', NULL, 3595, 2310, 2310, '[{"over":0,"rate":0.031},{"over":15400,"rate":0.0525},{"over":30810,"rate":0.057}]', '2026-01-01'),
('LA', 2026, 'brackets', NULL, 0, 4620, 1030, '[{"over":0,"rate":0.0185},{"over":12840,"rate":0.035},{"over":51350,"rate":0.0425}]', '2026-01-01'),
('ME', 2026, 'brackets', NULL, 16100, 0, 0, '[{"over":0,"rate":0.058},{"over":26750,"rate":0.0675},{"over":63265,"rate":0.0715}]', '2026-01-01'),
('MD', 2026, 'brackets', NULL, 2620, 3290, 3290, '[{"over":0,"rate":0.02},{"over":1030,"rate":0.03},{"over":2055,"rate":0.04},{"over":3080,"rate":0.0475},{"over":102700,"rate":0.05},{"over":128375,"rate":0.0525},{"over":154050,"rate":0.055},{"over":256750,"rate":0.0575}]', '2026-01-01'),
('MN', 2026, 'brackets', NULL, 14970, 0, 0, '[{"over":0,"rate":0.0535},{"over":32545,"rate":0.068},{"over":106900,"rate":0.0785},{"over":188290,"rate":0.0985}]', '2026-01-01'),
('MS', 2026, 'flat', 0.047, 2360, 6160, 1540, NULL, '2026-01-01'), -- MS 4.7% flat

-- MISSOURI - Updated to 4.7% flat rate per HB 798 for 2026
('MO', 2026, 'flat', 0.047, 16100, 0, 0, NULL, '2026-01-01'),

('MT', 2026, 'brackets', NULL, 5885, 3290, 3290, '[{"over":0,"rate":0.01},{"over":3700,"rate":0.02},{"over":6680,"rate":0.03},{"over":10375,"rate":0.04},{"over":14070,"rate":0.05},{"over":18075,"rate":0.06},{"over":23315,"rate":0.065}]', '2026-01-01'),
('NE', 2026, 'brackets', NULL, 0, 161, 161, '[{"over":0,"rate":0.0246},{"over":3800,"rate":0.0351},{"over":22770,"rate":0.0501},{"over":36700,"rate":0.0584}]', '2026-01-01'),
('NJ', 2026, 'brackets', NULL, 0, 1030, 1540, '[{"over":0,"rate":0.014},{"over":20540,"rate":0.0175},{"over":35945,"rate":0.035},{"over":41080,"rate":0.05525},{"over":77025,"rate":0.0637},{"over":513500,"rate":0.0897},{"over":1027000,"rate":0.1075}]', '2026-01-01'),
('NM', 2026, 'brackets', NULL, 16100, 0, 0, '[{"over":0,"rate":0.017},{"over":5650,"rate":0.032},{"over":11300,"rate":0.047},{"over":16430,"rate":0.049},{"over":215700,"rate":0.059}]', '2026-01-01'),
('NY', 2026, 'brackets', NULL, 8730, 0, 0, '[{"over":0,"rate":0.04},{"over":8730,"rate":0.045},{"over":12015,"rate":0.0525},{"over":14275,"rate":0.055},{"over":82830,"rate":0.06},{"over":221215,"rate":0.0685},{"over":1106665,"rate":0.0965},{"over":5135000,"rate":0.103},{"over":25675000,"rate":0.109}]', '2026-01-01'),
('ND', 2026, 'flat', 0.019, 0, 0, 0, NULL, '2026-01-01'), -- ND 1.9% flat
('OH', 2026, 'flat', 0.035, 0, 0, 0, NULL, '2026-01-01'), -- OH 3.5% flat
('OK', 2026, 'brackets', NULL, 6520, 1030, 1030, '[{"over":0,"rate":0.0025},{"over":1030,"rate":0.0075},{"over":2570,"rate":0.0175},{"over":3850,"rate":0.0275},{"over":5035,"rate":0.0375},{"over":7395,"rate":0.0475}]', '2026-01-01'),
('OR', 2026, 'brackets', NULL, 2820, 242, 242, '[{"over":0,"rate":0.0475},{"over":4415,"rate":0.0675},{"over":11040,"rate":0.0875},{"over":128375,"rate":0.099}]', '2026-01-01'),
('RI', 2026, 'brackets', NULL, 10835, 4980, 0, '[{"over":0,"rate":0.0375},{"over":79540,"rate":0.0475},{"over":180820,"rate":0.0599}]', '2026-01-01'),
('SC', 2026, 'brackets', NULL, 16100, 0, 0, '[{"over":0,"rate":0.0},{"over":3555,"rate":0.03},{"over":17800,"rate":0.064}]', '2026-01-01'),
('VT', 2026, 'brackets', NULL, 7395, 4980, 4980, '[{"over":0,"rate":0.0335},{"over":46625,"rate":0.066},{"over":113025,"rate":0.076},{"over":235755,"rate":0.0875}]', '2026-01-01'),
('VA', 2026, 'brackets', NULL, 4620, 955, 955, '[{"over":0,"rate":0.02},{"over":3080,"rate":0.03},{"over":5135,"rate":0.05},{"over":17460,"rate":0.0575}]', '2026-01-01'),
('WV', 2026, 'brackets', NULL, 0, 2055, 2055, '[{"over":0,"rate":0.0236},{"over":10270,"rate":0.0315},{"over":25675,"rate":0.0354},{"over":41080,"rate":0.0472},{"over":61620,"rate":0.0512}]', '2026-01-01'),
('WI', 2026, 'brackets', NULL, 13590, 720, 720, '[{"over":0,"rate":0.0354},{"over":14705,"rate":0.0465},{"over":29410,"rate":0.0530},{"over":323820,"rate":0.0765}]', '2026-01-01'),
('DC', 2026, 'brackets', NULL, 16100, 0, 0, '[{"over":0,"rate":0.04},{"over":10270,"rate":0.06},{"over":41080,"rate":0.065},{"over":61620,"rate":0.085},{"over":256750,"rate":0.0925},{"over":513500,"rate":0.0975},{"over":1027000,"rate":0.1075}]', '2026-01-01')

ON CONFLICT (state, tax_year) DO UPDATE SET
  method = EXCLUDED.method,
  flat_rate = EXCLUDED.flat_rate,
  standard_deduction = EXCLUDED.standard_deduction,
  personal_exemption = EXCLUDED.personal_exemption,
  dependent_exemption = EXCLUDED.dependent_exemption,
  brackets = EXCLUDED.brackets,
  effective_from = EXCLUDED.effective_from;
