import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { readFileSync } from "fs";
import { join } from "path";
import { getModelRates } from "@/lib/models";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = createServiceClient();

    // Fetch invoice with company
    const { data: invoice, error: invoiceError } = await db
      .from("invoices")
      .select(`
        *,
        companies(
          id,
          name,
          state,
          contact_email,
          contact_name,
          contact_phone,
          address,
          city,
          zip,
          model,
          pay_frequency
        )
      `)
      .eq("id", id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { ok: false, error: "Invoice not found" },
        { status: 404 }
      );
    }

    const company = Array.isArray(invoice.companies) ? invoice.companies[0] : invoice.companies;

    // Get model rates
    const [employeeRate, employerRate] = getModelRates(company.model);

    // Fetch employees with their benefits
    const { data: employees } = await db
      .from("employees")
      .select(`
        id,
        first_name,
        last_name,
        gross_pay,
        employee_benefits(
          per_pay_amount
        )
      `)
      .eq("company_id", company.id)
      .eq("active", true)
      .order("last_name");

    // Calculate pay periods per month
    const payPeriodMap: Record<string, number> = {
      weekly: 52,
      biweekly: 26,
      semimonthly: 24,
      monthly: 12
    };
    const periodsPerYear = payPeriodMap[company.pay_frequency] || 26;
    const periodsPerMonth = periodsPerYear / 12;

    // Calculate fees per employee
    const employeeData = (employees || []).map(emp => {
      const benefits = emp.employee_benefits || [];
      const perPayPretax = benefits.reduce((sum: number, b: any) => sum + Number(b.per_pay_amount || 0), 0);
      const monthlyPretax = perPayPretax * periodsPerMonth;

      const employeeFee = monthlyPretax * employeeRate;
      const employerFee = monthlyPretax * employerRate;

      return {
        name: `${emp.last_name}, ${emp.first_name}`,
        monthlyPretax,
        employeeFee,
        employerFee
      };
    });

    // Generate PDF
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([612, 792]); // Letter size
    const { width, height } = page.getSize();

    // Load fonts
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Load logo
    let logoImage;
    try {
      const logoPath = join(process.cwd(), "public", "benefit-builder-logo-trans.png");
      const logoBytes = readFileSync(logoPath);
      logoImage = await pdfDoc.embedPng(logoBytes);
    } catch (e) {
      console.warn("Logo not found, skipping...");
    }

    let yPosition = height - 50;

    // ===== HEADER SECTION =====
    // Draw logo (top left)
    if (logoImage) {
      const logoDims = logoImage.scale(0.25);
      page.drawImage(logoImage, {
        x: 40,
        y: yPosition - logoDims.height,
        width: logoDims.width,
        height: logoDims.height,
      });
    }

    // Company Name & Info (centered)
    const companyName = company.name || "Company";
    const companyNameWidth = helveticaBold.widthOfTextAtSize(companyName, 18);
    page.drawText(companyName, {
      x: (width - companyNameWidth) / 2,
      y: yPosition,
      size: 18,
      font: helveticaBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    yPosition -= 20;

    // Company Address (centered)
    const addressParts = [];
    if (company.address) addressParts.push(company.address);
    if (company.city && company.state && company.zip) {
      addressParts.push(`${company.city}, ${company.state} ${company.zip}`);
    } else if (company.city && company.state) {
      addressParts.push(`${company.city}, ${company.state}`);
    } else if (company.state) {
      addressParts.push(company.state);
    }

    for (const line of addressParts) {
      const lineWidth = helvetica.widthOfTextAtSize(line, 11);
      page.drawText(line, {
        x: (width - lineWidth) / 2,
        y: yPosition,
        size: 11,
        font: helvetica,
        color: rgb(0.3, 0.3, 0.3),
      });
      yPosition -= 15;
    }

    // Phone number (centered)
    if (company.contact_phone) {
      const phoneWidth = helvetica.widthOfTextAtSize(company.contact_phone, 11);
      page.drawText(company.contact_phone, {
        x: (width - phoneWidth) / 2,
        y: yPosition,
        size: 11,
        font: helvetica,
        color: rgb(0.3, 0.3, 0.3),
      });
      yPosition -= 15;
    }

    yPosition -= 25;

    // ===== INVOICE DETAIL TITLE =====
    const invoiceTitle = "INVOICE DETAIL";
    const invoiceTitleWidth = helveticaBold.widthOfTextAtSize(invoiceTitle, 20);
    page.drawText(invoiceTitle, {
      x: (width - invoiceTitleWidth) / 2,
      y: yPosition,
      size: 20,
      font: helveticaBold,
      color: rgb(0.2, 0.4, 0.7),
    });

    yPosition -= 25;

    // Invoice metadata (centered)
    const periodText = `Period: ${invoice.period}`;
    const periodWidth = helvetica.widthOfTextAtSize(periodText, 10);
    page.drawText(periodText, {
      x: (width - periodWidth) / 2,
      y: yPosition,
      size: 10,
      font: helvetica,
    });

    yPosition -= 15;

    const modelText = `Model: ${company.model} (Employee ${(employeeRate * 100).toFixed(0)}% / Employer ${(employerRate * 100).toFixed(0)}%)`;
    const modelWidth = helvetica.widthOfTextAtSize(modelText, 10);
    page.drawText(modelText, {
      x: (width - modelWidth) / 2,
      y: yPosition,
      size: 10,
      font: helvetica,
    });

    yPosition -= 30;

    // ===== EMPLOYEE TABLE =====
    const tableX = 50;
    const tableWidth = width - 100;
    const colWidths = {
      name: 200,
      pretax: 100,
      erFee: 90,
      eeFee: 90
    };

    // Table header
    page.drawRectangle({
      x: tableX,
      y: yPosition - 5,
      width: tableWidth,
      height: 25,
      color: rgb(0.2, 0.4, 0.7),
    });

    page.drawText("Employee Name", {
      x: tableX + 10,
      y: yPosition + 5,
      size: 10,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    });

    page.drawText("Monthly Pretax", {
      x: tableX + colWidths.name + 10,
      y: yPosition + 5,
      size: 10,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    });

    page.drawText(`ER Fee (${(employerRate * 100).toFixed(0)}%)`, {
      x: tableX + colWidths.name + colWidths.pretax + 10,
      y: yPosition + 5,
      size: 10,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    });

    page.drawText(`EE Fee (${(employeeRate * 100).toFixed(0)}%)`, {
      x: tableX + colWidths.name + colWidths.pretax + colWidths.erFee + 10,
      y: yPosition + 5,
      size: 10,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    });

    yPosition -= 30;

    // Employee rows
    let totalEmployerFee = 0;
    let totalEmployeeFee = 0;
    let rowIndex = 0;

    for (const emp of employeeData) {
      // Check if we need a new page
      if (yPosition < 100) {
        page = pdfDoc.addPage([612, 792]);
        yPosition = height - 50;

        // Redraw table header on new page
        page.drawRectangle({
          x: tableX,
          y: yPosition - 5,
          width: tableWidth,
          height: 25,
          color: rgb(0.2, 0.4, 0.7),
        });

        page.drawText("Employee Name", {
          x: tableX + 10,
          y: yPosition + 5,
          size: 10,
          font: helveticaBold,
          color: rgb(1, 1, 1),
        });

        page.drawText("Monthly Pretax", {
          x: tableX + colWidths.name + 10,
          y: yPosition + 5,
          size: 10,
          font: helveticaBold,
          color: rgb(1, 1, 1),
        });

        page.drawText(`ER Fee (${(employerRate * 100).toFixed(0)}%)`, {
          x: tableX + colWidths.name + colWidths.pretax + 10,
          y: yPosition + 5,
          size: 10,
          font: helveticaBold,
          color: rgb(1, 1, 1),
        });

        page.drawText(`EE Fee (${(employeeRate * 100).toFixed(0)}%)`, {
          x: tableX + colWidths.name + colWidths.pretax + colWidths.erFee + 10,
          y: yPosition + 5,
          size: 10,
          font: helveticaBold,
          color: rgb(1, 1, 1),
        });

        yPosition -= 30;
      }

      // Alternate row colors
      if (rowIndex % 2 === 0) {
        page.drawRectangle({
          x: tableX,
          y: yPosition - 8,
          width: tableWidth,
          height: 22,
          color: rgb(0.96, 0.96, 0.96),
        });
      }

      // Employee name
      page.drawText(emp.name.substring(0, 30), {
        x: tableX + 10,
        y: yPosition,
        size: 9,
        font: helvetica,
      });

      // Monthly pretax
      page.drawText(`$${emp.monthlyPretax.toFixed(2)}`, {
        x: tableX + colWidths.name + 10,
        y: yPosition,
        size: 9,
        font: helvetica,
      });

      // Employer fee
      page.drawText(`$${emp.employerFee.toFixed(2)}`, {
        x: tableX + colWidths.name + colWidths.pretax + 10,
        y: yPosition,
        size: 9,
        font: helvetica,
      });

      // Employee fee
      page.drawText(`$${emp.employeeFee.toFixed(2)}`, {
        x: tableX + colWidths.name + colWidths.pretax + colWidths.erFee + 10,
        y: yPosition,
        size: 9,
        font: helvetica,
      });

      totalEmployerFee += emp.employerFee;
      totalEmployeeFee += emp.employeeFee;
      yPosition -= 22;
      rowIndex++;
    }

    // ===== TOTALS ROW =====
    yPosition -= 10;

    page.drawLine({
      start: { x: tableX, y: yPosition + 15 },
      end: { x: tableX + tableWidth, y: yPosition + 15 },
      thickness: 2,
      color: rgb(0.2, 0.4, 0.7),
    });

    page.drawText("TOTALS", {
      x: tableX + 10,
      y: yPosition,
      size: 10,
      font: helveticaBold,
    });

    page.drawText(`$${totalEmployerFee.toFixed(2)}`, {
      x: tableX + colWidths.name + colWidths.pretax + 10,
      y: yPosition,
      size: 10,
      font: helveticaBold,
      color: rgb(0, 0.5, 0),
    });

    page.drawText(`$${totalEmployeeFee.toFixed(2)}`, {
      x: tableX + colWidths.name + colWidths.pretax + colWidths.erFee + 10,
      y: yPosition,
      size: 10,
      font: helveticaBold,
      color: rgb(0, 0.5, 0),
    });

    // ===== FOOTER =====
    yPosition = 60;

    const contact = "Questions? Contact support@benefitsbuilder.com";
    const contactWidth = helvetica.widthOfTextAtSize(contact, 9);
    page.drawText(contact, {
      x: (width - contactWidth) / 2,
      y: yPosition,
      size: 9,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Save PDF
    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="invoice-detail-${invoice.period}-${company.name.replace(/\s+/g, '-')}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
