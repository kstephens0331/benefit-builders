-- Add address, city, zip, and contact_name fields to companies table
-- These fields are used to store company location and primary contact information

ALTER TABLE companies ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS zip text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_name text;

-- Add comment to explain fields
COMMENT ON COLUMN companies.address IS 'Street address of the company';
COMMENT ON COLUMN companies.city IS 'City where the company is located';
COMMENT ON COLUMN companies.zip IS 'ZIP/Postal code';
COMMENT ON COLUMN companies.contact_name IS 'Primary point of contact name';
