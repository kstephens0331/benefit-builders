// Script to initialize database with seed data using Supabase client
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = path.join(__dirname, '..', '.env.local');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      process.env[key] = value;
    }
  });
}

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Make sure .env.local exists with these variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedPlanModels() {
  console.log('🌱 Seeding plan models...');

  const { error } = await supabase.from('plan_models').upsert([
    { id: '5_3', name: '5/3', employee_cap_pct: 0.0500, employer_cap_pct: 0.0300 },
    { id: '4_3', name: '4/3', employee_cap_pct: 0.0400, employer_cap_pct: 0.0300 },
    { id: '5_1', name: '5/1', employee_cap_pct: 0.0500, employer_cap_pct: 0.0100 },
    { id: '4_4', name: '4/4', employee_cap_pct: 0.0400, employer_cap_pct: 0.0400 },
  ], { onConflict: 'id' });

  if (error) {
    console.error('❌ Error seeding plan models:', error);
    throw error;
  }
  console.log('✅ Plan models seeded\n');
}

async function seedFederalTax() {
  console.log('🌱 Seeding federal tax parameters...');

  const { error } = await supabase.from('tax_federal_params').upsert([
    {
      tax_year: 2025,
      ss_rate: 0.062,
      med_rate: 0.0145,
      ss_wage_base: 176100,
      addl_medicare_threshold: 200000
    }
  ], { onConflict: 'tax_year' });

  if (error) {
    console.error('❌ Error seeding federal tax:', error);
    throw error;
  }
  console.log('✅ Federal tax parameters seeded\n');
}

async function seedWithholdingTables() {
  console.log('🌱 Seeding withholding tables...');

  const brackets2025 = {
    single: {
      standard_deduction: 14600,
      brackets: [
        { max: 11925, rate: 0.10, base: 0 },
        { max: 48475, rate: 0.12, base: 1192.50 },
        { max: 103350, rate: 0.22, base: 5578.50 },
        { max: 197300, rate: 0.24, base: 17651.00 },
        { max: 250525, rate: 0.32, base: 40219.00 },
        { max: 626350, rate: 0.35, base: 57271.00 },
        { max: null, rate: 0.37, base: 188925.25 }
      ]
    },
    married: {
      standard_deduction: 29200,
      brackets: [
        { max: 23850, rate: 0.10, base: 0 },
        { max: 96950, rate: 0.12, base: 2385.00 },
        { max: 206700, rate: 0.22, base: 11157.00 },
        { max: 394600, rate: 0.24, base: 35302.00 },
        { max: 501050, rate: 0.32, base: 80438.00 },
        { max: 751600, rate: 0.35, base: 114542.00 },
        { max: null, rate: 0.37, base: 202234.50 }
      ]
    },
    head: {
      standard_deduction: 21900,
      brackets: [
        { max: 17000, rate: 0.10, base: 0 },
        { max: 64850, rate: 0.12, base: 1700.00 },
        { max: 103350, rate: 0.22, base: 7442.00 },
        { max: 197300, rate: 0.24, base: 15912.00 },
        { max: 250500, rate: 0.32, base: 38460.00 },
        { max: 626350, rate: 0.35, base: 55484.00 },
        { max: null, rate: 0.37, base: 186971.50 }
      ]
    }
  };

  const records = [];
  for (const filing of ['single', 'married', 'head'] as const) {
    for (const freq of ['weekly', 'biweekly', 'semimonthly', 'monthly']) {
      records.push({
        tax_year: 2025,
        filing_status: filing,
        pay_frequency: freq,
        percentage_method_json: brackets2025[filing]
      });
    }
  }

  const { error } = await supabase.from('withholding_federal_15t').upsert(records, {
    onConflict: 'tax_year,filing_status,pay_frequency'
  });

  if (error) {
    console.error('❌ Error seeding withholding tables:', error);
    throw error;
  }
  console.log('✅ Withholding tables seeded\n');
}

async function seedStateTax() {
  console.log('🌱 Seeding state tax parameters...');

  const states = [
    // Texas - no income tax
    {
      state: 'TX',
      tax_year: 2025,
      method: 'none',
      flat_rate: null,
      standard_deduction: 0,
      personal_exemption: 0,
      dependent_exemption: 0,
      allowances_method: 'none',
      brackets: null,
      credits: null,
      locality_mode: 'none',
      effective_from: '2025-01-01'
    },
    // Florida - no income tax
    {
      state: 'FL',
      tax_year: 2025,
      method: 'none',
      flat_rate: null,
      standard_deduction: 0,
      personal_exemption: 0,
      dependent_exemption: 0,
      allowances_method: 'none',
      brackets: null,
      credits: null,
      locality_mode: 'none',
      effective_from: '2025-01-01'
    },
    // Illinois - flat rate
    {
      state: 'IL',
      tax_year: 2025,
      method: 'flat',
      flat_rate: 0.0495,
      standard_deduction: 0,
      personal_exemption: 2425,
      dependent_exemption: 2425,
      allowances_method: 'per_allowance_amount',
      brackets: null,
      credits: null,
      locality_mode: 'none',
      effective_from: '2025-01-01'
    },
    // Pennsylvania - flat rate
    {
      state: 'PA',
      tax_year: 2025,
      method: 'flat',
      flat_rate: 0.0307,
      standard_deduction: 0,
      personal_exemption: 0,
      dependent_exemption: 0,
      allowances_method: 'none',
      brackets: null,
      credits: null,
      locality_mode: 'none',
      effective_from: '2025-01-01'
    }
  ];

  const { error } = await supabase.from('tax_state_params').upsert(states, {
    onConflict: 'state,tax_year'
  });

  if (error) {
    console.error('❌ Error seeding state tax:', error);
    throw error;
  }
  console.log('✅ State tax parameters seeded\n');
}

async function main() {
  console.log('🚀 Initializing Benefits Builder database...\n');

  try {
    await seedPlanModels();
    await seedFederalTax();
    await seedWithholdingTables();
    await seedStateTax();

    console.log('============================================');
    console.log('✨ Database initialization complete!');
    console.log('============================================\n');
    console.log('Next steps:');
    console.log('1. Run: npm run dev');
    console.log('2. Visit: http://localhost:3002');
    console.log('3. Add companies and employees');
    console.log('4. Configure additional states at /admin/tax\n');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

main();
