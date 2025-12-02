// apps/web/src/app/api/reports/data/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { calcFICA, calcFITFromTable } from "@/lib/tax";
import {
  calculateSafeSection125Deduction,
  perPayToMonthly,
  checkSection125Affordability,
  type CompanyTier,
  type FilingStatus,
} from "@/lib/section125";

export async function GET() {
  try {
    const db = createServiceClient();
    const taxYear = new Date().getFullYear();

    // Fetch federal tax rates
    const { data: fed } = await db
      .from("tax_federal_params")
      .select("ss_rate, med_rate")
      .eq("tax_year", taxYear)
      .single();

    const ssRate = Number(fed?.ss_rate || 0.062);
    const medRate = Number(fed?.med_rate || 0.0145);

    // Fetch companies with pay_frequency
    const { data: companiesData } = await db
      .from("companies")
      .select("id, name, state, model, tier, pay_frequency, employer_rate, employee_rate, safety_cap_percent")
      .eq("status", "active");

    // Fetch only ENROLLED employees (consent_status = 'elect')
    const { data: employeesData } = await db
      .from("employees")
      .select("id, company_id, first_name, last_name, filing_status, dependents, gross_pay, pay_period, active, safety_cap_percent, consent_status")
      .eq("active", true)
      .eq("consent_status", "elect");

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

    // Build company map
    const companyMap = new Map<string, any>();
    for (const c of companiesData || []) {
      companyMap.set(c.id, {
        id: c.id,
        name: c.name,
        state: c.state || "",
        model: c.model || "5/3",
        tier: c.tier || "2025",
        pay_frequency: c.pay_frequency || "biweekly",
        employer_rate: Number(c.employer_rate) || 3,
        employee_rate: Number(c.employee_rate) || 5,
        safety_cap_percent: Number(c.safety_cap_percent) || 50,
        employees: [] as any[],
        total_employees: 0,
        total_section_125_monthly: 0,
        total_er_savings_monthly: 0,
        total_er_savings_annual: 0,
      });
    }

    // Process employees and add to companies
    for (const emp of employeesData || []) {
      const company = companyMap.get(emp.company_id);
      if (!company) continue;

      const gross = Number(emp.gross_pay) || 0;
      const payPeriod = emp.pay_period || getPayPeriodCode(company.pay_frequency);
      const periodsPerYear = payPeriodsPerYear[payPeriod] || 26;
      const periodsPerMonth = periodsPerYear / 12;

      const tier: CompanyTier = company.tier as CompanyTier;
      const filingStatus: FilingStatus = (emp.filing_status as FilingStatus) || "single";
      const dependents = Number(emp.dependents) || 0;
      const safetyCapPercent = Number(emp.safety_cap_percent ?? company.safety_cap_percent) || 50;

      // Calculate Section 125 amount
      const section125PerPay = calculateSafeSection125Deduction(
        tier,
        filingStatus,
        dependents,
        gross,
        payPeriod,
        safetyCapPercent
      );
      const section125Monthly = perPayToMonthly(section125PerPay, payPeriod);

      // Calculate taxes WITHOUT Section 125
      const beforeFICA = calcFICA(gross, 0, ssRate, medRate);
      const standardDeductionAnnual = filingStatus === "married" ? 29200 : 14600;
      const standardDeductionPerPay = standardDeductionAnnual / periodsPerYear;
      const dependentAllowancePerPay = dependents * (2000 / periodsPerYear);
      const beforeFITTaxable = Math.max(0, gross - standardDeductionPerPay - dependentAllowancePerPay);
      const beforeFIT = beforeFITTaxable * 0.12; // Simplified
      const beforeTotalTax = beforeFICA.fica + beforeFIT;
      const beforeNetPay = gross - beforeTotalTax;

      // Calculate taxes WITH Section 125
      const afterFICA = calcFICA(gross, section125PerPay, ssRate, medRate);
      const afterFITTaxable = Math.max(0, gross - section125PerPay - standardDeductionPerPay - dependentAllowancePerPay);
      const afterFIT = afterFITTaxable * 0.12; // Simplified
      const employeeFee = section125PerPay * (company.employee_rate / 100);
      const afterTotalTax = afterFICA.fica + afterFIT;
      const afterNetPay = gross - afterTotalTax - employeeFee;

      // Allowable Benefit = Net Pay WITH Section 125 - Net Pay WITHOUT Section 125
      const allowableBenefit = afterNetPay - beforeNetPay;

      // Employer FICA savings
      const erFicaSavingsPerPay = beforeFICA.fica - afterFICA.fica;
      const employerFee = section125PerPay * (company.employer_rate / 100);
      const erNetSavingsPerPay = erFicaSavingsPerPay - employerFee;
      const erSavingsMonthly = erNetSavingsPerPay * periodsPerMonth;
      const erSavingsAnnual = erNetSavingsPerPay * periodsPerYear;

      const employeeData = {
        id: emp.id,
        first_name: emp.first_name,
        last_name: emp.last_name,
        filing_status: filingStatus,
        dependents: dependents,
        gross_pay: gross,
        pay_period: payPeriod,
        active: emp.active,
        section_125_per_pay: +section125PerPay.toFixed(2),
        section_125_monthly: +section125Monthly.toFixed(2),
        allowable_benefit: +allowableBenefit.toFixed(2),
        er_savings_monthly: +erSavingsMonthly.toFixed(2),
        er_savings_annual: +erSavingsAnnual.toFixed(2),
      };

      company.employees.push(employeeData);
      company.total_employees += 1;
      company.total_section_125_monthly += section125Monthly;
      company.total_er_savings_monthly += erSavingsMonthly;
      company.total_er_savings_annual += erSavingsAnnual;
    }

    // Round company totals and convert to array
    const companies = Array.from(companyMap.values()).map((c) => ({
      ...c,
      total_section_125_monthly: +c.total_section_125_monthly.toFixed(2),
      total_er_savings_monthly: +c.total_er_savings_monthly.toFixed(2),
      total_er_savings_annual: +c.total_er_savings_annual.toFixed(2),
    }));

    // Sort companies by name
    companies.sort((a, b) => a.name.localeCompare(b.name));

    // Sort employees within each company by last name
    for (const company of companies) {
      company.employees.sort((a: any, b: any) => a.last_name.localeCompare(b.last_name));
    }

    return NextResponse.json({ ok: true, companies });
  } catch (error: any) {
    console.error("Reports data error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
