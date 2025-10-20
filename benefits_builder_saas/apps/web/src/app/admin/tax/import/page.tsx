// src/app/admin/tax/import/page.tsx
import { redirect } from "next/navigation";

export const metadata = { title: "Tax Import" };

type FifteenTRow = { over: number; baseTax: number; pct: number };

async function saveFederalParams(formData: FormData) {
  "use server";
  const db = (await import("@/lib/supabase")).createServiceClient();
  const tax_year = Number(formData.get("tax_year"));
  const ss_rate = Number(formData.get("ss_rate"));
  const med_rate = Number(formData.get("med_rate"));
  if (!tax_year) throw new Error("tax_year required");

  const { error } = await db.from("tax_federal_params").upsert(
    { tax_year, ss_rate, med_rate },
    { onConflict: "tax_year" }
  );
  if (error) throw new Error(error.message);
  redirect("/admin/tax");
}

async function saveFifteenT(formData: FormData) {
  "use server";
  const db = (await import("@/lib/supabase")).createServiceClient();
  const tax_year = Number(formData.get("t15_year"));
  const filing_status = String(formData.get("t15_status") ?? "").trim(); // "single" | "married" | "head"
  const pay_frequency = String(formData.get("t15_freq") ?? "").trim();   // "weekly" | "biweekly" | "semimonthly" | "monthly"
  const tableJson = String(formData.get("t15_json") ?? "");

  if (!tax_year || !filing_status || !pay_frequency) throw new Error("All fields required");
  let parsed: FifteenTRow[];
  try {
    parsed = JSON.parse(tableJson);
  } catch {
    throw new Error("Invalid JSON for 15-T table");
  }

  const { error } = await db.from("withholding_federal_15t").upsert(
    {
      tax_year,
      filing_status,
      pay_frequency,
      percentage_method_json: parsed,
    },
    { onConflict: "tax_year,filing_status,pay_frequency" }
  );
  if (error) throw new Error(error.message);
  redirect("/admin/tax");
}

async function saveStateParams(formData: FormData) {
  "use server";
  const db = (await import("@/lib/supabase")).createServiceClient();
  const state = String(formData.get("state") ?? "").toUpperCase();
  const tax_year = Number(formData.get("state_year"));
  const method = String(formData.get("state_method") ?? "none"); // "none" | "flat" | "brackets"
  const flat_rate = formData.get("flat_rate");
  const bracketsJson = String(formData.get("brackets_json") ?? "");

  let brackets: any = null;
  if (method === "brackets") {
    try {
      brackets = JSON.parse(bracketsJson);
    } catch {
      throw new Error("Invalid JSON for brackets");
    }
  }

  const { error } = await db.from("tax_state_params").upsert(
    {
      state,
      tax_year,
      method,
      flat_rate: flat_rate ? Number(flat_rate) : null,
      brackets,
    },
    { onConflict: "state,tax_year" }
  );
  if (error) throw new Error(error.message);
  redirect("/admin/tax");
}

export default function TaxImportPage() {
  return (
    <main className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Import / Update Tax Data</h1>

      {/* Federal Params */}
      <section className="p-4 bg-white rounded-2xl shadow space-y-3">
        <h2 className="font-semibold">Federal Parameters (Social Security & Medicare)</h2>
        <form action={saveFederalParams} className="grid md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-sm">Tax Year</label>
            <input name="tax_year" type="number" className="border rounded-lg p-2 w-full" defaultValue={2025} />
          </div>
          <div>
            <label className="text-sm">SS Rate</label>
            <input name="ss_rate" type="number" step="0.0001" className="border rounded-lg p-2 w-full" placeholder="0.062" />
          </div>
          <div>
            <label className="text-sm">Med Rate</label>
            <input name="med_rate" type="number" step="0.0001" className="border rounded-lg p-2 w-full" placeholder="0.0145" />
          </div>
          <button className="px-4 py-2 rounded-xl bg-slate-900 text-white">Save Federal Params</button>
        </form>
        <p className="text-xs text-slate-500">
          Tip: These are decimal rates (e.g., 0.062 = 6.2%).
        </p>
      </section>

      {/* 15-T */}
      <section className="p-4 bg-white rounded-2xl shadow space-y-3">
        <h2 className="font-semibold">IRS Pub. 15-T — Percentage Method (per frequency & filing)</h2>
        <form action={saveFifteenT} className="space-y-3">
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm">Tax Year</label>
              <input name="t15_year" type="number" className="border rounded-lg p-2 w-full" defaultValue={2025} />
            </div>
            <div>
              <label className="text-sm">Filing Status</label>
              <select name="t15_status" className="border rounded-lg p-2 w-full" defaultValue="single">
                <option value="single">single</option>
                <option value="married">married</option>
                <option value="head">head</option>
              </select>
            </div>
            <div>
              <label className="text-sm">Pay Frequency</label>
              <select name="t15_freq" className="border rounded-lg p-2 w-full" defaultValue="biweekly">
                <option value="weekly">weekly</option>
                <option value="biweekly">biweekly</option>
                <option value="semimonthly">semimonthly</option>
                <option value="monthly">monthly</option>
              </select>
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-sm">Percentage Table JSON</label>
            <textarea
              name="t15_json"
              rows={8}
              className="border rounded-lg p-2 w-full font-mono"
              placeholder='[{"over":0,"baseTax":0,"pct":0.1},{"over":500,"baseTax":50,"pct":0.12}]'
            />
          </div>
          <button className="px-4 py-2 rounded-xl bg-slate-900 text-white">Save 15-T Table</button>
        </form>
        <p className="text-xs text-slate-500">
          Shape: sorted rows with <code>over</code>, <code>baseTax</code>, and <code>pct</code> for the frequency/status.
        </p>
      </section>

      {/* State */}
      <section className="p-4 bg-white rounded-2xl shadow space-y-3">
        <h2 className="font-semibold">State Withholding Params</h2>
        <form action={saveStateParams} className="space-y-3">
          <div className="grid md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-sm">State</label>
              <input name="state" className="border rounded-lg p-2 w-full" placeholder="TX" />
            </div>
            <div>
              <label className="text-sm">Tax Year</label>
              <input name="state_year" type="number" className="border rounded-lg p-2 w-full" defaultValue={2025} />
            </div>
            <div>
              <label className="text-sm">Method</label>
              <select name="state_method" className="border rounded-lg p-2 w-full" defaultValue="none">
                <option value="none">none (no SIT)</option>
                <option value="flat">flat</option>
                <option value="brackets">brackets</option>
              </select>
            </div>
            <div>
              <label className="text-sm">Flat Rate (if flat)</label>
              <input name="flat_rate" type="number" step="0.0001" className="border rounded-lg p-2 w-full" placeholder="0.05" />
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-sm">Brackets JSON (if method = brackets)</label>
            <textarea
              name="brackets_json"
              rows={6}
              className="border rounded-lg p-2 w-full font-mono"
              placeholder='[{"over":0,"baseTax":0,"pct":0.03},{"over":1000,"baseTax":30,"pct":0.05}]'
            />
          </div>
          <button className="px-4 py-2 rounded-xl bg-slate-900 text-white">Save State Params</button>
        </form>
        <p className="text-xs text-slate-500">
          Leave method = <em>none</em> for states without SIT (e.g., TX, FL).
        </p>
      </section>
    </main>
  );
}
