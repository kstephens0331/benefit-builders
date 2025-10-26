// apps/web/src/app/companies/[id]/page.tsx
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

export default async function CompanyPage({ params }: Params) {
  const { id: companyId } = await params;
  const db = createServiceClient();

  const { data: company, error: cErr } = await db
    .from("companies")
    .select("id,name,state,model,status")
    .eq("id", companyId)
    .single();

  if (cErr || !company) {
    return (
      <main className="max-w-7xl mx-auto p-6">
        <pre className="text-red-600">{cErr?.message ?? "Company not found"}</pre>
      </main>
    );
  }

  const { data: employees, error: eErr } = await db
    .from("employees")
    .select(
      "id,first_name,last_name,filing_status,dependents,gross_pay:paycheck_gross,consent_status,active"
    )
    .eq("company_id", companyId)
    .order("last_name");

  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{company.name}</h1>
          <p className="text-slate-600 text-sm">
            {company.state} · Model {company.model} · {company.status}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/companies/${companyId}/add-employee`}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white"
          >
            Add Employee
          </Link>
          <a
            href={`/companies/${companyId}/billing/pdf?period=${period}`}
            target="_blank"
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white"
          >
            Download Invoice PDF
          </a>
          <a
            href={`/companies/${companyId}/roster/pdf`}
            target="_blank"
            className="px-4 py-2 rounded-xl border border-slate-300"
          >
            Download Roster PDF
          </a>
          <a
  href={`/companies/${companyId}/proposal/pdf?period=${period}`}
  target="_blank"
  className="px-4 py-2 rounded-xl bg-emerald-600 text-white"
>
  Download Proposal PDF
</a>
        </div>
      </div>

      {eErr ? (
        <pre className="text-red-600">{eErr.message}</pre>
      ) : (
        <div className="grid gap-2">
          {(employees ?? []).map((emp) => (
            <Link
              key={emp.id}
              href={`/companies/${companyId}/employees/${emp.id}`}
              className="p-4 bg-white rounded-xl shadow flex items-center justify-between hover:shadow-lg transition cursor-pointer"
            >
              <div>
                <div className="font-medium">
                  {emp.last_name}, {emp.first_name}
                </div>
                <div className="text-sm text-slate-600">
                  Status: {emp.consent_status} · Filing: {emp.filing_status} · Dependents:{" "}
                  {emp.dependents} · Gross: $
                  {typeof emp.gross_pay === "number"
                    ? emp.gross_pay.toFixed(2)
                    : String(emp.gross_pay ?? "")}
                </div>
              </div>
              <span
                className={
                  "px-3 py-1 rounded-full text-sm " +
                  (emp.active ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-700")
                }
              >
                {emp.active ? "active" : "inactive"}
              </span>
            </Link>
          ))}
          {(!employees || employees.length === 0) && (
            <p className="text-slate-600">No employees yet.</p>
          )}
        </div>
      )}
    </main>
  );
}
