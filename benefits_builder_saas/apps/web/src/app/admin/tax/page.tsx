// src/app/admin/tax/page.tsx
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";

export const metadata = { title: "Tax Admin" };

export default async function TaxAdminPage() {
  const db = createServiceClient();
  const { data: latestFed } = await db
    .from("tax_federal_params")
    .select("tax_year, ss_rate, med_rate")
    .order("tax_year", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Tax Administration</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="p-4 bg-white rounded-2xl shadow">
          <h2 className="font-semibold mb-2">Federal Params</h2>
          <div className="text-sm text-slate-600">
            Latest Year: {latestFed?.tax_year ?? "—"} · SS: {latestFed?.ss_rate ?? "—"} · Med: {latestFed?.med_rate ?? "—"}
          </div>
          <Link className="inline-block mt-3 px-3 py-2 rounded-lg bg-slate-900 text-white" href="/admin/tax/import">
            Import / Update
          </Link>
        </div>
        <div className="p-4 bg-white rounded-2xl shadow">
          <h2 className="font-semibold mb-2">IRS 15-T & State Rules</h2>
          <p className="text-sm text-slate-600">Manage Pub. 15-T percentage tables and state withholding parameters.</p>
          <Link className="inline-block mt-3 px-3 py-2 rounded-lg bg-slate-900 text-white" href="/admin/tax/import">
            Import / Update
          </Link>
        </div>
      </div>
    </main>
  );
}
