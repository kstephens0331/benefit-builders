import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

console.log('🔌 Connecting to Supabase...');
console.log(`📍 URL: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runSQL(sql) {
  // Use the Supabase REST API to execute raw SQL
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  return response.json();
}

async function runMigration(filename) {
  const filepath = join(__dirname, 'supabase', 'migrations', filename);

  console.log(`\n📄 Running migration: ${filename}`);

  try {
    const sql = readFileSync(filepath, 'utf8');
    console.log(`   📊 Size: ${(sql.length / 1024).toFixed(2)} KB`);

    // Split on semicolons and run each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      try {
        const { data, error } = await supabase.rpc('query', { sql: statement });
        if (error) throw error;
        successCount++;
      } catch (err) {
        // Ignore "already exists" errors
        if (err.message && (
          err.message.includes('already exists') ||
          err.message.includes('does not exist')
        )) {
          successCount++;
          continue;
        }
        throw err;
      }
    }

    console.log(`   ✅ Executed ${successCount}/${statements.length} statements`);
    return true;
  } catch (err) {
    console.error(`   ❌ Error:`, err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting database migrations...\n');

  const migrations = [
    '20240115_quickbooks_enhancements.sql',
    '20240116_invoice_payment_enhancements.sql',
    '20240117_accounting_safety_system.sql'
  ];

  let failedCount = 0;
  for (const migration of migrations) {
    const success = await runMigration(migration);
    if (!success) failedCount++;
  }

  if (failedCount > 0) {
    console.log(`\n⚠️  ${failedCount} migration(s) had errors`);
    console.log('   This is often OK if tables already exist');
  } else {
    console.log('\n✨ All migrations completed successfully!');
  }
}

main().catch((err) => {
  console.error('\n💥 Migration failed:', err);
  process.exit(1);
});
