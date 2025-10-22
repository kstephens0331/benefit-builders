-- Seed 2025 Federal Tax Parameters
INSERT INTO tax_federal_params (tax_year, ss_rate, med_rate, ss_wage_base, addl_medicare_threshold) VALUES
  (2025, 0.062, 0.0145, 176100, 200000)
ON CONFLICT (tax_year) DO UPDATE SET
  ss_rate = EXCLUDED.ss_rate,
  med_rate = EXCLUDED.med_rate,
  ss_wage_base = EXCLUDED.ss_wage_base,
  addl_medicare_threshold = EXCLUDED.addl_medicare_threshold;
