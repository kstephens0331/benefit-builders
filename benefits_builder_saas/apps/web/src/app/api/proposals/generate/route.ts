import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import * as XLSX from "xlsx";
import { calculateProposalMetrics } from "@/lib/proposal-calculator";

export const runtime = "nodejs";

// POST - Generate proposal from uploaded census file
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const companyName = formData.get("companyName") as string;
    const companyAddress = formData.get("companyAddress") as string || "";
    const companyCity = formData.get("companyCity") as string || "";
    const companyState = formData.get("companyState") as string || "";
    const companyPhone = formData.get("companyPhone") as string || "";
    const companyEmail = formData.get("companyEmail") as string || "";
    const companyContact = formData.get("companyContact") as string || "";
    const effectiveDate = formData.get("effectiveDate") as string;
    const modelPercentage = formData.get("modelPercentage") as string || "5/1";
    const payPeriod = formData.get("payPeriod") as string || "Bi-Weekly";
    const companyId = formData.get("companyId") as string || null;

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "No file uploaded" },
        { status: 400 }
      );
    }

    if (!companyName || !effectiveDate) {
      return NextResponse.json(
        { ok: false, error: "Company name and effective date are required" },
        { status: 400 }
      );
    }

    // Read Excel file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];

    // Find header row (looking for "Last Name", "First Name", etc.)
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(20, rawData.length); i++) {
      const row = rawData[i];
      const rowStr = row.join(" ").toLowerCase();
      if (rowStr.includes("last name") && rowStr.includes("first name")) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      return NextResponse.json(
        { ok: false, error: "Could not find employee data header row in census file" },
        { status: 400 }
      );
    }

    // Parse employees
    const headerRow = rawData[headerRowIndex];
    const employees: any[] = [];

    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0) continue;

      // Find column indexes
      const lastNameIdx = headerRow.findIndex((h: string) =>
        h && h.toString().toLowerCase().includes("last name")
      );
      const firstNameIdx = headerRow.findIndex((h: string) =>
        h && h.toString().toLowerCase().includes("first name")
      );
      const stateIdx = headerRow.findIndex((h: string) =>
        h && h.toString().toLowerCase().trim() === "st"
      );
      const payPeriodIdx = headerRow.findIndex((h: string) =>
        h && (h.toString().toLowerCase().includes("pay period") || h.toString().toLowerCase().includes("w,b,m,s"))
      );
      const grossPayIdx = headerRow.findIndex((h: string) =>
        h && (h.toString().toLowerCase().includes("gross pay") || h.toString().toLowerCase().includes("paycheck gross"))
      );
      const maritalStatusIdx = headerRow.findIndex((h: string) =>
        h && h.toString().toLowerCase().includes("marital status")
      );
      const dependentsIdx = headerRow.findIndex((h: string) =>
        h && h.toString().toLowerCase().includes("dependents")
      );

      const lastName = row[lastNameIdx]?.toString().trim() || "";
      const firstName = row[firstNameIdx]?.toString().trim() || "";

      if (!lastName || !firstName) continue;

      const fullName = `${firstName} ${lastName}`;
      const state = row[stateIdx]?.toString().trim() || "MO";
      const payFreqRaw = row[payPeriodIdx]?.toString().trim().toUpperCase() || "B";
      const grossPay = parseFloat(row[grossPayIdx]?.toString().replace(/[^0-9.]/g, "") || "0");
      const maritalStatus = row[maritalStatusIdx]?.toString().trim().toUpperCase() || "S";
      const dependents = parseInt(row[dependentsIdx]?.toString() || "0");

      // Convert pay frequency codes to full names
      const payFreqMap: Record<string, string> = {
        W: "W", B: "B", S: "S", M: "M", A: "A",
        WEEKLY: "W", BIWEEKLY: "B", "BI-WEEKLY": "B",
        SEMIMONTHLY: "S", "SEMI-MONTHLY": "S",
        MONTHLY: "M", ANNUAL: "A"
      };
      const payFreq = payFreqMap[payFreqRaw] || "B";

      // Clean any asterisks from the name (they may come from Excel formatting)
      // Disqualification is based on gross pay threshold only, not asterisks
      const cleanName = fullName.replace(/\*/g, "").trim();

      employees.push({
        name: cleanName,
        state,
        payFreq,
        grossPay,
        maritalStatus,
        dependents,
      });
    }

    if (employees.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No employees found in census file" },
        { status: 400 }
      );
    }

    // Calculate proposal metrics for each employee
    // This calculates PROJECTED savings assuming all employees will elect Section 125
    const calculatedEmployees = employees.map(emp => {
      // Only disqualify if gross pay is too low (< $500 per paycheck)
      if (emp.grossPay < 500) {
        return {
          ...emp,
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
        emp.grossPay,
        emp.payFreq,
        emp.maritalStatus,
        emp.dependents,
        emp.state,
        modelPercentage,
        '2025', // Default tier - could be passed from form
        50 // Safety cap percent
      );

      return {
        ...emp,
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
    const db = createServiceClient();

    const { data: proposal, error: proposalError } = await db
      .from("proposals")
      .insert({
        company_id: companyId,
        proposal_name: `${companyName} - ${effectiveDate}`,
        company_name: companyName,
        company_address: companyAddress,
        company_city: companyCity,
        company_state: companyState,
        company_phone: companyPhone,
        company_email: companyEmail,
        company_contact: companyContact,
        effective_date: effectiveDate,
        model_percentage: modelPercentage,
        pay_period: payPeriod,
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

    const { error: employeesError } = await db
      .from("proposal_employees")
      .insert(employeeRecords);

    if (employeesError) throw new Error(employeesError.message);

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
    console.error("Error generating proposal:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
