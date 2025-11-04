import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { PDFDocument, StandardFonts, rgb, PDFPage } from "pdf-lib";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

// GET - Generate PDF for proposal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = createServiceClient();

    // Get proposal
    const { data: proposal, error: proposalError } = await db
      .from("proposals")
      .select("*")
      .eq("id", id)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json(
        { ok: false, error: "Proposal not found" },
        { status: 404 }
      );
    }

    // Get employees
    const { data: employees, error: employeesError } = await db
      .from("proposal_employees")
      .select("*")
      .eq("proposal_id", id)
      .order("employee_name");

    if (employeesError) throw new Error(employeesError.message);

    // Generate PDF
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Load Benefits Booster logo if available (optional)
    let logoImage = null;
    const logoPath = path.join(process.cwd(), "public", "benefits-booster-logo.png");
    if (fs.existsSync(logoPath)) {
      try {
        const logoBytes = fs.readFileSync(logoPath);
        logoImage = await pdfDoc.embedPng(logoBytes);
      } catch (e) {
        console.log("Logo not found, skipping");
      }
    }

    const pageWidth = 792; // US Letter width in points
    const pageHeight = 612; // US Letter height in points (landscape)
    const margin = 40;
    const contentWidth = pageWidth - 2 * margin;

    // Colors matching Benefits Booster theme
    const primaryBlue = rgb(0.05, 0.32, 0.62); // #0D5280
    const accentRed = rgb(0.8, 0.1, 0.1);
    const textGray = rgb(0.2, 0.2, 0.2);
    const lightGray = rgb(0.95, 0.95, 0.95);

    // Split employees into pages (20 employees per page)
    const employeesPerPage = 20;
    const totalPages = Math.ceil((employees?.length || 0) / employeesPerPage);

    for (let pageNum = 0; pageNum < totalPages; pageNum++) {
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      const startIdx = pageNum * employeesPerPage;
      const endIdx = Math.min(startIdx + employeesPerPage, employees?.length || 0);
      const pageEmployees = employees?.slice(startIdx, endIdx) || [];

      let yPosition = pageHeight - margin;

      // Header Section
      // Logo (left side)
      if (logoImage) {
        const logoWidth = 100;
        const logoHeight = 60;
        page.drawImage(logoImage, {
          x: margin,
          y: yPosition - logoHeight,
          width: logoWidth,
          height: logoHeight,
        });
      } else {
        // Draw text logo if image not available
        page.drawText("Benefits Booster", {
          x: margin,
          y: yPosition - 20,
          size: 18,
          font: boldFont,
          color: primaryBlue,
        });
        page.drawText("Making your benefits soar", {
          x: margin,
          y: yPosition - 38,
          size: 10,
          font: font,
          color: accentRed,
        });
      }

      // Title (center)
      page.drawText("Benefits Booster Proposal", {
        x: pageWidth / 2 - 100,
        y: yPosition - 30,
        size: 18,
        font: boldFont,
        color: textGray,
      });

      yPosition -= 80;

      // Company Info Section (2 columns)
      const col1X = margin;
      const col2X = pageWidth / 2;
      const col3X = pageWidth - 200;
      const infoYStart = yPosition;

      // Column 1
      page.drawText("Company Name:", { x: col1X, y: infoYStart, size: 9, font: font, color: textGray });
      page.drawText("Company Contact:", { x: col1X, y: infoYStart - 12, size: 9, font: font, color: textGray });
      page.drawText("Date:", { x: col1X, y: infoYStart - 24, size: 9, font: font, color: textGray });
      page.drawText("Pay Period:", { x: col1X, y: infoYStart - 36, size: 9, font: font, color: textGray });

      page.drawText(proposal.company_name, { x: col1X + 95, y: infoYStart, size: 9, font: boldFont, color: textGray });
      page.drawText(proposal.company_contact || "", { x: col1X + 95, y: infoYStart - 12, size: 9, font: font, color: textGray });
      page.drawText(new Date().toLocaleDateString(), { x: col1X + 95, y: infoYStart - 24, size: 9, font: font, color: textGray });
      page.drawText(proposal.pay_period, { x: col1X + 95, y: infoYStart - 36, size: 9, font: font, color: textGray });

      // Column 2
      page.drawText("Company Address:", { x: col2X, y: infoYStart, size: 9, font: font, color: textGray });
      page.drawText("Company Phone:", { x: col2X, y: infoYStart - 12, size: 9, font: font, color: textGray });
      page.drawText("Effective Date:", { x: col2X, y: infoYStart - 24, size: 9, font: font, color: textGray });

      page.drawText(proposal.company_address || "", { x: col2X + 100, y: infoYStart, size: 9, font: font, color: textGray });
      page.drawText(proposal.company_phone || "", { x: col2X + 100, y: infoYStart - 12, size: 9, font: font, color: textGray });
      page.drawText(new Date(proposal.effective_date).toLocaleDateString(), { x: col2X + 100, y: infoYStart - 24, size: 9, font: font, color: textGray });

      // Column 3
      page.drawText("Company City:", { x: col3X, y: infoYStart, size: 9, font: font, color: textGray });
      page.drawText("Company Email:", { x: col3X, y: infoYStart - 12, size: 9, font: font, color: textGray });
      page.drawText("Model Percentage:", { x: col3X, y: infoYStart - 24, size: 9, font: font, color: textGray });

      const cityText = proposal.company_city ? `${proposal.company_city}${proposal.company_state ? ', ' + proposal.company_state : ''}` : "";
      page.drawText(cityText, { x: col3X + 85, y: infoYStart, size: 9, font: font, color: textGray });
      page.drawText(proposal.company_email || "", { x: col3X + 85, y: infoYStart - 12, size: 9, font: font, color: textGray });
      page.drawText(proposal.model_percentage, { x: col3X + 85, y: infoYStart - 24, size: 9, font: font, color: textGray });

      yPosition -= 70;

      // Employee Table
      drawEmployeeTable(page, pageEmployees, yPosition, margin, contentWidth, font, boldFont, primaryBlue, lightGray, textGray);

      // Footer on last page
      if (pageNum === totalPages - 1) {
        const footerY = 30;
        page.drawText("* Denotes Employees that do not qualify for the 125 Plan", {
          x: margin,
          y: footerY,
          size: 8,
          font: font,
          color: textGray,
        });

        // Total on last page
        if (pageNum === totalPages - 1 && employees && employees.length > 0) {
          const totalMonthly = proposal.total_monthly_savings;
          const totalAnnual = proposal.total_annual_savings;

          page.drawText(`Employee Count: ${proposal.total_employees}`, {
            x: margin,
            y: footerY + 30,
            size: 9,
            font: boldFont,
            color: textGray,
          });

          page.drawText(`$${totalMonthly.toFixed(2)}`, {
            x: pageWidth - 200,
            y: footerY + 30,
            size: 9,
            font: boldFont,
            color: textGray,
          });

          page.drawText(`$${totalAnnual.toFixed(2)}`, {
            x: pageWidth - 100,
            y: footerY + 30,
            size: 9,
            font: boldFont,
            color: textGray,
          });
        }
      }
    }

    // Save PDF
    const pdfBytes = await pdfDoc.save();

    // Update proposal with PDF data
    await db
      .from("proposals")
      .update({ pdf_data: Buffer.from(pdfBytes) })
      .eq("id", id);

    // Return PDF
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${proposal.proposal_name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Error generating proposal PDF:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

function drawEmployeeTable(
  page: PDFPage,
  employees: any[],
  startY: number,
  marginX: number,
  width: number,
  font: any,
  boldFont: any,
  primaryColor: any,
  lightGray: any,
  textGray: any
) {
  let y = startY;

  // Column widths
  const colWidths = [120, 35, 50, 70, 55, 35, 80, 80, 90];
  const colX = [
    marginX,
    marginX + colWidths[0],
    marginX + colWidths[0] + colWidths[1],
    marginX + colWidths[0] + colWidths[1] + colWidths[2],
    marginX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3],
    marginX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4],
    marginX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5],
    marginX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5] + colWidths[6],
    marginX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5] + colWidths[6] + colWidths[7],
  ];

  // Header row background
  page.drawRectangle({
    x: marginX,
    y: y - 15,
    width: width,
    height: 18,
    color: lightGray,
  });

  // Header text
  const headers = [
    "Employee Name",
    "State",
    "Pay Freq",
    "Paycheck\nGross\nAmount",
    "Marital\nStatus",
    "Deps",
    "Employee\nGross\nBenefit\nAllotment",
    "Net\nMonthly\nEmployer\nSavings",
    "Net Annual\nEmployer\nSavings",
  ];

  headers.forEach((header, i) => {
    const lines = header.split("\n");
    lines.forEach((line, lineIdx) => {
      page.drawText(line, {
        x: colX[i] + 2,
        y: y - 10 - (lineIdx * 8),
        size: 7,
        font: boldFont,
        color: textGray,
      });
    });
  });

  y -= 28;

  // Employee rows
  employees.forEach((emp, idx) => {
    // Alternate row background
    if (idx % 2 === 0) {
      page.drawRectangle({
        x: marginX,
        y: y - 10,
        width: width,
        height: 12,
        color: rgb(0.98, 0.98, 0.98),
      });
    }

    const employeeName = emp.qualifies ? emp.employee_name : `${emp.employee_name}*`;

    // Draw cells
    page.drawText(employeeName, { x: colX[0] + 2, y, size: 7, font: font, color: textGray });
    page.drawText(emp.state || "MO", { x: colX[1] + 2, y, size: 7, font: font, color: textGray });
    page.drawText(emp.pay_frequency || "B", { x: colX[2] + 2, y, size: 7, font: font, color: textGray });
    page.drawText(`$${emp.paycheck_gross.toFixed(2)}`, { x: colX[3] + 2, y, size: 7, font: font, color: textGray });
    page.drawText(emp.marital_status || "S", { x: colX[4] + 2, y, size: 7, font: font, color: textGray });
    page.drawText(emp.dependents.toString(), { x: colX[5] + 2, y, size: 7, font: font, color: textGray });
    page.drawText(`$${emp.gross_benefit_allotment.toFixed(2)}`, { x: colX[6] + 2, y, size: 7, font: font, color: textGray });
    page.drawText(`$${emp.net_monthly_employer_savings.toFixed(2)}`, { x: colX[7] + 2, y, size: 7, font: font, color: textGray });
    page.drawText(`$${emp.net_annual_employer_savings.toFixed(2)}`, { x: colX[8] + 2, y, size: 7, font: font, color: textGray });

    y -= 12;
  });
}
