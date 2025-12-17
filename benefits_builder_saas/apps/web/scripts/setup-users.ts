// Setup Internal Users
// Run this script to create the 4 internal user accounts

import { createClient } from "@supabase/supabase-js";
import * as crypto from "crypto";
import * as dotenv from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

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

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

async function setupUsers() {
  console.log("🔄 Setting up internal users...\n");

  const users = [
    {
      username: "info@stephenscode.dev",
      password: "78410889Ks!",
      full_name: "System Administrator",
      email: "info@stephenscode.dev",
      role: "admin",
      active: true
    },
    {
      username: "Josh",
      password: "Eghm1234",
      full_name: "Josh",
      email: "josh@benefitsbuilder.com",
      role: "user",
      active: true
    },
    {
      username: "user3@benefitsbuilder.com",
      password: "ChangeMe123!",  // Temporary password
      full_name: "User 3 - Awaiting Setup",
      email: "user3@benefitsbuilder.com",
      role: "user",
      active: false  // Disabled until Bill provides credentials
    },
    {
      username: "user4@benefitsbuilder.com",
      password: "ChangeMe123!",  // Temporary password
      full_name: "User 4 - Awaiting Setup",
      email: "user4@benefitsbuilder.com",
      role: "viewer",
      active: false  // Disabled until Bill provides credentials
    }
  ];

  for (const user of users) {
    const passwordHash = hashPassword(user.password);

    console.log(`Creating user: ${user.username}`);

    // Check if user exists
    const { data: existing } = await db
      .from("internal_users")
      .select("id")
      .eq("username", user.username)
      .single();

    if (existing) {
      // Update existing user
      const { error } = await db
        .from("internal_users")
        .update({
          password_hash: passwordHash,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          active: user.active,
          updated_at: new Date().toISOString()
        })
        .eq("username", user.username);

      if (error) {
        console.error(`   ❌ Error updating ${user.username}:`, error.message);
      } else {
        console.log(`   ✅ Updated ${user.username} (Active: ${user.active})`);
      }
    } else {
      // Insert new user
      const { error } = await db
        .from("internal_users")
        .insert({
          username: user.username,
          password_hash: passwordHash,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          active: user.active
        });

      if (error) {
        console.error(`   ❌ Error creating ${user.username}:`, error.message);
      } else {
        console.log(`   ✅ Created ${user.username} (Active: ${user.active})`);
      }
    }
  }

  console.log("\n✅ User setup complete!\n");
  console.log("📝 Active Users:");
  console.log("   - info@stephenscode.dev (admin)");
  console.log("   - Josh (user)");
  console.log("\n⚠️ Inactive Users (Awaiting credentials):");
  console.log("   - user3@benefitsbuilder.com (user)");
  console.log("   - user4@benefitsbuilder.com (viewer)");
  console.log("\nTo activate users, update their credentials and set active=true\n");
}

setupUsers().catch(console.error);
