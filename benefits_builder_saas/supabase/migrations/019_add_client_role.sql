-- Add client role for company owners/executives
-- Clients can only see their ONE assigned company and add/remove employees

-- 1. Update internal_users role constraint to include client role
ALTER TABLE internal_users DROP CONSTRAINT IF EXISTS internal_users_role_check;
ALTER TABLE internal_users ADD CONSTRAINT internal_users_role_check
  CHECK (role IN ('super_admin', 'admin', 'rep', 'client', 'user', 'viewer'));

-- 2. Add assigned_company_id to internal_users for client role
-- This links a client user to their single company
ALTER TABLE internal_users ADD COLUMN IF NOT EXISTS assigned_company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- 3. Create index for client company filtering
CREATE INDEX IF NOT EXISTS idx_internal_users_assigned_company ON internal_users(assigned_company_id);

-- 4. Add comments
COMMENT ON COLUMN internal_users.assigned_company_id IS 'For client role only - the single company this client user can access';
