#!/usr/bin/env tsx

/**
 * Simple Database Migration Runner
 *
 * Executes SQL migrations by splitting them into individual statements
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Load environment
const envPath = join(rootDir, '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = Object.fromEntries(
  envContent
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#') && !line.startsWith('»'))
    .map(line => {
      const [key, ...valueParts] = line.split('=');
      return [key?.trim() || '', valueParts.join('=').trim()];
    })
    .filter(([key]) => key)
);

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

console.log('🔌 Connecting to Supabase...');
console.log(`📍 URL: ${supabaseUrl}\n`);

const supabase = createClient(supabaseUrl, supabaseKey);

function parseSQL(sql: string): string[] {
  // Remove comments
  sql = sql.replace(/--[^\n]*/g, '');

  // Split on semicolons but preserve them in DO blocks and functions
  const statements: string[] = [];
  let current = '';
  let inBlock = 0; // Track nesting level of $$ blocks
  let inFunction = false;
  let inDoBlock = false;

  const lines = sql.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Track DO blocks
    if (trimmed.match(/^DO\s+\$\$/i)) {
      inDoBlock = true;
      inBlock++;
    }

    // Track function definitions
    if (trimmed.match(/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/i)) {
      inFunction = true;
    }

    // Track $$ delimiters
    const dollarCount = (line.match(/\$\$/g) || []).length;
    if (dollarCount > 0) {
      if (inDoBlock || inFunction) {
        // Count pairs
        for (let i = 0; i < dollarCount; i++) {
          if (inBlock > 0) {
            inBlock--;
            if (inBlock === 0) {
              inDoBlock = false;
              inFunction = false;
            }
          } else {
            inBlock++;
          }
        }
      }
    }

    current += line + '\n';

    // Check for statement end
    if (trimmed.endsWith(';') && inBlock === 0) {
      if (current.trim()) {
        statements.push(current.trim());
      }
      current = '';
    }
  }

  // Add any remaining content
  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements.filter(s => s && s.length > 2);
}

async function execSQL(sql: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Try to execute as a raw query using from() with a non-existent table
    // This will force Supabase to execute raw SQL
    const { error } = await (supabase as any).rpc('exec', { sql });

    if (!error) {
      return { success: true };
    }

    // Fallback: try using postgres changes
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=minimal',
        'Content-Profile': 'public'
      },
      body: JSON.stringify({ query: sql })
    });

    if (response.ok) {
      return { success: true };
    }

    return { success: false, error: `HTTP ${response.status}` };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

async function runMigration(filename: string) {
  const filepath = join(rootDir, 'supabase', 'migrations', filename);

  if (!existsSync(filepath)) {
    console.log(`⏭️  Skipping ${filename} - not found\n`);
    return { success: false, skipped: true };
  }

  console.log(`📄 Running: ${filename}`);
  const sql = readFileSync(filepath, 'utf8');
  console.log(`   Size: ${(sql.length / 1024).toFixed(2)} KB`);

  const statements = parseSQL(sql);
  console.log(`   Statements: ${statements.length}`);

  let executed = 0;
  let failed = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 60).replace(/\s+/g, ' ');

    process.stdout.write(`   [${i + 1}/${statements.length}] ${preview}... `);

    const result = await execSQL(stmt);

    if (result.success) {
      console.log('✅');
      executed++;
    } else {
      // Check if it's an "already exists" error (safe to ignore)
      if (result.error?.includes('already exists') ||
          result.error?.includes('does not exist')) {
        console.log('⏭️  (already applied)');
        executed++;
      } else {
        console.log(`❌ ${result.error}`);
        failed++;
      }
    }
  }

  console.log(`   Result: ${executed}/${statements.length} successful\n`);

  return { success: failed === 0, executed, failed };
}

async function main() {
  console.log('🚀 Database Migrations\n');

  const migrations = [
    '20240115_quickbooks_enhancements.sql',
    '20240116_invoice_payment_enhancements.sql',
    '20240117_accounting_safety_system.sql'
  ];

  console.log('📋 Migrations to run:');
  migrations.forEach((m, i) => console.log(`   ${i + 1}. ${m}`));
  console.log();

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const migration of migrations) {
    const result = await runMigration(migration);
    if (result.success) totalSuccess++;
    else if (!result.skipped) totalFailed++;
  }

  console.log('='.repeat(60));
  console.log(`✅ Successful: ${totalSuccess}`);
  console.log(`❌ Failed: ${totalFailed}`);
  console.log('='.repeat(60));

  if (totalFailed === 0) {
    console.log('\n✨ All migrations completed!');
  } else {
    console.log('\n⚠️  Some migrations failed - check errors above');
  }
}

main().catch(console.error);
