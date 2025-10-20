// src/app/admin/catalog/add/page.tsx
import { redirect } from "next/navigation";

export const metadata = { title: "Add Benefit" };

async function createBenefit(formData: FormData) {
  "use server";
  const db = (await import("@/lib/supabase")).createServiceClient();

  const plan_code = String(formData.get("plan_code") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const reduces_fit = String(formData.get("reduces_fit") ?? "true") === "true";
  const reduces_fica = String(formData.get("reduces_fica") ?? "true") === "true";
  const annual_limit = formData.get("annual_limit");
  const law_reference = String(formData.get("law_reference") ?? "").trim() || null;
  const effective_year = Number(formData.get("effective_year") ?? 2025);
  const expires_year = (String(formData.get("expires_year") ?? "").trim() || null) as string | null;

  if (!plan_code || !description) throw new Error("plan_code and description required");

  const { error } = await db.from("benefit_catalog").insert({
    plan_code,
    description,
    reduces_fit,
    reduces_fica,
    annual_limit: annual_limit ? Number(annual_limit) : null,
    law_reference,
    effective_year,
    expires_year: expires_year ? Number(expires_year) : null,
  });

  if (error) throw new Error(error.message);
  redirect("/admin/catalog");
}

export default function AddCatalogPage() {
  return (
    <main className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Add Benefit</h1>
      <form action={createBenefit} className="space-y-4">
        <div className="grid gap-2">
          <label className="text-sm">Plan Code</label>
          <input name="plan_code" required className="border rounded-lg p-2" placeholder="H125" />
        </div>
        <div className="grid gap-2">
          <label className="text-sm">Description</label>
          <input name="description" required className="border rounded-lg p-2" placeholder="Section 125 Health Premium" />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <label className="text-sm">Reduces FIT?</label>
            <select name="reduces_fit" className="border rounded-lg p-2" defaultValue="true">
              <option value="true">Yes</option><option value="false">No</option>
            </select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm">Reduces FICA?</label>
            <select name="reduces_fica" className="border rounded-lg p-2" defaultValue="true">
              <option value="true">Yes</option><option value="false">No</option>
            </select>
          </div>
        </div>
        <div className="grid gap-2">
          <label className="text-sm">Annual Limit (optional)</label>
          <input name="annual_limit" type="number" step="0.01" className="border rounded-lg p-2" placeholder="e.g. 3250" />
        </div>
        <div className="grid gap-2">
          <label className="text-sm">Law Reference (optional)</label>
          <input name="law_reference" className="border rounded-lg p-2" placeholder="IRC §125" />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <label className="text-sm">Effective Year</label>
            <input name="effective_year" type="number" className="border rounded-lg p-2" defaultValue={2025} />
          </div>
          <div className="grid gap-2">
            <label className="text-sm">Expires Year (optional)</label>
            <input name="expires_year" type="number" className="border rounded-lg p-2" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 rounded-xl bg-slate-900 text-white">Save</button>
          <a href="/admin/catalog" className="text-sm underline">Cancel</a>
        </div>
      </form>
    </main>
  );
}
