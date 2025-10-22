#!/usr/bin/env node
// Script to initialize and seed the Supabase database using Node.js
// This works without requiring psql to be installed

const fs = require('fs');
const path = require('path');

// You'll need to install: npm install -g pg
const { Client } = require('pg');

async function setup() {
  console.log('🚀 Setting up Benefits Builder database...\n');

  // Get connection string from environment or prompt
  const connectionString = process.env.SUPABASE_DB_URL;

  if (!connectionString) {
    console.error('❌ SUPABASE_DB_URL environment variable not set!');
    console.error('\nPlease set your Supabase connection string:');
    console.error('  Windows: set SUPABASE_DB_URL=postgresql://postgres:[password]@[host]:5432/postgres');
    console.error('  Mac/Linux: export SUPABASE_DB_URL=postgresql://postgres:[password]@[host]:5432/postgres\n');
    console.error('You can find this in your Supabase dashboard under Settings > Database\n');
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Read and execute schema
    console.log('📋 Applying schema...');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schema);
    console.log('✅ Schema applied\n');

    // Read and execute seed files
    const seedFiles = [
      '001_plan_models.sql',
      '002_federal_tax_2025.sql',
      '003_withholding_federal_15t_2025.sql',
      '004_state_tax_sample.sql'
    ];

    for (const file of seedFiles) {
      console.log(`🌱 Seeding: ${file}...`);
      const sql = fs.readFileSync(path.join(__dirname, 'seed', file), 'utf8');
      await client.query(sql);
      console.log(`✅ ${file} complete\n`);
    }

    console.log('============================================');
    console.log('✨ Database setup complete!');
    console.log('============================================\n');
    console.log('Next steps:');
    console.log('1. Run the application: cd apps/web && npm run dev');
    console.log('2. Visit http://localhost:3002');
    console.log('3. Add companies and employees through the UI');
    console.log('4. Configure additional state tax parameters at /admin/tax\n');

  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setup();
