// src/app/companies/[id]/add-employee/page.tsx
import { redirect } from "next/navigation";

async function createEmployee(formData: FormData) {
  "use server";
  const db = (await import("@/lib/supabase")).createServiceClient();

  const company_id = String(formData.get("company_id") ?? "");
  const first_name = String(formData.get("first_name") ?? "").trim();
  const last_name = String(formData.get("last_name") ?? "").trim();
  const dob = (String(formData.get("dob") ?? "") || null) as string | null;
  const gross_pay = Number(formData.get("gross_pay") ?? 0);
  // Map short codes to full values: s->single, m->married, h->head
  const filingCode = String(formData.get("filing_status") ?? "s");
  const filing_status = filingCode === "m" ? "married" : filingCode === "h" ? "head" : "single";
  const dependents = Number(formData.get("dependents") ?? 0);
  const tobacco_use = String(formData.get("tobacco_use") ?? "false") === "true";
  const active = String(formData.get("active") ?? "true") === "true";
  const inactive_date = (String(formData.get("inactive_date") ?? "") || null) as string | null;
  const consent_status = String(formData.get("consent_status") ?? "pending");

  if (!company_id || !first_name || !last_name) throw new Error("Missing required fields");

  const { error } = await db.from("employees").insert({
    company_id,
    first_name,
    last_name,
    dob,
    gross_pay,
    filing_status,
    dependents,
    tobacco_use,
    active,
    inactive_date,
    consent_status,
  });
  if (error) throw new Error(error.message);

  redirect(`/companies/${company_id}`);
}

export default async function AddEmployeePage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;

  return (
    <main className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-xl font-semibold">Add Employee</h1>

      <form action={createEmployee} className="space-y-4">
        <input type="hidden" name="company_id" value={companyId} />

        <div className="grid md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <label className="text-sm">First name *</label>
            <input name="first_name" required className="border rounded-lg p-2" />
          </div>
          <div className="grid gap-2">
            <label className="text-sm">Last name *</label>
            <input name="last_name" required className="border rounded-lg p-2" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <label className="text-sm">DOB</label>
            <input type="date" name="dob" className="border rounded-lg p-2" />
          </div>
          <div className="grid gap-2">
            <label className="text-sm">Gross Pay (per paycheck) *</label>
            <input name="gross_pay" type="number" step="0.01" className="border rounded-lg p-2" required />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="grid gap-2">
            <label className="text-sm">Filing Status</label>
            <select name="filing_status" className="border rounded-lg p-2" defaultValue="s">
              <option value="s">Single</option>
              <option value="m">Married</option>
              <option value="h">Head of Household</option>
            </select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm">Dependents</label>
            <input name="dependents" type="number" min="0" className="border rounded-lg p-2" defaultValue={0} />
          </div>
          <div className="grid gap-2">
            <label className="text-sm">Tobacco Use</label>
            <select name="tobacco_use" className="border rounded-lg p-2" defaultValue="false">
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <label className="text-sm">Consent Status</label>
            <select name="consent_status" className="border rounded-lg p-2" defaultValue="pending">
              <option value="pending">Pending</option>
              <option value="elect">Enrolled</option>
              <option value="dont">Declined</option>
            </select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm">Active?</label>
            <select name="active" className="border rounded-lg p-2" defaultValue="true">
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>

        <div className="grid gap-2">
          <label className="text-sm">Inactive date (if inactive)</label>
          <input type="date" name="inactive_date" className="border rounded-lg p-2" />
        </div>

        <div className="flex items-center gap-2 pt-4">
          <button className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-700">Save</button>
          <a href={`/companies/${companyId}`} className="text-sm underline">Cancel</a>
        </div>
      </form>
    </main>
  );
}
