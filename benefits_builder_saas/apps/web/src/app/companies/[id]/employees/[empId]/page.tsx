// src/app/companies/[id]/employees/[empId]/page.tsx
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";

export default async function EmployeePage({
  params,
}: { params: Promise<{ id: string; empId: string }> }) {
  const { id: companyId, empId } = await params;
  const db = createServiceClient();

  const { data: emp, error } = await db
    .from("employees")
    .select(
      "id, first_name, last_name, state, pay_period, paycheck_gross, filing_status, dependents, active, hire_date, dob, inactive_date"
    )
    .eq("id", empId)
    .single();

  if (error || !emp) {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <pre className="text-red-600">{error?.message ?? "Employee not found"}</pre>
      </main>
    );
  }

  const label = "text-xs uppercase tracking-wide text-slate-500";
  const row = "grid grid-cols-2 gap-4";

  const payMap: Record<string, string> = { w: "weekly", b: "biweekly", s: "semimonthly", m: "monthly" };

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {emp.last_name}, {emp.first_name}
          </h1>
          <p className="text-slate-600 text-sm">
            {emp.state} · {payMap[emp.pay_period] ?? emp.pay_period} ·{" "}
            {emp.active ? "active" : `inactive${emp.inactive_date ? ` since ${emp.inactive_date}` : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/companies/${companyId}/employees/${emp.id}/compare`}
            className="px-3 py-2 rounded-lg bg-slate-900 text-white"
          >
            Compare
          </Link>
          <Link
            href={`/companies/${companyId}/employees/${emp.id}/benefits`}
            className="px-3 py-2 rounded-lg bg-slate-100"
          >
            Benefits
          </Link>
          <Link href={`/companies/${companyId}`} className="text-sm underline">
            Back to Company
          </Link>
        </div>
      </div>

      <div className="p-4 bg-white rounded-2xl shadow space-y-3">
        <div className={row}>
          <div>
            <div className={label}>Gross per pay</div>
            <div className="font-medium">${Number(emp.paycheck_gross ?? 0).toFixed(2)}</div>
          </div>
          <div>
            <div className={label}>Filing status</div>
            <div className="font-medium">{emp.filing_status}</div>
          </div>
        </div>
        <div className={row}>
          <div>
            <div className={label}>Dependents</div>
            <div className="font-medium">{emp.dependents ?? 0}</div>
          </div>
          <div>
            <div className={label}>Hire date</div>
            <div className="font-medium">{emp.hire_date ?? "—"}</div>
          </div>
        </div>
        <div className={row}>
          <div>
            <div className={label}>DOB</div>
            <div className="font-medium">{emp.dob ?? "—"}</div>
          </div>
          <div>
            <div className={label}>Inactive date</div>
            <div className="font-medium">{emp.inactive_date ?? "—"}</div>
          </div>
        </div>
      </div>
    </main>
  );
}
