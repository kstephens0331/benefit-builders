// src/app/api/billing/close/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { computeProfitShare } from "@/lib/fees";
import { calcFICA } from "@/lib/tax";
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

  const { period } = validation.data;

  const { data: companies, error: cErr } = await db
    .from("companies").select("id,name,status,model,state,pay_frequency,contact_email").eq("status","active");
  if (cErr) return NextResponse.json({ ok:false, error:cErr.message }, { status: 500 });

  const [year] = period.split("-").map(Number);

  // Get federal tax rates for FICA calculations
  const { data: fed } = await db
    .from("tax_federal_params")
    .select("ss_rate, med_rate")
    .eq("tax_year", year)
    .single();

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
      .select("base_fee_cents, per_employee_active_cents, maintenance_cents, tax_rate_percent, profit_share_mode, profit_share_percent")
      .eq("company_id", c.id).maybeSingle();
    const base_fee_cents = bs?.base_fee_cents ?? 0;
    const per_employee_active_cents = bs?.per_employee_active_cents ?? 0;
    const maintenance_cents = bs?.maintenance_cents ?? 0;
    const tax_rate_percent = Number(bs?.tax_rate_percent ?? 0);
    const profit_share_mode = (bs?.profit_share_mode ?? "none") as "none" | "percent_er_savings" | "percent_bb_profit";
    const profit_share_percent = Number(bs?.profit_share_percent ?? 0);

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

    // Calculate Section 125 fees and FICA savings
    const { data: emps } = await db
      .from("employees")
      .select("id, gross_pay")
      .eq("company_id", c.id)
      .eq("active", true);

    if (!emps || emps.length === 0) continue; // Skip companies with no active employees

    // PERFORMANCE FIX: Fetch all benefits for all employees in ONE query (eliminates N+1 problem)
    const employeeIds = emps.map(e => e.id);
    const { data: allBenefits } = await db
      .from("employee_benefits")
      .select("employee_id, per_pay_amount, reduces_fica")
      .in("employee_id", employeeIds);

    // Group benefits by employee_id for O(1) lookup
    const benefitsByEmployee = new Map<string, Array<{ per_pay_amount: number; reduces_fica: boolean }>>();
    for (const benefit of allBenefits || []) {
      if (!benefitsByEmployee.has(benefit.employee_id)) {
        benefitsByEmployee.set(benefit.employee_id, []);
      }
      benefitsByEmployee.get(benefit.employee_id)!.push({
        per_pay_amount: Number(benefit.per_pay_amount || 0),
        reduces_fica: !!benefit.reduces_fica
      });
    }

    let totalPretaxMonthly = 0;
    let totalEmployerFicaSavingsMonthly = 0;

    const payPeriodMap: Record<string, number> = {
      weekly: 52,
      biweekly: 26,
      semimonthly: 24,
      monthly: 12
    };
    const periodsPerYear = payPeriodMap[c.pay_frequency] || 26;
    const periodsPerMonth = periodsPerYear / 12;

    for (const emp of emps) {
      const benefits = benefitsByEmployee.get(emp.id) || [];

      const perPayPretax = benefits.reduce((sum, b) => sum + b.per_pay_amount, 0);
      const perPayPretaxFica = benefits.filter(b => b.reduces_fica).reduce((sum, b) => sum + b.per_pay_amount, 0);

      totalPretaxMonthly += perPayPretax * periodsPerMonth;

      // Calculate employer FICA savings
      const grossPay = Number(emp.gross_pay || 0);
      if (grossPay > 0 && perPayPretaxFica > 0) {
        const ficaBefore = calcFICA(grossPay, 0, Number(fed?.ss_rate || 0.062), Number(fed?.med_rate || 0.0145));
        const ficaAfter = calcFICA(grossPay, perPayPretaxFica, Number(fed?.ss_rate || 0.062), Number(fed?.med_rate || 0.0145));
        const ficaSavedPerPay = ficaBefore.fica - ficaAfter.fica;
        totalEmployerFicaSavingsMonthly += ficaSavedPerPay * periodsPerMonth;
      }
    }

    // Calculate model-based fees (BB profit)
    const [employeeRate, employerRate] = getModelRates(c.model);
    const employeeFeeMonthly = totalPretaxMonthly * employeeRate;
    const employerFeeMonthly = totalPretaxMonthly * employerRate;
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
    const profitShare = computeProfitShare(
      profit_share_mode,
      profit_share_percent,
      totalEmployerFicaSavingsMonthly,
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

    // Send billing notification email
    if (c.contact_email) {
      const netSavings = totalEmployerFicaSavingsMonthly - (total_cents / 100);
      await sendBillingNotification(c.name, c.contact_email, period, {
        subtotal: subtotal / 100,
        tax: tax_cents / 100,
        total: total_cents / 100,
        employerSavings: totalEmployerFicaSavingsMonthly,
        netSavings
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
      total_pretax_monthly: totalPretaxMonthly,
      employer_fica_savings_monthly: totalEmployerFicaSavingsMonthly,
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
