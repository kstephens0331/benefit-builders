import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { readFileSync } from "fs";
import { join } from "path";

// Benefit Builder company info (static)
const BENEFIT_BUILDER = {
  name: "Benefit Builder",
  address: "206A S Loop 336 W Box 322",
  cityStateZip: "Conroe, TX 77304-3300",
  email: "billdawson.bb@gmail.com",
  phone: "+1 (972) 741-5663",
};

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

    // Fetch invoice lines
    const { data: lines } = await db
      .from("invoice_lines")
      .select("*")
      .eq("invoice_id", id)
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

    const company = Array.isArray(invoice.companies) ? invoice.companies[0] : invoice.companies;
    const leftMargin = 40;
    const rightMargin = width - 40;
    let y = height - 40;

    // Colors
    const bluePrimary = rgb(0.1, 0.4, 0.7);
    const blueLight = rgb(0.9, 0.95, 1);
    const grayText = rgb(0.3, 0.3, 0.3);
    const greenText = rgb(0.1, 0.6, 0.1);

    // ===== HEADER SECTION =====
    // "INVOICE" title (top left, blue)
    page.drawText("INVOICE", {
      x: leftMargin,
      y: y,
      size: 24,
      font: helveticaBold,
      color: bluePrimary,
    });

    // Logo (top right)
    if (logoImage) {
      const logoDims = logoImage.scale(0.2);
      page.drawImage(logoImage, {
        x: rightMargin - logoDims.width,
        y: y - logoDims.height + 30,
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

    y -= 30;

    // ===== BILL TO / SHIP TO SECTION (light blue box) =====
    const boxY = y;
    const boxHeight = 90;
    page.drawRectangle({
      x: leftMargin,
      y: boxY - boxHeight,
      width: rightMargin - leftMargin,
      height: boxHeight,
      color: blueLight,
    });

    y -= 20;
    const colWidth = (rightMargin - leftMargin) / 2;

    // Bill To
    page.drawText("Bill to", {
      x: leftMargin + 15,
      y: y,
      size: 10,
      font: helveticaBold,
      color: grayText,
    });
    y -= 14;
    page.drawText(company?.contact_name || company?.name || "Customer", {
      x: leftMargin + 15,
      y: y,
      size: 9,
      font: helvetica,
      color: grayText,
    });
    y -= 12;
    page.drawText(company?.name || "", {
      x: leftMargin + 15,
      y: y,
      size: 9,
      font: helvetica,
      color: grayText,
    });
    y -= 12;
    if (company?.address) {
      page.drawText(company.address, {
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
      page.drawText(cityStateZip, {
        x: leftMargin + 15,
        y: y,
        size: 9,
        font: helvetica,
        color: grayText,
      });
    }

    // Ship To (same as Bill To for services)
    let shipY = boxY - 20;
    page.drawText("Ship to", {
      x: leftMargin + colWidth + 15,
      y: shipY,
      size: 10,
      font: helveticaBold,
      color: grayText,
    });
    shipY -= 14;
    page.drawText(company?.contact_name || company?.name || "Customer", {
      x: leftMargin + colWidth + 15,
      y: shipY,
      size: 9,
      font: helvetica,
      color: grayText,
    });
    shipY -= 12;
    page.drawText(company?.name || "", {
      x: leftMargin + colWidth + 15,
      y: shipY,
      size: 9,
      font: helvetica,
      color: grayText,
    });
    shipY -= 12;
    if (company?.address) {
      page.drawText(company.address, {
        x: leftMargin + colWidth + 15,
        y: shipY,
        size: 9,
        font: helvetica,
        color: grayText,
      });
      shipY -= 12;
    }
    if (cityStateZip) {
      page.drawText(cityStateZip, {
        x: leftMargin + colWidth + 15,
        y: shipY,
        size: 9,
        font: helvetica,
        color: grayText,
      });
    }

    y = boxY - boxHeight - 30;

    // ===== INVOICE DETAILS SECTION =====
    page.drawText("Invoice details", {
      x: leftMargin,
      y: y,
      size: 11,
      font: helveticaBold,
      color: grayText,
    });
    y -= 16;

    // Generate invoice number from ID or invoice_number field
    const invoiceNumber = invoice.invoice_number || invoice.id.substring(0, 8).toUpperCase();
    page.drawText(`Invoice no.: ${invoiceNumber}`, {
      x: leftMargin,
      y: y,
      size: 9,
      font: helvetica,
      color: grayText,
    });
    y -= 12;

    page.drawText("Terms: Net 30", {
      x: leftMargin,
      y: y,
      size: 9,
      font: helvetica,
      color: grayText,
    });
    y -= 12;

    const invoiceDate = invoice.invoice_date || invoice.issued_at;
    const formattedInvoiceDate = invoiceDate
      ? new Date(invoiceDate).toLocaleDateString("en-US")
      : new Date().toLocaleDateString("en-US");
    page.drawText(`Invoice date: ${formattedInvoiceDate}`, {
      x: leftMargin,
      y: y,
      size: 9,
      font: helvetica,
      color: grayText,
    });
    y -= 12;

    // Due date (30 days from invoice date)
    const dueDate = invoice.due_date
      ? new Date(invoice.due_date)
      : new Date(new Date(invoiceDate || Date.now()).getTime() + 30 * 24 * 60 * 60 * 1000);
    page.drawText(`Due date: ${dueDate.toLocaleDateString("en-US")}`, {
      x: leftMargin,
      y: y,
      size: 9,
      font: helvetica,
      color: grayText,
    });

    y -= 40;

    // ===== LINE ITEMS TABLE =====
    const tableX = leftMargin;
    const tableWidth = rightMargin - leftMargin;
    const colWidths = {
      num: 30,
      product: 120,
      description: 180,
      qty: 50,
      rate: 70,
      amount: 70,
    };

    // Table header
    page.drawLine({
      start: { x: tableX, y: y + 5 },
      end: { x: tableX + tableWidth, y: y + 5 },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });

    y -= 5;
    let x = tableX;
    page.drawText("#", { x: x + 5, y: y, size: 9, font: helveticaBold, color: grayText });
    x += colWidths.num;
    page.drawText("Product or service", { x, y, size: 9, font: helveticaBold, color: grayText });
    x += colWidths.product;
    page.drawText("Description", { x, y, size: 9, font: helveticaBold, color: grayText });
    x += colWidths.description;
    page.drawText("Qty", { x, y, size: 9, font: helveticaBold, color: grayText });
    x += colWidths.qty;
    page.drawText("Rate", { x, y, size: 9, font: helveticaBold, color: grayText });
    x += colWidths.rate;
    page.drawText("Amount", { x, y, size: 9, font: helveticaBold, color: grayText });

    y -= 15;
    page.drawLine({
      start: { x: tableX, y: y + 5 },
      end: { x: tableX + tableWidth, y: y + 5 },
      thickness: 1,
      color: rgb(0.9, 0.9, 0.9),
    });

    // Line items
    let subtotal = 0;
    const lineItems = lines || [];

    if (lineItems.length > 0) {
      lineItems.forEach((line: any, index: number) => {
        y -= 5;
        x = tableX;

        page.drawText(`${index + 1}.`, { x: x + 5, y, size: 9, font: helvetica, color: grayText });
        x += colWidths.num;

        // Product name (e.g., "Monthly Fee")
        const productName = line.kind === "employer_fee" ? "Employer Fee" :
                           line.kind === "employee_fee" ? "Employee Fee" :
                           line.kind === "admin_fee" ? "Admin Fee" :
                           "Monthly Fee";
        page.drawText(productName, { x, y, size: 9, font: helveticaBold, color: grayText });
        x += colWidths.product;

        // Description
        const desc = line.description || invoice.period || "";
        page.drawText(desc.substring(0, 30), { x, y, size: 9, font: helvetica, color: grayText });
        x += colWidths.description;

        // Qty
        const qty = line.quantity || 1;
        page.drawText(String(qty), { x, y, size: 9, font: helvetica, color: grayText });
        x += colWidths.qty;

        // Rate
        const rate = (line.amount_cents / 100) / qty;
        page.drawText(`$${rate.toFixed(2)}`, { x, y, size: 9, font: helvetica, color: grayText });
        x += colWidths.rate;

        // Amount
        const amount = line.amount_cents / 100;
        page.drawText(`$${amount.toFixed(2)}`, { x, y, size: 9, font: helvetica, color: grayText });

        subtotal += line.amount_cents;
        y -= 20;
      });
    } else {
      // Single line item from invoice total
      y -= 5;
      x = tableX;
      page.drawText("1.", { x: x + 5, y, size: 9, font: helvetica, color: grayText });
      x += colWidths.num;
      page.drawText("Monthly Fee", { x, y, size: 9, font: helveticaBold, color: grayText });
      x += colWidths.product;
      page.drawText(invoice.period || "", { x, y, size: 9, font: helvetica, color: grayText });
      x += colWidths.description;
      page.drawText("1", { x, y, size: 9, font: helvetica, color: grayText });
      x += colWidths.qty;
      const total = (invoice.total_cents || 0) / 100;
      page.drawText(`$${total.toFixed(2)}`, { x, y, size: 9, font: helvetica, color: grayText });
      x += colWidths.rate;
      page.drawText(`$${total.toFixed(2)}`, { x, y, size: 9, font: helvetica, color: grayText });
      subtotal = invoice.total_cents || 0;
      y -= 20;
    }

    // Line under items
    page.drawLine({
      start: { x: tableX, y: y + 10 },
      end: { x: tableX + tableWidth, y: y + 10 },
      thickness: 1,
      color: rgb(0.9, 0.9, 0.9),
    });

    y -= 20;

    // ===== TOTALS SECTION =====
    const totalsX = tableX + tableWidth - 200;

    // Ways to pay section (left side)
    page.drawText("Ways to pay", {
      x: leftMargin,
      y: y + 10,
      size: 10,
      font: helveticaBold,
      color: grayText,
    });
    // Payment method icons would go here (text placeholder)
    page.drawText("VISA  MC  DISCOVER  AMEX  BANK  PayPal  Venmo", {
      x: leftMargin,
      y: y - 5,
      size: 7,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Total (right side)
    const totalAmount = (invoice.total_cents || subtotal) / 100;
    page.drawText("Total", {
      x: totalsX,
      y: y + 10,
      size: 10,
      font: helvetica,
      color: grayText,
    });
    page.drawText(`$${totalAmount.toFixed(2)}`, {
      x: totalsX + 100,
      y: y + 10,
      size: 14,
      font: helveticaBold,
      color: grayText,
    });

    y -= 25;

    // Payment (if any)
    const amountPaid = (invoice.amount_paid_cents || 0) / 100;
    if (amountPaid > 0) {
      page.drawText("Payment", {
        x: totalsX,
        y: y,
        size: 10,
        font: helvetica,
        color: grayText,
      });
      page.drawText(`-$${amountPaid.toFixed(2)}`, {
        x: totalsX + 100,
        y: y,
        size: 10,
        font: helvetica,
        color: grayText,
      });
      y -= 20;
    }

    // Balance due line
    page.drawLine({
      start: { x: totalsX, y: y + 5 },
      end: { x: totalsX + 160, y: y + 5 },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });

    const balanceDue = totalAmount - amountPaid;
    page.drawText("Balance due", {
      x: totalsX,
      y: y - 10,
      size: 10,
      font: helveticaBold,
      color: grayText,
    });
    page.drawText(`$${balanceDue.toFixed(2)}`, {
      x: totalsX + 100,
      y: y - 10,
      size: 14,
      font: helveticaBold,
      color: balanceDue === 0 ? greenText : grayText,
    });

    // "Paid in Full" stamp if balance is 0
    if (balanceDue === 0 || invoice.payment_status === "paid") {
      y -= 40;
      page.drawText("Paid in Full", {
        x: totalsX + 50,
        y: y,
        size: 16,
        font: helveticaBold,
        color: greenText,
      });
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
