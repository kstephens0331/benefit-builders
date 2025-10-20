// src/app/admin/catalog/page.tsx
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";

export const metadata = { title: "Benefit Catalog" };

function yesNo(v: boolean | null | undefined) {
  return v ? "Yes" : "No";
}

export default async function CatalogListPage() {
  const db = createServiceClient();
  const { data, error } = await db
    .from("benefit_catalog")
    .select("plan_code, description, reduces_fit, reduces_fica, annual_limit, law_reference, effective_year, expires_year")
    .order("plan_code");

  if (error) {
    return (
      <main className="max-w-6xl mx-auto p-6">
        <pre className="text-red-600">{error.message}</pre>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Benefit Catalog</h1>
        <div className="flex gap-2">
          <Link href="/admin/catalog/add" className="px-3 py-2 rounded-lg bg-slate-900 text-white">
            Add Benefit
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-2xl shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left bg-slate-50">
              <th className="p-3">Code</th>
              <th className="p-3">Description</th>
              <th className="p-3">FIT</th>
              <th className="p-3">FICA</th>
              <th className="p-3">Annual Cap</th>
              <th className="p-3">Law Ref</th>
              <th className="p-3">Effective</th>
              <th className="p-3">Expires</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((r) => (
              <tr key={r.plan_code} className="border-t">
                <td className="p-3 font-mono">{r.plan_code}</td>
                <td className="p-3">{r.description}</td>
                <td className="p-3">{yesNo(r.reduces_fit)}</td>
                <td className="p-3">{yesNo(r.reduces_fica)}</td>
                <td className="p-3">{r.annual_limit ?? "—"}</td>
                <td className="p-3">{r.law_reference ?? "—"}</td>
                <td className="p-3">{r.effective_year}</td>
                <td className="p-3">{r.expires_year ?? "—"}</td>
                <td className="p-3">
                  <Link
                    href={`/admin/catalog/${encodeURIComponent(r.plan_code)}`}
                    className="text-slate-700 hover:underline"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {!data?.length && (
              <tr>
                <td className="p-3 text-slate-600" colSpan={9}>No catalog rows yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
