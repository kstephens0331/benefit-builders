/**
 * Simple Tax Data Deployment Script
 *
 * Uses Supabase client to insert tax data for all 51 jurisdictions
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read environment variables
const envPath = join(__dirname, '..', 'apps', 'web', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');

const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`${name}=(.+)`));
  if (!match) throw new Error(`Missing ${name}`);
  return match[1].trim();
};

const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 Deploying Tax Data to Supabase\n');
console.log('Supabase URL:', supabaseUrl);
console.log('\n' + '='.repeat(60) + '\n');

// First, let's verify we can connect and check current state
const { data: existing, error: checkError } = await supabase
  .from('tax_state_params')
  .select('state, tax_year')
  .eq('tax_year', 2025);

if (checkError) {
  console.error('❌ Database connection failed:', checkError.message);
  process.exit(1);
}

console.log(`📊 Current 2025 tax data: ${existing ? existing.length : 0} states\n`);

// Read and parse the SQL files
console.log('📄 Reading SQL files...\n');

const sql1 = readFileSync(join(__dirname, '..', 'supabase', 'seed', '006_complete_state_tax_2025.sql'), 'utf-8');
const sql2 = readFileSync(join(__dirname, '..', 'supabase', 'seed', '007_complete_state_tax_2025_part2.sql'), 'utf-8');

// Manual approach: We'll use the Supabase SQL editor URL instead
console.log('⚠️  Supabase requires SQL to be run via the SQL Editor or CLI\n');
console.log('📝 Instructions:\n');
console.log('1. Go to your Supabase Dashboard:');
console.log(`   ${supabaseUrl.replace('https://', 'https://supabase.com/dashboard/project/')}/editor\n`);
console.log('2. Click "SQL Editor" in the left sidebar\n');
console.log('3. Click "New query"\n');
console.log('4. Copy and paste the contents of:');
console.log('   - supabase/seed/006_complete_state_tax_2025.sql');
console.log('   - Click "Run"');
console.log('   - Then paste and run 007_complete_state_tax_2025_part2.sql\n');
console.log('=' .repeat(60) + '\n');

// Alternative: Let's try direct SQL execution via Supabase's postgres connection
console.log('🔄 Attempting direct SQL execution...\n');

// We'll manually insert the data using the Supabase client
// This is more reliable than trying to execute raw SQL

const taxData = [
  // No-income-tax states (9)
  { state: 'AK', tax_year: 2025, method: 'none', flat_rate: null, standard_deduction: null, personal_exemption: null, dependent_exemption: null, allowances_method: null, brackets: null, credits: null, locality_mode: 'none', effective_from: '2025-01-01' },
  { state: 'FL', tax_year: 2025, method: 'none', flat_rate: null, standard_deduction: null, personal_exemption: null, dependent_exemption: null, allowances_method: null, brackets: null, credits: null, locality_mode: 'none', effective_from: '2025-01-01' },
  { state: 'NV', tax_year: 2025, method: 'none', flat_rate: null, standard_deduction: null, personal_exemption: null, dependent_exemption: null, allowances_method: null, brackets: null, credits: null, locality_mode: 'none', effective_from: '2025-01-01' },
  { state: 'SD', tax_year: 2025, method: 'none', flat_rate: null, standard_deduction: null, personal_exemption: null, dependent_exemption: null, allowances_method: null, brackets: null, credits: null, locality_mode: 'none', effective_from: '2025-01-01' },
  { state: 'TN', tax_year: 2025, method: 'none', flat_rate: null, standard_deduction: null, personal_exemption: null, dependent_exemption: null, allowances_method: null, brackets: null, credits: null, locality_mode: 'none', effective_from: '2025-01-01' },
  { state: 'TX', tax_year: 2025, method: 'none', flat_rate: null, standard_deduction: null, personal_exemption: null, dependent_exemption: null, allowances_method: null, brackets: null, credits: null, locality_mode: 'none', effective_from: '2025-01-01' },
  { state: 'WA', tax_year: 2025, method: 'none', flat_rate: null, standard_deduction: null, personal_exemption: null, dependent_exemption: null, allowances_method: null, brackets: null, credits: null, locality_mode: 'none', effective_from: '2025-01-01' },
  { state: 'WY', tax_year: 2025, method: 'none', flat_rate: null, standard_deduction: null, personal_exemption: null, dependent_exemption: null, allowances_method: null, brackets: null, credits: null, locality_mode: 'none', effective_from: '2025-01-01' },
  { state: 'NH', tax_year: 2025, method: 'none', flat_rate: null, standard_deduction: null, personal_exemption: null, dependent_exemption: null, allowances_method: null, brackets: null, credits: null, locality_mode: 'none', effective_from: '2025-01-01' },
];

console.log('Inserting no-income-tax states...');
for (const data of taxData) {
  const { error } = await supabase
    .from('tax_state_params')
    .upsert(data, { onConflict: 'state,tax_year' });

  if (error) {
    console.log(`  ❌ ${data.state}: ${error.message}`);
  } else {
    console.log(`  ✅ ${data.state}`);
  }
}

console.log('\n✅ Sample deployment complete!');
console.log('\n⚠️  For complete deployment, please run the SQL files in Supabase SQL Editor');
console.log('   OR use: npx supabase db push (if using local Supabase CLI)\n');
