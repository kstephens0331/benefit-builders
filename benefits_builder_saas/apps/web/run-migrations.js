const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration(filename) {
  const filepath = path.join(__dirname, 'supabase', 'migrations', filename);

  if (!fs.existsSync(filepath)) {
    console.log(`⏭️  Skipping ${filename} - file not found`);
    return;
  }

  console.log(`\n📄 Running migration: ${filename}`);
  const sql = fs.readFileSync(filepath, 'utf8');

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });

    if (error) {
      // If exec_sql RPC doesn't exist, try direct query
      const { error: queryError } = await supabase.from('_sql').insert({ query: sql });

      if (queryError) {
        console.error(`❌ Error running ${filename}:`, error || queryError);
        throw error || queryError;
      }
    }

    console.log(`✅ Successfully ran ${filename}`);
  } catch (err) {
    console.error(`❌ Failed to run ${filename}:`, err.message);
    throw err;
  }
}

async function main() {
  console.log('🚀 Starting database migrations...\n');
  console.log(`📍 Database: ${supabaseUrl}`);

  const migrations = [
    '20240115_quickbooks_enhancements.sql',
    '20240116_invoice_payment_enhancements.sql',
    '20240117_accounting_safety_system.sql'
  ];

  for (const migration of migrations) {
    await runMigration(migration);
  }

  console.log('\n✨ All migrations completed successfully!');
}

main().catch((err) => {
  console.error('\n💥 Migration failed:', err);
  process.exit(1);
});
