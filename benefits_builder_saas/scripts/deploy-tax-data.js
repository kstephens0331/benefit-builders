/**
 * Deploy Tax Data to Supabase
 *
 * This script deploys the complete 2025 tax data for all 51 jurisdictions
 * to the Supabase database.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Read environment variables
const envPath = path.join(__dirname, '..', 'apps', 'web', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`${name}=(.+)`));
  return match ? match[1].trim() : null;
};

const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSqlFile(filename) {
  const filePath = path.join(__dirname, '..', 'supabase', 'seed', filename);
  console.log(`\n📄 Reading ${filename}...`);

  const sql = fs.readFileSync(filePath, 'utf-8');

  // Remove comments and split into individual statements
  const statements = sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--') && line.trim() !== '')
    .join('\n')
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);

  console.log(`   Found ${statements.length} SQL statements`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (stmt.length > 0) {
      try {
        // Execute via Supabase RPC or direct query
        const { error } = await supabase.rpc('exec_sql', { sql_query: stmt });
        if (error) {
          console.error(`   ❌ Statement ${i + 1} failed:`, error.message);
        } else {
          console.log(`   ✅ Statement ${i + 1} executed`);
        }
      } catch (err) {
        console.error(`   ❌ Statement ${i + 1} error:`, err.message);
      }
    }
  }
}

async function deployTaxData() {
  console.log('🚀 Deploying Complete 2025 Tax Data to Supabase\n');
  console.log('=' .repeat(60));

  try {
    // Deploy Part 1: No-tax, Flat-tax, and first Progressive states
    console.log('\n📦 Part 1: Deploying initial tax data...');
    await runSqlFile('006_complete_state_tax_2025.sql');

    // Deploy Part 2: Remaining Progressive states
    console.log('\n📦 Part 2: Deploying remaining progressive states...');
    await runSqlFile('007_complete_state_tax_2025_part2.sql');

    console.log('\n' + '='.repeat(60));
    console.log('✅ Tax data deployment complete!\n');

    // Verify deployment
    console.log('🔍 Verifying deployment...\n');
    const { data, error } = await supabase
      .from('tax_state_params')
      .select('state, tax_year, method')
      .eq('tax_year', 2025)
      .order('state');

    if (error) {
      console.error('❌ Verification failed:', error.message);
    } else {
      console.log(`✅ Found ${data.length} states with 2025 tax data:\n`);

      const noTax = data.filter(s => s.method === 'none');
      const flat = data.filter(s => s.method === 'flat');
      const brackets = data.filter(s => s.method === 'brackets');

      console.log(`   No-income-tax states: ${noTax.length}`);
      console.log(`   Flat-tax states: ${flat.length}`);
      console.log(`   Progressive-tax states: ${brackets.length}`);
      console.log(`   ---`);
      console.log(`   TOTAL: ${data.length} / 51 jurisdictions`);

      if (data.length === 51) {
        console.log('\n🎉 SUCCESS! All 51 jurisdictions deployed!\n');
      } else {
        console.log(`\n⚠️  WARNING: Expected 51 jurisdictions, found ${data.length}\n`);
        console.log('Missing states:',
          ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA',
           'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA',
           'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY',
           'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX',
           'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY']
          .filter(state => !data.find(d => d.state === state))
        );
      }
    }

  } catch (err) {
    console.error('\n❌ Deployment failed:', err.message);
    process.exit(1);
  }
}

deployTaxData();
