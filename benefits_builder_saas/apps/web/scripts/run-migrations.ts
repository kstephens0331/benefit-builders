#!/usr/bin/env tsx

/**
 * Database Migration Runner
 *
 * Runs all pending SQL migrations against the Supabase database
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

interface MigrationResult {
  filename: string;
  success: boolean;
  statementsExecuted: number;
  totalStatements: number;
  error?: string;
}

async function runMigration(filename: string): Promise<MigrationResult> {
  const filepath = join(rootDir, 'supabase', 'migrations', filename);

  if (!existsSync(filepath)) {
    console.log(`⏭️  Skipping ${filename} - file not found`);
    return {
      filename,
      success: false,
      statementsExecuted: 0,
      totalStatements: 0,
      error: 'File not found'
    };
  }

  console.log(`📄 Running migration: ${filename}`);

  try {
    const sql = readFileSync(filepath, 'utf8');
    const sizeKB = (sql.length / 1024).toFixed(2);
    console.log(`   📊 Size: ${sizeKB} KB`);

    // Execute the entire SQL file as one transaction
    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      // If exec_sql doesn't exist, try the query approach
      console.log('   ℹ️  Trying alternative execution method...');

      // Try running the full SQL using postgres REST API extension
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ query: sql })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    }

    console.log(`   ✅ Migration completed successfully\n`);

    return {
      filename,
      success: true,
      statementsExecuted: 1,
      totalStatements: 1
    };
  } catch (err) {
    const error = err as Error;
    console.error(`   ❌ Error: ${error.message}\n`);

    return {
      filename,
      success: false,
      statementsExecuted: 0,
      totalStatements: 1,
      error: error.message
    };
  }
}

async function main() {
  console.log('🚀 Starting database migrations...\n');

  const migrations = [
    '20240115_quickbooks_enhancements.sql',
    '20240116_invoice_payment_enhancements.sql',
    '20240117_accounting_safety_system.sql'
  ];

  const results: MigrationResult[] = [];

  for (const migration of migrations) {
    const result = await runMigration(migration);
    results.push(result);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n⚠️  Failed migrations:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.filename}: ${r.error}`);
    });
    console.log('\n💡 Tip: Some failures are expected if tables already exist');
  } else {
    console.log('\n✨ All migrations completed successfully!');
  }
}

main().catch((err) => {
  console.error('\n💥 Migration failed:', err);
  process.exit(1);
});
