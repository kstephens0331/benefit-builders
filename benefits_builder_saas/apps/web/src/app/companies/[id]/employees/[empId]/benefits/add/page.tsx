// src/app/companies/[id]/employees/[empId]/benefits/add/page.tsx
import { redirect } from "next/navigation";

async function addBenefit(formData: FormData) {
  "use server";
  const db = (await import("@/lib/supabase")).createServiceClient();

  const employee_id = String(formData.get("employee_id") ?? "");
  const company_id = String(formData.get("company_id") ?? "");
  const catalog_code = (String(formData.get("catalog_code") ?? "") || null) as string | null;
  const plan_code = (String(formData.get("plan_code") ?? "") || null) as string | null;
  const per_pay_amount = Number(formData.get("per_pay_amount") ?? 0);
  const start_date = (String(formData.get("start_date") ?? "") || null) as string | null;
  const end_date = (String(formData.get("end_date") ?? "") || null) as string | null;

  if (!employee_id) throw new Error("Missing employee_id");
  if (!catalog_code && !plan_code) throw new Error("Provide a catalog_code or plan_code");
  if (!(per_pay_amount > 0)) throw new Error("per_pay_amount must be > 0");

  const { error } = await db.from("employee_benefits").insert({
    employee_id,
    catalog_code,
    plan_code,
    per_pay_amount,
    start_date,
    end_date,
    active: true,
  });
  if (error) throw new Error(error.message);

  redirect(`/companies/${company_id}/employees/${employee_id}/benefits`);
}

export default async function AddBenefitPage({
  params,
}: { params: Promise<{ id: string; empId: string }> }) {
  const { id: companyId, empId } = await params;

  // Optionally fetch catalog to help pick valid codes
  const db = (await import("@/lib/supabase")).createServiceClient();
  const { data: catalog } = await db
    .from("benefit_catalog")
    .select("plan_code, description, reduces_fit, reduces_fica, annual_limit")
    .order("plan_code");

  return (
    <main className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-xl font-semibold">Add Benefit</h1>

      <form action={addBenefit} className="space-y-4">
        <input type="hidden" name="employee_id" value={empId} />
        <input type="hidden" name="company_id" value={companyId} />

        <div className="grid gap-2">
          <label className="text-sm">Catalog Code (preferred)</label>
          <input name="catalog_code" list="catalog-codes" placeholder="e.g., H125" className="border rounded-lg p-2" />
          <datalist id="catalog-codes">
            {(catalog ?? []).map((c) => (
              <option key={c.plan_code} value={c.plan_code}>
                {c.plan_code} — {c.description}
              </option>
            ))}
          </datalist>
          <div className="text-xs text-slate-500">
            If your catalog isn’t set yet, you may provide <strong>Plan Code</strong> instead.
          </div>
        </div>

        <div className="grid gap-2">
          <label className="text-sm">Plan Code (fallback)</label>
          <input name="plan_code" placeholder="e.g., H125" className="border rounded-lg p-2" />
        </div>

        <div className="grid gap-2">
          <label className="text-sm">Per-pay Amount (USD)</label>
          <input name="per_pay_amount" type="number" step="0.01" min="0.01" required className="border rounded-lg p-2" />
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <div>
            <label className="text-sm">Start date (optional)</label>
            <input name="start_date" type="date" className="border rounded-lg p-2 w-full" />
          </div>
          <div>
            <label className="text-sm">End date (optional)</label>
            <input name="end_date" type="date" className="border rounded-lg p-2 w-full" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="px-4 py-2 rounded-xl bg-slate-900 text-white">Save</button>
          <a href={`/companies/${companyId}/employees/${empId}/benefits`} className="text-sm underline">
            Cancel
          </a>
        </div>
      </form>

      <div className="p-4 bg-white rounded-xl shadow">
        <h2 className="font-semibold mb-2">Catalog Preview</h2>
        <div className="grid gap-2">
          {(catalog ?? []).map((c) => (
            <div key={c.plan_code} className="text-sm border rounded-lg p-2">
              <div className="font-medium">{c.plan_code} — {c.description}</div>
              <div className="text-xs text-slate-600">
                FIT: {c.reduces_fit ? "Yes" : "No"} · FICA: {c.reduces_fica ? "Yes" : "No"} · Annual cap:{" "}
                {c.annual_limit ?? "—"}
              </div>
            </div>
          ))}
          {!catalog?.length && <div className="text-sm text-slate-600">No catalog rows yet.</div>}
        </div>
      </div>
    </main>
  );
}
