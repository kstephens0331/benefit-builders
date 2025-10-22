-- Seed plan models (billing models)
INSERT INTO plan_models (id, name, employee_cap_pct, employer_cap_pct) VALUES
  ('5_3', '5/3', 0.0500, 0.0300),
  ('4_3', '4/3', 0.0400, 0.0300),
  ('5_1', '5/1', 0.0500, 0.0100),
  ('4_4', '4/4', 0.0400, 0.0400)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  employee_cap_pct = EXCLUDED.employee_cap_pct,
  employer_cap_pct = EXCLUDED.employer_cap_pct;
