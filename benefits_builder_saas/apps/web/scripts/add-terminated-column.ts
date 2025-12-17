// Add terminated column to employees table
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "..", ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const db = createClient(supabaseUrl, supabaseServiceKey);

async function addTerminatedColumn() {
  console.log("Adding terminated column to employees table...\n");

  // Check if column exists by querying an employee
  const { data: employee, error: checkError } = await db
    .from("employees")
    .select("terminated")
    .limit(1)
    .maybeSingle();

  if (!checkError) {
    console.log("terminated column already exists!");
    return;
  }

  // Column doesn't exist, need to add via Supabase SQL Editor
  console.log("The terminated column needs to be added to the employees table.");
  console.log("\nPlease run this SQL in your Supabase SQL Editor:");
  console.log("----------------------------------------");
  console.log("ALTER TABLE employees ADD COLUMN IF NOT EXISTS terminated BOOLEAN DEFAULT FALSE;");
  console.log("----------------------------------------");
  console.log("\nAlternatively, add it via the Supabase Table Editor.");
}

addTerminatedColumn().catch(console.error);
