// src/app/companies/page.tsx
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";

export const metadata = { title: "Companies" };

export default async function CompaniesPage() {
  const db = createServiceClient();
  const { data, error } = await db
    .from("companies")
    .select("id,name,state,model,status")
    .order("name");

  if (error) {
    return (
      <main className="max-w-6xl mx-auto p-6">
        <pre className="text-red-600">{error.message}</pre>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Companies</h1>
      <div className="grid gap-2">
        {(data ?? []).map((c) => (
          <Link
            key={c.id}
            href={`/companies/${c.id}`}
            className="p-4 bg-white rounded-xl shadow hover:bg-slate-50 transition block"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-sm text-slate-600">{c.state} · Model {c.model}</div>
              </div>
              <span className={"px-3 py-1 rounded-full text-sm " + (c.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-700")}>
                {c.status}
              </span>
            </div>
          </Link>
        ))}
        {!data?.length && <p className="text-slate-600">No companies.</p>}
      </div>
    </main>
  );
}
