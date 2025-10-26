// apps/web/src/app/companies/archived/page.tsx
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";

export default async function ArchivedCompaniesPage() {
  const db = createServiceClient();

  const { data: companies, error } = await db
    .from("companies")
    .select("id, name, state, model, status, employer_rate, employee_rate, pay_frequency")
    .eq("status", "inactive")
    .order("name");

  if (error) {
    return (
      <main className="max-w-7xl mx-auto p-6">
        <pre className="text-red-600">{error.message}</pre>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Archived Companies</h1>
          <p className="text-slate-600 text-sm">Companies marked as inactive</p>
        </div>
        <Link
          href="/companies"
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium"
        >
          ← Back to Active Companies
        </Link>
      </div>

      <div className="grid gap-2">
        {companies && companies.length > 0 ? (
          companies.map((c) => (
            <div
              key={c.id}
              className="p-4 bg-white rounded-xl shadow hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-4">
                <Link href={`/companies/${c.id}`} className="flex-1">
                  <div className="font-medium text-lg">{c.name}</div>
                  <div className="text-sm text-slate-600">
                    {c.state} · Model {c.model} · {c.pay_frequency}
                  </div>
                </Link>

                <span className="px-3 py-1 rounded-full text-sm bg-slate-200 text-slate-700">
                  {c.status}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-xl shadow">
            <p className="text-slate-600 text-lg">No archived companies</p>
            <p className="text-slate-500 text-sm mt-2">
              Companies marked as inactive will appear here
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
