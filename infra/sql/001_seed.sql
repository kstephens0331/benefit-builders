-- ========== 001_seed.sql ==========
insert into companies (id, name, state, city, pay_period, employee_fee, employer_fee)
values (gen_random_uuid(), 'ClientCo, Inc.', 'TX', 'Conroe', 'semimonthly', 3.00, 2.00)
returning id \gset;

-- TODO: replace the user_id below with your real auth.users.id after creating a user
insert into company_users (user_id, company_id, role)
values ('00000000-0000-0000-0000-000000000000', :'id', 'admin');
-- ========== /001_seed.sql ==========
