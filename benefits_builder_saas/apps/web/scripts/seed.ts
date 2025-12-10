import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const db = createClient(url, service);

async function main() {
  console.log("Seeding plan models, company, employee...");

  // Plan models
  await db.from("plan_models").upsert([
    { id: "3_4", name: "3/4", employee_cap_pct: 0.03, employer_cap_pct: 0.04 },
    { id: "5_1", name: "5/1", employee_cap_pct: 0.05, employer_cap_pct: 0.01 },
    { id: "5_3", name: "5/3", employee_cap_pct: 0.05, employer_cap_pct: 0.03 },
    { id: "4_4", name: "4/4", employee_cap_pct: 0.04, employer_cap_pct: 0.04 }
  ]);

  // Company
  const { data: company, error: cErr } = await db.from("companies").insert({
    name: "Advanced Assisted Living",
    state: "MO",
    model: "5/1",
    pay_frequency: "biweekly",
    contact_email: "owner@example.com",
    status: "active"
  }).select().single();
  if (cErr) throw cErr;

  // Employee
  if (company) {
    const { error: eErr } = await db.from("employees").insert({
      company_id: company.id,
      first_name: "Stephanie",
      last_name: "Bess",
      filing_status: "single",
      dependents: 0,
      gross_pay: 1000,
      consent_status: "elect",
      tobacco_use: false
    });
    if (eErr) throw eErr;
  }

  // Billing settings
  if (company) {
    await db.from("company_billing_settings").upsert({
      company_id: company.id,
      plan_tier: "standard",
      base_fee_cents: 0,
      per_employee_active_cents: 0,
      per_report_cents: 0,
      profit_share_mode: "none",
      profit_share_percent: 0,
      maintenance_cents: 0,
      tax_rate_percent: 0
    });
  }

  console.log("✅ Seed complete");
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
