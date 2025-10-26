#!/usr/bin/env node
/**
 * Run SQL files directly via Supabase REST API
 *
 * This script executes the tax data SQL files by making direct POST requests
 * to the Supabase REST API using the service role key.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

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

// Extract project ref from URL
const projectRef = supabaseUrl.match(/https:\/\/(.+?)\.supabase\.co/)[1];

console.log('🚀 Deploying Tax Data to Supabase\n');
console.log(`Project: ${projectRef}`);
console.log('=' .repeat(60) + '\n');

// Read SQL files
const sql1Path = join(__dirname, '..', 'supabase', 'seed', '006_complete_state_tax_2025.sql');
const sql2Path = join(__dirname, '..', 'supabase', 'seed', '007_complete_state_tax_2025_part2.sql');

const sql1 = readFileSync(sql1Path, 'utf-8');
const sql2 = readFileSync(sql2Path, 'utf-8');

// Function to execute SQL via Supabase REST API
async function executeSql(sql, description) {
  console.log(`📄 Executing: ${description}...`);

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Failed: ${error}`);
      return false;
    }

    console.log(`✅ Success\n`);
    return true;
  } catch (error) {
    console.error(`❌ Error: ${error.message}\n`);
    return false;
  }
}

// Alternative: Direct database execution using pg connection string
// Since Supabase doesn't have a built-in exec_sql RPC, we'll use a different approach

console.log('⚠️  Note: Supabase requires SQL to be run via the SQL Editor\n');
console.log('📋 Please follow these steps:\n');
console.log('1. Open Supabase Dashboard:');
console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql/new\n`);
console.log('2. Copy and paste the SQL from these files:');
console.log(`   - ${sql1Path}`);
console.log(`   - ${sql2Path}\n`);
console.log('3. Click "Run" for each file\n');
console.log('=' .repeat(60) + '\n');

// Show file contents summary
console.log('📊 File 1 Summary (006_complete_state_tax_2025.sql):');
const part1States = sql1.match(/VALUES \('([A-Z]{2})',/g);
if (part1States) {
  const states = part1States.map(m => m.match(/'([A-Z]{2})'/)[1]);
  console.log(`   ${states.length} states: ${states.join(', ')}\n`);
}

console.log('📊 File 2 Summary (007_complete_state_tax_2025_part2.sql):');
const part2States = sql2.match(/VALUES \(\s*'([A-Z]{2})',/g);
if (part2States) {
  const states = part2States.map(m => m.match(/'([A-Z]{2})'/)[1]);
  console.log(`   ${states.length} states: ${states.join(', ')}\n`);
}

console.log('\n✅ Files are ready for deployment via Supabase SQL Editor\n');
