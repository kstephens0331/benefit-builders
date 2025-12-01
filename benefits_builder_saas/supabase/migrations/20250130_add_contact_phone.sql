-- Add contact_phone field to companies table
-- This field stores the primary contact's phone number

ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_phone text;

-- Add comment to explain field
COMMENT ON COLUMN companies.contact_phone IS 'Primary contact phone number';
