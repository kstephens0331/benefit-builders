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

    // Load Benefits Builder logo if available
    let logoImage = null;
    const logoPath = path.join(process.cwd(), "public", "benefits-builder-logo.png");
    if (fs.existsSync(logoPath)) {
      try {
        const logoBytes = fs.readFileSync(logoPath);
        logoImage = await pdfDoc.embedPng(logoBytes);
      } catch (e) {
        console.log("Logo not found, skipping");
      }
    }

    const pageWidth = 792; // US Letter width in points (landscape)
    const pageHeight = 612; // US Letter height in points
    const margin = 30;
    const contentWidth = pageWidth - 2 * margin;

    // Colors - Benefits Builder theme
    const primaryBlue = rgb(0.05, 0.32, 0.62); // #0D5280
    const accentRed = rgb(0.8, 0.1, 0.1);
    const textBlack = rgb(0, 0, 0); // Full black for better visibility
    const textDark = rgb(0.15, 0.15, 0.15); // Dark gray for text
    const headerBg = rgb(0.2, 0.4, 0.6); // Darker blue for header
    const lightBlueBg = rgb(0.92, 0.95, 0.98); // Light blue for alternating rows

    // Split employees into pages (18 employees per page to fit new columns)
    const employeesPerPage = 18;
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
        // Add tagline below logo in red
        page.drawText("Making your benefits soar", {
          x: margin,
          y: yPosition - logoHeight - 12,
          size: 9,
          font: font,
          color: accentRed,
        });
      } else {
        // Draw text logo if image not available - use "Benefits Builder"
        page.drawText("Benefits Builder", {
          x: margin,
          y: yPosition - 20,
          size: 18,
          font: boldFont,
          color: primaryBlue,
        });
        page.drawText("Making your benefits soar", {
          x: margin,
          y: yPosition - 35,
          size: 9,
          font: font,
          color: accentRed,
        });
      }

      // Title (center) - "Benefits Builder Proposal"
      page.drawText("Benefits Builder Proposal", {
        x: pageWidth / 2 - 90,
        y: yPosition - 25,
        size: 18,
        font: boldFont,
        color: textBlack,
      });

      yPosition -= 75;

      // Company Info Section (3 columns)
      const col1X = margin;
      const col2X = pageWidth / 3 + 20;
      const col3X = (pageWidth * 2) / 3;
      const infoYStart = yPosition;
      const labelWidth = 90;

      // Column 1
      page.drawText("Company Name:", { x: col1X, y: infoYStart, size: 8, font: font, color: textDark });
      page.drawText("Company Contact:", { x: col1X, y: infoYStart - 11, size: 8, font: font, color: textDark });
      page.drawText("Date:", { x: col1X, y: infoYStart - 22, size: 8, font: font, color: textDark });
      page.drawText("Pay Period:", { x: col1X, y: infoYStart - 33, size: 8, font: font, color: textDark });

      page.drawText(proposal.company_name || "", { x: col1X + labelWidth, y: infoYStart, size: 8, font: boldFont, color: textBlack });
      page.drawText(proposal.company_contact || "", { x: col1X + labelWidth, y: infoYStart - 11, size: 8, font: font, color: textBlack });
      page.drawText(new Date().toLocaleDateString(), { x: col1X + labelWidth, y: infoYStart - 22, size: 8, font: font, color: textBlack });
      page.drawText(proposal.pay_period || "", { x: col1X + labelWidth, y: infoYStart - 33, size: 8, font: font, color: textBlack });

      // Column 2
      page.drawText("Company Address:", { x: col2X, y: infoYStart, size: 8, font: font, color: textDark });
      page.drawText("Company Phone:", { x: col2X, y: infoYStart - 11, size: 8, font: font, color: textDark });
      page.drawText("Effective Date:", { x: col2X, y: infoYStart - 22, size: 8, font: font, color: textDark });

      page.drawText(proposal.company_address || "", { x: col2X + labelWidth, y: infoYStart, size: 8, font: font, color: textBlack });
      page.drawText(proposal.company_phone || "", { x: col2X + labelWidth, y: infoYStart - 11, size: 8, font: font, color: textBlack });
      page.drawText(proposal.effective_date ? new Date(proposal.effective_date).toLocaleDateString() : "", { x: col2X + labelWidth, y: infoYStart - 22, size: 8, font: font, color: textBlack });

      // Column 3
      page.drawText("Company City:", { x: col3X, y: infoYStart, size: 8, font: font, color: textDark });
      page.drawText("Company Email:", { x: col3X, y: infoYStart - 11, size: 8, font: font, color: textDark });
      page.drawText("Model:", { x: col3X, y: infoYStart - 22, size: 8, font: font, color: textDark });

      const cityText = proposal.company_city ? `${proposal.company_city}${proposal.company_state ? ', ' + proposal.company_state : ''}` : "";
      page.drawText(cityText, { x: col3X + 75, y: infoYStart, size: 8, font: font, color: textBlack });
      page.drawText(proposal.company_email || "", { x: col3X + 75, y: infoYStart - 11, size: 8, font: font, color: textBlack });
      page.drawText(proposal.model_percentage || "", { x: col3X + 75, y: infoYStart - 22, size: 8, font: font, color: textBlack });

      yPosition -= 55;

      // Employee Table
      const isLastPage = pageNum === totalPages - 1;

      // Calculate employee totals for the table footer
      const allEmployees = employees || [];
      const totalEmployeeIncrease = allEmployees.reduce((sum, e) => sum + (e.employee_net_increase_monthly || 0), 0);
      const totalEmployerSavings = allEmployees.reduce((sum, e) => sum + (e.net_monthly_employer_savings || 0), 0);
      const totalAnnualEmployerSavings = allEmployees.reduce((sum, e) => sum + (e.net_annual_employer_savings || 0), 0);

      drawEmployeeTable(
        page,
        pageEmployees,
        yPosition,
        margin,
        contentWidth,
        font,
        boldFont,
        headerBg,
        lightBlueBg,
        textBlack,
        textDark,
        isLastPage,
        isLastPage ? {
          employeeCount: proposal.total_employees || allEmployees.length,
          totalEmployeeIncrease: totalEmployeeIncrease,
          totalEmployerSavings: totalEmployerSavings,
          totalAnnualSavings: totalAnnualEmployerSavings,
        } : null
      );

      // Footer on last page
      if (pageNum === totalPages - 1) {
        const footerY = 25;
        page.drawText("* Denotes Employees that do not qualify for the 125 Plan", {
          x: margin,
          y: footerY,
          size: 7,
          font: font,
          color: accentRed,
        });
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
  headerBg: any,
  lightBlueBg: any,
  textBlack: any,
  textDark: any,
  isLastPage: boolean = false,
  totals: {
    employeeCount: number;
    totalEmployeeIncrease: number;
    totalEmployerSavings: number;
    totalAnnualSavings: number;
  } | null = null
) {
  let y = startY;

  // Column configuration - wider columns, cleaner headers
  // Name, State, Freq, Gross, Status, Deps, Benefit, EE +/mo, ER +/mo, ER +/yr
  const colWidths = [110, 30, 35, 65, 40, 30, 60, 70, 70, 70];
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);

  // Calculate column positions
  const colX: number[] = [];
  let currentX = marginX;
  for (const w of colWidths) {
    colX.push(currentX);
    currentX += w;
  }

  // Header row background - darker for contrast
  page.drawRectangle({
    x: marginX,
    y: y - 25,
    width: totalWidth,
    height: 28,
    color: headerBg,
  });

  // Header text - WHITE text on dark background for visibility
  const whiteColor = rgb(1, 1, 1);
  const headers = [
    "Employee Name",
    "State",
    "Freq",
    "Gross/Pay",
    "Status",
    "Deps",
    "Benefit",
    "EE +/mo",
    "ER +/mo",
    "ER +/yr",
  ];

  headers.forEach((header, i) => {
    page.drawText(header, {
      x: colX[i] + 3,
      y: y - 15,
      size: 7,
      font: boldFont,
      color: whiteColor,
    });
  });

  y -= 32;

  // Employee rows
  employees.forEach((emp, idx) => {
    // Alternate row background
    if (idx % 2 === 0) {
      page.drawRectangle({
        x: marginX,
        y: y - 8,
        width: totalWidth,
        height: 14,
        color: lightBlueBg,
      });
    }

    const employeeName = emp.qualifies === false ? `${emp.employee_name}*` : emp.employee_name;

    // Format pay frequency
    const freqMap: Record<string, string> = { W: "W", B: "B", S: "S", M: "M" };
    const freq = freqMap[emp.pay_frequency] || emp.pay_frequency || "B";

    // Draw cells with BLACK text for visibility
    page.drawText(employeeName || "", { x: colX[0] + 3, y, size: 7, font: font, color: textBlack });
    page.drawText(emp.state || "MO", { x: colX[1] + 3, y, size: 7, font: font, color: textBlack });
    page.drawText(freq, { x: colX[2] + 3, y, size: 7, font: font, color: textBlack });
    page.drawText(`$${(emp.paycheck_gross || 0).toFixed(2)}`, { x: colX[3] + 3, y, size: 7, font: font, color: textBlack });
    page.drawText(emp.marital_status || "S", { x: colX[4] + 3, y, size: 7, font: font, color: textBlack });
    page.drawText((emp.dependents || 0).toString(), { x: colX[5] + 3, y, size: 7, font: font, color: textBlack });
    page.drawText(`$${(emp.gross_benefit_allotment || 0).toFixed(2)}`, { x: colX[6] + 3, y, size: 7, font: font, color: textBlack });

    // Employee take-home increase (new column)
    const empIncrease = emp.employee_net_increase_monthly || 0;
    page.drawText(`$${empIncrease.toFixed(2)}`, { x: colX[7] + 3, y, size: 7, font: font, color: empIncrease > 0 ? rgb(0, 0.5, 0) : textBlack });

    // Employer monthly savings
    const erMonthly = emp.net_monthly_employer_savings || 0;
    page.drawText(`$${erMonthly.toFixed(2)}`, { x: colX[8] + 3, y, size: 7, font: font, color: erMonthly > 0 ? rgb(0, 0.5, 0) : textBlack });

    // Employer annual savings
    const erAnnual = emp.net_annual_employer_savings || 0;
    page.drawText(`$${erAnnual.toFixed(2)}`, { x: colX[9] + 3, y, size: 7, font: font, color: erAnnual > 0 ? rgb(0, 0.5, 0) : textBlack });

    y -= 14;
  });

  // Add totals row on last page
  if (isLastPage && totals) {
    // Add separator line
    y -= 5;
    page.drawLine({
      start: { x: marginX, y: y },
      end: { x: marginX + totalWidth, y: y },
      thickness: 1.5,
      color: textBlack,
    });
    y -= 15;

    // Background for totals row
    page.drawRectangle({
      x: marginX,
      y: y - 8,
      width: totalWidth,
      height: 16,
      color: headerBg,
    });

    // Employee Count label (left side)
    page.drawText(`Employee Count: ${totals.employeeCount}`, {
      x: colX[0] + 3,
      y,
      size: 8,
      font: boldFont,
      color: whiteColor,
    });

    // Total Employee Increase (aligned with column 7)
    page.drawText(`$${totals.totalEmployeeIncrease.toFixed(2)}`, {
      x: colX[7] + 3,
      y,
      size: 8,
      font: boldFont,
      color: whiteColor,
    });

    // Total Monthly Employer Savings (aligned with column 8)
    page.drawText(`$${totals.totalEmployerSavings.toFixed(2)}`, {
      x: colX[8] + 3,
      y,
      size: 8,
      font: boldFont,
      color: whiteColor,
    });

    // Total Annual Employer Savings (aligned with column 9)
    page.drawText(`$${totals.totalAnnualSavings.toFixed(2)}`, {
      x: colX[9] + 3,
      y,
      size: 8,
      font: boldFont,
      color: whiteColor,
    });
  }
}
