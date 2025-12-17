// src/app/companies/[id]/employees/[empId]/benefits/page.tsx
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

async function deleteBenefit(formData: FormData) {
  "use server";
  const db = (await import("@/lib/supabase")).createServiceClient();

  const benefitId = String(formData.get("benefit_id") ?? "");
  const companyId = String(formData.get("company_id") ?? "");
  const employeeId = String(formData.get("employee_id") ?? "");

  if (!benefitId) {
    throw new Error("Missing benefit ID");
  }

  await db.from("employee_benefits").delete().eq("id", benefitId);

  revalidatePath(`/companies/${companyId}/employees/${employeeId}/benefits`);
}

// Helper to parse plan_code into provider and category
function parsePlanCode(planCode: string): { provider: string; category: string } {
  if (planCode.includes(" - ")) {
    const [provider, ...rest] = planCode.split(" - ");
    return { provider: provider.trim(), category: rest.join(" - ").trim() };
  }
  // Legacy format - just show as provider
  return { provider: planCode, category: "-" };
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
    .select("id, plan_code, per_pay_amount")
    .eq("employee_id", empId)
    .order("plan_code", { ascending: true });

  // Calculate total per-pay deductions
  const totalPerPay = (bens ?? []).reduce((sum, b) => sum + Number(b.per_pay_amount || 0), 0);

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            Benefits - {emp?.first_name} {emp?.last_name}
          </h1>
          <p className="text-sm text-slate-500">
            Manage enrolled benefits and deductions for this employee
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/companies/${companyId}/employees/${empId}/benefits/add`}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            + Add Benefit
          </Link>
          <Link
            href={`/companies/${companyId}/employees/${empId}`}
            className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            Back
          </Link>
        </div>
      </div>

      {bErr && <pre className="text-red-600 p-4 bg-red-50 rounded-lg">{bErr.message}</pre>}

      {/* Benefits Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Provider</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Benefit Type</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Per Check</th>
              <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(bens ?? []).map((b, idx) => {
              const { provider, category } = parsePlanCode(b.plan_code);
              return (
                <tr key={b.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="py-3 px-4 font-medium">{provider}</td>
                  <td className="py-3 px-4 text-slate-600">{category}</td>
                  <td className="py-3 px-4 text-right font-medium">
                    ${Number(b.per_pay_amount || 0).toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <form action={deleteBenefit} className="inline">
                      <input type="hidden" name="benefit_id" value={b.id} />
                      <input type="hidden" name="company_id" value={companyId} />
                      <input type="hidden" name="employee_id" value={empId} />
                      <button
                        type="submit"
                        className="px-3 py-1 text-sm rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                        onClick={(e) => {
                          if (!confirm(`Remove ${provider} - ${category} benefit?`)) {
                            e.preventDefault();
                          }
                        }}
                      >
                        Remove
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}

            {/* Empty state */}
            {(!bens || bens.length === 0) && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-500">
                  <p>No benefits enrolled</p>
                  <p className="text-sm text-slate-400 mt-1">Click "Add Benefit" to enroll</p>
                </td>
              </tr>
            )}
          </tbody>

          {/* Footer with total */}
          {bens && bens.length > 0 && (
            <tfoot className="bg-blue-50 border-t-2 border-blue-200">
              <tr>
                <td colSpan={2} className="py-3 px-4 font-semibold text-blue-900">
                  Total Deductions per Paycheck
                </td>
                <td className="py-3 px-4 text-right font-bold text-xl text-blue-900">
                  ${totalPerPay.toFixed(2)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Info box */}
      <div className="p-4 bg-slate-50 rounded-lg text-sm text-slate-600">
        <p className="font-medium text-slate-700 mb-1">About Benefit Deductions</p>
        <p>
          These voluntary benefits are deducted from the employee's paycheck each pay period.
          The total amount shown is the sum of all enrolled benefit deductions.
        </p>
      </div>
    </main>
  );
}
