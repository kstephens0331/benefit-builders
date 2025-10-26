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

-- User 2: bill
-- Password: Password123!
-- Hash: SHA-256 of "Password123!"
INSERT INTO internal_users (username, password_hash, full_name, email, role, active)
VALUES (
  'bill',
  'a109e36947ad56de1dca1cc49f0ef8ac9ad9a7b1aa0df41fb3c4cb73c1ff01ea',  -- SHA-256 hash of "Password123!"
  'Bill',
  'Billdawson.bb@gmail.com',
  'admin',
  true
) ON CONFLICT (username) DO NOTHING;

-- User 3: test
-- Password: test123!
-- Hash: SHA-256 of "test123!"
INSERT INTO internal_users (username, password_hash, full_name, email, role, active)
VALUES (
  'test',
  'e1dddc844ca8ad19718295dbf2f0ed6746b459c2e3582ef8bf909812a24d9fe7',  -- SHA-256 hash of "test123!"
  'Test User',
  'test@benefitsbuilder.com',
  'admin',
  true
) ON CONFLICT (username) DO NOTHING;

-- User 4: test2
-- Password: test123!
-- Hash: SHA-256 of "test123!"
INSERT INTO internal_users (username, password_hash, full_name, email, role, active)
VALUES (
  'test2',
  'e1dddc844ca8ad19718295dbf2f0ed6746b459c2e3582ef8bf909812a24d9fe7',  -- SHA-256 hash of "test123!"
  'Test User 2',
  'test2@benefitsbuilder.com',
  'admin',
  true
) ON CONFLICT (username) DO NOTHING;

-- Clean up any expired sessions on startup
DELETE FROM user_sessions WHERE expires_at < now();

COMMENT ON TABLE internal_users IS 'Contains 4 Benefits Builder internal users for system access';
