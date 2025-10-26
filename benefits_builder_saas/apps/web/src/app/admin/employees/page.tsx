// apps/web/src/app/admin/employees/page.tsx
import { createServiceClient } from "@/lib/supabase";
import Link from "next/link";

type SearchParams = Promise<{ active?: string }>;

export default async function AdminEmployeesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filterActive = params.active === "true";

  const db = createServiceClient();

  // Build query
  let query = db
    .from("employees")
    .select(`
      id,
      first_name,
      last_name,
      gross_pay,
      active,
      consent_status,
      companies (
        id,
        name
      )
    `)
    .order("last_name");

  // Apply filter if specified
  if (filterActive) {
    query = query.eq("active", true);
  }

  const { data: employees, error } = await query;

  if (error) {
    return (
      <main className="max-w-7xl mx-auto p-6">
        <pre className="text-red-600">{error.message}</pre>
      </main>
    );
  }

  const activeCount = employees?.filter((e) => e.active).length || 0;
  const inactiveCount = employees?.filter((e) => !e.active).length || 0;

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">All Employees</h1>
          <p className="text-slate-600 text-sm">
            {employees?.length || 0} total · {activeCount} active · {inactiveCount} inactive
          </p>
        </div>
        <Link
          href="/admin"
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium"
        >
          ← Back to Admin
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b">
        <Link
          href="/admin/employees"
          className={`px-4 py-2 font-medium border-b-2 transition ${
            !filterActive
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          All Employees ({employees?.length || 0})
        </Link>
        <Link
          href="/admin/employees?active=true"
          className={`px-4 py-2 font-medium border-b-2 transition ${
            filterActive
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          Active Only ({activeCount})
        </Link>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        {employees && employees.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-sm">Employee</th>
                  <th className="px-4 py-3 text-left font-semibold text-sm">Company</th>
                  <th className="px-4 py-3 text-right font-semibold text-sm">Gross Pay</th>
                  <th className="px-4 py-3 text-center font-semibold text-sm">Consent</th>
                  <th className="px-4 py-3 text-center font-semibold text-sm">Status</th>
                  <th className="px-4 py-3 text-center font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {employees.map((emp: any) => (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {emp.last_name}, {emp.first_name}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {emp.companies ? (
                        <Link
                          href={`/companies/${emp.companies.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {emp.companies.name}
                        </Link>
                      ) : (
                        <span className="text-slate-400">No company</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      ${Number(emp.gross_pay || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          emp.consent_status === "enrolled"
                            ? "bg-green-100 text-green-700"
                            : emp.consent_status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {emp.consent_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          emp.active
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {emp.active ? "active" : "inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {emp.companies && (
                        <Link
                          href={`/companies/${emp.companies.id}/employees/${emp.id}`}
                          className="text-blue-600 hover:underline text-sm font-medium"
                        >
                          View
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <p className="text-lg">No employees found</p>
          </div>
        )}
      </div>
    </main>
  );
}
