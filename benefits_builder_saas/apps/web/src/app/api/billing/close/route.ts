// src/app/api/billing/close/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

type Company = { id: string; name: string; status: string };

export async function POST(req: Request) {
  const db = createServiceClient();
  const { period } = await req.json().catch(() => ({ period: null }));
  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ ok:false, error:"Missing or invalid period (YYYY-MM)" }, { status: 400 });
  }

  const { data: companies, error: cErr } = await db
    .from("companies").select("id,name,status").eq("status","active");
  if (cErr) return NextResponse.json({ ok:false, error:cErr.message }, { status: 500 });

  const results: any[] = [];

  for (const c of (companies ?? [] as Company[])) {
    const [y,m] = period.split("-").map(Number);
    const monthEnd = new Date(Date.UTC(y, m, 0)).toISOString().slice(0,10);

    // Count active employees (fallback method)
    const { data: act, error: acErr } = await db
      .from("employees").select("id", { count: "exact", head: true })
      .eq("company_id", c.id).eq("active", true);
    if (acErr) return NextResponse.json({ ok:false, error:acErr.message }, { status: 500 });
    const employees_active = (act as any)?.length ?? 0;

    const { data: bs } = await db
      .from("company_billing_settings")
      .select("base_fee_cents, per_employee_active_cents, maintenance_cents, tax_rate_percent")
      .eq("company_id", c.id).maybeSingle();
    const base_fee_cents = bs?.base_fee_cents ?? 0;
    const per_employee_active_cents = bs?.per_employee_active_cents ?? 0;
    const maintenance_cents = bs?.maintenance_cents ?? 0;
    const tax_rate_percent = Number(bs?.tax_rate_percent ?? 0);

    // invoice
    let invoiceId: string;
    {
      const { data: inv, error: iErr } = await db
        .from("invoices").select("id").eq("company_id", c.id).eq("period", period).maybeSingle();
      if (iErr) return NextResponse.json({ ok:false, error:iErr.message }, { status: 500 });

      if (inv?.id) {
        invoiceId = inv.id;
      } else {
        const { data: newInv, error: nErr } = await db
          .from("invoices").insert({
            company_id: c.id, period, status: "open",
            subtotal_cents: 0, tax_cents: 0, total_cents: 0
          }).select("id").single();
        if (nErr) return NextResponse.json({ ok:false, error:nErr.message }, { status: 500 });
        invoiceId = newInv.id;
      }
    }

    async function addLine(kind: string, description: string, qty: number, unit: number) {
      const amount = Math.round(qty * unit);
      const { error: lErr } = await db.from("invoice_lines").insert({
        invoice_id: invoiceId, kind, description, quantity: qty,
        unit_price_cents: unit, amount_cents: amount
      });
      if (lErr) throw new Error(lErr.message);
      return amount;
    }

    let subtotal = 0;
    if (base_fee_cents > 0) subtotal += await addLine("base_fee", "Base Fee", 1, base_fee_cents);
    if (per_employee_active_cents > 0) subtotal += await addLine("per_employee_active", "Active employees", employees_active, per_employee_active_cents);
    if (maintenance_cents > 0) subtotal += await addLine("maintenance", "Maintenance", 1, maintenance_cents);

    const tax_cents = Math.round(subtotal * (tax_rate_percent / 100));
    const total_cents = subtotal + tax_cents;

    const { error: uErr } = await db
      .from("invoices").update({ subtotal_cents: subtotal, tax_cents, total_cents })
      .eq("id", invoiceId);
    if (uErr) return NextResponse.json({ ok:false, error:uErr.message }, { status: 500 });

    results.push({ company_id: c.id, employees_active, subtotal_cents: subtotal, tax_cents, total_cents });
  }

  return NextResponse.json({ ok:true, period, results });
}
