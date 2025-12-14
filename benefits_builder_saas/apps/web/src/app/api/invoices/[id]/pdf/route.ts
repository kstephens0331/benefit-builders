import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from "pdf-lib";
import { readFileSync } from "fs";
import { join } from "path";

// Benefit Builder company info (static)
const BENEFIT_BUILDER = {
  name: "Benefit Builder",
  address: "206A S Loop 336 W Box 322",
  cityStateZip: "Conroe, TX 77304-3300",
  email: "billdawson.bb@gmail.com",
  phone: "+1 (972) 741-5663",
  website: "https://web-dun-three-87.vercel.app",
  termsUrl: "https://web-dun-three-87.vercel.app/legal/terms",
  privacyUrl: "https://web-dun-three-87.vercel.app/legal/privacy",
};

// Helper to format currency
function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// Helper to draw page header
async function drawPageHeader(
  page: PDFPage,
  helveticaBold: PDFFont,
  helvetica: PDFFont,
  company: any,
  invoice: any,
  logoImage: any,
  pageNumber: number,
  totalPages: number
) {
  const { width, height } = page.getSize();
  const leftMargin = 40;
  const rightMargin = width - 40;
  let y = height - 40;

  const bluePrimary = rgb(0.1, 0.4, 0.7);
  const blueLight = rgb(0.9, 0.95, 1);
  const grayText = rgb(0.3, 0.3, 0.3);

  // "INVOICE" title (top left, blue)
  page.drawText("INVOICE", {
    x: leftMargin,
    y: y,
    size: 24,
    font: helveticaBold,
    color: bluePrimary,
  });

  // Page number (top right)
  page.drawText(`Page ${pageNumber} of ${totalPages}`, {
    x: rightMargin - 80,
    y: y,
    size: 10,
    font: helvetica,
    color: grayText,
  });

  // Logo (top right)
  if (logoImage) {
    const logoDims = logoImage.scale(0.15);
    page.drawImage(logoImage, {
      x: rightMargin - logoDims.width,
      y: y - logoDims.height + 20,
      width: logoDims.width,
      height: logoDims.height,
    });
  }

  y -= 20;

  // Benefit Builder company info (below INVOICE title)
  page.drawText(BENEFIT_BUILDER.name, {
    x: leftMargin,
    y: y,
    size: 10,
    font: helveticaBold,
    color: grayText,
  });
  y -= 14;
  page.drawText(BENEFIT_BUILDER.address, {
    x: leftMargin,
    y: y,
    size: 9,
    font: helvetica,
    color: grayText,
  });
  y -= 12;
  page.drawText(BENEFIT_BUILDER.cityStateZip, {
    x: leftMargin,
    y: y,
    size: 9,
    font: helvetica,
    color: grayText,
  });

  // Email and phone (to the right of address)
  page.drawText(BENEFIT_BUILDER.email, {
    x: leftMargin + 180,
    y: y + 26,
    size: 9,
    font: helvetica,
    color: grayText,
  });
  page.drawText(BENEFIT_BUILDER.phone, {
    x: leftMargin + 180,
    y: y + 14,
    size: 9,
    font: helvetica,
    color: grayText,
  });

  y -= 25;

  // Invoice details (compact for all pages)
  const invoiceNumber = invoice.invoice_number || invoice.id.substring(0, 8).toUpperCase();
  const invoiceDate = invoice.invoice_date || invoice.issued_at;
  const formattedInvoiceDate = invoiceDate
    ? new Date(invoiceDate).toLocaleDateString("en-US")
    : new Date().toLocaleDateString("en-US");

  // Company name and invoice details in a row
  page.drawText(`Bill To: ${company?.name || "Customer"}`, {
    x: leftMargin,
    y: y,
    size: 10,
    font: helveticaBold,
    color: grayText,
  });

  page.drawText(`Invoice #: ${invoiceNumber}  |  Date: ${formattedInvoiceDate}  |  Period: ${invoice.period}`, {
    x: rightMargin - 280,
    y: y,
    size: 9,
    font: helvetica,
    color: grayText,
  });

  y -= 10;

  // Divider line
  page.drawLine({
    start: { x: leftMargin, y: y },
    end: { x: rightMargin, y: y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });

  return y - 15;
}

// Helper to draw page footer
function drawPageFooter(page: PDFPage, helvetica: PDFFont) {
  const { width } = page.getSize();
  const leftMargin = 40;
  const rightMargin = width - 40;
  const footerY = 30;

  const grayText = rgb(0.3, 0.3, 0.3);

  page.drawLine({
    start: { x: leftMargin, y: footerY + 10 },
    end: { x: rightMargin, y: footerY + 10 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });

  page.drawText("Thank you for your business!", {
    x: leftMargin,
    y: footerY,
    size: 9,
    font: helvetica,
    color: grayText,
  });
}

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
          model
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

    // Fetch invoice lines
    const { data: lines } = await db
      .from("invoice_lines")
      .select("*")
      .eq("invoice_id", id)
      .order("kind");

    // Generate PDF
    const pdfDoc = await PDFDocument.create();

    // Load fonts
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Load logo
    let logoImage: any = null;
    try {
      const logoPath = join(process.cwd(), "public", "benefit-builder-logo-trans.png");
      const logoBytes = readFileSync(logoPath);
      logoImage = await pdfDoc.embedPng(logoBytes);
    } catch (e) {
      console.warn("Logo not found, skipping...");
    }

    const company = Array.isArray(invoice.companies) ? invoice.companies[0] : invoice.companies;
    const lineItems = lines || [];

    // Separate summary lines from employee detail lines
    const summaryLines = lineItems.filter((l: any) => l.kind !== "employee_detail");
    const employeeDetailLines = lineItems.filter((l: any) => l.kind === "employee_detail");

    // Calculate total pages (page 1 = summary, pages 2+ = employee details)
    const employeesPerPage = 25;
    const detailPages = Math.ceil(employeeDetailLines.length / employeesPerPage);
    const totalPages = 1 + (detailPages > 0 ? detailPages : 0);

    // Colors
    const bluePrimary = rgb(0.1, 0.4, 0.7);
    const blueLight = rgb(0.9, 0.95, 1);
    const grayText = rgb(0.3, 0.3, 0.3);
    const greenText = rgb(0.1, 0.6, 0.1);

    // ==================== PAGE 1: SUMMARY ====================
    const page1 = pdfDoc.addPage([612, 792]);
    const { width, height } = page1.getSize();
    const leftMargin = 40;
    const rightMargin = width - 40;

    let y = await drawPageHeader(page1, helveticaBold, helvetica, company, invoice, logoImage, 1, totalPages);

    // Bill To / Ship To Section (light blue box)
    const boxY = y;
    const boxHeight = 80;
    page1.drawRectangle({
      x: leftMargin,
      y: boxY - boxHeight,
      width: rightMargin - leftMargin,
      height: boxHeight,
      color: blueLight,
    });

    y -= 15;
    const colWidth = (rightMargin - leftMargin) / 2;

    // Bill To
    page1.drawText("Bill to", {
      x: leftMargin + 15,
      y: y,
      size: 10,
      font: helveticaBold,
      color: grayText,
    });
    y -= 14;
    page1.drawText(company?.contact_name || company?.name || "Customer", {
      x: leftMargin + 15,
      y: y,
      size: 9,
      font: helvetica,
      color: grayText,
    });
    y -= 12;
    page1.drawText(company?.name || "", {
      x: leftMargin + 15,
      y: y,
      size: 9,
      font: helvetica,
      color: grayText,
    });
    y -= 12;
    if (company?.address) {
      page1.drawText(company.address, {
        x: leftMargin + 15,
        y: y,
        size: 9,
        font: helvetica,
        color: grayText,
      });
      y -= 12;
    }
    const cityStateZip = [company?.city, company?.state, company?.zip].filter(Boolean).join(", ");
    if (cityStateZip) {
      page1.drawText(cityStateZip, {
        x: leftMargin + 15,
        y: y,
        size: 9,
        font: helvetica,
        color: grayText,
      });
    }

    // Invoice details on right side of box
    let detailY = boxY - 15;
    const invoiceNumber = invoice.invoice_number || invoice.id.substring(0, 8).toUpperCase();
    page1.drawText("Invoice Details", {
      x: leftMargin + colWidth + 15,
      y: detailY,
      size: 10,
      font: helveticaBold,
      color: grayText,
    });
    detailY -= 14;
    page1.drawText(`Invoice No.: ${invoiceNumber}`, {
      x: leftMargin + colWidth + 15,
      y: detailY,
      size: 9,
      font: helvetica,
      color: grayText,
    });
    detailY -= 12;
    page1.drawText("Terms: Net 30", {
      x: leftMargin + colWidth + 15,
      y: detailY,
      size: 9,
      font: helvetica,
      color: grayText,
    });
    detailY -= 12;
    const invoiceDate = invoice.invoice_date || invoice.issued_at;
    const formattedInvoiceDate = invoiceDate
      ? new Date(invoiceDate).toLocaleDateString("en-US")
      : new Date().toLocaleDateString("en-US");
    page1.drawText(`Invoice Date: ${formattedInvoiceDate}`, {
      x: leftMargin + colWidth + 15,
      y: detailY,
      size: 9,
      font: helvetica,
      color: grayText,
    });
    detailY -= 12;
    const dueDate = invoice.due_date
      ? new Date(invoice.due_date)
      : new Date(new Date(invoiceDate || Date.now()).getTime() + 30 * 24 * 60 * 60 * 1000);
    page1.drawText(`Due Date: ${dueDate.toLocaleDateString("en-US")}`, {
      x: leftMargin + colWidth + 15,
      y: detailY,
      size: 9,
      font: helvetica,
      color: grayText,
    });

    y = boxY - boxHeight - 30;

    // Summary Line Items Table
    page1.drawText("Summary", {
      x: leftMargin,
      y: y,
      size: 12,
      font: helveticaBold,
      color: bluePrimary,
    });
    y -= 20;

    // Table header
    const tableX = leftMargin;
    const tableWidth = rightMargin - leftMargin;

    page1.drawLine({
      start: { x: tableX, y: y + 5 },
      end: { x: tableX + tableWidth, y: y + 5 },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });

    let x = tableX;
    page1.drawText("#", { x: x + 5, y: y, size: 9, font: helveticaBold, color: grayText });
    page1.drawText("Description", { x: x + 30, y: y, size: 9, font: helveticaBold, color: grayText });
    page1.drawText("Qty", { x: x + 320, y: y, size: 9, font: helveticaBold, color: grayText });
    page1.drawText("Rate", { x: x + 380, y: y, size: 9, font: helveticaBold, color: grayText });
    page1.drawText("Amount", { x: x + 470, y: y, size: 9, font: helveticaBold, color: grayText });

    y -= 15;
    page1.drawLine({
      start: { x: tableX, y: y + 5 },
      end: { x: tableX + tableWidth, y: y + 5 },
      thickness: 1,
      color: rgb(0.9, 0.9, 0.9),
    });

    // Render summary line items
    let subtotal = 0;
    if (summaryLines.length > 0) {
      summaryLines.forEach((line: any, index: number) => {
        y -= 5;

        page1.drawText(`${index + 1}.`, { x: tableX + 5, y, size: 9, font: helvetica, color: grayText });

        // Description
        let desc = line.description || line.kind || "";
        if (line.kind === "bb_fees_summary") {
          desc = "Benefits Builder Fees";
          if (employeeDetailLines.length > 0) {
            desc += ` (${employeeDetailLines.length} employees - see details)`;
          }
        }
        page1.drawText(desc.substring(0, 50), { x: tableX + 30, y, size: 9, font: helvetica, color: grayText });

        // Qty
        const qty = line.quantity || 1;
        page1.drawText(String(qty), { x: tableX + 320, y, size: 9, font: helvetica, color: grayText });

        // Rate
        const rate = (line.amount_cents / 100) / qty;
        page1.drawText(formatCurrency(rate * 100), { x: tableX + 380, y, size: 9, font: helvetica, color: grayText });

        // Amount
        page1.drawText(formatCurrency(line.amount_cents), { x: tableX + 470, y, size: 9, font: helvetica, color: grayText });

        subtotal += line.amount_cents;
        y -= 20;
      });
    } else {
      // Fallback if no lines
      y -= 5;
      page1.drawText("1.", { x: tableX + 5, y, size: 9, font: helvetica, color: grayText });
      page1.drawText("Monthly Fee", { x: tableX + 30, y, size: 9, font: helvetica, color: grayText });
      page1.drawText("1", { x: tableX + 320, y, size: 9, font: helvetica, color: grayText });
      const total = (invoice.total_cents || 0) / 100;
      page1.drawText(`$${total.toFixed(2)}`, { x: tableX + 380, y, size: 9, font: helvetica, color: grayText });
      page1.drawText(`$${total.toFixed(2)}`, { x: tableX + 470, y, size: 9, font: helvetica, color: grayText });
      subtotal = invoice.total_cents || 0;
      y -= 20;
    }

    // Line under items
    page1.drawLine({
      start: { x: tableX, y: y + 10 },
      end: { x: tableX + tableWidth, y: y + 10 },
      thickness: 1,
      color: rgb(0.9, 0.9, 0.9),
    });

    y -= 30;

    // Totals section
    const totalsX = tableX + tableWidth - 200;

    // Subtotal
    page1.drawText("Subtotal", {
      x: totalsX,
      y: y,
      size: 10,
      font: helvetica,
      color: grayText,
    });
    page1.drawText(formatCurrency(invoice.subtotal_cents || subtotal), {
      x: totalsX + 100,
      y: y,
      size: 10,
      font: helvetica,
      color: grayText,
    });
    y -= 18;

    // Tax
    if (invoice.tax_cents > 0) {
      page1.drawText("Tax", {
        x: totalsX,
        y: y,
        size: 10,
        font: helvetica,
        color: grayText,
      });
      page1.drawText(formatCurrency(invoice.tax_cents), {
        x: totalsX + 100,
        y: y,
        size: 10,
        font: helvetica,
        color: grayText,
      });
      y -= 18;
    }

    // Total line
    page1.drawLine({
      start: { x: totalsX, y: y + 5 },
      end: { x: totalsX + 160, y: y + 5 },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });

    const totalAmount = (invoice.total_cents || subtotal) / 100;
    page1.drawText("Total Due", {
      x: totalsX,
      y: y - 10,
      size: 12,
      font: helveticaBold,
      color: grayText,
    });
    page1.drawText(`$${totalAmount.toFixed(2)}`, {
      x: totalsX + 100,
      y: y - 10,
      size: 14,
      font: helveticaBold,
      color: bluePrimary,
    });

    // Note about employee details
    if (employeeDetailLines.length > 0) {
      y -= 50;
      page1.drawText(`Employee details on page${detailPages > 1 ? "s" : ""} 2${detailPages > 1 ? `-${totalPages}` : ""}`, {
        x: leftMargin,
        y: y,
        size: 10,
        font: helvetica,
        color: grayText,
      });
    }

    drawPageFooter(page1, helvetica);

    // ==================== PAGES 2+: EMPLOYEE DETAILS ====================
    if (employeeDetailLines.length > 0) {
      for (let pageIdx = 0; pageIdx < detailPages; pageIdx++) {
        const detailPage = pdfDoc.addPage([612, 792]);
        const pageNum = pageIdx + 2;

        let dy = await drawPageHeader(detailPage, helveticaBold, helvetica, company, invoice, logoImage, pageNum, totalPages);

        // Title
        detailPage.drawText("Employee Benefits Breakdown", {
          x: leftMargin,
          y: dy,
          size: 12,
          font: helveticaBold,
          color: bluePrimary,
        });
        dy -= 8;

        detailPage.drawText(`Model: ${company?.model || "5/3"} (Employee/Employer)`, {
          x: leftMargin,
          y: dy,
          size: 9,
          font: helvetica,
          color: grayText,
        });
        dy -= 20;

        // Table header
        detailPage.drawLine({
          start: { x: leftMargin, y: dy + 5 },
          end: { x: rightMargin, y: dy + 5 },
          thickness: 1,
          color: rgb(0.8, 0.8, 0.8),
        });

        detailPage.drawText("Employee Name", { x: leftMargin + 5, y: dy, size: 8, font: helveticaBold, color: grayText });
        detailPage.drawText("Allowable Benefit", { x: leftMargin + 180, y: dy, size: 8, font: helveticaBold, color: grayText });
        detailPage.drawText("EE BB Fee", { x: leftMargin + 300, y: dy, size: 8, font: helveticaBold, color: grayText });
        detailPage.drawText("ER BB Fee", { x: leftMargin + 390, y: dy, size: 8, font: helveticaBold, color: grayText });
        detailPage.drawText("Total Fee", { x: leftMargin + 475, y: dy, size: 8, font: helveticaBold, color: grayText });

        dy -= 12;
        detailPage.drawLine({
          start: { x: leftMargin, y: dy + 5 },
          end: { x: rightMargin, y: dy + 5 },
          thickness: 1,
          color: rgb(0.9, 0.9, 0.9),
        });

        // Get employees for this page
        const startIdx = pageIdx * employeesPerPage;
        const endIdx = Math.min(startIdx + employeesPerPage, employeeDetailLines.length);
        const pageEmployees = employeeDetailLines.slice(startIdx, endIdx);

        // Render employee rows
        for (const emp of pageEmployees) {
          dy -= 5;

          // Employee name
          const name = (emp.description || "Unknown").substring(0, 30);
          detailPage.drawText(name, { x: leftMargin + 5, y: dy, size: 8, font: helvetica, color: grayText });

          // Allowable Benefit
          const allowable = emp.allowable_benefit_cents || 0;
          detailPage.drawText(formatCurrency(allowable), { x: leftMargin + 180, y: dy, size: 8, font: helvetica, color: grayText });

          // EE Fee and ER Fee (calculate from total based on model rates)
          // Since we store total fee in amount_cents and allowable_benefit_cents separately,
          // we need to derive EE/ER fees. For now, just show total split based on company model.
          const totalFee = emp.amount_cents || 0;
          const [eeRate, erRate] = getModelRates(company?.model);
          const totalRate = eeRate + erRate;
          const eeFee = totalRate > 0 ? Math.round(totalFee * (eeRate / totalRate)) : 0;
          const erFee = totalFee - eeFee;

          detailPage.drawText(formatCurrency(eeFee), { x: leftMargin + 300, y: dy, size: 8, font: helvetica, color: grayText });
          detailPage.drawText(formatCurrency(erFee), { x: leftMargin + 390, y: dy, size: 8, font: helvetica, color: grayText });
          detailPage.drawText(formatCurrency(totalFee), { x: leftMargin + 475, y: dy, size: 8, font: helveticaBold, color: grayText });

          dy -= 15;
        }

        // Page totals
        dy -= 10;
        detailPage.drawLine({
          start: { x: leftMargin, y: dy + 5 },
          end: { x: rightMargin, y: dy + 5 },
          thickness: 1,
          color: rgb(0.8, 0.8, 0.8),
        });

        // Calculate page totals
        const pageTotal = pageEmployees.reduce((sum: number, emp: any) => sum + (emp.amount_cents || 0), 0);
        const pageAllowable = pageEmployees.reduce((sum: number, emp: any) => sum + (emp.allowable_benefit_cents || 0), 0);

        detailPage.drawText(`Page ${pageNum} Totals:`, { x: leftMargin + 5, y: dy - 10, size: 8, font: helveticaBold, color: grayText });
        detailPage.drawText(formatCurrency(pageAllowable), { x: leftMargin + 180, y: dy - 10, size: 8, font: helveticaBold, color: grayText });
        detailPage.drawText(formatCurrency(pageTotal), { x: leftMargin + 475, y: dy - 10, size: 8, font: helveticaBold, color: bluePrimary });

        // Grand totals on last detail page
        if (pageIdx === detailPages - 1) {
          const grandTotal = employeeDetailLines.reduce((sum: number, emp: any) => sum + (emp.amount_cents || 0), 0);
          const grandAllowable = employeeDetailLines.reduce((sum: number, emp: any) => sum + (emp.allowable_benefit_cents || 0), 0);

          dy -= 30;
          detailPage.drawLine({
            start: { x: leftMargin + 150, y: dy + 5 },
            end: { x: rightMargin, y: dy + 5 },
            thickness: 2,
            color: bluePrimary,
          });

          detailPage.drawText(`Grand Totals (${employeeDetailLines.length} employees):`, { x: leftMargin + 5, y: dy - 10, size: 9, font: helveticaBold, color: bluePrimary });
          detailPage.drawText(formatCurrency(grandAllowable), { x: leftMargin + 180, y: dy - 10, size: 9, font: helveticaBold, color: bluePrimary });
          detailPage.drawText(formatCurrency(grandTotal), { x: leftMargin + 475, y: dy - 10, size: 9, font: helveticaBold, color: bluePrimary });
        }

        drawPageFooter(detailPage, helvetica);
      }
    }

    // Save PDF
    const pdfBytes = await pdfDoc.save();

    const fileName = `Invoice-${invoiceNumber}.pdf`;
    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
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

// Import getModelRates for EE/ER fee calculation
function getModelRates(model: string | null | undefined): [number, number] {
  const m = (model ?? "").trim();
  switch (m) {
    case "5/3": return [0.05, 0.03];
    case "3/4": return [0.03, 0.04];
    case "5/1": return [0.05, 0.01];
    case "5/0": return [0.05, 0.00];
    case "4/4": return [0.04, 0.04];
    default: return [0.05, 0.03];
  }
}
