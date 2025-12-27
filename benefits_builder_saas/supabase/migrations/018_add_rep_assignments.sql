-- Add rep assignment functionality for role-based access control
-- Roles: super_admin (full access), admin (full access), rep (assigned companies only)

-- 1. Update internal_users role constraint to include new roles
ALTER TABLE internal_users DROP CONSTRAINT IF EXISTS internal_users_role_check;
ALTER TABLE internal_users ADD CONSTRAINT internal_users_role_check
  CHECK (role IN ('super_admin', 'admin', 'rep', 'user', 'viewer'));

-- 2. Add assigned_rep_id to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS assigned_rep_id UUID REFERENCES internal_users(id) ON DELETE SET NULL;

-- 3. Create index for rep filtering
CREATE INDEX IF NOT EXISTS idx_companies_assigned_rep ON companies(assigned_rep_id);

-- 4. Add comments
COMMENT ON COLUMN companies.assigned_rep_id IS 'Sales rep assigned to this company - used for access control';

-- 5. Update existing system admin to super_admin role
UPDATE internal_users SET role = 'super_admin' WHERE username = 'info@stephenscode.dev';

-- 6. Create Piersen Garrison user account (rep role)
-- Username: piersen@benefitsbuilder.com
-- Password: Natalie! (SHA-256 hashed)
INSERT INTO internal_users (username, password_hash, full_name, email, role, active)
VALUES (
  'piersen@benefitsbuilder.com',
  'd0300c7e7f47a2b90f7b4bb8944846be695ad5a14ea0922e96c49375d2bfafd1',
  'Piersen Garrison',
  'piersen@benefitsbuilder.com',
  'rep',
  true
) ON CONFLICT (username) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  active = EXCLUDED.active;
