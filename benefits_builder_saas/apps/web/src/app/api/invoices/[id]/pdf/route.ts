import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { readFileSync } from "fs";
import { join } from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
          contact_email
        )
      `)
      .eq("id", params.id)
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
      .eq("invoice_id", params.id)
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

    // Draw logo if available
    if (logoImage) {
      const logoDims = logoImage.scale(0.3);
      page.drawImage(logoImage, {
        x: 50,
        y: yPosition - logoDims.height,
        width: logoDims.width,
        height: logoDims.height,
      });
      yPosition -= logoDims.height + 20;
    }

    // Company name and title
    page.drawText("BENEFITS BUILDER", {
      x: 50,
      y: yPosition,
      size: 20,
      font: helveticaBold,
      color: rgb(0.2, 0.4, 0.7),
    });

    yPosition -= 30;

    // Invoice title
    page.drawText("INVOICE", {
      x: 50,
      y: yPosition,
      size: 24,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });

    // Invoice details (right side)
    const rightX = width - 200;
    page.drawText(`Invoice #: ${invoice.id.substring(0, 8).toUpperCase()}`, {
      x: rightX,
      y: yPosition,
      size: 10,
      font: helvetica,
    });

    yPosition -= 20;
    page.drawText(`Period: ${invoice.period}`, {
      x: rightX,
      y: yPosition,
      size: 10,
      font: helvetica,
    });

    yPosition -= 15;
    const issueDate = new Date(invoice.issued_at).toLocaleDateString();
    page.drawText(`Issue Date: ${issueDate}`, {
      x: rightX,
      y: yPosition,
      size: 10,
      font: helvetica,
    });

    yPosition -= 15;
    page.drawText(`Status: ${invoice.status.toUpperCase()}`, {
      x: rightX,
      y: yPosition,
      size: 10,
      font: helveticaBold,
      color: invoice.status === 'paid' ? rgb(0, 0.6, 0) : rgb(0.8, 0, 0),
    });

    yPosition -= 40;

    // Bill To section
    page.drawText("BILL TO:", {
      x: 50,
      y: yPosition,
      size: 12,
      font: helveticaBold,
    });

    yPosition -= 20;
    const company = Array.isArray(invoice.companies) ? invoice.companies[0] : invoice.companies;
    page.drawText(company.name, {
      x: 50,
      y: yPosition,
      size: 11,
      font: helvetica,
    });

    yPosition -= 15;
    if (company.contact_email) {
      page.drawText(company.contact_email, {
        x: 50,
        y: yPosition,
        size: 10,
        font: helvetica,
        color: rgb(0.3, 0.3, 0.3),
      });
    }

    yPosition -= 40;

    // Line items table header
    page.drawRectangle({
      x: 40,
      y: yPosition - 5,
      width: width - 80,
      height: 25,
      color: rgb(0.9, 0.9, 0.9),
    });

    page.drawText("Description", {
      x: 50,
      y: yPosition + 5,
      size: 10,
      font: helveticaBold,
    });

    page.drawText("Qty", {
      x: 380,
      y: yPosition + 5,
      size: 10,
      font: helveticaBold,
    });

    page.drawText("Unit Price", {
      x: 430,
      y: yPosition + 5,
      size: 10,
      font: helveticaBold,
    });

    page.drawText("Amount", {
      x: 510,
      y: yPosition + 5,
      size: 10,
      font: helveticaBold,
    });

    yPosition -= 30;

    // Line items
    if (lines && lines.length > 0) {
      for (const line of lines) {
        page.drawText(line.description, {
          x: 50,
          y: yPosition,
          size: 9,
          font: helvetica,
        });

        page.drawText(line.quantity.toString(), {
          x: 390,
          y: yPosition,
          size: 9,
          font: helvetica,
        });

        const unitPrice = (line.unit_price_cents / 100).toFixed(2);
        page.drawText(`$${unitPrice}`, {
          x: 430,
          y: yPosition,
          size: 9,
          font: helvetica,
        });

        const amount = (line.amount_cents / 100).toFixed(2);
        page.drawText(`$${amount}`, {
          x: 510,
          y: yPosition,
          size: 9,
          font: helvetica,
        });

        yPosition -= 20;
      }
    }

    yPosition -= 20;

    // Totals section
    const subtotal = (invoice.subtotal_cents / 100).toFixed(2);
    const tax = (invoice.tax_cents / 100).toFixed(2);
    const total = (invoice.total_cents / 100).toFixed(2);

    page.drawText("Subtotal:", {
      x: 450,
      y: yPosition,
      size: 10,
      font: helvetica,
    });

    page.drawText(`$${subtotal}`, {
      x: 510,
      y: yPosition,
      size: 10,
      font: helvetica,
    });

    yPosition -= 20;

    if (invoice.tax_cents > 0) {
      page.drawText("Tax:", {
        x: 450,
        y: yPosition,
        size: 10,
        font: helvetica,
      });

      page.drawText(`$${tax}`, {
        x: 510,
        y: yPosition,
        size: 10,
        font: helvetica,
      });

      yPosition -= 20;
    }

    // Draw line
    page.drawLine({
      start: { x: 440, y: yPosition + 5 },
      end: { x: width - 40, y: yPosition + 5 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    yPosition -= 10;

    page.drawText("TOTAL:", {
      x: 450,
      y: yPosition,
      size: 12,
      font: helveticaBold,
    });

    page.drawText(`$${total}`, {
      x: 510,
      y: yPosition,
      size: 12,
      font: helveticaBold,
      color: rgb(0, 0.5, 0),
    });

    // Footer
    yPosition = 80;
    page.drawText("Thank you for your business!", {
      x: 50,
      y: yPosition,
      size: 10,
      font: helvetica,
      color: rgb(0.4, 0.4, 0.4),
    });

    yPosition -= 15;
    page.drawText("For questions, contact: support@benefitsbuilder.com", {
      x: 50,
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
