// src/app/api/billing/generate-invoices/route.ts
// This route ONLY generates invoices - it does NOT do month-end close
// Invoicing is INDEPENDENT of employee_benefits - uses company-level billing settings
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { computeProfitShare } from "@/lib/fees";
import { getModelRates } from "@/lib/models";
import { BillingCloseSchema, validateRequestBody } from "@/lib/validation";
import { sendBillingNotification } from "@/lib/email";

type Company = { id: string; name: string; status: string; model: string; state: string; pay_frequency: string; contact_email: string | null };

export async function POST(req: Request) {
  const db = createServiceClient();

  // Validate request body
  const validation = await validateRequestBody(req, BillingCloseSchema);
  if (!validation.valid) {
    return NextResponse.json(
      { ok: false, error: validation.error, issues: validation.issues },
      { status: 400 }
    );
  }

  const { period, company_id } = validation.data;

  // Build query - filter by single company if provided, otherwise all active companies
  let query = db.from("companies").select("id,name,status,model,state,pay_frequency,contact_email");

  if (company_id) {
    // Single company invoice generation
    query = query.eq("id", company_id);
  } else {
    // All active companies
    query = query.eq("status", "active");
  }

  const { data: companies, error: cErr } = await query;
  if (cErr) return NextResponse.json({ ok:false, error:cErr.message }, { status: 500 });

  if (!companies || companies.length === 0) {
    return NextResponse.json({ ok: false, error: company_id ? "Company not found" : "No active companies found" }, { status: 404 });
  }

  const results: any[] = [];

  for (const c of (companies ?? [] as Company[])) {
    const [y,m] = period.split("-").map(Number);
    const monthEnd = new Date(Date.UTC(y, m, 0)).toISOString().slice(0,10);

    // Count enrolled employees (active AND elected into benefits)
    const { count: enrolledCount, error: acErr } = await db
      .from("employees").select("id", { count: "exact", head: true })
      .eq("company_id", c.id)
      .eq("active", true)
      .eq("consent_status", "elect");
    if (acErr) return NextResponse.json({ ok:false, error:acErr.message }, { status: 500 });
    const employees_active = enrolledCount ?? 0;

    const { data: bs } = await db
      .from("company_billing_settings")
      .select("base_fee_cents, per_employee_active_cents, maintenance_cents, tax_rate_percent, profit_share_mode, profit_share_percent, monthly_pretax_volume")
      .eq("company_id", c.id).maybeSingle();
    const base_fee_cents = bs?.base_fee_cents ?? 0;
    const per_employee_active_cents = bs?.per_employee_active_cents ?? 0;
    const maintenance_cents = bs?.maintenance_cents ?? 0;
    const tax_rate_percent = Number(bs?.tax_rate_percent ?? 0);
    const profit_share_mode = (bs?.profit_share_mode ?? "none") as "none" | "percent_er_savings" | "percent_bb_profit";
    const profit_share_percent = Number(bs?.profit_share_percent ?? 0);
    const monthly_pretax_volume = Number(bs?.monthly_pretax_volume ?? 0);

    // invoice - find existing or create new
    let invoiceId: string;
    {
      const { data: inv, error: iErr } = await db
        .from("invoices").select("id").eq("company_id", c.id).eq("period", period).maybeSingle();
      if (iErr) return NextResponse.json({ ok:false, error:iErr.message }, { status: 500 });

      if (inv?.id) {
        invoiceId = inv.id;
        // Clear existing invoice lines to allow re-generation
        const { error: delErr } = await db.from("invoice_lines").delete().eq("invoice_id", invoiceId);
        if (delErr) return NextResponse.json({ ok:false, error: delErr.message }, { status: 500 });
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

    // Calculate model-based fees using company-level monthly_pretax_volume
    // This is INDEPENDENT of employee_benefits table
    const [employeeRate, employerRate] = getModelRates(c.model);
    const employeeFeeMonthly = monthly_pretax_volume * employeeRate;
    const employerFeeMonthly = monthly_pretax_volume * employerRate;
    const bbProfitMonthly = employeeFeeMonthly + employerFeeMonthly;

    // Convert to cents for invoice lines
    const employerFeeCents = Math.round(employerFeeMonthly * 100);
    const employeeFeeCents = Math.round(employeeFeeMonthly * 100);

    let subtotal = 0;
    if (base_fee_cents > 0) subtotal += await addLine("base_fee", "Base Fee", 1, base_fee_cents);
    if (per_employee_active_cents > 0) subtotal += await addLine("per_employee_active", "Active employees", employees_active, per_employee_active_cents);
    if (maintenance_cents > 0) subtotal += await addLine("maintenance", "Maintenance", 1, maintenance_cents);
    if (employerFeeCents > 0) subtotal += await addLine("employer_fee", `Employer Fee (${(employerRate * 100).toFixed(1)}%)`, 1, employerFeeCents);
    if (employeeFeeCents > 0) subtotal += await addLine("employee_fee", `Employee Fee (${(employeeRate * 100).toFixed(1)}%)`, 1, employeeFeeCents);

    // Calculate profit-sharing credit (if applicable)
    // Note: employer FICA savings not calculated here - use 0 for now
    const profitShare = computeProfitShare(
      profit_share_mode,
      profit_share_percent,
      0, // Employer FICA savings - calculated separately in reports
      bbProfitMonthly
    );

    if (profitShare.profitShareCents > 0) {
      // Profit-share is a credit (negative line item)
      subtotal -= await addLine("profit_share", `Credit: ${profitShare.description}`, 1, -profitShare.profitShareCents);
    }

    const tax_cents = Math.round(subtotal * (tax_rate_percent / 100));
    const total_cents = subtotal + tax_cents;

    const { error: uErr } = await db
      .from("invoices").update({ subtotal_cents: subtotal, tax_cents, total_cents })
      .eq("id", invoiceId);
    if (uErr) return NextResponse.json({ ok:false, error:uErr.message }, { status: 500 });

    // Send billing notification email (optional)
    if (c.contact_email) {
      await sendBillingNotification(c.name, c.contact_email, period, {
        subtotal: subtotal / 100,
        tax: tax_cents / 100,
        total: total_cents / 100,
        employerSavings: 0, // Calculated separately in reports
        netSavings: 0
      }).catch((err) => {
        console.error(`Failed to send billing email to ${c.contact_email}:`, err);
        // Don't fail the billing process if email fails
      });
    }

    results.push({
      company_id: c.id,
      company_name: c.name,
      employees_active,
      model: c.model,
      monthly_pretax_volume,
      bb_profit_monthly: bbProfitMonthly,
      employee_fee_cents: employeeFeeCents,
      employer_fee_cents: employerFeeCents,
      profit_share_cents: profitShare.profitShareCents,
      profit_share_mode,
      subtotal_cents: subtotal,
      tax_cents,
      total_cents
    });
  }

  return NextResponse.json({ ok:true, period, results });
}
