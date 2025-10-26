// Advanced Dashboard Analytics API
// Provides comprehensive KPIs, trends, and business metrics

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getModelRates } from "@/lib/models";
import { calcFICA } from "@/lib/tax";

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

    // Total Employees
    const { count: totalEmployees } = await db
      .from("employees")
      .select("*", { count: "exact", head: true })
      .eq("active", true);

    // Employees with Benefits
    const { data: employeesWithBenefits } = await db
      .from("employees")
      .select("id")
      .eq("active", true);

    const employeeIds = (employeesWithBenefits || []).map(e => e.id);
    const { data: uniqueBenefitEmployees } = employeeIds.length > 0
      ? await db
          .from("employee_benefits")
          .select("employee_id")
          .in("employee_id", employeeIds)
      : { data: [] };

    const enrolledCount = new Set((uniqueBenefitEmployees || []).map(b => b.employee_id)).size;
    const enrollmentRate = totalEmployees ? (enrolledCount / totalEmployees * 100).toFixed(1) : "0.0";

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

    // Calculate revenue from all companies
    const { data: companies } = await db
      .from("companies")
      .select("id, name, model, pay_frequency")
      .eq("status", "active");

    let totalMonthlyRevenue = 0;
    let totalEmployerSavings = 0;
    let totalBBProfit = 0;
    const companyMetrics: any[] = [];

    for (const company of companies || []) {
      const { data: emps } = await db
        .from("employees")
        .select("id, gross_pay")
        .eq("company_id", company.id)
        .eq("active", true);

      if (!emps || emps.length === 0) continue;

      // Fetch all benefits for this company's employees
      const empIds = emps.map(e => e.id);
      const { data: benefits } = await db
        .from("employee_benefits")
        .select("employee_id, per_pay_amount, reduces_fica")
        .in("employee_id", empIds);

      const benefitsByEmp = new Map<string, Array<{ per_pay_amount: number; reduces_fica: boolean }>>();
      for (const ben of benefits || []) {
        if (!benefitsByEmp.has(ben.employee_id)) {
          benefitsByEmp.set(ben.employee_id, []);
        }
        benefitsByEmp.get(ben.employee_id)!.push({
          per_pay_amount: Number(ben.per_pay_amount || 0),
          reduces_fica: !!ben.reduces_fica
        });
      }

      const payPeriodMap: Record<string, number> = { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12 };
      const periodsPerYear = payPeriodMap[company.pay_frequency] || 26;
      const periodsPerMonth = periodsPerYear / 12;

      let companyPretaxMonthly = 0;
      let companyEmployerSavings = 0;

      for (const emp of emps) {
        const empBenefits = benefitsByEmp.get(emp.id) || [];
        const perPayPretax = empBenefits.reduce((sum, b) => sum + b.per_pay_amount, 0);
        const perPayPretaxFica = empBenefits.filter(b => b.reduces_fica).reduce((sum, b) => sum + b.per_pay_amount, 0);

        companyPretaxMonthly += perPayPretax * periodsPerMonth;

        // Calculate employer FICA savings
        const grossPay = Number(emp.gross_pay || 0);
        if (grossPay > 0 && perPayPretaxFica > 0) {
          const ficaBefore = calcFICA(grossPay, 0, Number(fed?.ss_rate || 0.062), Number(fed?.med_rate || 0.0145));
          const ficaAfter = calcFICA(grossPay, perPayPretaxFica, Number(fed?.ss_rate || 0.062), Number(fed?.med_rate || 0.0145));
          const ficaSaved = ficaBefore.fica - ficaAfter.fica;
          companyEmployerSavings += ficaSaved * periodsPerMonth;
        }
      }

      // Calculate BB profit from model fees
      const [employeeRate, employerRate] = getModelRates(company.model);
      const employeeFee = companyPretaxMonthly * employeeRate;
      const employerFee = companyPretaxMonthly * employerRate;
      const companyBBProfit = employeeFee + employerFee;

      totalMonthlyRevenue += companyBBProfit;
      totalEmployerSavings += companyEmployerSavings;
      totalBBProfit += companyBBProfit;

      companyMetrics.push({
        company_id: company.id,
        company_name: company.name,
        employees: emps.length,
        enrolled: benefitsByEmp.size,
        pretax_monthly: companyPretaxMonthly,
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
    // KEY METRICS SUMMARY
    // ========================================================================

    const avgEmployeesPerCompany = activeCompanies && totalEmployees ? (totalEmployees / activeCompanies).toFixed(1) : "0.0";
    const avgRevenuePerCompany = activeCompanies && totalMonthlyRevenue ? (totalMonthlyRevenue / activeCompanies).toFixed(2) : "0.00";
    const avgRevenuePerEmployee = totalEmployees && totalMonthlyRevenue ? (totalMonthlyRevenue / totalEmployees).toFixed(2) : "0.00";

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
        enrolled_employees: enrolledCount,
        enrollment_rate: parseFloat(enrollmentRate),

        monthly_revenue: parseFloat(totalMonthlyRevenue.toFixed(2)),
        annual_revenue_projected: parseFloat((totalMonthlyRevenue * 12).toFixed(2)),
        total_employer_savings: parseFloat(totalEmployerSavings.toFixed(2)),
        profit_margin_percent: parseFloat(profitMargin),

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
