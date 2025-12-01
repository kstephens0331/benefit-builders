import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import * as XLSX from "xlsx";
import { calculateProposalMetrics } from "@/lib/proposal-calculator";
import type { CompanyTier } from "@/lib/section125";

export const runtime = "nodejs";

// Helper to convert pay period display format to database format
function convertPayPeriodToDb(payPeriod: string): string {
  const map: Record<string, string> = {
    "Weekly": "weekly",
    "Bi-Weekly": "biweekly",
    "Semi-Monthly": "semimonthly",
    "Monthly": "monthly",
  };
  return map[payPeriod] || "biweekly";
}

// Helper to convert pay period to single-letter code
function convertPayPeriodToCode(payPeriod: string): string {
  const map: Record<string, string> = {
    "Weekly": "w",
    "Bi-Weekly": "b",
    "Semi-Monthly": "s",
    "Monthly": "m",
    "weekly": "w",
    "biweekly": "b",
    "semimonthly": "s",
    "monthly": "m",
  };
  return map[payPeriod] || "b";
}

// POST - Generate proposal from uploaded census file
// NEW FLOW:
// 1. Check if company exists, create if not
// 2. Add employees to company's employees table
// 3. Generate proposal from those employees
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
    const tier = (formData.get("tier") as CompanyTier) || "2025";
    let companyId = formData.get("companyId") as string || null;

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

    // Convert proposal pay period to single letter code for default
    const proposalPayFreqMap: Record<string, string> = {
      "Weekly": "W", "weekly": "W", "W": "W", "w": "W",
      "Bi-Weekly": "B", "bi-weekly": "B", "biweekly": "B", "Biweekly": "B", "B": "B", "b": "B",
      "Semi-Monthly": "S", "semi-monthly": "S", "semimonthly": "S", "Semimonthly": "S", "S": "S", "s": "S",
      "Monthly": "M", "monthly": "M", "M": "M", "m": "M",
      "Annual": "A", "annual": "A", "A": "A", "a": "A"
    };
    const defaultPayFreqCode = proposalPayFreqMap[payPeriod || "Bi-Weekly"] || "B";

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
      const payFreqRaw = row[payPeriodIdx]?.toString().trim().toUpperCase() || "";
      const grossPay = parseFloat(row[grossPayIdx]?.toString().replace(/[^0-9.]/g, "") || "0");
      const maritalStatus = row[maritalStatusIdx]?.toString().trim().toUpperCase() || "S";
      const dependents = parseInt(row[dependentsIdx]?.toString() || "0");

      // Convert pay frequency codes to single letter codes
      // Use employee's pay frequency from census if provided, otherwise use proposal's pay period
      const payFreqMap: Record<string, string> = {
        W: "W", B: "B", S: "S", M: "M", A: "A",
        WEEKLY: "W", BIWEEKLY: "B", "BI-WEEKLY": "B",
        SEMIMONTHLY: "S", "SEMI-MONTHLY": "S",
        MONTHLY: "M", ANNUAL: "A"
      };
      const payFreq = payFreqRaw ? (payFreqMap[payFreqRaw] || defaultPayFreqCode) : defaultPayFreqCode;

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

    // Initialize database client
    const db = createServiceClient();

    // STEP 1: Find or create the company
    let actualCompanyId = companyId;

    if (!actualCompanyId) {
      // Check if company exists by name
      const { data: existingCompany } = await db
        .from("companies")
        .select("id")
        .ilike("name", companyName)
        .single();

      if (existingCompany) {
        actualCompanyId = existingCompany.id;
      } else {
        // Create new company
        const [employeeRateStr, employerRateStr] = modelPercentage.split("/");
        const employeeRate = parseFloat(employeeRateStr) || 5;
        const employerRate = parseFloat(employerRateStr) || 3;

        const { data: newCompany, error: createError } = await db
          .from("companies")
          .insert({
            name: companyName,
            address: companyAddress,
            city: companyCity,
            state: companyState,
            phone: companyPhone,
            email: companyEmail,
            contact_name: companyContact,
            model: modelPercentage,
            pay_frequency: convertPayPeriodToDb(payPeriod),
            tier: tier,
            employee_rate: employeeRate,
            employer_rate: employerRate,
            active: true,
          })
          .select("id")
          .single();

        if (createError || !newCompany) {
          throw new Error(`Failed to create company: ${createError?.message || "Unknown error"}`);
        }
        actualCompanyId = newCompany.id;
      }
    }

    // STEP 2: Add/update employees in the company's employees table
    const payPeriodCode = convertPayPeriodToCode(payPeriod);

    for (const emp of employees) {
      // Parse employee name (stored as "First Last" but need separate fields)
      const nameParts = emp.name.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Check if employee already exists (by name + company)
      const { data: existingEmp } = await db
        .from("employees")
        .select("id")
        .eq("company_id", actualCompanyId)
        .ilike("first_name", firstName)
        .ilike("last_name", lastName)
        .single();

      // Convert marital status to filing_status
      const filingStatus = emp.maritalStatus === "M" ? "married" : "single";
      const empPayPeriod = emp.payFreq.toLowerCase();

      if (existingEmp) {
        // Update existing employee
        await db
          .from("employees")
          .update({
            gross_pay: emp.grossPay,
            state: emp.state,
            pay_period: empPayPeriod,
            filing_status: filingStatus,
            dependents: emp.dependents,
            active: true,
          })
          .eq("id", existingEmp.id);
      } else {
        // Insert new employee
        await db
          .from("employees")
          .insert({
            company_id: actualCompanyId,
            first_name: firstName,
            last_name: lastName,
            gross_pay: emp.grossPay,
            state: emp.state || companyState || "MO",
            pay_period: empPayPeriod,
            filing_status: filingStatus,
            dependents: emp.dependents,
            active: true,
          });
      }
    }

    // STEP 3: Calculate proposal metrics for each employee
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
        tier, // Use company tier from form
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

    // STEP 4: Save proposal to database (linking to company)
    const { data: proposal, error: proposalError } = await db
      .from("proposals")
      .insert({
        company_id: actualCompanyId,
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
