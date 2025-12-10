-- Seed plan models (billing models)
-- IMPORTANT: Model format is EMPLOYEE/EMPLOYER
-- Example: "5/3" means Employee pays 5%, Employer pays 3%
INSERT INTO plan_models (id, name, employee_cap_pct, employer_cap_pct) VALUES
  ('5_3', '5/3', 0.0500, 0.0300),  -- Employee 5%, Employer 3%
  ('3_4', '3/4', 0.0300, 0.0400),  -- Employee 3%, Employer 4%
  ('5_1', '5/1', 0.0500, 0.0100),  -- Employee 5%, Employer 1%
  ('4_4', '4/4', 0.0400, 0.0400)   -- Employee 4%, Employer 4%
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  employee_cap_pct = EXCLUDED.employee_cap_pct,
  employer_cap_pct = EXCLUDED.employer_cap_pct;
