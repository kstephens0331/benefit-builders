/**
 * Deploy Tax Data to Supabase
 *
 * This script deploys the complete 2025 tax data for all 51 jurisdictions
 * to the Supabase database using direct SQL execution.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

// Read environment variables from apps/web/.env.local
const envPath = join(process.cwd(), 'apps', 'web', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');

const getEnvVar = (name: string): string => {
  const match = envContent.match(new RegExp(`${name}=(.+)`));
  if (!match) throw new Error(`Missing ${name} in .env.local`);
  return match[1].trim();
};

const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSqlFile(filename: string): Promise<void> {
  const filePath = join(process.cwd(), 'supabase', 'seed', filename);
  console.log(`\n📄 Executing ${filename}...`);

  const sql = readFileSync(filePath, 'utf-8');

  // Split into individual INSERT statements
  const statements = sql
    .split(/;\s*\n/)
    .map(stmt => stmt.trim())
    .filter(stmt =>
      stmt.length > 0 &&
      !stmt.startsWith('--') &&
      stmt.toUpperCase().includes('INSERT')
    );

  console.log(`   Found ${statements.length} INSERT statements`);

  let successCount = 0;
  let errorCount = 0;

  for (const stmt of statements) {
    try {
      // Extract state code from the statement for logging
      const stateMatch = stmt.match(/'([A-Z]{2})'/);
      const state = stateMatch ? stateMatch[1] : 'UNKNOWN';

      const { error } = await supabase.rpc('exec_sql', { query: stmt + ';' });

      if (error) {
        console.log(`   ❌ ${state}: ${error.message}`);
        errorCount++;
      } else {
        console.log(`   ✅ ${state}`);
        successCount++;
      }
    } catch (err: any) {
      console.error(`   ❌ Error:`, err.message);
      errorCount++;
    }
  }

  console.log(`\n   Summary: ${successCount} succeeded, ${errorCount} failed`);
}

async function verifyDeployment(): Promise<void> {
  console.log('\n🔍 Verifying deployment...\n');

  const { data, error } = await supabase
    .from('tax_state_params')
    .select('state, tax_year, method, flat_rate, brackets')
    .eq('tax_year', 2025)
    .order('state');

  if (error) {
    console.error('❌ Verification failed:', error.message);
    return;
  }

  const noTax = data.filter(s => s.method === 'none');
  const flat = data.filter(s => s.method === 'flat');
  const brackets = data.filter(s => s.method === 'brackets');

  console.log(`✅ Found ${data.length} states with 2025 tax data:\n`);
  console.log(`   No-income-tax states: ${noTax.length}`);
  console.log(`   Flat-tax states: ${flat.length}`);
  console.log(`   Progressive-tax states: ${brackets.length}`);
  console.log(`   ${'─'.repeat(40)}`);
  console.log(`   TOTAL: ${data.length} / 51 jurisdictions\n`);

  if (data.length === 51) {
    console.log('🎉 SUCCESS! All 51 jurisdictions deployed!\n');
  } else {
    const allStates = [
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA',
      'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA',
      'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY',
      'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX',
      'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
    ];
    const missing = allStates.filter(state => !data.find(d => d.state === state));
    console.log(`⚠️  WARNING: Expected 51 jurisdictions, found ${data.length}`);
    console.log(`Missing states: ${missing.join(', ')}\n`);
  }

  // Show sample data
  console.log('📊 Sample tax data:\n');
  data.slice(0, 5).forEach(s => {
    console.log(`   ${s.state} (${s.method}):`, s.method === 'flat'
      ? `${(s.flat_rate * 100).toFixed(2)}% flat rate`
      : s.method === 'brackets'
        ? `${JSON.parse(s.brackets).length} tax brackets`
        : 'No state income tax'
    );
  });
  console.log();
}

async function deploy(): Promise<void> {
  console.log('🚀 Deploying Complete 2025 Tax Data to Supabase\n');
  console.log('═'.repeat(60));

  try {
    // Deploy Part 1: No-tax, Flat-tax, and first Progressive states
    console.log('\n📦 Part 1: No-tax states, Flat-tax states, First progressive states');
    await executeSqlFile('006_complete_state_tax_2025.sql');

    // Deploy Part 2: Remaining Progressive states
    console.log('\n📦 Part 2: Remaining progressive states');
    await executeSqlFile('007_complete_state_tax_2025_part2.sql');

    console.log('\n' + '═'.repeat(60));
    console.log('✅ Tax data deployment complete!\n');

    // Verify
    await verifyDeployment();

  } catch (err: any) {
    console.error('\n❌ Deployment failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

deploy();
