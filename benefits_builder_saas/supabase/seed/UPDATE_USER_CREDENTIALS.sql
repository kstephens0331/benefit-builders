-- UPDATE SCRIPT: Update internal user credentials
-- Run this in Supabase SQL Editor to update the 3 users

-- Update User 2: bill
-- Password: Password123!
UPDATE internal_users
SET
  username = 'bill',
  password_hash = 'a109e36947ad56de1dca1cc49f0ef8ac9ad9a7b1aa0df41fb3c4cb73c1ff01ea',
  full_name = 'Bill',
  email = 'Billdawson.bb@gmail.com',
  role = 'user',
  active = true
WHERE username = 'user2@benefitsbuilder.com' OR email = 'user2@benefitsbuilder.com';

-- Update User 3: test
-- Password: test123!
UPDATE internal_users
SET
  username = 'test',
  password_hash = 'e1dddc844ca8ad19718295dbf2f0ed6746b459c2e3582ef8bf909812a24d9fe7',
  full_name = 'Test User',
  email = 'test@benefitsbuilder.com',
  role = 'user',
  active = true
WHERE username = 'user3@benefitsbuilder.com' OR email = 'user3@benefitsbuilder.com';

-- Update User 4: test2
-- Password: test123!
UPDATE internal_users
SET
  username = 'test2',
  password_hash = 'e1dddc844ca8ad19718295dbf2f0ed6746b459c2e3582ef8bf909812a24d9fe7',
  full_name = 'Test User 2',
  email = 'test2@benefitsbuilder.com',
  role = 'viewer',
  active = true
WHERE username = 'user4@benefitsbuilder.com' OR email = 'user4@benefitsbuilder.com';

-- Verify the updates
SELECT username, email, role, active, full_name
FROM internal_users
ORDER BY username;
