// src/app/companies/[id]/add-employee/page.tsx
import { redirect } from "next/navigation";

async function createEmployee(formData: FormData) {
  "use server";
  const db = (await import("@/lib/supabase")).createServiceClient();

  const company_id = String(formData.get("company_id") ?? "");
  const first_name = String(formData.get("first_name") ?? "").trim();
  const last_name = String(formData.get("last_name") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim().toUpperCase();
  const dob = (String(formData.get("dob") ?? "") || null) as string | null;
  const hire_date = (String(formData.get("hire_date") ?? "") || null) as string | null;
  const pay_period = String(formData.get("pay_period") ?? "b"); // w/b/s/m
  const paycheck_gross = Number(formData.get("paycheck_gross") ?? 0);
  const filing_status = String(formData.get("filing_status") ?? "s"); // s/m/h (you can map to single/married/head elsewhere)
  const dependents = Number(formData.get("dependents") ?? 0);
  const active = String(formData.get("active") ?? "true") === "true";
  const inactive_date = (String(formData.get("inactive_date") ?? "") || null) as string | null;

  if (!company_id || !first_name || !last_name) throw new Error("Missing required fields");

  const { error } = await db.from("employees").insert({
    company_id,
    first_name,
    last_name,
    state,
    dob,
    hire_date,
    pay_period,
    paycheck_gross,
    filing_status,
    dependents,
    active,
    inactive_date
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
            <label className="text-sm">First name</label>
            <input name="first_name" required className="border rounded-lg p-2" />
          </div>
          <div className="grid gap-2">
            <label className="text-sm">Last name</label>
            <input name="last_name" required className="border rounded-lg p-2" />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="grid gap-2">
            <label className="text-sm">State</label>
            <input name="state" required className="border rounded-lg p-2" placeholder="TX" />
          </div>
          <div className="grid gap-2">
            <label className="text-sm">DOB</label>
            <input type="date" name="dob" className="border rounded-lg p-2" />
          </div>
          <div className="grid gap-2">
            <label className="text-sm">Hire date</label>
            <input type="date" name="hire_date" className="border rounded-lg p-2" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <label className="text-sm">Pay period</label>
            <select name="pay_period" className="border rounded-lg p-2" defaultValue="b">
              <option value="w">weekly</option>
              <option value="b">biweekly</option>
              <option value="s">semimonthly</option>
              <option value="m">monthly</option>
            </select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm">Paycheck gross</label>
            <input name="paycheck_gross" type="number" step="0.01" className="border rounded-lg p-2" required />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="grid gap-2">
            <label className="text-sm">Marital status</label>
            <select name="filing_status" className="border rounded-lg p-2" defaultValue="s">
              <option value="s">single</option>
              <option value="m">married</option>
              <option value="h">head</option>
            </select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm">Dependents</label>
            <input name="dependents" type="number" min="0" className="border rounded-lg p-2" defaultValue={0} />
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

        <div className="flex items-center gap-2">
          <button className="px-4 py-2 rounded-xl bg-slate-900 text-white">Save</button>
          <a href={`/companies/${companyId}`} className="text-sm underline">Cancel</a>
        </div>
      </form>
    </main>
  );
}
