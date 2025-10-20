// src/app/admin/catalog/[code]/page.tsx
import { createServiceClient } from "@/lib/supabase";
import { redirect, notFound } from "next/navigation";

export const metadata = { title: "Edit Benefit" };

async function updateBenefit(formData: FormData) {
  "use server";
  const db = (await import("@/lib/supabase")).createServiceClient();

  const original_code = String(formData.get("original_code") ?? "");
  const plan_code = String(formData.get("plan_code") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const reduces_fit = String(formData.get("reduces_fit") ?? "true") === "true";
  const reduces_fica = String(formData.get("reduces_fica") ?? "true") === "true";
  const annual_limit = formData.get("annual_limit");
  const law_reference = String(formData.get("law_reference") ?? "").trim() || null;
  const effective_year = Number(formData.get("effective_year") ?? 2025);
  const expires_year = (String(formData.get("expires_year") ?? "").trim() || null) as string | null;

  const { error } = await db
    .from("benefit_catalog")
    .update({
      plan_code,
      description,
      reduces_fit,
      reduces_fica,
      annual_limit: annual_limit ? Number(annual_limit) : null,
      law_reference,
      effective_year,
      expires_year: expires_year ? Number(expires_year) : null,
    })
    .eq("plan_code", original_code);

  if (error) throw new Error(error.message);
  redirect("/admin/catalog");
}

async function deleteBenefit(formData: FormData) {
  "use server";
  const db = (await import("@/lib/supabase")).createServiceClient();
  const plan_code = String(formData.get("plan_code") ?? "");
  const { error } = await db.from("benefit_catalog").delete().eq("plan_code", plan_code);
  if (error) throw new Error(error.message);
  redirect("/admin/catalog");
}

export default async function EditCatalogPage({
  params,
}: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const db = createServiceClient();
  const { data: row, error } = await db
    .from("benefit_catalog")
    .select("plan_code, description, reduces_fit, reduces_fica, annual_limit, law_reference, effective_year, expires_year")
    .eq("plan_code", code)
    .maybeSingle();

  if (error) {
    return (
      <main className="max-w-xl mx-auto p-6">
        <pre className="text-red-600">{error.message}</pre>
      </main>
    );
  }
  if (!row) return notFound();

  return (
    <main className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Edit Benefit</h1>

      <form action={updateBenefit} className="space-y-4">
        <input type="hidden" name="original_code" value={row.plan_code} />
        <div className="grid gap-2">
          <label className="text-sm">Plan Code</label>
          <input name="plan_code" defaultValue={row.plan_code} required className="border rounded-lg p-2" />
        </div>
        <div className="grid gap-2">
          <label className="text-sm">Description</label>
          <input name="description" defaultValue={row.description} required className="border rounded-lg p-2" />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <label className="text-sm">Reduces FIT?</label>
            <select name="reduces_fit" className="border rounded-lg p-2" defaultValue={String(!!row.reduces_fit)}>
              <option value="true">Yes</option><option value="false">No</option>
            </select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm">Reduces FICA?</label>
            <select name="reduces_fica" className="border rounded-lg p-2" defaultValue={String(!!row.reduces_fica)}>
              <option value="true">Yes</option><option value="false">No</option>
            </select>
          </div>
        </div>
        <div className="grid gap-2">
          <label className="text-sm">Annual Limit (optional)</label>
          <input name="annual_limit" type="number" step="0.01" defaultValue={row.annual_limit ?? undefined} className="border rounded-lg p-2" />
        </div>
        <div className="grid gap-2">
          <label className="text-sm">Law Reference (optional)</label>
          <input name="law_reference" defaultValue={row.law_reference ?? ""} className="border rounded-lg p-2" />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <label className="text-sm">Effective Year</label>
            <input name="effective_year" type="number" defaultValue={row.effective_year} className="border rounded-lg p-2" />
          </div>
          <div className="grid gap-2">
            <label className="text-sm">Expires Year (optional)</label>
            <input name="expires_year" type="number" defaultValue={row.expires_year ?? undefined} className="border rounded-lg p-2" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 rounded-xl bg-slate-900 text-white">Save</button>
          <a href="/admin/catalog" className="text-sm underline">Cancel</a>
        </div>
      </form>

      <form action={deleteBenefit}>
        <input type="hidden" name="plan_code" value={row.plan_code} />
        <button className="text-red-600 text-sm underline mt-4" onClick={(e) => {
          if (!confirm("Delete this benefit?")) e.preventDefault();
        }}>Delete</button>
      </form>
    </main>
  );
}
