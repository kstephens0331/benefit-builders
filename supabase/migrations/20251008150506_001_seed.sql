-- === 001_seed.sql ===
with inserted as (
  insert into companies (id, name, state, city, pay_period, employee_fee, employer_fee)
  values (gen_random_uuid(), 'ClientCo, Inc.', 'TX', 'Conroe', 'semimonthly', 3.00, 2.00)
  returning id
)
insert into company_users (user_id, company_id, role)
select '00000000-0000-0000-0000-000000000000'::uuid, inserted.id, 'admin'
from inserted;
-- Replace the user_id above with your real auth.users.id later.

