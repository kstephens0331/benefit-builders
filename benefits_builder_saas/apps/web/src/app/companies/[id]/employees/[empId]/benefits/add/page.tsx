// src/app/companies/[id]/employees/[empId]/benefits/add/page.tsx
import { redirect } from "next/navigation";

async function addBenefit(formData: FormData) {
  "use server";
  const db = (await import("@/lib/supabase")).createServiceClient();

  const employee_id = String(formData.get("employee_id") ?? "");
  const company_id = String(formData.get("company_id") ?? "");
  const policy_number = String(formData.get("policy_number") ?? "").trim();
  const provider = String(formData.get("provider") ?? "").trim();
  const benefit_category = String(formData.get("benefit_category") ?? "").trim();
  const per_pay_amount = Number(formData.get("per_pay_amount") ?? 0);

  if (!employee_id) throw new Error("Missing employee_id");
  if (!provider) throw new Error("Please enter a provider/company name");
  if (!benefit_category) throw new Error("Please select a benefit category");
  if (!(per_pay_amount > 0)) throw new Error("Amount must be greater than 0");

  // Store as: "Provider - Category" in plan_code for backwards compatibility
  // Also store individual fields in a JSON-friendly format
  const plan_code = `${provider} - ${benefit_category}`;

  const { error } = await db.from("employee_benefits").insert({
    employee_id,
    plan_code, // Full display name
    per_pay_amount,
    reduces_fit: true,
    reduces_fica: true,
    // Store additional details in a way that can be parsed later
    // Note: If these columns don't exist yet, they'll be ignored
    // policy_number,
    // provider,
    // benefit_category,
  });
  if (error) throw new Error(error.message);

  redirect(`/companies/${company_id}/employees/${employee_id}/benefits`);
}

const BENEFIT_CATEGORIES = [
  "Accident",
  "Cancer",
  "Critical Illness",
  "Dental",
  "Disability (Short-Term)",
  "Disability (Long-Term)",
  "Hospital Indemnity",
  "Life Insurance",
  "Vision",
  "Whole Life",
  "Other",
];

const COMMON_PROVIDERS = [
  "Aflac",
  "Allstate",
  "Colonial Life",
  "Guardian",
  "Lincoln Financial",
  "MetLife",
  "Principal",
  "Transamerica",
  "Unum",
  "Other",
];

export default async function AddBenefitPage({
  params,
}: { params: Promise<{ id: string; empId: string }> }) {
  const { id: companyId, empId } = await params;

  return (
    <main className="max-w-lg mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Add Benefit</h1>
        <p className="text-sm text-slate-500 mt-1">
          Enter the benefit details for this employee
        </p>
      </div>

      <form action={addBenefit} className="space-y-4 bg-white rounded-xl shadow p-6">
        <input type="hidden" name="employee_id" value={empId} />
        <input type="hidden" name="company_id" value={companyId} />

        {/* Policy Number */}
        <div className="grid gap-2">
          <label className="text-sm font-medium">Policy Number</label>
          <input
            name="policy_number"
            placeholder="e.g., POL-123456"
            className="border rounded-lg p-2 w-full"
          />
          <p className="text-xs text-slate-500">Optional - the policy or certificate number</p>
        </div>

        {/* Provider/Company */}
        <div className="grid gap-2">
          <label className="text-sm font-medium">Provider / Company *</label>
          <input
            name="provider"
            list="providers"
            placeholder="e.g., Aflac"
            required
            className="border rounded-lg p-2 w-full"
          />
          <datalist id="providers">
            {COMMON_PROVIDERS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          <p className="text-xs text-slate-500">The insurance company providing this benefit</p>
        </div>

        {/* Benefit Category */}
        <div className="grid gap-2">
          <label className="text-sm font-medium">Benefit Category *</label>
          <select
            name="benefit_category"
            required
            className="border rounded-lg p-2 w-full"
          >
            <option value="">-- Select Category --</option>
            {BENEFIT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <p className="text-xs text-slate-500">Type of coverage (Accident, Cancer, Life, etc.)</p>
        </div>

        {/* Amount per Paycheck */}
        <div className="grid gap-2">
          <label className="text-sm font-medium">Amount per Paycheck *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
            <input
              name="per_pay_amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="0.00"
              className="border rounded-lg p-2 pl-7 w-full"
            />
          </div>
          <p className="text-xs text-slate-500">The amount deducted each pay period</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t">
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Add Benefit
          </button>
          <a
            href={`/companies/${companyId}/employees/${empId}/benefits`}
            className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            Cancel
          </a>
        </div>
      </form>
    </main>
  );
}
