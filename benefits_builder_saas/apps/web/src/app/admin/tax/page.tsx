// apps/web/src/app/admin/tax/page.tsx
import { createServiceClient } from "@/lib/supabase";
import type { Route } from "next";

export const dynamic = "force-dynamic";

function thisPeriod() {
  const now = new Date();
  return { year: now.getFullYear() };
}

export default async function TaxAdminPage() {
  const { year } = thisPeriod();
  const db = createServiceClient();

  // Load federal params for current year (if any)
  const { data: fed } = await db
    .from("tax_federal_params")
    .select("tax_year, ss_rate, med_rate")
    .eq("tax_year", year)
    .maybeSingle();

  // Count of 15-T rows for this year
  const { count: count15t } = await db
    .from("withholding_federal_15t")
    .select("*", { count: "exact", head: true })
    .eq("tax_year", year);

  // --- Server actions ---
  async function saveFederal(formData: FormData) {
    "use server";
    const db = createServiceClient();
    const tax_year = Number(formData.get("tax_year") || year);
    const ss_rate = Number(formData.get("ss_rate") || 0);
    const med_rate = Number(formData.get("med_rate") || 0);

    // Minimal validation
    if (!(tax_year > 2000 && tax_year < 2100)) throw new Error("Invalid year");
    if (ss_rate < 0 || med_rate < 0) throw new Error("Rates must be >= 0");

    const { error } = await db.from("tax_federal_params").upsert(
      { tax_year, ss_rate, med_rate },
      { onConflict: "tax_year" }
    );
    if (error) throw new Error(error.message);
  }

  async function upsert15T(formData: FormData) {
    "use server";
    const db = createServiceClient();
    const tax_year = Number(formData.get("t15_year"));
    const filing_status = String(formData.get("filing_status") || "single");
    const pay_frequency = String(formData.get("pay_frequency") || "biweekly");
    const raw = String(formData.get("percentage_method_json") || "[]");

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      throw new Error("percentage_method_json must be valid JSON");
    }

    const { error } = await db
      .from("withholding_federal_15t")
      .upsert(
        { tax_year, filing_status, pay_frequency, percentage_method_json: json },
        { onConflict: "tax_year,filing_status,pay_frequency" }
      );
    if (error) throw new Error(error.message);
  }

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tax Admin</h1>
        <nav className="flex gap-2">
          <a className="px-3 py-2 rounded-lg border" href={"/admin/tax/states" as Route}>
            Manage States
          </a>
        </nav>
      </div>

      {/* Federal params */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Federal — FICA Rates</h2>
        <p className="text-sm text-slate-600">
          Configure Social Security and Medicare rates for the tax year used in FICA savings.
        </p>
        <form action={saveFederal} className="p-4 rounded-xl bg-white border grid gap-4 md:grid-cols-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tax Year</label>
            <input
              name="tax_year"
              type="number"
              defaultValue={fed?.tax_year ?? year}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">SS Rate (decimal)</label>
            <input
              name="ss_rate"
              type="number"
              step="0.0001"
              defaultValue={fed?.ss_rate ?? 0}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Medicare Rate (decimal)</label>
            <input
              name="med_rate"
              type="number"
              step="0.0001"
              defaultValue={fed?.med_rate ?? 0}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>
          <div className="flex items-end">
            <button className="px-4 py-2 rounded-xl bg-slate-900 text-white">Save Federal</button>
          </div>
        </form>
      </section>

      {/* 15-T upload */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">IRS 15-T — Percentage Method (per-status & per-frequency)</h2>
        <p className="text-sm text-slate-600">
          Store the percentage-method table JSON for each filing status and pay frequency (e.g., single/biweekly).
          Current year {year} has <b>{count15t ?? 0}</b> entries.
        </p>

        <form action={upsert15T} className="p-4 rounded-xl bg-white border grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium mb-1">Tax Year</label>
            <input
              name="t15_year"
              type="number"
              defaultValue={year}
              className="w-full rounded-lg border px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Filing Status</label>
            <select name="filing_status" className="w-full rounded-lg border px-3 py-2">
              <option value="single">single</option>
              <option value="married">married</option>
              <option value="head">head</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Pay Frequency</label>
            <select name="pay_frequency" className="w-full rounded-lg border px-3 py-2">
              <option value="weekly">weekly</option>
              <option value="biweekly">biweekly</option>
              <option value="semimonthly">semimonthly</option>
              <option value="monthly">monthly</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium mb-1">percentage_method_json</label>
            <textarea
              name="percentage_method_json"
              rows={10}
              placeholder='[ { "over": 0, "base": 0, "rate": 0.10 }, ... ]'
              className="w-full rounded-lg border px-3 py-2 font-mono text-sm"
              required
            />
          </div>

          <div className="md:col-span-3 flex justify-end">
            <button className="px-4 py-2 rounded-xl bg-slate-900 text-white">Upsert 15-T Row</button>
          </div>
        </form>
      </section>
    </main>
  );
}
