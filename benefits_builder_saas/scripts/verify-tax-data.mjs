#!/usr/bin/env node
/**
 * Verify Tax Data Deployment
 *
 * Checks that all 51 jurisdictions are present in the database
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

console.log('🔍 Verifying 2025 Tax Data Deployment\n');
console.log('='.repeat(60) + '\n');

// All 50 states + DC
const ALL_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA',
  'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY',
  'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX',
  'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

async function verify() {
  try {
    // Fetch all 2025 tax data
    const { data, error } = await supabase
      .from('tax_state_params')
      .select('state, tax_year, method, flat_rate, brackets, standard_deduction')
      .eq('tax_year', 2025)
      .order('state');

    if (error) {
      console.error('❌ Database query failed:', error.message);
      process.exit(1);
    }

    // Group by method
    const noTax = data.filter(s => s.method === 'none');
    const flat = data.filter(s => s.method === 'flat');
    const brackets = data.filter(s => s.method === 'brackets');

    // Check count
    console.log(`📊 Tax Data Summary:\n`);
    console.log(`   No-income-tax states: ${noTax.length} / 9`);
    console.log(`   Flat-tax states: ${flat.length} / 13`);
    console.log(`   Progressive-tax states: ${brackets.length} / 29 (28 + DC)`);
    console.log(`   ${'─'.repeat(50)}`);
    console.log(`   TOTAL: ${data.length} / 51 jurisdictions\n`);

    if (data.length === 51) {
      console.log('✅ SUCCESS! All 51 jurisdictions are present!\n');
    } else {
      console.log(`⚠️  WARNING: Expected 51, found ${data.length}\n`);
    }

    // Find missing states
    const presentStates = data.map(d => d.state);
    const missing = ALL_STATES.filter(s => !presentStates.includes(s));

    if (missing.length > 0) {
      console.log(`❌ Missing states (${missing.length}):`);
      console.log(`   ${missing.join(', ')}\n`);
    } else {
      console.log('✅ All states present!\n');
    }

    // Show sample data for each method type
    console.log('📋 Sample Data:\n');

    if (noTax.length > 0) {
      const sample = noTax[0];
      console.log(`   No-tax example (${sample.state}):`);
      console.log(`   - Method: ${sample.method}`);
      console.log(`   - No state income tax\n`);
    }

    if (flat.length > 0) {
      const sample = flat.find(s => s.state === 'IL') || flat[0];
      console.log(`   Flat-tax example (${sample.state}):`);
      console.log(`   - Method: ${sample.method}`);
      console.log(`   - Rate: ${(sample.flat_rate * 100).toFixed(2)}%`);
      console.log(`   - Standard Deduction: $${sample.standard_deduction || 0}\n`);
    }

    if (brackets.length > 0) {
      const sample = brackets.find(s => s.state === 'CA') || brackets[0];
      const bracketCount = JSON.parse(sample.brackets || '[]').length;
      console.log(`   Progressive-tax example (${sample.state}):`);
      console.log(`   - Method: ${sample.method}`);
      console.log(`   - Brackets: ${bracketCount}`);
      console.log(`   - Standard Deduction: $${sample.standard_deduction || 0}\n`);
    }

    // Detailed breakdown
    console.log('=' .repeat(60) + '\n');
    console.log('📜 Complete List:\n');

    console.log('NO-INCOME-TAX STATES:');
    noTax.forEach(s => console.log(`   ✅ ${s.state}`));

    console.log('\nFLAT-TAX STATES:');
    flat.forEach(s => console.log(`   ✅ ${s.state} - ${(s.flat_rate * 100).toFixed(2)}%`));

    console.log('\nPROGRESSIVE-TAX STATES:');
    brackets.forEach(s => {
      const bracketCount = JSON.parse(s.brackets || '[]').length;
      console.log(`   ✅ ${s.state} - ${bracketCount} brackets`);
    });

    console.log('\n' + '='.repeat(60) + '\n');

    // Overall status
    if (data.length === 51 && missing.length === 0) {
      console.log('🎉 DEPLOYMENT VERIFIED: All 51 jurisdictions ready for production!\n');
      process.exit(0);
    } else {
      console.log('⚠️  INCOMPLETE: Please deploy remaining states\n');
      process.exit(1);
    }

  } catch (err) {
    console.error('❌ Verification failed:', err.message);
    process.exit(1);
  }
}

verify();
