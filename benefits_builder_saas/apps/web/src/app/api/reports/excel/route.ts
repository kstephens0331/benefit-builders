// API endpoint to export reports as Excel file
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { computeFeesForPretaxMonthly } from "@/lib/fees";
import { calcFICA } from "@/lib/tax";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const db = createServiceClient();
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  })();

  const [yearStr] = period.split("-");
  const taxYear = Number(yearStr) || new Date().getFullYear();

  try {
    // Get federal tax rates
    const { data: fed } = await db
      .from("tax_federal_params")
      .select("ss_rate, med_rate")
      .eq("tax_year", taxYear)
      .single();

    // Get companies
    const { data: companiesData } = await db
      .from("companies")
      .select("id,name,state,model,status")
      .eq("status", "active");

    // Get employees
    const { data: emps } = await db
      .from("employees")
      .select("id,company_id,active,pay_period,paycheck_gross,first_name,last_name")
      .eq("active", true);

    // Get benefits
    const { data: bens } = await db
      .from("employee_benefits")
      .select("employee_id, per_pay_amount, reduces_fica");

    const payMap: Record<string, number> = { w: 52, b: 26, s: 24, m: 12 };
    const ppm = (pp: string | null | undefined) => (payMap[pp ?? "b"] ?? 26) / 12;

    // Build company summaries
    const byCompany: Record<string, any> = {};
    for (const c of companiesData ?? []) {
      byCompany[c.id] = {
        company_id: c.id,
        company_name: c.name,
        state: c.state,
        model: c.model,
        status: c.status,
        employees_active: 0,
        pretax_monthly: 0,
        employer_fica_saved_monthly: 0,
      };
    }

    // Index benefits by employee
    const benByEmp = new Map<string, { perPay: number; reducesFICA: boolean }>();
    for (const b of bens ?? []) {
      const key = String(b.employee_id);
      const prev = benByEmp.get(key) ?? { perPay: 0, reducesFICA: true };
      prev.perPay += Number(b.per_pay_amount ?? 0);
      prev.reducesFICA = prev.reducesFICA && !!b.reduces_fica;
      benByEmp.set(key, prev);
    }

    // Calculate for each employee
    const employeeRows: any[] = [];
    const nameById = new Map<string, string>();
    for (const c of companiesData ?? []) nameById.set(c.id, c.name);

    for (const e of emps ?? []) {
      const bucket = byCompany[e.company_id];
      if (bucket) bucket.employees_active += 1;

      const perPayPretax = benByEmp.get(e.id)?.perPay ?? 0;
      const perMonth = ppm(e.pay_period);

      if (bucket) {
        bucket.pretax_monthly += perPayPretax * perMonth;

        // Calculate employer FICA savings
        const gross = Number(e.paycheck_gross ?? 0);
        const before = calcFICA(gross, 0, Number(fed?.ss_rate || 0.062), Number(fed?.med_rate || 0.0145));
        const after = calcFICA(gross, perPayPretax, Number(fed?.ss_rate || 0.062), Number(fed?.med_rate || 0.0145));
        const savedPerPay = +(before.fica - after.fica).toFixed(2);
        bucket.employer_fica_saved_monthly += savedPerPay * perMonth;
      }

      employeeRows.push({
        Company: nameById.get(e.company_id) ?? "",
        "Last Name": e.last_name,
        "First Name": e.first_name,
        Active: e.active ? "Yes" : "No",
        "Pay Period": e.pay_period,
        "Gross/Pay": e.paycheck_gross ? Number(e.paycheck_gross) : 0,
        "Pretax/Pay": +perPayPretax.toFixed(2),
        "Pretax/Month": +(perPayPretax * perMonth).toFixed(2),
      });
    }

    // Finalize company rows with fees
    const companyRows = Object.values(byCompany).map((r: any) => {
      const fees = computeFeesForPretaxMonthly(+r.pretax_monthly.toFixed(2), r.model);
      const employer_net = +(+r.employer_fica_saved_monthly.toFixed(2) - fees.employerFeeMonthly).toFixed(2);
      return {
        Company: r.company_name,
        State: r.state || "",
        Model: r.model || "",
        "Active Employees": r.employees_active,
        "Pretax (Monthly)": +r.pretax_monthly.toFixed(2),
        "ER FICA Saved (Monthly)": +r.employer_fica_saved_monthly.toFixed(2),
        "EE Fees (Monthly)": fees.employeeFeeMonthly,
        "ER Fees (Monthly)": fees.employerFeeMonthly,
        "ER Net (Monthly)": employer_net,
      };
    });

    // Create Excel workbook
    const workbook = XLSX.utils.book_new();

    // Add Companies sheet
    const companiesSheet = XLSX.utils.json_to_sheet(companyRows);
    XLSX.utils.book_append_sheet(workbook, companiesSheet, "Companies");

    // Add Employees sheet
    const employeesSheet = XLSX.utils.json_to_sheet(employeeRows);
    XLSX.utils.book_append_sheet(workbook, employeesSheet, "Employees");

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Return Excel file
    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="BenefitsBuilder-Report-${period}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("Excel export error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to generate Excel report", details: error.message },
      { status: 500 }
    );
  }
}
