// apps/web/src/app/api/proposals/from-employees/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { calculateProposalMetrics } from "@/lib/proposal-calculator";

export const runtime = "nodejs";

// POST - Generate proposal from existing company employees
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company_id } = body;

    if (!company_id) {
      return NextResponse.json(
        { ok: false, error: "company_id is required" },
        { status: 400 }
      );
    }

    const db = createServiceClient();

    // Fetch company details
    const { data: company, error: companyError } = await db
      .from("companies")
      .select("id, name, state, model, tier, employer_rate, employee_rate, pay_frequency, safety_cap_percent")
      .eq("id", company_id)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { ok: false, error: "Company not found" },
        { status: 404 }
      );
    }

    // Fetch all active employees
    const { data: employees, error: employeesError } = await db
      .from("employees")
      .select("id, first_name, last_name, filing_status, dependents, gross_pay, pay_period, safety_cap_percent, consent_status")
      .eq("company_id", company_id)
      .eq("active", true)
      .order("last_name");

    if (employeesError) {
      return NextResponse.json(
        { ok: false, error: "Failed to fetch employees" },
        { status: 500 }
      );
    }

    if (!employees || employees.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No active employees found for this company" },
        { status: 400 }
      );
    }

    // Map filing status to marital status
    const filingToMarital: Record<string, string> = {
      single: "S",
      married: "M",
      head: "H",
    };

    // Map pay_period to pay frequency code
    const payPeriodMap: Record<string, string> = {
      weekly: "W",
      biweekly: "B",
      "bi-weekly": "B",
      semimonthly: "S",
      "semi-monthly": "S",
      monthly: "M",
      annual: "A",
    };

    // Calculate proposal metrics for each employee
    const calculatedEmployees = employees.map((emp) => {
      const fullName = `${emp.first_name} ${emp.last_name}`;
      const maritalStatus = filingToMarital[emp.filing_status] || "S";
      const payFreq = payPeriodMap[emp.pay_period?.toLowerCase() || company.pay_frequency?.toLowerCase() || "biweekly"] || "B";

      // Employee qualifies if consent_status is "elect" and gross pay is sufficient
      const qualifies = emp.consent_status === "elect" && emp.gross_pay >= 500;

      if (!qualifies) {
        return {
          name: fullName,
          state: company.state,
          payFreq: payFreq,
          grossPay: emp.gross_pay,
          maritalStatus: maritalStatus,
          dependents: emp.dependents,
          qualifies: false,
          grossBenefitAllotment: 0,
          netMonthlySavings: 0,
          netAnnualSavings: 0,
          disqualificationReason: emp.consent_status !== "elect" ? "Not enrolled" : "Gross pay below $500",
        };
      }

      const result = calculateProposalMetrics(
        emp.gross_pay,
        payFreq,
        maritalStatus,
        emp.dependents,
        company.state,
        company.model || "5/1"
      );

      return {
        name: fullName,
        state: company.state,
        payFreq: payFreq,
        grossPay: emp.gross_pay,
        maritalStatus: maritalStatus,
        dependents: emp.dependents,
        qualifies: true,
        grossBenefitAllotment: result.grossBenefitAllotment,
        netMonthlySavings: result.netMonthlySavings,
        netAnnualSavings: result.netAnnualSavings,
      };
    });

    // Calculate totals
    const qualified = calculatedEmployees.filter((e) => e.qualifies);
    const totalMonthlySavings = qualified.reduce((sum, e) => sum + e.netMonthlySavings, 0);
    const totalAnnualSavings = qualified.reduce((sum, e) => sum + e.netAnnualSavings, 0);

    // Get current date for proposal name
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];

    // Save to database
    const { data: proposal, error: proposalError } = await db
      .from("proposals")
      .insert({
        company_id: company_id,
        proposal_name: `${company.name} - ${dateStr}`,
        company_name: company.name,
        company_address: "",
        company_city: "",
        company_state: company.state,
        company_phone: "",
        company_email: "",
        company_contact: "",
        effective_date: dateStr,
        model_percentage: company.model || "5/1",
        pay_period: company.pay_frequency || "Bi-Weekly",
        total_employees: employees.length,
        qualified_employees: qualified.length,
        total_monthly_savings: totalMonthlySavings,
        total_annual_savings: totalAnnualSavings,
        census_data: { employees: calculatedEmployees },
        status: "draft",
      })
      .select()
      .single();

    if (proposalError) {
      throw new Error(proposalError.message);
    }

    // Save employee details
    const employeeRecords = calculatedEmployees.map((emp) => ({
      proposal_id: proposal.id,
      employee_name: emp.name,
      state: emp.state,
      pay_frequency: emp.payFreq,
      paycheck_gross: emp.grossPay,
      marital_status: emp.maritalStatus,
      dependents: emp.dependents,
      gross_benefit_allotment: emp.grossBenefitAllotment || 0,
      net_monthly_employer_savings: emp.netMonthlySavings || 0,
      net_annual_employer_savings: emp.netAnnualSavings || 0,
      qualifies: emp.qualifies,
      disqualification_reason: emp.disqualificationReason || null,
    }));

    const { error: insertError } = await db
      .from("proposal_employees")
      .insert(employeeRecords);

    if (insertError) {
      // Rollback: delete the proposal
      await db.from("proposals").delete().eq("id", proposal.id);
      throw new Error(insertError.message);
    }

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
    console.error("Error generating proposal from employees:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
