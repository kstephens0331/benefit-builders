// Generate Custom Reports
// Execute report templates with filters and export to various formats

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import { getModelRates } from "@/lib/models";
import { calcFICA } from "@/lib/tax";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const db = createServiceClient();
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const { template_id, filters, format } = await req.json().catch(() => ({}));

  if (!template_id) {
    return NextResponse.json({ ok: false, error: "template_id required" }, { status: 400 });
  }

  // Fetch template
  const { data: template, error: templateError } = await db
    .from("report_templates")
    .select("*")
    .eq("id", template_id)
    .single();

  if (templateError || !template) {
    return NextResponse.json({ ok: false, error: "Template not found" }, { status: 404 });
  }

  try {
    let reportData: any[] = [];
    let title = template.name;

    // Generate report based on type
    switch (template.report_type) {
      case "billing_summary":
        reportData = await generateBillingSummary(db, filters);
        break;
      case "employee_enrollment":
        reportData = await generateEmployeeEnrollment(db, filters);
        break;
      case "company_performance":
        reportData = await generateCompanyPerformance(db, filters);
        break;
      case "tax_savings":
        reportData = await generateTaxSavings(db, filters);
        break;
      case "profit_analysis":
        reportData = await generateProfitAnalysis(db, filters);
        break;
      default:
        return NextResponse.json(
          { ok: false, error: `Unknown report type: ${template.report_type}` },
          { status: 400 }
        );
    }

    const executionTime = Date.now() - startTime;

    // Save to history
    await db.from("report_history").insert({
      template_id,
      report_type: template.report_type,
      title,
      parameters: filters || {},
      generated_by: user.id,
      row_count: reportData.length,
      execution_time_ms: executionTime,
      status: "completed"
    });

    // Apply sorting if specified
    if (template.sort_by) {
      reportData.sort((a, b) => {
        const aVal = a[template.sort_by];
        const bVal = b[template.sort_by];
        const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        return template.sort_order === "asc" ? comparison : -comparison;
      });
    }

    return NextResponse.json({
      ok: true,
      report: {
        title: template.name,
        description: template.description,
        columns: template.columns,
        data: reportData,
        row_count: reportData.length,
        execution_time_ms: executionTime,
        generated_at: new Date().toISOString(),
        generated_by: user.full_name
      }
    });
  } catch (error: any) {
    console.error("Report generation error:", error);

    // Save error to history
    await db.from("report_history").insert({
      template_id,
      report_type: template.report_type,
      title: template.name,
      parameters: filters || {},
      generated_by: user.id,
      status: "failed",
      error_message: error.message
    });

    return NextResponse.json(
      { ok: false, error: `Report generation failed: ${error.message}` },
      { status: 500 }
    );
  }
}

// ============================================================================
// REPORT GENERATORS
// ============================================================================

async function generateBillingSummary(db: any, filters: any) {
  const period = filters?.period || getCurrentPeriod();

  const { data: snapshots } = await db
    .from("billing_usage_snapshots")
    .select("*")
    .eq("period", period);

  const results = [];

  for (const snapshot of snapshots || []) {
    const { data: company } = await db
      .from("companies")
      .select("name")
      .eq("id", snapshot.company_id)
      .single();

    const { data: invoice } = await db
      .from("invoices")
      .select("total_cents")
      .eq("company_id", snapshot.company_id)
      .eq("period", period)
      .single();

    const employerSavings = Number(snapshot.employer_savings_cents || 0) / 100;
    const bbProfit = Number(snapshot.bb_profit_cents || 0) / 100;
    const invoiceTotal = invoice ? Number(invoice.total_cents || 0) / 100 : 0;
    const netSavings = employerSavings - invoiceTotal;

    results.push({
      company_name: company?.name || "Unknown",
      period,
      employees_active: snapshot.employees_active || 0,
      total_pretax: Number(snapshot.total_pretax_cents || 0) / 100,
      employer_savings: employerSavings,
      bb_profit: bbProfit,
      invoice_total: invoiceTotal,
      net_savings: netSavings
    });
  }

  return results;
}

async function generateEmployeeEnrollment(db: any, filters: any) {
  const companyId = filters?.company_id;

  let query = db.from("employees").select("id, company_id, first_name, last_name, active");

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data: employees } = await query;

  const results = [];

  for (const emp of employees || []) {
    const { data: company } = await db
      .from("companies")
      .select("name")
      .eq("id", emp.company_id)
      .single();

    const { data: benefits } = await db
      .from("employee_benefits")
      .select("per_pay_amount")
      .eq("employee_id", emp.id);

    const benefitCount = (benefits || []).length;
    const totalPretax = (benefits || []).reduce(
      (sum, b) => sum + Number(b.per_pay_amount || 0),
      0
    );

    // Estimate annual savings (assuming 22% effective tax rate)
    const annualSavings = totalPretax * 26 * 0.22;

    results.push({
      company_name: company?.name || "Unknown",
      employee_name: `${emp.first_name} ${emp.last_name}`,
      enrollment_status: benefitCount > 0 ? "Enrolled" : "Not Enrolled",
      benefit_count: benefitCount,
      total_pretax: totalPretax,
      annual_savings: annualSavings
    });
  }

  return results;
}

async function generateCompanyPerformance(db: any, filters: any) {
  const { data: companies } = await db
    .from("companies")
    .select("id, name, model, pay_frequency")
    .eq("status", "active");

  const results = [];

  for (const company of companies || []) {
    const { data: employees } = await db
      .from("employees")
      .select("id")
      .eq("company_id", company.id)
      .eq("active", true);

    const totalEmployees = (employees || []).length;

    const employeeIds = (employees || []).map((e) => e.id);
    const { data: benefits } =
      employeeIds.length > 0
        ? await db
            .from("employee_benefits")
            .select("employee_id, per_pay_amount")
            .in("employee_id", employeeIds)
        : { data: [] };

    const enrolledEmployees = new Set((benefits || []).map((b) => b.employee_id)).size;
    const enrollmentRate = totalEmployees > 0 ? (enrolledEmployees / totalEmployees) * 100 : 0;

    const totalPretaxPerPay = (benefits || []).reduce(
      (sum, b) => sum + Number(b.per_pay_amount || 0),
      0
    );
    const avgPretaxPerEmployee = enrolledEmployees > 0 ? totalPretaxPerPay / enrolledEmployees : 0;

    // Estimate monthly values
    const payPeriodMap: Record<string, number> = {
      weekly: 52,
      biweekly: 26,
      semimonthly: 24,
      monthly: 12
    };
    const periodsPerYear = payPeriodMap[company.pay_frequency] || 26;
    const periodsPerMonth = periodsPerYear / 12;
    const totalPretaxMonthly = totalPretaxPerPay * periodsPerMonth;

    // Estimate employer savings (7.65% FICA on pretax)
    const totalEmployerSavings = totalPretaxMonthly * 0.0765;

    // Estimate BB revenue
    const [employeeRate, employerRate] = getModelRates(company.model);
    const totalBBRevenue = totalPretaxMonthly * employeeRate + totalPretaxMonthly * employerRate;

    results.push({
      company_name: company.name,
      total_employees: totalEmployees,
      enrolled_employees: enrolledEmployees,
      enrollment_rate: enrollmentRate,
      avg_pretax_per_employee: avgPretaxPerEmployee,
      total_employer_savings: totalEmployerSavings,
      total_bb_revenue: totalBBRevenue
    });
  }

  return results;
}

async function generateTaxSavings(db: any, filters: any) {
  const period = filters?.period || getCurrentPeriod();

  const { data: snapshots } = await db
    .from("billing_usage_snapshots")
    .select("*")
    .eq("period", period);

  const results = [];

  for (const snapshot of snapshots || []) {
    const { data: company } = await db
      .from("companies")
      .select("name")
      .eq("id", snapshot.company_id)
      .single();

    const grossPayroll = Number(snapshot.gross_payroll_cents || 0) / 100;
    const totalPretax = Number(snapshot.total_pretax_cents || 0) / 100;
    const employerSavings = Number(snapshot.employer_savings_cents || 0) / 100;

    // Estimate employee savings (assuming 22% effective rate)
    const employeeSavings = totalPretax * 0.22;

    const totalSavings = employerSavings + employeeSavings;
    const roiPercent = grossPayroll > 0 ? (totalSavings / grossPayroll) * 100 : 0;

    results.push({
      company_name: company?.name || "Unknown",
      period,
      gross_payroll: grossPayroll,
      total_pretax: totalPretax,
      employer_fica_savings: employerSavings,
      employee_income_savings: employeeSavings,
      total_savings: totalSavings,
      roi_percent: roiPercent
    });
  }

  return results;
}

async function generateProfitAnalysis(db: any, filters: any) {
  const period = filters?.period || getCurrentPeriod();

  const { data: snapshots } = await db
    .from("billing_usage_snapshots")
    .select("*")
    .eq("period", period);

  const totalCompanies = (snapshots || []).length;
  let totalEmployees = 0;
  let totalPretax = 0;
  let employeeFees = 0;
  let employerFees = 0;

  for (const snapshot of snapshots || []) {
    totalEmployees += snapshot.employees_active || 0;
    totalPretax += Number(snapshot.total_pretax_cents || 0) / 100;
    employeeFees += Number(snapshot.employee_fee_cents || 0) / 100;
    employerFees += Number(snapshot.employer_fee_cents || 0) / 100;
  }

  const totalRevenue = employeeFees + employerFees;
  const avgRevenuePerCompany = totalCompanies > 0 ? totalRevenue / totalCompanies : 0;
  const avgRevenuePerEmployee = totalEmployees > 0 ? totalRevenue / totalEmployees : 0;

  return [
    {
      period,
      total_companies: totalCompanies,
      total_employees: totalEmployees,
      total_pretax: totalPretax,
      employee_fees: employeeFees,
      employer_fees: employerFees,
      total_revenue: totalRevenue,
      avg_revenue_per_company: avgRevenuePerCompany,
      avg_revenue_per_employee: avgRevenuePerEmployee
    }
  ];
}

function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}
