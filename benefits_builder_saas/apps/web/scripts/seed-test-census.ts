// Test Census Seed - Comprehensive test data for billing model validation
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local from the web app root
dotenv.config({ path: join(__dirname, "..", ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const db = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log("🌱 Starting Test Census Seed...\n");

  // Clean existing test data
  console.log("🧹 Cleaning existing test data...");
  const { data: existingCompanies } = await db
    .from("companies")
    .select("id")
    .ilike("name", "Test Company%");

  if (existingCompanies && existingCompanies.length > 0) {
    for (const company of existingCompanies) {
      await db.from("companies").delete().eq("id", company.id);
    }
    console.log(`   Deleted ${existingCompanies.length} test companies\n`);
  }

  // ============================================================================
  // TEST COMPANY 1: 5/3 Model with NO profit-sharing
  // ============================================================================
  console.log("📊 Creating Test Company 1: 5/3 Model (No Profit-Sharing)");

  const { data: company1, error: c1Err } = await db
    .from("companies")
    .insert({
      name: "Test Company 1 - Model 5/3",
      state: "TX",
      model: "5/3",
      pay_frequency: "biweekly",
      contact_email: "test1@example.com",
      status: "active"
    })
    .select()
    .single();

  if (c1Err || !company1) {
    console.error("❌ Failed to create company 1:", c1Err);
    process.exit(1);
  }

  // Add billing settings - no profit sharing
  await db.from("company_billing_settings").insert({
    company_id: company1.id,
    plan_tier: "standard",
    base_fee_cents: 10000, // $100 base fee
    per_employee_active_cents: 500, // $5 per employee
    maintenance_cents: 2500, // $25 maintenance
    profit_share_mode: "none",
    profit_share_percent: 0,
    tax_rate_percent: 8.25 // TX sales tax
  });

  // Add 5 employees with various benefit elections
  const emp1_1 = await db.from("employees").insert({
    company_id: company1.id,
    first_name: "John",
    last_name: "Smith",
    filing_status: "married",
    dependents: 2,
    dob: "1980-05-15",
    tobacco_use: false,
    gross_pay: 3000.00, // $3k per pay (biweekly)
    consent_status: "elect",
    active: true
  }).select().single();

  await db.from("employee_benefits").insert([
    {
      employee_id: emp1_1.data!.id,
      plan_code: "DENTAL_FAM",
      reduces_fit: true,
      reduces_fica: true,
      per_pay_amount: 50.00 // $50 per pay
    },
    {
      employee_id: emp1_1.data!.id,
      plan_code: "VISION_FAM",
      reduces_fit: true,
      reduces_fica: true,
      per_pay_amount: 15.00 // $15 per pay
    }
  ]);

  const emp1_2 = await db.from("employees").insert({
    company_id: company1.id,
    first_name: "Sarah",
    last_name: "Johnson",
    filing_status: "single",
    dependents: 0,
    dob: "1990-08-22",
    tobacco_use: false,
    gross_pay: 2500.00,
    consent_status: "elect",
    active: true
  }).select().single();

  await db.from("employee_benefits").insert([
    {
      employee_id: emp1_2.data!.id,
      plan_code: "DENTAL_IND",
      reduces_fit: true,
      reduces_fica: true,
      per_pay_amount: 25.00
    },
    {
      employee_id: emp1_2.data!.id,
      plan_code: "STD",
      reduces_fit: true,
      reduces_fica: true,
      per_pay_amount: 10.00
    }
  ]);

  const emp1_3 = await db.from("employees").insert({
    company_id: company1.id,
    first_name: "Michael",
    last_name: "Williams",
    filing_status: "married",
    dependents: 3,
    dob: "1975-12-10",
    tobacco_use: true,
    gross_pay: 4500.00, // Higher earner
    consent_status: "elect",
    active: true
  }).select().single();

  await db.from("employee_benefits").insert([
    {
      employee_id: emp1_3.data!.id,
      plan_code: "DENTAL_FAM",
      reduces_fit: true,
      reduces_fica: true,
      per_pay_amount: 50.00
    },
    {
      employee_id: emp1_3.data!.id,
      plan_code: "VISION_FAM",
      reduces_fit: true,
      reduces_fica: true,
      per_pay_amount: 15.00
    },
    {
      employee_id: emp1_3.data!.id,
      plan_code: "CANCER",
      reduces_fit: true,
      reduces_fica: true,
      per_pay_amount: 30.00
    }
  ]);

  // 2 more employees without benefits (to test mixed scenarios)
  await db.from("employees").insert([
    {
      company_id: company1.id,
      first_name: "Emily",
      last_name: "Brown",
      filing_status: "single",
      dependents: 0,
      dob: "1995-03-18",
      tobacco_use: false,
      gross_pay: 2000.00,
      consent_status: "dont",
      active: true
    },
    {
      company_id: company1.id,
      first_name: "David",
      last_name: "Martinez",
      filing_status: "head",
      dependents: 1,
      dob: "1988-07-25",
      tobacco_use: false,
      gross_pay: 2800.00,
      consent_status: "pending",
      active: true
    }
  ]);

  console.log("   ✅ Added 5 employees (3 with benefits, 2 without)");

  // ============================================================================
  // TEST COMPANY 2: 4/3 Model with EMPLOYER SAVINGS profit-sharing (20%)
  // ============================================================================
  console.log("\n📊 Creating Test Company 2: 4/3 Model (20% Employer Savings Sharing)");

  const { data: company2, error: c2Err } = await db
    .from("companies")
    .insert({
      name: "Test Company 2 - Model 4/3",
      state: "FL",
      model: "4/3",
      pay_frequency: "semimonthly",
      contact_email: "test2@example.com",
      status: "active"
    })
    .select()
    .single();

  if (c2Err || !company2) {
    console.error("❌ Failed to create company 2:", c2Err);
    process.exit(1);
  }

  await db.from("company_billing_settings").insert({
    company_id: company2.id,
    plan_tier: "enterprise",
    base_fee_cents: 15000, // $150 base fee
    per_employee_active_cents: 750, // $7.50 per employee
    maintenance_cents: 5000, // $50 maintenance
    profit_share_mode: "percent_er_savings",
    profit_share_percent: 20.00, // 20% of employer FICA savings
    tax_rate_percent: 0 // FL has no state sales tax on services
  });

  // Add 3 employees with higher benefit amounts
  const emp2_1 = await db.from("employees").insert({
    company_id: company2.id,
    first_name: "Robert",
    last_name: "Taylor",
    filing_status: "married",
    dependents: 4,
    dob: "1982-09-30",
    tobacco_use: false,
    gross_pay: 5000.00, // Semimonthly
    consent_status: "elect",
    active: true
  }).select().single();

  await db.from("employee_benefits").insert([
    {
      employee_id: emp2_1.data!.id,
      plan_code: "DENTAL_FAM",
      reduces_fit: true,
      reduces_fica: true,
      per_pay_amount: 100.00
    },
    {
      employee_id: emp2_1.data!.id,
      plan_code: "VISION_FAM",
      reduces_fit: true,
      reduces_fica: true,
      per_pay_amount: 30.00
    },
    {
      employee_id: emp2_1.data!.id,
      plan_code: "LTD",
      reduces_fit: true,
      reduces_fica: true,
      per_pay_amount: 50.00
    }
  ]);

  const emp2_2 = await db.from("employees").insert({
    company_id: company2.id,
    first_name: "Jennifer",
    last_name: "Anderson",
    filing_status: "single",
    dependents: 0,
    dob: "1992-11-05",
    tobacco_use: false,
    gross_pay: 3500.00,
    consent_status: "elect",
    active: true
  }).select().single();

  await db.from("employee_benefits").insert([
    {
      employee_id: emp2_2.data!.id,
      plan_code: "DENTAL_IND",
      reduces_fit: true,
      reduces_fica: true,
      per_pay_amount: 45.00
    }
  ]);

  const emp2_3 = await db.from("employees").insert({
    company_id: company2.id,
    first_name: "Christopher",
    last_name: "Thomas",
    filing_status: "married",
    dependents: 1,
    dob: "1985-04-12",
    tobacco_use: false,
    gross_pay: 4200.00,
    consent_status: "elect",
    active: true
  }).select().single();

  await db.from("employee_benefits").insert([
    {
      employee_id: emp2_3.data!.id,
      plan_code: "DENTAL_FAM",
      reduces_fit: true,
      reduces_fica: true,
      per_pay_amount: 75.00
    },
    {
      employee_id: emp2_3.data!.id,
      plan_code: "VISION_IND",
      reduces_fit: true,
      reduces_fica: true,
      per_pay_amount: 12.00
    }
  ]);

  console.log("   ✅ Added 3 employees (all with benefits)");

  // ============================================================================
  // TEST COMPANY 3: 5/1 Model with BB PROFIT profit-sharing (15%)
  // ============================================================================
  console.log("\n📊 Creating Test Company 3: 5/1 Model (15% BB Profit Sharing)");

  const { data: company3, error: c3Err } = await db
    .from("companies")
    .insert({
      name: "Test Company 3 - Model 5/1",
      state: "IL",
      model: "5/1",
      pay_frequency: "weekly",
      contact_email: "test3@example.com",
      status: "active"
    })
    .select()
    .single();

  if (c3Err || !company3) {
    console.error("❌ Failed to create company 3:", c3Err);
    process.exit(1);
  }

  await db.from("company_billing_settings").insert({
    company_id: company3.id,
    plan_tier: "custom",
    base_fee_cents: 0, // No base fee
    per_employee_active_cents: 1000, // $10 per employee
    maintenance_cents: 0, // No maintenance
    profit_share_mode: "percent_bb_profit",
    profit_share_percent: 15.00, // 15% of BB profit
    tax_rate_percent: 6.25 // IL sales tax
  });

  // Add 4 employees with weekly pay
  const emp3_1 = await db.from("employees").insert({
    company_id: company3.id,
    first_name: "Amanda",
    last_name: "Garcia",
    filing_status: "single",
    dependents: 0,
    dob: "1993-06-20",
    tobacco_use: false,
    gross_pay: 750.00, // Weekly
    consent_status: "elect",
    active: true
  }).select().single();

  await db.from("employee_benefits").insert([
    {
      employee_id: emp3_1.data!.id,
      plan_code: "DENTAL_IND",
      reduces_fit: true,
      reduces_fica: true,
      per_pay_amount: 12.50
    }
  ]);

  const emp3_2 = await db.from("employees").insert({
    company_id: company3.id,
    first_name: "Matthew",
    last_name: "Rodriguez",
    filing_status: "married",
    dependents: 2,
    dob: "1987-02-14",
    tobacco_use: false,
    gross_pay: 1000.00,
    consent_status: "elect",
    active: true
  }).select().single();

  await db.from("employee_benefits").insert([
    {
      employee_id: emp3_2.data!.id,
      plan_code: "DENTAL_FAM",
      reduces_fit: true,
      reduces_fica: true,
      per_pay_amount: 25.00
    },
    {
      employee_id: emp3_2.data!.id,
      plan_code: "VISION_FAM",
      reduces_fit: true,
      reduces_fica: true,
      per_pay_amount: 7.50
    }
  ]);

  await db.from("employees").insert([
    {
      company_id: company3.id,
      first_name: "Jessica",
      last_name: "Lee",
      filing_status: "head",
      dependents: 2,
      dob: "1989-10-08",
      tobacco_use: false,
      gross_pay: 850.00,
      consent_status: "elect",
      active: true
    },
    {
      company_id: company3.id,
      first_name: "Daniel",
      last_name: "White",
      filing_status: "single",
      dependents: 0,
      dob: "1991-12-28",
      tobacco_use: false,
      gross_pay: 900.00,
      consent_status: "dont",
      active: true
    }
  ]);

  console.log("   ✅ Added 4 employees (2 with benefits, 2 without)");

  // ============================================================================
  // TEST COMPANY 4: 4/4 Model with high profit-sharing (25% ER Savings)
  // ============================================================================
  console.log("\n📊 Creating Test Company 4: 4/4 Model (25% Employer Savings Sharing)");

  const { data: company4, error: c4Err } = await db
    .from("companies")
    .insert({
      name: "Test Company 4 - Model 4/4",
      state: "PA",
      model: "4/4",
      pay_frequency: "monthly",
      contact_email: "test4@example.com",
      status: "active"
    })
    .select()
    .single();

  if (c4Err || !company4) {
    console.error("❌ Failed to create company 4:", c4Err);
    process.exit(1);
  }

  await db.from("company_billing_settings").insert({
    company_id: company4.id,
    plan_tier: "starter",
    base_fee_cents: 5000, // $50 base fee
    per_employee_active_cents: 250, // $2.50 per employee
    maintenance_cents: 0,
    profit_share_mode: "percent_er_savings",
    profit_share_percent: 25.00, // 25% of employer FICA savings
    tax_rate_percent: 6.00 // PA sales tax
  });

  // Add 6 employees with monthly pay
  const emp4_1 = await db.from("employees").insert({
    company_id: company4.id,
    first_name: "Michelle",
    last_name: "Hall",
    filing_status: "married",
    dependents: 3,
    dob: "1983-08-17",
    tobacco_use: false,
    gross_pay: 6000.00, // Monthly
    consent_status: "elect",
    active: true
  }).select().single();

  await db.from("employee_benefits").insert([
    {
      employee_id: emp4_1.data!.id,
      plan_code: "DENTAL_FAM",
      reduces_fit: true,
      reduces_fica: true,
      per_pay_amount: 150.00
    },
    {
      employee_id: emp4_1.data!.id,
      plan_code: "VISION_FAM",
      reduces_fit: true,
      reduces_fica: true,
      per_pay_amount: 40.00
    },
    {
      employee_id: emp4_1.data!.id,
      plan_code: "LTD",
      reduces_fit: true,
      reduces_fica: true,
      per_pay_amount: 60.00
    },
    {
      employee_id: emp4_1.data!.id,
      plan_code: "STD",
      reduces_fit: true,
      reduces_fica: true,
      per_pay_amount: 25.00
    }
  ]);

  await db.from("employees").insert([
    {
      company_id: company4.id,
      first_name: "Kevin",
      last_name: "Young",
      filing_status: "single",
      dependents: 0,
      dob: "1994-01-09",
      tobacco_use: false,
      gross_pay: 4500.00,
      consent_status: "elect",
      active: true
    },
    {
      company_id: company4.id,
      first_name: "Lisa",
      last_name: "King",
      filing_status: "married",
      dependents: 1,
      dob: "1986-05-23",
      tobacco_use: false,
      gross_pay: 5500.00,
      consent_status: "elect",
      active: true
    },
    {
      company_id: company4.id,
      first_name: "Brian",
      last_name: "Wright",
      filing_status: "head",
      dependents: 2,
      dob: "1990-09-11",
      tobacco_use: true,
      gross_pay: 4800.00,
      consent_status: "dont",
      active: true
    },
    {
      company_id: company4.id,
      first_name: "Nancy",
      last_name: "Lopez",
      filing_status: "single",
      dependents: 0,
      dob: "1992-07-04",
      tobacco_use: false,
      gross_pay: 4200.00,
      consent_status: "pending",
      active: true
    },
    {
      company_id: company4.id,
      first_name: "Steven",
      last_name: "Hill",
      filing_status: "married",
      dependents: 2,
      dob: "1984-11-19",
      tobacco_use: false,
      gross_pay: 7000.00, // High earner
      consent_status: "elect",
      active: true
    }
  ]);

  console.log("   ✅ Added 6 employees (varied benefit elections)");

  // ============================================================================
  // Summary
  // ============================================================================
  console.log("\n" + "=".repeat(70));
  console.log("📋 TEST CENSUS SUMMARY");
  console.log("=".repeat(70));
  console.log("");
  console.log("✅ Test Company 1 - Model 5/3 (TX, Biweekly)");
  console.log("   • 5 employees (3 with benefits)");
  console.log("   • Profit-sharing: NONE");
  console.log("   • Base fee: $100, Per-employee: $5, Maintenance: $25");
  console.log("");
  console.log("✅ Test Company 2 - Model 4/3 (FL, Semimonthly)");
  console.log("   • 3 employees (all with benefits)");
  console.log("   • Profit-sharing: 20% of Employer FICA Savings");
  console.log("   • Base fee: $150, Per-employee: $7.50, Maintenance: $50");
  console.log("");
  console.log("✅ Test Company 3 - Model 5/1 (IL, Weekly)");
  console.log("   • 4 employees (2 with benefits)");
  console.log("   • Profit-sharing: 15% of BB Profit");
  console.log("   • Base fee: $0, Per-employee: $10, Maintenance: $0");
  console.log("");
  console.log("✅ Test Company 4 - Model 4/4 (PA, Monthly)");
  console.log("   • 6 employees (varied elections)");
  console.log("   • Profit-sharing: 25% of Employer FICA Savings");
  console.log("   • Base fee: $50, Per-employee: $2.50, Maintenance: $0");
  console.log("");
  console.log("=".repeat(70));
  console.log("🎯 Total: 4 companies, 18 employees");
  console.log("🎯 All 4 billing models represented (5/3, 4/3, 5/1, 4/4)");
  console.log("🎯 All pay frequencies covered (weekly, biweekly, semimonthly, monthly)");
  console.log("🎯 All profit-sharing modes tested (none, % ER savings, % BB profit)");
  console.log("=".repeat(70));
  console.log("\n✨ Test census seed complete!\n");
}

main().catch(console.error);
