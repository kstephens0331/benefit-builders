import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// GET - Download month-end report as CSV
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = createServiceClient();

    // Get closing record
    const { data: closing, error: closingError } = await db
      .from("month_end_closings")
      .select("*")
      .eq("id", id)
      .single();

    if (closingError || !closing) {
      return NextResponse.json(
        { ok: false, error: "Month-end closing not found" },
        { status: 404 }
      );
    }

    // Get company details
    const { data: companyDetails, error: detailsError } = await db
      .from("month_end_company_details")
      .select("*")
      .eq("closing_id", id)
      .order("company_name");

    if (detailsError) throw new Error(detailsError.message);

    // Generate CSV
    const csvRows: string[] = [];

    // Header - Summary
    csvRows.push(`Month-End Closing Report`);
    csvRows.push(`Period,${closing.month_year}`);
    csvRows.push(`Closing Date,${closing.closing_date}`);
    csvRows.push(`Status,${closing.status}`);
    csvRows.push(``);

    // Overall Summary
    csvRows.push(`OVERALL SUMMARY`);
    csvRows.push(`Total Companies,${closing.total_companies}`);
    csvRows.push(`Total Employees,${closing.total_employees}`);
    csvRows.push(`Total Pre-Tax Deductions,$${closing.total_pretax_deductions?.toFixed(2) || '0.00'}`);
    csvRows.push(`Total BB Fees,$${closing.total_bb_fees?.toFixed(2) || '0.00'}`);
    csvRows.push(`Total Employer FICA Savings,$${closing.total_employer_savings?.toFixed(2) || '0.00'}`);
    csvRows.push(`Total Employee Tax Savings,$${closing.total_employee_savings?.toFixed(2) || '0.00'}`);
    csvRows.push(`Total AR Open,$${closing.total_ar_open?.toFixed(2) || '0.00'}`);
    csvRows.push(`Total AR Overdue,$${closing.total_ar_overdue?.toFixed(2) || '0.00'}`);
    csvRows.push(`Total AP Open,$${closing.total_ap_open?.toFixed(2) || '0.00'}`);
    csvRows.push(`Total AP Overdue,$${closing.total_ap_overdue?.toFixed(2) || '0.00'}`);
    csvRows.push(`Emails Sent,${closing.emails_sent || 0}`);
    csvRows.push(`Emails Failed,${closing.emails_failed || 0}`);
    csvRows.push(``);
    csvRows.push(``);

    // Company Details Header
    csvRows.push(`COMPANY DETAILS`);
    csvRows.push(
      `Company Name,Contact Email,Employees,Enrolled,Enrollment Rate %,Pre-Tax Deductions,BB Fees,Employer FICA Savings,Employee Tax Savings,Net Savings,Email Sent`
    );

    // Company Details Rows
    if (companyDetails) {
      for (const detail of companyDetails) {
        csvRows.push(
          [
            `"${detail.company_name}"`,
            detail.contact_email || '',
            detail.employee_count,
            detail.enrolled_count,
            detail.enrollment_rate?.toFixed(1) || '0.0',
            `$${detail.pretax_deductions?.toFixed(2) || '0.00'}`,
            `$${detail.bb_fees?.toFixed(2) || '0.00'}`,
            `$${detail.employer_fica_savings?.toFixed(2) || '0.00'}`,
            `$${detail.employee_tax_savings?.toFixed(2) || '0.00'}`,
            `$${detail.net_savings?.toFixed(2) || '0.00'}`,
            detail.email_sent ? 'Yes' : 'No',
          ].join(',')
        );
      }
    }

    const csvContent = csvRows.join('\n');
    const filename = `Month-End-Report-${closing.month_year.replace(/\s+/g, '-')}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
