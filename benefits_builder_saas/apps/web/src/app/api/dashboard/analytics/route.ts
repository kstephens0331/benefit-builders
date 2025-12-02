// Advanced Dashboard Analytics API
// Provides comprehensive KPIs, trends, and business metrics

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getModelRates } from "@/lib/models";
import { calcFICA } from "@/lib/tax";
import {
  calculateSafeSection125Deduction,
  type CompanyTier,
  type FilingStatus,
} from "@/lib/section125";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const db = createServiceClient();
  const { searchParams } = new URL(req.url);
  const months = parseInt(searchParams.get("months") || "6"); // Default to 6 months of data

  try {
    // ========================================================================
    // CORE METRICS
    // ========================================================================

    // Total Companies
    const { count: totalCompanies } = await db
      .from("companies")
      .select("*", { count: "exact", head: true });

    const { count: activeCompanies } = await db
      .from("companies")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    // Total Employees (all)
    const { count: totalEmployees } = await db
      .from("employees")
      .select("*", { count: "exact", head: true });

    // Active Employees only
    const { count: activeEmployees } = await db
      .from("employees")
      .select("*", { count: "exact", head: true })
      .eq("active", true);

    // Enrolled Employees (consent_status = 'elect')
    const { count: enrolledEmployees } = await db
      .from("employees")
      .select("*", { count: "exact", head: true })
      .eq("active", true)
      .eq("consent_status", "elect");

    const enrolledCount = enrolledEmployees || 0;
    const enrollmentRate = activeEmployees ? (enrolledCount / activeEmployees * 100).toFixed(1) : "0.0";

    // ========================================================================
    // REVENUE CALCULATIONS (Current Month)
    // ========================================================================

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const currentPeriod = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;

    // Get federal tax rates
    const { data: fed } = await db
      .from("tax_federal_params")
      .select("ss_rate, med_rate")
      .eq("tax_year", currentYear)
      .single();

    // Calculate revenue from all companies using enrolled employees
    const { data: companies } = await db
      .from("companies")
      .select("id, name, model, pay_frequency, tier, employer_rate, employee_rate, safety_cap_percent")
      .eq("status", "active");

    // Helper to convert pay_frequency to code
    const getPayPeriodCode = (payFrequency: string | null | undefined): string => {
      const freq = (payFrequency || "").toLowerCase();
      if (freq === "weekly" || freq === "w") return "w";
      if (freq === "biweekly" || freq === "bi-weekly" || freq === "b") return "b";
      if (freq === "semimonthly" || freq === "semi-monthly" || freq === "s") return "s";
      if (freq === "monthly" || freq === "m") return "m";
      return "b";
    };

    const payPeriodMap: Record<string, number> = { w: 52, b: 26, s: 24, m: 12, weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12 };

    let totalMonthlyRevenue = 0;
    let totalEmployerSavings = 0;
    let totalBBProfit = 0;
    const companyMetrics: any[] = [];

    for (const company of companies || []) {
      // Fetch only ENROLLED employees (consent_status = 'elect')
      const { data: emps } = await db
        .from("employees")
        .select("id, gross_pay, pay_period, filing_status, dependents, safety_cap_percent")
        .eq("company_id", company.id)
        .eq("active", true)
        .eq("consent_status", "elect");

      // Also count total active employees for metrics
      const { count: totalActiveEmps } = await db
        .from("employees")
        .select("*", { count: "exact", head: true })
        .eq("company_id", company.id)
        .eq("active", true);

      if (!emps || emps.length === 0) {
        companyMetrics.push({
          company_id: company.id,
          company_name: company.name,
          employees: totalActiveEmps || 0,
          enrolled: 0,
          pretax_monthly: 0,
          bb_profit: 0,
          employer_savings: 0
        });
        continue;
      }

      const companyPayPeriod = getPayPeriodCode(company.pay_frequency);
      const periodsPerYear = payPeriodMap[companyPayPeriod] || 26;
      const periodsPerMonth = periodsPerYear / 12;
      const tier: CompanyTier = (company.tier as CompanyTier) || "2025";
      const companySafetyCapPercent = Number(company.safety_cap_percent) || 50;
      const employerRate = Number(company.employer_rate) || 3;
      const employeeRate = Number(company.employee_rate) || 5;
      const ficaRate = 0.0765;

      let companySection125Monthly = 0;
      let companyEmployerSavings = 0;

      for (const emp of emps) {
        const grossPay = Number(emp.gross_pay || 0);
        const payPeriod = emp.pay_period || companyPayPeriod;
        const filingStatus: FilingStatus = (emp.filing_status as FilingStatus) || "single";
        const dependents = Number(emp.dependents) || 0;
        const safetyCapPercent = Number(emp.safety_cap_percent ?? companySafetyCapPercent) || 50;

        // Calculate Section 125 amount using the same logic as other pages
        const section125PerPay = calculateSafeSection125Deduction(
          tier,
          filingStatus,
          dependents,
          grossPay,
          payPeriod,
          safetyCapPercent
        );

        const empPeriodsPerYear = payPeriodMap[payPeriod] || 26;
        const empPeriodsPerMonth = empPeriodsPerYear / 12;

        companySection125Monthly += section125PerPay * empPeriodsPerMonth;

        // Calculate employer FICA savings
        if (grossPay > 0 && section125PerPay > 0) {
          const erFicaSavingsPerPay = section125PerPay * ficaRate;
          const employerFeePerPay = section125PerPay * (employerRate / 100);
          const erNetSavingsPerPay = erFicaSavingsPerPay - employerFeePerPay;
          companyEmployerSavings += erNetSavingsPerPay * empPeriodsPerMonth;
        }
      }

      // Calculate BB profit from model fees
      const companyEmployeeFee = companySection125Monthly * (employeeRate / 100);
      const companyEmployerFee = companySection125Monthly * (employerRate / 100);
      const companyBBProfit = companyEmployeeFee + companyEmployerFee;

      totalMonthlyRevenue += companyBBProfit;
      totalEmployerSavings += companyEmployerSavings;
      totalBBProfit += companyBBProfit;

      companyMetrics.push({
        company_id: company.id,
        company_name: company.name,
        employees: totalActiveEmps || 0,
        enrolled: emps.length,
        pretax_monthly: companySection125Monthly,
        bb_profit: companyBBProfit,
        employer_savings: companyEmployerSavings
      });
    }

    const profitMargin = totalEmployerSavings > 0
      ? ((totalBBProfit / totalEmployerSavings) * 100).toFixed(1)
      : "0.0";

    // ========================================================================
    // HISTORICAL TRENDS (Last N Months)
    // ========================================================================

    const trends: any[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const trendDate = new Date(currentDate);
      trendDate.setMonth(trendDate.getMonth() - i);
      const year = trendDate.getFullYear();
      const month = trendDate.getMonth() + 1;
      const period = `${year}-${String(month).padStart(2, "0")}`;

      const { data: snapshot } = await db
        .from("billing_usage_snapshots")
        .select("employer_savings_cents, bb_profit_cents")
        .eq("period", period);

      const totalSavings = (snapshot || []).reduce((sum, s) => sum + Number(s.employer_savings_cents || 0), 0) / 100;
      const totalProfit = (snapshot || []).reduce((sum, s) => sum + Number(s.bb_profit_cents || 0), 0) / 100;

      trends.push({
        period,
        month_label: trendDate.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        revenue: totalProfit,
        employer_savings: totalSavings
      });
    }

    // ========================================================================
    // COMPANY DISTRIBUTION BY SIZE
    // ========================================================================

    const companySizes = [
      { label: "1-10 employees", min: 1, max: 10, count: 0 },
      { label: "11-25 employees", min: 11, max: 25, count: 0 },
      { label: "26-50 employees", min: 26, max: 50, count: 0 },
      { label: "51-100 employees", min: 51, max: 100, count: 0 },
      { label: "100+ employees", min: 101, max: 999999, count: 0 }
    ];

    for (const company of companies || []) {
      const { count } = await db
        .from("employees")
        .select("*", { count: "exact", head: true })
        .eq("company_id", company.id)
        .eq("active", true);

      const empCount = count || 0;
      for (const size of companySizes) {
        if (empCount >= size.min && empCount <= size.max) {
          size.count++;
          break;
        }
      }
    }

    // ========================================================================
    // TOP PERFORMING COMPANIES
    // ========================================================================

    const topCompanies = companyMetrics
      .sort((a, b) => b.bb_profit - a.bb_profit)
      .slice(0, 10);

    // ========================================================================
    // POTENTIAL REVENUE FROM NON-ENROLLED EMPLOYEES
    // ========================================================================

    let potentialMonthlyRevenue = 0;
    let potentialErSavings = 0;

    for (const company of companies || []) {
      // Fetch NON-ENROLLED active employees
      const { data: nonEnrolledEmps } = await db
        .from("employees")
        .select("id, gross_pay, pay_period, filing_status, dependents, safety_cap_percent")
        .eq("company_id", company.id)
        .eq("active", true)
        .neq("consent_status", "elect");

      if (!nonEnrolledEmps || nonEnrolledEmps.length === 0) continue;

      const companyPayPeriod = getPayPeriodCode(company.pay_frequency);
      const tier: CompanyTier = (company.tier as CompanyTier) || "2025";
      const companySafetyCapPercent = Number(company.safety_cap_percent) || 50;
      const employerRate = Number(company.employer_rate) || 3;
      const employeeRate = Number(company.employee_rate) || 5;
      const ficaRate = 0.0765;

      for (const emp of nonEnrolledEmps) {
        const grossPay = Number(emp.gross_pay || 0);
        const payPeriod = emp.pay_period || companyPayPeriod;
        const filingStatus: FilingStatus = (emp.filing_status as FilingStatus) || "single";
        const dependents = Number(emp.dependents) || 0;
        const safetyCapPercent = Number(emp.safety_cap_percent ?? companySafetyCapPercent) || 50;

        const section125PerPay = calculateSafeSection125Deduction(
          tier,
          filingStatus,
          dependents,
          grossPay,
          payPeriod,
          safetyCapPercent
        );

        const empPeriodsPerYear = payPeriodMap[payPeriod] || 26;
        const empPeriodsPerMonth = empPeriodsPerYear / 12;

        const section125Monthly = section125PerPay * empPeriodsPerMonth;
        const empBBRevenue = section125Monthly * ((employeeRate + employerRate) / 100);
        potentialMonthlyRevenue += empBBRevenue;

        // Calculate potential employer savings
        if (grossPay > 0 && section125PerPay > 0) {
          const erFicaSavingsPerPay = section125PerPay * ficaRate;
          const employerFeePerPay = section125PerPay * (employerRate / 100);
          const erNetSavingsPerPay = erFicaSavingsPerPay - employerFeePerPay;
          potentialErSavings += erNetSavingsPerPay * empPeriodsPerMonth;
        }
      }
    }

    // ========================================================================
    // KEY METRICS SUMMARY
    // ========================================================================

    const avgEmployeesPerCompany = activeCompanies && activeEmployees ? (activeEmployees / activeCompanies).toFixed(1) : "0.0";
    const avgRevenuePerCompany = activeCompanies && totalMonthlyRevenue ? (totalMonthlyRevenue / activeCompanies).toFixed(2) : "0.00";
    const avgRevenuePerEmployee = enrolledCount && totalMonthlyRevenue ? (totalMonthlyRevenue / enrolledCount).toFixed(2) : "0.00";

    // ========================================================================
    // RESPONSE
    // ========================================================================

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      period: currentPeriod,

      summary: {
        total_companies: totalCompanies || 0,
        active_companies: activeCompanies || 0,
        total_employees: totalEmployees || 0,
        active_employees: activeEmployees || 0,
        enrolled_employees: enrolledCount,
        non_enrolled_employees: (activeEmployees || 0) - enrolledCount,
        enrollment_rate: parseFloat(enrollmentRate),

        monthly_revenue: parseFloat(totalMonthlyRevenue.toFixed(2)),
        annual_revenue_projected: parseFloat((totalMonthlyRevenue * 12).toFixed(2)),
        total_employer_savings: parseFloat(totalEmployerSavings.toFixed(2)),
        profit_margin_percent: parseFloat(profitMargin),

        // Potential revenue from non-enrolled employees
        potential_monthly_revenue: parseFloat(potentialMonthlyRevenue.toFixed(2)),
        potential_annual_revenue: parseFloat((potentialMonthlyRevenue * 12).toFixed(2)),
        potential_er_savings: parseFloat(potentialErSavings.toFixed(2)),

        avg_employees_per_company: parseFloat(avgEmployeesPerCompany),
        avg_revenue_per_company: parseFloat(avgRevenuePerCompany),
        avg_revenue_per_employee: parseFloat(avgRevenuePerEmployee)
      },

      trends,
      company_distribution: companySizes,
      top_companies: topCompanies,

      // Company-level metrics for detailed analysis
      company_metrics: companyMetrics.sort((a, b) => b.bb_profit - a.bb_profit)
    });
  } catch (error: any) {
    console.error("Dashboard analytics error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to generate analytics", details: error.message },
      { status: 500 }
    );
  }
}
