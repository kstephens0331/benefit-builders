// apps/web/src/app/admin/tax/states/[state]/page.tsx
import { createServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ state: string }>; searchParams: Promise<{ year?: string }> };

export default async function EditStateTaxPage({ params, searchParams }: Props) {
  const { state } = await params;
  const { year } = await searchParams;
  const tax_year = Number(year) || new Date().getFullYear();

  const db = createServiceClient();
  const { data: row } = await db
    .from("tax_state_params")
    .select("state,tax_year,method,flat_rate,brackets")
    .eq("state", state)
    .eq("tax_year", tax_year)
    .maybeSingle();

  async function save(formData: FormData) {
    "use server";
    const db = createServiceClient();
    const st = String(formData.get("state") || "").toUpperCase();
    const y = Number(formData.get("tax_year"));
    const method = String(formData.get("method") || "none");
    const flat_rate_raw = String(formData.get("flat_rate") || "");
    const brackets_raw = String(formData.get("brackets") || "");

    let flat_rate: number | null = null;
    if (flat_rate_raw.trim() !== "") {
      flat_rate = Number(flat_rate_raw);
      if (Number.isNaN(flat_rate) || flat_rate < 0) {
        throw new Error("flat_rate must be a decimal (e.g., 0.05)");
      }
    }

    let brackets: unknown = null;
    if (brackets_raw.trim() !== "") {
      try {
        brackets = JSON.parse(brackets_raw);
      } catch {
        throw new Error("brackets must be valid JSON or left blank");
      }
    }

    const { error } = await db
      .from("tax_state_params")
      .upsert(
        { state: st, tax_year: y, method, flat_rate, brackets },
        { onConflict: "state,tax_year" }
      );
    if (error) throw new Error(error.message);
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">State Tax — {state}</h1>
      <form action={save} className="p-4 rounded-xl bg-white border grid gap-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">State</label>
            <input
              name="state"
              defaultValue={state.toUpperCase()}
              className="w-full rounded-lg border px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tax Year</label>
            <input
              name="tax_year"
              type="number"
              defaultValue={tax_year}
              className="w-full rounded-lg border px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Method</label>
            <select
              name="method"
              defaultValue={row?.method ?? "none"}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="none">none</option>
              <option value="flat">flat</option>
              <option value="brackets">brackets</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Flat Rate (decimal) — e.g., 0.05 for 5% (for <code>method=flat</code>)
            </label>
            <input
              name="flat_rate"
              type="number"
              step="0.0001"
              defaultValue={row?.flat_rate ?? ""}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Brackets JSON (for <code>method=brackets</code>)
            </label>
            <textarea
              name="brackets"
              rows={8}
              defaultValue={
                row?.brackets ? JSON.stringify(row.brackets, null, 2) : ""
              }
              className="w-full rounded-lg border px-3 py-2 font-mono text-sm"
              placeholder='[{"over":0,"base":0,"rate":0.03}, {"over":1000,"base":30,"rate":0.05}]'
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button className="px-4 py-2 rounded-xl bg-slate-900 text-white">Save State</button>
        </div>
      </form>
    </main>
  );
}
