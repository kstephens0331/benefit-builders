// apps/web/src/app/companies/[id]/employees/[empId]/compare/page.tsx
import { createServiceClient } from "@/lib/supabase";

async function getPreview(empId: string) {
  // Use proper URL for server-side fetch
  const BASE = process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3002");

  const res = await fetch(`${BASE}/api/optimizer/preview`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ employeeId: empId }),
    cache: "no-store",
  });
  if (!res.ok) {
    let msg = "Failed to fetch preview";
    try { msg = await res.text(); } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export default async function ComparePage({
  params,
}: { params: Promise<{ id: string; empId: string }> }) {
  const { id, empId } = await params;
  const db = createServiceClient();

  const [{ data: emp }, preview] = await Promise.all([
    db.from("employees")
      .select("id, first_name, last_name, paycheck_gross, pay_period")
      .eq("id", empId).single(),
    getPreview(empId),
  ]);

  const name = emp ? `${emp.last_name?.toLowerCase?.() || ""}, ${emp.first_name?.toLowerCase?.() || ""}` : "employee";

  const usd = (n: number) => `$${(n ?? 0).toFixed(2)}`;

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-xl font-bold">Paycheck Compare — {name}</h1>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="p-4 bg-white rounded-xl shadow">
          <h2 className="font-semibold mb-2">Per Pay</h2>
          <div className="text-sm space-y-1">
            <div className="flex justify-between"><span>Gross</span><span>{usd(preview.inputs.gross_per_pay)}</span></div>
            <div className="flex justify-between"><span>Total Pre-Tax</span><span>{usd(preview.inputs.pre_tax_per_pay)}</span></div>
            <div className="flex justify-between"><span>Taxes (Before)</span><span>{usd(preview.per_pay.taxes_before)}</span></div>
            <div className="flex justify-between"><span>Taxes (After)</span><span>{usd(preview.per_pay.taxes_after)}</span></div>
            <div className="flex justify-between font-medium"><span>Employee Tax Savings</span><span>{usd(preview.per_pay.employee_tax_savings)}</span></div>
            <div className="flex justify-between"><span>Employer FICA Savings</span><span>{usd(preview.per_pay.employer_fica_savings)}</span></div>
          </div>
        </section>

        <section className="p-4 bg-white rounded-xl shadow">
          <h2 className="font-semibold mb-2">Monthly</h2>
          <div className="text-sm space-y-1">
            <div className="flex justify-between"><span>Pretax Total</span><span>{usd(preview.monthly.pretax_total)}</span></div>
            <div className="flex justify-between"><span>Emp. Tax Savings</span><span>{usd(preview.monthly.employee_tax_savings)}</span></div>
            <div className="flex justify-between"><span>Er. FICA Savings</span><span>{usd(preview.monthly.employer_fica_savings)}</span></div>
            <div className="flex justify-between"><span>Employee Fee ({preview.meta.fees_model})</span><span>{usd(preview.monthly.employee_fee)}</span></div>
            <div className="flex justify-between"><span>Employer Fee ({preview.meta.fees_model})</span><span>{usd(preview.monthly.employer_fee)}</span></div>
            <div className="flex justify-between font-semibold"><span>Employee Net Savings</span><span>{usd(preview.monthly.employee_net_savings)}</span></div>
            <div className="flex justify-between font-semibold"><span>Employer Net Savings</span><span>{usd(preview.monthly.employer_net_savings)}</span></div>
            <div className="flex justify-between"><span>Employer Annual Net Savings</span><span>{usd(preview.monthly.employer_annual_net_savings)}</span></div>
          </div>
        </section>
      </div>

      <p className="text-xs text-slate-500">
        Tax calculations use IRS 15-T percentage method, FICA (SS/Medicare) with wage base limits, and
        applicable state method. Fees follow the company model {preview.meta.company_model ?? "(none)"} as employee/employer % of monthly pre-tax total.
      </p>
    </main>
  );
}
