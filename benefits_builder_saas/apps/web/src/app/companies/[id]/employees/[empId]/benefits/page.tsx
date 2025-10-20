// src/app/companies/[id]/employees/[empId]/benefits/page.tsx
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";

async function toggleBenefit(formData: FormData) {
  "use server";
  const db = (await import("@/lib/supabase")).createServiceClient();

  const employeeId = String(formData.get("employee_id") ?? "");
  const plan_code = String(formData.get("plan_code") ?? "");
  const catalog_code = String(formData.get("catalog_code") ?? "");
  const makeActive = String(formData.get("make_active") ?? "false") === "true";

  if (!employeeId || (!plan_code && !catalog_code)) {
    throw new Error("Missing keys");
  }

  // Toggle by matching on employee + (catalog_code or plan_code)
  const query = db.from("employee_benefits").update({ active: makeActive });
  if (catalog_code) {
    await query.eq("employee_id", employeeId).eq("catalog_code", catalog_code);
  } else {
    await query.eq("employee_id", employeeId).eq("plan_code", plan_code);
  }
}

export default async function BenefitsPage({
  params,
}: {
  params: Promise<{ id: string; empId: string }>;
}) {
  const { id: companyId, empId } = await params;
  const db = createServiceClient();

  const { data: emp } = await db
    .from("employees")
    .select("id,first_name,last_name")
    .eq("id", empId)
    .single();

  const { data: bens, error: bErr } = await db
    .from("employee_benefits")
    .select("plan_code, catalog_code, per_pay_amount, active, start_date, end_date")
    .eq("employee_id", empId)
    .order("catalog_code", { ascending: true });

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          Benefits — {emp?.last_name}, {emp?.first_name}
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/companies/${companyId}/employees/${empId}/benefits/add`}
            className="px-3 py-2 rounded-lg bg-slate-900 text-white"
          >
            Add Benefit
          </Link>
          <Link
            href={`/companies/${companyId}/employees/${empId}`}
            className="text-sm underline"
          >
            Back to Employee
          </Link>
        </div>
      </div>

      {bErr && <pre className="text-red-600">{bErr.message}</pre>}

      <div className="grid gap-2">
        {(bens ?? []).map((b, i) => {
          const code = b.catalog_code ?? b.plan_code ?? "";
          return (
            <div key={i} className="p-4 bg-white rounded-xl shadow flex items-center justify-between">
              <div>
                <div className="font-medium">{code}</div>
                <div className="text-sm text-slate-600">
                  Per-pay: ${Number(b.per_pay_amount || 0).toFixed(2)} · Active: {b.active ? "Yes" : "No"}
                </div>
                <div className="text-xs text-slate-500">
                  Dates: {b.start_date ?? "—"} to {b.end_date ?? "—"}
                </div>
              </div>
              <form action={toggleBenefit} className="flex items-center gap-2">
                <input type="hidden" name="employee_id" value={empId} />
                {b.catalog_code ? (
                  <input type="hidden" name="catalog_code" value={b.catalog_code} />
                ) : (
                  <input type="hidden" name="plan_code" value={b.plan_code ?? ""} />
                )}
                <input type="hidden" name="make_active" value={(!b.active).toString()} />
                <button
                  className={
                    "px-3 py-1 rounded-lg " +
                    (b.active ? "bg-slate-100" : "bg-green-600 text-white")
                  }
                >
                  {b.active ? "Deactivate" : "Activate"}
                </button>
              </form>
            </div>
          );
        })}
        {(!bens || bens.length === 0) && (
          <p className="text-slate-600">No benefits on file.</p>
        )}
      </div>
    </main>
  );
}
