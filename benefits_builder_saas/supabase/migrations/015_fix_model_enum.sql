-- Fix: Convert model column from enum to text with check constraint
-- This allows easier management of model values

-- Step 1: Drop the enum type constraint by converting to text
ALTER TABLE companies ALTER COLUMN model TYPE text;

-- Step 2: Update any 4/3 values to 3/4
UPDATE companies SET model = '3/4' WHERE model = '4/3';

-- Step 3: Add a check constraint for valid model values
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_model_check;
ALTER TABLE companies ADD CONSTRAINT companies_model_check
  CHECK (model IN ('5/3', '3/4', '5/1', '5/0', '4/4', '6/0', '1/5'));

-- Step 4: Drop the old enum type if it exists
DROP TYPE IF EXISTS company_model_type;
