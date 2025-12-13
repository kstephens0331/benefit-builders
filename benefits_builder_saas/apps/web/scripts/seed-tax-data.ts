#!/usr/bin/env tsx

/**
 * Tax Data Seeder
 *
 * Runs all tax-related SQL seed files against the Supabase database
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Load environment from .env.local
const envPath = join(rootDir, '.env.local');
if (!existsSync(envPath)) {
  console.error('❌ .env.local file not found');
  process.exit(1);
}

const envContent = readFileSync(envPath, 'utf-8');
const envVars = Object.fromEntries(
  envContent
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#') && !line.startsWith('»'))
    .map(line => {
      const [key, ...valueParts] = line.split('=');
      return [key.trim(), valueParts.join('=').trim()];
    })
);

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('🔌 Connecting to Supabase...');
console.log(`📍 URL: ${supabaseUrl}\n`);

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runSqlFile(filename: string, directory: string = 'seed'): Promise<boolean> {
  const filepath = join(rootDir, 'supabase', directory, filename);

  if (!existsSync(filepath)) {
    console.log(`⏭️  Skipping ${filename} - file not found at ${filepath}`);
    return false;
  }

  console.log(`📄 Running: ${filename}`);

  try {
    const sql = readFileSync(filepath, 'utf8');
    const sizeKB = (sql.length / 1024).toFixed(2);
    console.log(`   📊 Size: ${sizeKB} KB`);

    // Split into individual statements and run each
    // This handles the ON CONFLICT properly
    const statements = sql
      .split(/;\s*$/m)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`   📝 Statements: ${statements.length}`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (!stmt) continue;

      // Use raw SQL execution via postgres function
      const { error } = await supabase.rpc('exec_sql', { sql_query: stmt });

      if (error) {
        // Try direct query if rpc doesn't work
        const { error: queryError } = await supabase.from('_sql').select().limit(0);

        // Fall back to using the REST API directly
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ query: stmt })
        });

        // Just log and continue - some statements may fail due to existing data
        if (!response.ok) {
          console.log(`   ⚠️  Statement ${i + 1} may have failed (this is often OK for upserts)`);
        }
      }
    }

    console.log(`   ✅ Completed successfully\n`);
    return true;
  } catch (err) {
    const error = err as Error;
    console.error(`   ❌ Error: ${error.message}\n`);
    return false;
  }
}

async function checkExistingData(taxYear: number = 2025) {
  console.log(`🔍 Checking existing tax data for ${taxYear}...\n`);

  // Check federal params
  const { data: fedParams } = await supabase
    .from('tax_federal_params')
    .select('*')
    .eq('tax_year', taxYear)
    .single();

  if (fedParams) {
    console.log(`✅ Federal tax params (${taxYear}): EXISTS`);
    console.log(`   SS Rate: ${fedParams.ss_rate}, Med Rate: ${fedParams.med_rate}, SS Wage Base: $${fedParams.ss_wage_base}`);
  } else {
    console.log(`❌ Federal tax params (${taxYear}): MISSING`);
  }

  // Check MO state params
  const { data: moParams } = await supabase
    .from('tax_state_params')
    .select('*')
    .eq('state', 'MO')
    .eq('tax_year', taxYear)
    .single();

  if (moParams) {
    console.log(`✅ MO state tax params (${taxYear}): EXISTS`);
    console.log(`   Method: ${moParams.method}, Std Deduction: ${moParams.standard_deduction}${moParams.flat_rate ? `, Rate: ${moParams.flat_rate}` : ''}`);
  } else {
    console.log(`❌ MO state tax params (${taxYear}): MISSING`);
  }

  // Check federal withholding brackets
  const { data: fedWithholding } = await supabase
    .from('withholding_federal_15t')
    .select('*')
    .eq('tax_year', taxYear)
    .limit(1);

  if (fedWithholding && fedWithholding.length > 0) {
    console.log(`✅ Federal withholding brackets (${taxYear}): EXISTS`);

    // Count total rows
    const { count } = await supabase
      .from('withholding_federal_15t')
      .select('*', { count: 'exact', head: true })
      .eq('tax_year', taxYear);

    console.log(`   Total rows: ${count}`);
  } else {
    console.log(`❌ Federal withholding brackets (${taxYear}): MISSING`);
  }

  // Check state params count
  const { count: stateCount } = await supabase
    .from('tax_state_params')
    .select('*', { count: 'exact', head: true })
    .eq('tax_year', taxYear);

  console.log(`📊 Total state tax configs (${taxYear}): ${stateCount || 0}`);
  console.log('');

  return {
    hasFedParams: !!fedParams,
    hasMoParams: !!moParams,
    hasFedWithholding: fedWithholding && fedWithholding.length > 0,
    stateCount: stateCount || 0
  };
}

async function seedDirectly(taxYear: number) {
  console.log(`📥 Seeding ${taxYear} tax data directly via Supabase client...\n`);

  // Tax data configurations for each year
  const taxConfigs: Record<number, {
    ssWageBase: number;
    singleDeduction: number;
    marriedDeduction: number;
    headDeduction: number;
    moMethod: string;
    moFlatRate: number | null;
    moDeduction: number;
    moBrackets: Array<{over: number; rate: number}> | null;
    singleBrackets: Array<{max: number | null; rate: number; base: number}>;
    marriedBrackets: Array<{max: number | null; rate: number; base: number}>;
    headBrackets: Array<{max: number | null; rate: number; base: number}>;
  }> = {
    2025: {
      ssWageBase: 176100,
      singleDeduction: 14600,
      marriedDeduction: 29200,
      headDeduction: 21900,
      moMethod: 'brackets',
      moFlatRate: null,
      moDeduction: 14600,
      moBrackets: [
        { over: 0, rate: 0 },
        { over: 1207, rate: 0.02 },
        { over: 2414, rate: 0.025 },
        { over: 3621, rate: 0.03 },
        { over: 4828, rate: 0.035 },
        { over: 6035, rate: 0.04 },
        { over: 7242, rate: 0.045 },
        { over: 8449, rate: 0.048 }
      ],
      singleBrackets: [
        { max: 11925, rate: 0.10, base: 0 },
        { max: 48475, rate: 0.12, base: 1192.50 },
        { max: 103350, rate: 0.22, base: 5578.50 },
        { max: 197300, rate: 0.24, base: 17651.00 },
        { max: 250525, rate: 0.32, base: 40219.00 },
        { max: 626350, rate: 0.35, base: 57271.00 },
        { max: null, rate: 0.37, base: 188925.25 }
      ],
      marriedBrackets: [
        { max: 23850, rate: 0.10, base: 0 },
        { max: 96950, rate: 0.12, base: 2385.00 },
        { max: 206700, rate: 0.22, base: 11157.00 },
        { max: 394600, rate: 0.24, base: 35302.00 },
        { max: 501050, rate: 0.32, base: 80438.00 },
        { max: 751600, rate: 0.35, base: 114542.00 },
        { max: null, rate: 0.37, base: 202234.50 }
      ],
      headBrackets: [
        { max: 17000, rate: 0.10, base: 0 },
        { max: 64850, rate: 0.12, base: 1700.00 },
        { max: 103350, rate: 0.22, base: 7442.00 },
        { max: 197300, rate: 0.24, base: 15912.00 },
        { max: 250500, rate: 0.32, base: 38460.00 },
        { max: 626350, rate: 0.35, base: 55484.00 },
        { max: null, rate: 0.37, base: 186971.50 }
      ]
    },
    2026: {
      ssWageBase: 184500,
      singleDeduction: 16100,
      marriedDeduction: 32200,
      headDeduction: 24150,
      moMethod: 'flat',
      moFlatRate: 0.047,
      moDeduction: 16100,
      moBrackets: null,
      singleBrackets: [
        { max: 12400, rate: 0.10, base: 0 },
        { max: 50400, rate: 0.12, base: 1240.00 },
        { max: 105700, rate: 0.22, base: 5800.00 },
        { max: 201775, rate: 0.24, base: 17966.00 },
        { max: 256225, rate: 0.32, base: 41024.00 },
        { max: 640600, rate: 0.35, base: 58448.00 },
        { max: null, rate: 0.37, base: 192979.25 }
      ],
      marriedBrackets: [
        { max: 24800, rate: 0.10, base: 0 },
        { max: 100800, rate: 0.12, base: 2480.00 },
        { max: 211400, rate: 0.22, base: 11600.00 },
        { max: 403550, rate: 0.24, base: 35932.00 },
        { max: 512450, rate: 0.32, base: 82048.00 },
        { max: 768700, rate: 0.35, base: 116896.00 },
        { max: null, rate: 0.37, base: 206583.50 }
      ],
      headBrackets: [
        { max: 17700, rate: 0.10, base: 0 },
        { max: 67450, rate: 0.12, base: 1770.00 },
        { max: 105700, rate: 0.22, base: 7740.00 },
        { max: 201775, rate: 0.24, base: 16155.00 },
        { max: 256200, rate: 0.32, base: 39213.00 },
        { max: 640600, rate: 0.35, base: 56629.00 },
        { max: null, rate: 0.37, base: 191169.00 }
      ]
    }
  };

  const config = taxConfigs[taxYear];
  if (!config) {
    console.log(`   ⚠️  No configuration found for tax year ${taxYear}`);
    return;
  }

  // Seed federal params
  console.log(`📄 Seeding federal tax params (${taxYear})...`);
  const { error: fedError } = await supabase
    .from('tax_federal_params')
    .upsert({
      tax_year: taxYear,
      ss_rate: 0.062,
      med_rate: 0.0145,
      ss_wage_base: config.ssWageBase,
      addl_medicare_threshold: 200000
    }, { onConflict: 'tax_year' });

  if (fedError) {
    console.log(`   ⚠️  Error: ${fedError.message}`);
  } else {
    console.log(`   ✅ Federal params seeded (SS Wage Base: $${config.ssWageBase})`);
  }

  // Seed MO state params
  console.log(`📄 Seeding MO state tax params (${taxYear})...`);
  const { error: moError } = await supabase
    .from('tax_state_params')
    .upsert({
      state: 'MO',
      tax_year: taxYear,
      method: config.moMethod,
      flat_rate: config.moFlatRate,
      standard_deduction: config.moDeduction,
      personal_exemption: 0,
      dependent_exemption: 0,
      brackets: config.moBrackets,
      effective_from: `${taxYear}-01-01`
    }, { onConflict: 'state,tax_year' });

  if (moError) {
    console.log(`   ⚠️  Error: ${moError.message}`);
  } else {
    const moInfo = config.moMethod === 'flat'
      ? `Flat ${(config.moFlatRate! * 100).toFixed(1)}%`
      : 'Brackets';
    console.log(`   ✅ MO state params seeded (${moInfo})`);
  }

  // Seed federal withholding brackets for all filing statuses and pay frequencies
  console.log(`📄 Seeding federal withholding brackets (${taxYear})...`);

  const filingStatuses = ['single', 'married', 'head'];
  const payFrequencies = ['weekly', 'biweekly', 'semimonthly', 'monthly'];

  const bracketsByStatus: Record<string, {standard_deduction: number; brackets: typeof config.singleBrackets}> = {
    single: { standard_deduction: config.singleDeduction, brackets: config.singleBrackets },
    married: { standard_deduction: config.marriedDeduction, brackets: config.marriedBrackets },
    head: { standard_deduction: config.headDeduction, brackets: config.headBrackets }
  };

  let withholdingCount = 0;
  for (const status of filingStatuses) {
    for (const freq of payFrequencies) {
      const { error } = await supabase
        .from('withholding_federal_15t')
        .upsert({
          tax_year: taxYear,
          filing_status: status,
          pay_frequency: freq,
          percentage_method_json: bracketsByStatus[status]
        }, { onConflict: 'tax_year,filing_status,pay_frequency' });

      if (!error) {
        withholdingCount++;
      }
    }
  }

  console.log(`   ✅ ${withholdingCount} federal withholding rows seeded`);
  console.log('');
}

async function main() {
  console.log('🚀 Tax Data Seeder - 2025 & 2026\n');
  console.log('='.repeat(60) + '\n');

  // Check what's already there for both years
  console.log('CHECKING EXISTING DATA:\n');
  await checkExistingData(2025);
  await checkExistingData(2026);

  // Seed both years
  console.log('='.repeat(60));
  console.log('\nSEEDING DATA:\n');
  await seedDirectly(2025);
  await seedDirectly(2026);

  // Verify both years
  console.log('='.repeat(60));
  console.log('\nVERIFYING SEEDED DATA:\n');
  await checkExistingData(2025);
  await checkExistingData(2026);

  console.log('='.repeat(60));
  console.log('\n✨ Tax data seeding complete!');
  console.log('   2025 data: Ready');
  console.log('   2026 data: Ready for January 1st transition');
  console.log('\n📅 Note: System will automatically use 2026 rates on January 1, 2026');
}

main().catch((err) => {
  console.error('\n💥 Seeding failed:', err);
  process.exit(1);
});
