import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { readFileSync } from "fs";
import { join } from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = createServiceClient();

    // Fetch invoice with company and line items
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
          zip
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

    // Fetch invoice lines (only ER and EE fees)
    const { data: lines } = await db
      .from("invoice_lines")
      .select("*")
      .eq("invoice_id", id)
      .in("kind", ["employer_fee", "employee_fee"])
      .order("kind");

    // Generate PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter size
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
    const company = Array.isArray(invoice.companies) ? invoice.companies[0] : invoice.companies;

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

    yPosition -= 30;

    // ===== INVOICE TITLE & DETAILS =====
    // Invoice title (centered)
    const invoiceTitle = "INVOICE";
    const invoiceTitleWidth = helveticaBold.widthOfTextAtSize(invoiceTitle, 24);
    page.drawText(invoiceTitle, {
      x: (width - invoiceTitleWidth) / 2,
      y: yPosition,
      size: 24,
      font: helveticaBold,
      color: rgb(0.2, 0.4, 0.7),
    });

    yPosition -= 35;

    // Invoice metadata (centered)
    const invoiceNum = `Invoice #: ${invoice.id.substring(0, 8).toUpperCase()}`;
    const invoiceNumWidth = helvetica.widthOfTextAtSize(invoiceNum, 10);
    page.drawText(invoiceNum, {
      x: (width - invoiceNumWidth) / 2,
      y: yPosition,
      size: 10,
      font: helvetica,
    });

    yPosition -= 15;

    const periodText = `Period: ${invoice.period}`;
    const periodWidth = helvetica.widthOfTextAtSize(periodText, 10);
    page.drawText(periodText, {
      x: (width - periodWidth) / 2,
      y: yPosition,
      size: 10,
      font: helvetica,
    });

    yPosition -= 15;

    const issueDate = new Date(invoice.issued_at).toLocaleDateString();
    const issueDateText = `Issue Date: ${issueDate}`;
    const issueDateWidth = helvetica.widthOfTextAtSize(issueDateText, 10);
    page.drawText(issueDateText, {
      x: (width - issueDateWidth) / 2,
      y: yPosition,
      size: 10,
      font: helvetica,
    });

    yPosition -= 40;

    // ===== LINE ITEMS TABLE =====
    // Table header
    const tableX = 100;
    const tableWidth = width - 200;

    page.drawRectangle({
      x: tableX,
      y: yPosition - 5,
      width: tableWidth,
      height: 25,
      color: rgb(0.2, 0.4, 0.7),
    });

    page.drawText("Description", {
      x: tableX + 15,
      y: yPosition + 5,
      size: 11,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    });

    page.drawText("Amount", {
      x: tableX + tableWidth - 80,
      y: yPosition + 5,
      size: 11,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    });

    yPosition -= 30;

    // Line items (ER fee and EE fee)
    let subtotal = 0;
    if (lines && lines.length > 0) {
      for (const line of lines) {
        // Alternate row colors
        const isEven = lines.indexOf(line) % 2 === 0;
        if (isEven) {
          page.drawRectangle({
            x: tableX,
            y: yPosition - 8,
            width: tableWidth,
            height: 25,
            color: rgb(0.96, 0.96, 0.96),
          });
        }

        page.drawText(line.description, {
          x: tableX + 15,
          y: yPosition,
          size: 11,
          font: helvetica,
        });

        const amount = (line.amount_cents / 100).toFixed(2);
        page.drawText(`$${amount}`, {
          x: tableX + tableWidth - 80,
          y: yPosition,
          size: 11,
          font: helvetica,
        });

        subtotal += line.amount_cents;
        yPosition -= 25;
      }
    } else {
      // No lines - show message
      page.drawText("No fees for this period", {
        x: tableX + 15,
        y: yPosition,
        size: 11,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5),
      });
      yPosition -= 25;
    }

    yPosition -= 20;

    // ===== TOTALS SECTION =====
    // Divider line
    page.drawLine({
      start: { x: tableX + tableWidth - 150, y: yPosition + 10 },
      end: { x: tableX + tableWidth, y: yPosition + 10 },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7),
    });

    yPosition -= 5;

    // Subtotal
    const subtotalAmount = (invoice.subtotal_cents / 100).toFixed(2);
    page.drawText("Subtotal:", {
      x: tableX + tableWidth - 150,
      y: yPosition,
      size: 10,
      font: helvetica,
    });
    page.drawText(`$${subtotalAmount}`, {
      x: tableX + tableWidth - 80,
      y: yPosition,
      size: 10,
      font: helvetica,
    });

    yPosition -= 18;

    // Tax (if any)
    if (invoice.tax_cents > 0) {
      const taxAmount = (invoice.tax_cents / 100).toFixed(2);
      page.drawText("Tax:", {
        x: tableX + tableWidth - 150,
        y: yPosition,
        size: 10,
        font: helvetica,
      });
      page.drawText(`$${taxAmount}`, {
        x: tableX + tableWidth - 80,
        y: yPosition,
        size: 10,
        font: helvetica,
      });
      yPosition -= 18;
    }

    // Total line
    page.drawLine({
      start: { x: tableX + tableWidth - 150, y: yPosition + 10 },
      end: { x: tableX + tableWidth, y: yPosition + 10 },
      thickness: 2,
      color: rgb(0.2, 0.4, 0.7),
    });

    yPosition -= 5;

    // Total
    const totalAmount = (invoice.total_cents / 100).toFixed(2);
    page.drawText("TOTAL DUE:", {
      x: tableX + tableWidth - 150,
      y: yPosition,
      size: 12,
      font: helveticaBold,
    });
    page.drawText(`$${totalAmount}`, {
      x: tableX + tableWidth - 80,
      y: yPosition,
      size: 12,
      font: helveticaBold,
      color: rgb(0, 0.5, 0),
    });

    // ===== FOOTER =====
    yPosition = 100;

    // Status badge
    const statusText = `Status: ${invoice.status.toUpperCase()}`;
    const statusWidth = helveticaBold.widthOfTextAtSize(statusText, 12);
    const statusColor = invoice.status === 'paid' ? rgb(0, 0.6, 0) :
                        invoice.status === 'sent' ? rgb(0.8, 0.5, 0) :
                        rgb(0.8, 0, 0);
    page.drawText(statusText, {
      x: (width - statusWidth) / 2,
      y: yPosition,
      size: 12,
      font: helveticaBold,
      color: statusColor,
    });

    yPosition -= 25;

    // Thank you message
    const thankYou = "Thank you for your business!";
    const thankYouWidth = helvetica.widthOfTextAtSize(thankYou, 10);
    page.drawText(thankYou, {
      x: (width - thankYouWidth) / 2,
      y: yPosition,
      size: 10,
      font: helvetica,
      color: rgb(0.4, 0.4, 0.4),
    });

    yPosition -= 15;

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
        "Content-Disposition": `inline; filename="invoice-${invoice.period}-${company.name.replace(/\s+/g, '-')}.pdf"`,
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
