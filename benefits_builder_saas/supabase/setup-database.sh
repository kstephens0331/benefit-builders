#!/bin/bash
# Script to initialize and seed the Supabase database
# This script applies the schema and seed data to your Supabase instance

set -e  # Exit on error

echo "🚀 Setting up Benefits Builder database..."

# Check if required environment variables are set
if [ -z "$SUPABASE_DB_URL" ]; then
  echo "⚠️  SUPABASE_DB_URL not set. Please provide your Supabase PostgreSQL connection string."
  echo "You can find this in your Supabase dashboard under Settings > Database"
  echo ""
  echo "Example:"
  echo "  export SUPABASE_DB_URL='postgresql://postgres:[password]@[host]:5432/postgres'"
  echo ""
  exit 1
fi

echo "📋 Applying schema..."
psql "$SUPABASE_DB_URL" -f schema.sql

echo "🌱 Seeding data..."
psql "$SUPABASE_DB_URL" -f seed/001_plan_models.sql
psql "$SUPABASE_DB_URL" -f seed/002_federal_tax_2025.sql
psql "$SUPABASE_DB_URL" -f seed/003_withholding_federal_15t_2025.sql
psql "$SUPABASE_DB_URL" -f seed/004_state_tax_sample.sql

echo "✅ Database setup complete!"
echo ""
echo "Next steps:"
echo "1. Run the application: cd apps/web && npm run dev"
echo "2. Visit http://localhost:3002"
echo "3. Add companies and employees through the UI"
echo "4. Configure additional state tax parameters at /admin/tax"
