-- Fix: Add 3/4 to company_model_type enum (renamed from 4/3)
-- PostgreSQL enums can have values added but not removed/renamed easily

-- Add the new 3/4 value to the enum
DO $$
BEGIN
  -- Check if the enum type exists
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_model_type') THEN
    -- Add 3/4 if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumtypid = 'company_model_type'::regtype
      AND enumlabel = '3/4'
    ) THEN
      ALTER TYPE company_model_type ADD VALUE '3/4';
    END IF;
  END IF;
END $$;

-- Update any existing companies with 4/3 to 3/4
-- First, temporarily change column to text to allow the update
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_model_type') THEN
    -- Change column type to text temporarily
    ALTER TABLE companies ALTER COLUMN model TYPE text;

    -- Update 4/3 to 3/4
    UPDATE companies SET model = '3/4' WHERE model = '4/3';

    -- Change back to enum (this will validate values)
    ALTER TABLE companies ALTER COLUMN model TYPE company_model_type USING model::company_model_type;
  END IF;
END $$;
