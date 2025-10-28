-- Migration 007: Add tier field to companies table for Section 125 pricing tiers
-- This field determines which pricing structure applies to the company

-- Add tier column to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS tier text DEFAULT '2025'
CHECK (tier IN ('state_school', '2025', 'pre_2025', 'original_6pct'));

-- Add comment explaining the tier values
COMMENT ON COLUMN companies.tier IS 'Pricing tier for Section 125 calculations:
- state_school: State schools (all $1300/month, 6% EE / 0% ER)
- 2025: Standard 2025 clients (S/0=$1300, others=$1700)
- pre_2025: Legacy pre-2025 clients (S/0=$800, S/1+=$1200, M/0=$1200, M/1+=$1600)
- original_6pct: Original 6% clients (S/0=$700, S/1=$1100, M/0=$1500)';

-- Set default tier for existing companies to '2025' (already done by DEFAULT)
-- If you need to manually set specific companies to different tiers, do it here:
-- UPDATE companies SET tier = 'state_school' WHERE name LIKE '%School%';
