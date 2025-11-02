import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { sendMonthEndReport } from "@/lib/email";

// POST - Run month-end closing process
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { closingDate, sendEmails = false } = body;

    if (!closingDate) {
      return NextResponse.json(
        { ok: false, error: "Closing date is required (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const db = createServiceClient();

    // Parse closing date and generate period name
    const date = new Date(closingDate);
    const monthYear = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });

    console.log(`🔵 Starting month-end close for ${monthYear}...`);

    // Check if closing already exists
    const { data: existing } = await db
      .from("month_end_closings")
      .select("id, status")
      .eq("closing_date", closingDate)
      .single();

    if (existing && existing.status === "closed") {
      return NextResponse.json(
        {
          ok: false,
          error: `Month-end for ${monthYear} is already closed`,
        },
        { status: 400 }
      );
    }

    // Create or update closing record
    let closingId: string;

    if (existing) {
      closingId = existing.id;
      await db
        .from("month_end_closings")
        .update({ status: "closing", error_message: null })
        .eq("id", closingId);
    } else {
      const { data: newClosing, error: closingError } = await db
        .from("month_end_closings")
        .insert({
          closing_date: closingDate,
          month_year: monthYear,
          status: "closing",
        })
        .select("id")
        .single();

      if (closingError) throw new Error(closingError.message);
      closingId = newClosing.id;
    }

    // Get all active companies
    const { data: companies } = await db
      .from("companies")
      .select("*")
      .eq("status", "active");

    if (!companies || companies.length === 0) {
      await db
        .from("month_end_closings")
        .update({
          status: "closed",
          closed_at: new Date().toISOString(),
          closed_by: "system",
        })
        .eq("id", closingId);

      return NextResponse.json({
        ok: true,
        message: "No active companies found",
        closingId,
      });
    }

    let totalCompanies = 0;
    let totalEmployees = 0;
    let totalPretax = 0;
    let totalBBFees = 0;
    let totalEmployerSavings = 0;
    let totalEmployeeSavings = 0;
    let totalAROpen = 0;
    let totalAROverdue = 0;
    let totalAPOpen = 0;
    let totalAPOverdue = 0;
    let emailsSent = 0;
    let emailsFailed = 0;

    // Process each company
    for (const company of companies) {
      try {
        // Get employee count and enrolled count
        const { data: employees } = await db
          .from("employees")
          .select("id, health_insurance, dental_insurance, vision_insurance")
          .eq("company_id", company.id)
          .eq("status", "active");

        const employeeCount = employees?.length || 0;
        const enrolledCount =
          employees?.filter(
            (e) => e.health_insurance || e.dental_insurance || e.vision_insurance
          ).length || 0;
        const enrollmentRate =
          employeeCount > 0 ? (enrolledCount / employeeCount) * 100 : 0;

        // Calculate pretax deductions (sum of all benefit premiums)
        let pretaxDeductions = 0;
        let employeeFees = 0;
        let employerFees = 0;

        if (employees) {
          for (const emp of employees) {
            let benefitAmount = 0;
            if (emp.health_insurance) benefitAmount += parseFloat(emp.health_insurance) || 0;
            if (emp.dental_insurance) benefitAmount += parseFloat(emp.dental_insurance) || 0;
            if (emp.vision_insurance) benefitAmount += parseFloat(emp.vision_insurance) || 0;

            pretaxDeductions += benefitAmount;

            // Calculate BB fees based on company's fee model
            const employeeRate = parseFloat(company.employee_rate as string) || 5;
            const employerRate = parseFloat(company.employer_rate as string) || 1;

            employeeFees += benefitAmount * (employeeRate / 100);
            employerFees += benefitAmount * (employerRate / 100);
          }
        }

        const bbFees = employeeFees + employerFees;

        // Calculate employer FICA savings (7.65% of pretax deductions)
        const employerSavings = pretaxDeductions * 0.0765;

        // Estimate employee tax savings (assume ~22% federal + 5% state)
        const employeeSavings = pretaxDeductions * 0.27;

        // Net savings = employer savings - BB fees
        const netSavings = employerSavings - bbFees;

        // Get AR data for this company
        const { data: arData } = await db
          .from("accounts_receivable")
          .select("amount_due, status, due_date")
          .eq("company_id", company.id)
          .neq("status", "paid");

        let arOpen = 0;
        let arOverdue = 0;

        if (arData) {
          for (const ar of arData) {
            const amountDue = parseFloat(ar.amount_due as string) || 0;
            arOpen += amountDue;
            if (ar.status === "overdue") {
              arOverdue += amountDue;
            }
          }
        }

        // Save company details
        await db.from("month_end_company_details").insert({
          closing_id: closingId,
          company_id: company.id,
          company_name: company.name,
          contact_email: company.email,
          employee_count: employeeCount,
          enrolled_count: enrolledCount,
          enrollment_rate: enrollmentRate,
          pretax_deductions: pretaxDeductions,
          bb_fees: bbFees,
          employer_fica_savings: employerSavings,
          employee_tax_savings: employeeSavings,
          net_savings: netSavings,
        });

        // Aggregate totals
        totalCompanies++;
        totalEmployees += employeeCount;
        totalPretax += pretaxDeductions;
        totalBBFees += bbFees;
        totalEmployerSavings += employerSavings;
        totalEmployeeSavings += employeeSavings;
        totalAROpen += arOpen;
        totalAROverdue += arOverdue;

        // Send email if requested
        if (sendEmails && company.email) {
          try {
            const emailResult = await sendMonthEndReport(
              company.name,
              company.email,
              monthYear,
              {
                employeeCount,
                enrolledCount,
                enrollmentRate,
                pretaxDeductions,
                bbFees,
                employerSavings,
                employeeSavings,
                netSavings,
                arOpen,
                arOverdue,
              }
            );

            if (emailResult.success) {
              emailsSent++;
              await db
                .from("month_end_company_details")
                .update({
                  email_sent: true,
                  email_sent_at: new Date().toISOString(),
                })
                .eq("closing_id", closingId)
                .eq("company_id", company.id);
            } else {
              emailsFailed++;
              await db
                .from("month_end_company_details")
                .update({
                  email_sent: false,
                  email_error: emailResult.error || "Unknown error",
                })
                .eq("closing_id", closingId)
                .eq("company_id", company.id);
            }
          } catch (emailError: any) {
            console.error(`Failed to send email to ${company.name}:`, emailError.message);
            emailsFailed++;
          }
        }
      } catch (companyError: any) {
        console.error(`Error processing company ${company.name}:`, companyError.message);
        emailsFailed++;
      }
    }

    // Get AP totals
    const { data: apData } = await db
      .from("accounts_payable")
      .select("amount_due, status")
      .neq("status", "paid");

    if (apData) {
      for (const ap of apData) {
        const amountDue = parseFloat(ap.amount_due as string) || 0;
        totalAPOpen += amountDue;
        if (ap.status === "overdue") {
          totalAPOverdue += amountDue;
        }
      }
    }

    // Update closing record with totals
    await db
      .from("month_end_closings")
      .update({
        status: "closed",
        total_companies: totalCompanies,
        total_employees: totalEmployees,
        total_pretax_deductions: totalPretax,
        total_bb_fees: totalBBFees,
        total_employer_savings: totalEmployerSavings,
        total_employee_savings: totalEmployeeSavings,
        total_ar_open: totalAROpen,
        total_ar_overdue: totalAROverdue,
        total_ap_open: totalAPOpen,
        total_ap_overdue: totalAPOverdue,
        emails_sent: emailsSent,
        emails_failed: emailsFailed,
        report_generated: true,
        closed_at: new Date().toISOString(),
        closed_by: "system",
      })
      .eq("id", closingId);

    console.log(`✅ Month-end close completed for ${monthYear}`);
    console.log(`   Companies: ${totalCompanies}`);
    console.log(`   Employees: ${totalEmployees}`);
    console.log(`   Emails sent: ${emailsSent}, failed: ${emailsFailed}`);

    return NextResponse.json({
      ok: true,
      message: `Month-end closing for ${monthYear} completed successfully`,
      closingId,
      summary: {
        totalCompanies,
        totalEmployees,
        totalPretax,
        totalBBFees,
        totalEmployerSavings,
        totalEmployeeSavings,
        emailsSent,
        emailsFailed,
      },
    });
  } catch (error: any) {
    console.error("❌ Month-end close error:", error.message);

    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET - Get list of all month-end closings
export async function GET(request: NextRequest) {
  try {
    const db = createServiceClient();

    const { data, error } = await db
      .from("month_end_closings")
      .select("*")
      .order("closing_date", { ascending: false })
      .limit(24); // Last 2 years

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
