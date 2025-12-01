import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { calculateProposalMetrics } from "@/lib/proposal-calculator";
import type { CompanyTier } from "@/lib/section125";

export const runtime = "nodejs";

// POST - Generate proposal from existing company employees
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, effectiveDate, modelPercentage, payPeriod, tier } = body;

    if (!companyId) {
      return NextResponse.json(
        { ok: false, error: "Company ID is required" },
        { status: 400 }
      );
    }

    if (!effectiveDate) {
      return NextResponse.json(
        { ok: false, error: "Effective date is required" },
        { status: 400 }
      );
    }

    const db = createServiceClient();

    // Fetch company details
    const { data: company, error: companyError } = await db
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { ok: false, error: "Company not found" },
        { status: 404 }
      );
    }

    // Fetch employees for this company
    const { data: employees, error: employeesError } = await db
      .from("employees")
      .select("*")
      .eq("company_id", companyId);

    if (employeesError) {
      return NextResponse.json(
        { ok: false, error: employeesError.message },
        { status: 500 }
      );
    }

    if (!employees || employees.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No employees found for this company. Please add employees first or upload a census file." },
        { status: 400 }
      );
    }

    // Use company's model if not provided, or fall back to defaults
    const actualModel = modelPercentage || company.model || "5/3";
    const actualTier = (tier || company.tier || "2025") as CompanyTier;

    // Calculate proposal metrics for each employee
    const calculatedEmployees = employees.map(emp => {
      // Get employee's gross pay per paycheck
      const grossPay = emp.gross_pay || emp.paycheck_gross || 0;

      // Get employee's pay frequency (convert to single letter code)
      const payFreqRaw = emp.pay_period || emp.pay_frequency || "B";
      const payFreqMap: Record<string, string> = {
        W: "W", B: "B", S: "S", M: "M", A: "A",
        weekly: "W", biweekly: "B", "bi-weekly": "B",
        semimonthly: "S", "semi-monthly": "S",
        monthly: "M", annual: "A"
      };
      const payFreq = payFreqMap[payFreqRaw.toUpperCase()] || payFreqMap[payFreqRaw.toLowerCase()] || "B";

      // Get marital status
      const maritalStatus = emp.marital_status || emp.filing_status || "S";
      const maritalCode = maritalStatus.charAt(0).toUpperCase();

      // Get dependents
      const dependents = emp.dependents || 0;

      // Get state
      const state = emp.state || company.state || "MO";

      // Build employee name
      const employeeName = emp.name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim();

      // Only disqualify if gross pay is too low (< $500 per paycheck)
      if (grossPay < 500) {
        return {
          name: employeeName,
          state,
          payFreq,
          grossPay,
          maritalStatus: maritalCode,
          dependents,
          qualifies: false,
          grossBenefitAllotment: 0,
          employeeNetIncreaseMonthly: 0,
          employeeNetIncreaseAnnual: 0,
          employerNetSavingsMonthly: 0,
          employerNetSavingsAnnual: 0,
          netMonthlySavings: 0,
          netAnnualSavings: 0,
          disqualificationReason: "Gross pay below $500",
        };
      }

      const result = calculateProposalMetrics(
        grossPay,
        payFreq,
        maritalCode,
        dependents,
        state,
        actualModel,
        actualTier,
        50 // Safety cap percent
      );

      return {
        name: employeeName,
        state,
        payFreq,
        grossPay,
        maritalStatus: maritalCode,
        dependents,
        qualifies: true,
        grossBenefitAllotment: result.grossBenefitAllotment,
        employeeNetIncreaseMonthly: result.employeeNetIncreaseMonthly,
        employeeNetIncreaseAnnual: result.employeeNetIncreaseAnnual,
        employerNetSavingsMonthly: result.employerNetSavingsMonthly,
        employerNetSavingsAnnual: result.employerNetSavingsAnnual,
        netMonthlySavings: result.netMonthlySavings,
        netAnnualSavings: result.netAnnualSavings,
        isCapped: result.isCapped,
      };
    });

    // Calculate totals
    const qualified = calculatedEmployees.filter(e => e.qualifies);
    const totalMonthlySavings = qualified.reduce((sum, e) => sum + e.netMonthlySavings, 0);
    const totalAnnualSavings = qualified.reduce((sum, e) => sum + e.netAnnualSavings, 0);

    // Save to database
    const { data: proposal, error: proposalError } = await db
      .from("proposals")
      .insert({
        company_id: companyId,
        proposal_name: `${company.name} - ${effectiveDate}`,
        company_name: company.name,
        company_address: company.address || "",
        company_city: company.city || "",
        company_state: company.state || "",
        company_phone: company.phone || company.contact_phone || "",
        company_email: company.email || company.contact_email || "",
        company_contact: company.contact_name || "",
        effective_date: effectiveDate,
        model_percentage: actualModel,
        pay_period: payPeriod || "Bi-Weekly",
        total_employees: employees.length,
        qualified_employees: qualified.length,
        total_monthly_savings: totalMonthlySavings,
        total_annual_savings: totalAnnualSavings,
        census_data: { employees: calculatedEmployees },
        status: "draft",
      })
      .select()
      .single();

    if (proposalError) throw new Error(proposalError.message);

    // Save employee details with projected Section 125 savings
    const employeeRecords = calculatedEmployees.map(emp => ({
      proposal_id: proposal.id,
      employee_name: emp.name,
      state: emp.state,
      pay_frequency: emp.payFreq,
      paycheck_gross: emp.grossPay,
      marital_status: emp.maritalStatus,
      dependents: emp.dependents,
      gross_benefit_allotment: emp.grossBenefitAllotment || 0,
      employee_net_increase_monthly: emp.employeeNetIncreaseMonthly || 0,
      employee_net_increase_annual: emp.employeeNetIncreaseAnnual || 0,
      net_monthly_employer_savings: emp.netMonthlySavings || 0,
      net_annual_employer_savings: emp.netAnnualSavings || 0,
      qualifies: emp.qualifies,
      disqualification_reason: emp.disqualificationReason || null,
    }));

    const { error: employeesInsertError } = await db
      .from("proposal_employees")
      .insert(employeeRecords);

    if (employeesInsertError) throw new Error(employeesInsertError.message);

    return NextResponse.json({
      ok: true,
      message: `Proposal created successfully with ${employees.length} employees (${qualified.length} qualified)`,
      proposalId: proposal.id,
      data: {
        totalEmployees: employees.length,
        qualifiedEmployees: qualified.length,
        totalMonthlySavings,
        totalAnnualSavings,
      },
    });
  } catch (error: any) {
    console.error("Error generating proposal from company:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
