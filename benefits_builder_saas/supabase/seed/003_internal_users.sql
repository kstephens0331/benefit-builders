-- Seed Internal Users
-- Creates 4 internal Benefits Builder user accounts

-- User 1: info@stephenscode.dev (CONFIRMED)
-- Password: 78410889Ks!
-- Hash: SHA-256 of "78410889Ks!"
INSERT INTO internal_users (username, password_hash, full_name, email, role, active)
VALUES (
  'info@stephenscode.dev',
  'b9577976c7d8a6fb69809892aa8efbda4e6eb60882ad99640580ad7960d752e3',  -- SHA-256 hash of "78410889Ks!"
  'System Administrator',
  'info@stephenscode.dev',
  'admin',
  true
) ON CONFLICT (username) DO NOTHING;

-- User 2: Placeholder (awaiting credentials from Bill)
INSERT INTO internal_users (username, password_hash, full_name, email, role, active)
VALUES (
  'user2@benefitsbuilder.com',
  'placeholder_hash_2',
  'User 2 - Awaiting Setup',
  'user2@benefitsbuilder.com',
  'user',
  false  -- Disabled until credentials provided
) ON CONFLICT (username) DO NOTHING;

-- User 3: Placeholder (awaiting credentials from Bill)
INSERT INTO internal_users (username, password_hash, full_name, email, role, active)
VALUES (
  'user3@benefitsbuilder.com',
  'placeholder_hash_3',
  'User 3 - Awaiting Setup',
  'user3@benefitsbuilder.com',
  'user',
  false  -- Disabled until credentials provided
) ON CONFLICT (username) DO NOTHING;

-- User 4: Placeholder (awaiting credentials from Bill)
INSERT INTO internal_users (username, password_hash, full_name, email, role, active)
VALUES (
  'user4@benefitsbuilder.com',
  'placeholder_hash_4',
  'User 4 - Awaiting Setup',
  'user4@benefitsbuilder.com',
  'viewer',
  false  -- Disabled until credentials provided
) ON CONFLICT (username) DO NOTHING;

-- Clean up any expired sessions on startup
DELETE FROM user_sessions WHERE expires_at < now();

COMMENT ON TABLE internal_users IS 'Contains 4 Benefits Builder internal users for system access';
