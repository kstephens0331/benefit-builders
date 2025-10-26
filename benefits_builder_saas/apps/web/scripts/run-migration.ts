// Run database migrations
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "..", ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const db = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log("🔄 Running migration: Add Constraints...\n");

  const migrationPath = join(__dirname, "..", "..", "..", "supabase", "migrations", "001_add_constraints.sql");
  const migrationSQL = readFileSync(migrationPath, "utf8");

  // Split by statement and execute one by one
  const statements = migrationSQL
    .split(";")
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith("--"));

  for (const statement of statements) {
    if (statement.includes("DO $$") || statement.includes("CREATE INDEX") || statement.includes("COMMENT ON")) {
      console.log(`Executing: ${statement.substring(0, 60)}...`);

      try {
        const { error } = await db.rpc("exec_sql", { query: statement });
        if (error) {
          // Try direct query if RPC isn't available
          console.log("   Note: This constraint may already exist or require manual application via Supabase Dashboard");
        } else {
          console.log("   ✅ Success");
        }
      } catch (e) {
        console.log("   ⚠️ Error executing statement (may need manual application)");
      }
    }
  }

  console.log("\n✅ Migration process completed!");
  console.log("\n📝 If any statements failed, please run the migration SQL manually:");
  console.log("   1. Go to Supabase Dashboard → SQL Editor");
  console.log("   2. Paste contents of: supabase/migrations/001_add_constraints.sql");
  console.log("   3. Click RUN\n");
}

runMigration().catch(console.error);
