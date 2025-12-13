-- Federal Tax Parameters for 2026
-- Source: IRS, Social Security Administration
-- SS Wage Base: $184,500 (increased from $176,100 in 2025)
-- FICA rates unchanged: 6.2% SS + 1.45% Medicare = 7.65%

INSERT INTO tax_federal_params (tax_year, ss_rate, med_rate, ss_wage_base, addl_medicare_threshold)
VALUES (2026, 0.0620, 0.0145, 184500, 200000)
ON CONFLICT (tax_year) DO UPDATE SET
  ss_rate = EXCLUDED.ss_rate,
  med_rate = EXCLUDED.med_rate,
  ss_wage_base = EXCLUDED.ss_wage_base,
  addl_medicare_threshold = EXCLUDED.addl_medicare_threshold;
