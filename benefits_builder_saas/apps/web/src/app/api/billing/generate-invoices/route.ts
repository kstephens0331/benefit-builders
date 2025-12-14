// src/app/api/billing/generate-invoices/route.ts
// Invoice Generation with Per-Employee Breakdown
// Page 1: Single "Benefits Builder Fees" line (combined total)
// Pages 2+: Employee-by-employee detail (Name | Allowable Benefit | EE Fee | ER Fee)
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getModelRates } from "@/lib/models";
import { BillingCloseSchema, validateRequestBody } from "@/lib/validation";
import { calcFICA } from "@/lib/tax";
import {
  calculateSafeSection125Deduction,
  perPayToMonthly,
  type CompanyTier,
  type FilingStatus,
} from "@/lib/section125";

type Company = {
  id: string;
  name: string;
  status: string;
  model: string;
  state: string;
  pay_frequency: string;
  tier: string | null;
  contact_email: string | null;
  safety_cap_percent: number | null;
};

type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  filing_status: string;
  dependents: number;
  gross_pay: number;
  pay_period: string | null;
  safety_cap_percent: number | null;
};

// Helper to convert pay_frequency to code
const getPayPeriodCode = (payFrequency: string | null | undefined): string => {
  const freq = (payFrequency || "").toLowerCase();
  if (freq === "weekly" || freq === "w") return "w";
  if (freq === "biweekly" || freq === "bi-weekly" || freq === "b") return "b";
  if (freq === "semimonthly" || freq === "semi-monthly" || freq === "s") return "s";
  if (freq === "monthly" || freq === "m") return "m";
  return "b";
};

const payPeriodsPerYear: Record<string, number> = { w: 52, b: 26, s: 24, m: 12 };

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
  let query = db.from("companies").select("id,name,status,model,state,pay_frequency,tier,contact_email,safety_cap_percent");

  if (company_id) {
    query = query.eq("id", company_id);
  } else {
    query = query.eq("status", "active");
  }

  const { data: companies, error: cErr } = await query;
  if (cErr) return NextResponse.json({ ok: false, error: cErr.message }, { status: 500 });

  if (!companies || companies.length === 0) {
    return NextResponse.json({ ok: false, error: company_id ? "Company not found" : "No active companies found" }, { status: 404 });
  }

  // Get federal tax rates
  const taxYear = new Date().getFullYear();
  const { data: fed } = await db
    .from("tax_federal_params")
    .select("ss_rate, med_rate")
    .eq("tax_year", taxYear)
    .single();

  const ssRate = Number(fed?.ss_rate || 0.062);
  const medRate = Number(fed?.med_rate || 0.0145);

  const results: any[] = [];

  for (const c of (companies ?? [] as Company[])) {
    const [employeeRate, employerRate] = getModelRates(c.model);
    const companyPayPeriod = getPayPeriodCode(c.pay_frequency);
    const periodsPerYear = payPeriodsPerYear[companyPayPeriod] || 26;
    const periodsPerMonth = periodsPerYear / 12;
    const tier: CompanyTier = (c.tier as CompanyTier) || "2025";
    const companySafetyCap = Number(c.safety_cap_percent) || 50;

    // Fetch enrolled employees (active AND elected)
    const { data: employees, error: empErr } = await db
      .from("employees")
      .select("id, first_name, last_name, filing_status, dependents, gross_pay, pay_period, safety_cap_percent")
      .eq("company_id", c.id)
      .eq("active", true)
      .eq("consent_status", "elect");

    if (empErr) return NextResponse.json({ ok: false, error: empErr.message }, { status: 500 });

    const enrolledEmployees = (employees || []) as Employee[];

    // Get or create invoice
    let invoiceId: string;
    {
      const { data: inv, error: iErr } = await db
        .from("invoices").select("id").eq("company_id", c.id).eq("period", period).maybeSingle();
      if (iErr) return NextResponse.json({ ok: false, error: iErr.message }, { status: 500 });

      if (inv?.id) {
        invoiceId = inv.id;
        // Clear existing invoice lines to allow re-generation
        const { error: delErr } = await db.from("invoice_lines").delete().eq("invoice_id", invoiceId);
        if (delErr) return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });
      } else {
        const { data: newInv, error: nErr } = await db
          .from("invoices").insert({
            company_id: c.id, period, status: "open",
            subtotal_cents: 0, tax_cents: 0, total_cents: 0
          }).select("id").single();
        if (nErr) return NextResponse.json({ ok: false, error: nErr.message }, { status: 500 });
        invoiceId = newInv.id;
      }
    }

    // Calculate per-employee fees
    let totalBBFeesMonthly = 0;
    const employeeDetails: {
      employee_id: string;
      name: string;
      allowable_benefit_monthly: number;
      ee_fee_monthly: number;
      er_fee_monthly: number;
      section_125_monthly: number;
    }[] = [];

    for (const emp of enrolledEmployees) {
      const gross = Number(emp.gross_pay) || 0;
      const payPeriod = emp.pay_period || companyPayPeriod;
      const empPeriodsPerYear = payPeriodsPerYear[payPeriod] || 26;
      const empPeriodsPerMonth = empPeriodsPerYear / 12;
      const filingStatus: FilingStatus = (emp.filing_status as FilingStatus) || "single";
      const dependents = Number(emp.dependents) || 0;
      const safetyCapPercent = Number(emp.safety_cap_percent ?? companySafetyCap) || 50;

      // Calculate Section 125 deduction per pay period
      const section125PerPay = calculateSafeSection125Deduction(
        tier,
        filingStatus,
        dependents,
        gross,
        payPeriod,
        safetyCapPercent
      );
      const section125Monthly = perPayToMonthly(section125PerPay, payPeriod);

      // Calculate BB fees based on Section 125 amount
      const eeFeePerPay = section125PerPay * employeeRate;
      const erFeePerPay = section125PerPay * employerRate;
      const eeFeeMonthly = eeFeePerPay * empPeriodsPerMonth;
      const erFeeMonthly = erFeePerPay * empPeriodsPerMonth;
      const bbFeesMonthly = eeFeeMonthly + erFeeMonthly;

      // Calculate allowable benefit (net pay increase for employee)
      // WITHOUT Section 125
      const beforeFICA = calcFICA(gross, 0, ssRate, medRate);
      const standardDeductionAnnual = filingStatus === "married" ? 29200 : 14600;
      const standardDeductionPerPay = standardDeductionAnnual / empPeriodsPerYear;
      const dependentAllowancePerPay = dependents * (2000 / empPeriodsPerYear);
      const beforeFITTaxable = Math.max(0, gross - standardDeductionPerPay - dependentAllowancePerPay);
      const beforeFIT = beforeFITTaxable * 0.12;
      const beforeTotalTax = beforeFICA.fica + beforeFIT;
      const beforeNetPay = gross - beforeTotalTax;

      // WITH Section 125
      const afterFICA = calcFICA(gross, section125PerPay, ssRate, medRate);
      const afterFITTaxable = Math.max(0, gross - section125PerPay - standardDeductionPerPay - dependentAllowancePerPay);
      const afterFIT = afterFITTaxable * 0.12;
      const afterTotalTax = afterFICA.fica + afterFIT;
      const afterNetPay = gross - afterTotalTax - eeFeePerPay;

      // Allowable Benefit = Net Pay WITH Section 125 - Net Pay WITHOUT Section 125
      const allowableBenefitPerPay = afterNetPay - beforeNetPay;
      const allowableBenefitMonthly = allowableBenefitPerPay * empPeriodsPerMonth;

      totalBBFeesMonthly += bbFeesMonthly;

      employeeDetails.push({
        employee_id: emp.id,
        name: `${emp.first_name} ${emp.last_name}`,
        allowable_benefit_monthly: +allowableBenefitMonthly.toFixed(2),
        ee_fee_monthly: +eeFeeMonthly.toFixed(2),
        er_fee_monthly: +erFeeMonthly.toFixed(2),
        section_125_monthly: +section125Monthly.toFixed(2),
      });
    }

    // Convert to cents
    const totalBBFeesCents = Math.round(totalBBFeesMonthly * 100);

    // Create summary line item for page 1 (combined BB fees)
    if (totalBBFeesCents > 0) {
      const { error: sumErr } = await db.from("invoice_lines").insert({
        invoice_id: invoiceId,
        kind: "bb_fees_summary",
        description: `Benefits Builder Fees - ${enrolledEmployees.length} employees`,
        quantity: 1,
        unit_price_cents: totalBBFeesCents,
        amount_cents: totalBBFeesCents,
      });
      if (sumErr) return NextResponse.json({ ok: false, error: sumErr.message }, { status: 500 });
    }

    // Create employee detail lines for pages 2+
    for (const emp of employeeDetails) {
      const totalEmpFeeCents = Math.round((emp.ee_fee_monthly + emp.er_fee_monthly) * 100);
      const allowableBenefitCents = Math.round(emp.allowable_benefit_monthly * 100);
      const eeFeeCents = Math.round(emp.ee_fee_monthly * 100);
      const erFeeCents = Math.round(emp.er_fee_monthly * 100);

      const { error: detErr } = await db.from("invoice_lines").insert({
        invoice_id: invoiceId,
        kind: "employee_detail",
        description: emp.name,
        quantity: 1,
        unit_price_cents: totalEmpFeeCents,
        amount_cents: totalEmpFeeCents,
        employee_id: emp.employee_id,
        allowable_benefit_cents: allowableBenefitCents,
      });
      if (detErr) return NextResponse.json({ ok: false, error: detErr.message }, { status: 500 });
    }

    // Get company billing settings for any additional fees
    const { data: bs } = await db
      .from("company_billing_settings")
      .select("base_fee_cents, per_employee_active_cents, maintenance_cents, tax_rate_percent")
      .eq("company_id", c.id).maybeSingle();

    const base_fee_cents = bs?.base_fee_cents ?? 0;
    const per_employee_active_cents = bs?.per_employee_active_cents ?? 0;
    const maintenance_cents = bs?.maintenance_cents ?? 0;
    const tax_rate_percent = Number(bs?.tax_rate_percent ?? 0);

    // Add any additional fee lines (base fee, maintenance, etc.)
    let subtotal = totalBBFeesCents;

    if (base_fee_cents > 0) {
      const { error: bErr } = await db.from("invoice_lines").insert({
        invoice_id: invoiceId, kind: "base_fee", description: "Base Fee", quantity: 1,
        unit_price_cents: base_fee_cents, amount_cents: base_fee_cents
      });
      if (bErr) return NextResponse.json({ ok: false, error: bErr.message }, { status: 500 });
      subtotal += base_fee_cents;
    }

    if (per_employee_active_cents > 0 && enrolledEmployees.length > 0) {
      const perEmpTotal = per_employee_active_cents * enrolledEmployees.length;
      const { error: pErr } = await db.from("invoice_lines").insert({
        invoice_id: invoiceId, kind: "per_employee_active", description: "Active employees",
        quantity: enrolledEmployees.length, unit_price_cents: per_employee_active_cents, amount_cents: perEmpTotal
      });
      if (pErr) return NextResponse.json({ ok: false, error: pErr.message }, { status: 500 });
      subtotal += perEmpTotal;
    }

    if (maintenance_cents > 0) {
      const { error: mErr } = await db.from("invoice_lines").insert({
        invoice_id: invoiceId, kind: "maintenance", description: "Maintenance", quantity: 1,
        unit_price_cents: maintenance_cents, amount_cents: maintenance_cents
      });
      if (mErr) return NextResponse.json({ ok: false, error: mErr.message }, { status: 500 });
      subtotal += maintenance_cents;
    }

    const tax_cents = Math.round(subtotal * (tax_rate_percent / 100));
    const total_cents = subtotal + tax_cents;

    // Update invoice totals
    const { error: uErr } = await db
      .from("invoices").update({ subtotal_cents: subtotal, tax_cents, total_cents })
      .eq("id", invoiceId);
    if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 });

    results.push({
      company_id: c.id,
      company_name: c.name,
      invoice_id: invoiceId,
      employees_count: enrolledEmployees.length,
      model: c.model,
      bb_fees_cents: totalBBFeesCents,
      subtotal_cents: subtotal,
      tax_cents,
      total_cents,
      employee_details: employeeDetails,
    });
  }

  return NextResponse.json({ ok: true, period, results });
}
