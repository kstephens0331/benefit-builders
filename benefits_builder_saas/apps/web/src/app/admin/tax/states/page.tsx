// apps/web/src/app/admin/tax/states/page.tsx
import { createServiceClient } from "@/lib/supabase";
import Link from "next/link";
import type { Route } from "next";

export const dynamic = "force-dynamic";

export default async function StatesTaxPage() {
  const db = createServiceClient();
  const now = new Date();
  const year = now.getFullYear();

  const { data: rows, error } = await db
    .from("tax_state_params")
    .select("state, tax_year, method, flat_rate")
    .order("state");
  if (error) {
    return (
      <main className="max-w-7xl mx-auto p-6">
        <pre className="text-red-600">{error.message}</pre>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">State Tax Parameters</h1>
        <Link
          className="px-4 py-2 rounded-xl bg-slate-900 text-white"
          href={`/admin/tax/states/${"TX"}?year=${year}` as Route}
        >
          Quick Add TX {year}
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="text-left p-3">State</th>
              <th className="text-left p-3">Year</th>
              <th className="text-left p-3">Method</th>
              <th className="text-right p-3">Flat Rate</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r, i) => (
              <tr key={`${r.state}-${r.tax_year}-${i}`} className="border-t">
                <td className="p-3">{r.state}</td>
                <td className="p-3">{r.tax_year}</td>
                <td className="p-3">{r.method}</td>
                <td className="p-3 text-right">
                  {r.flat_rate != null ? `${(Number(r.flat_rate) * 100).toFixed(2)}%` : "-"}
                </td>
                <td className="p-3 text-right">
                  <Link
                    href={`/admin/tax/states/${r.state}?year=${r.tax_year}` as Route}
                    className="px-3 py-2 rounded-lg border"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {(!rows || rows.length === 0) && (
              <tr>
                <td className="p-4 text-slate-600" colSpan={5}>
                  No state tax rows found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
