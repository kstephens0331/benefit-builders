import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import nodemailer from "nodemailer";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = createServiceClient();

    // Fetch invoice with company details
    const { data: invoice, error: invoiceError } = await db
      .from("invoices")
      .select(`
        *,
        companies(
          id,
          name,
          contact_email
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

    if (!company.contact_email) {
      return NextResponse.json(
        { ok: false, error: "Company has no contact email" },
        { status: 400 }
      );
    }

    // Fetch invoice lines for email body
    const { data: lines } = await db
      .from("invoice_lines")
      .select("*")
      .eq("invoice_id", id);

    // Create email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const subtotal = (invoice.subtotal_cents / 100).toFixed(2);
    const tax = (invoice.tax_cents / 100).toFixed(2);
    const total = (invoice.total_cents / 100).toFixed(2);
    const issueDate = new Date(invoice.issued_at).toLocaleDateString();

    // Generate line items HTML
    let lineItemsHtml = "";
    if (lines && lines.length > 0) {
      lineItemsHtml = lines.map(line => {
        const amount = (line.amount_cents / 100).toFixed(2);
        return `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${line.description}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${line.quantity}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${amount}</td>
          </tr>
        `;
      }).join('');
    }

    // HTML email template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #2563eb;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9fafb;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .invoice-details {
              background-color: white;
              padding: 20px;
              border-radius: 5px;
              margin: 20px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th {
              background-color: #f3f4f6;
              padding: 10px;
              text-align: left;
              font-weight: bold;
              border-bottom: 2px solid #ddd;
            }
            .total-row {
              font-size: 18px;
              font-weight: bold;
              background-color: #f0fdf4;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background-color: #2563eb;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              color: #6b7280;
              font-size: 12px;
              margin-top: 30px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Benefits Builder Invoice</h1>
              <p>Period: ${invoice.period}</p>
            </div>

            <div class="content">
              <p>Dear ${company.name},</p>

              <p>Thank you for your continued partnership with Benefits Builder. Please find your invoice for the period <strong>${invoice.period}</strong> below.</p>

              <div class="invoice-details">
                <h2>Invoice Details</h2>
                <p><strong>Invoice ID:</strong> ${invoice.id.substring(0, 8).toUpperCase()}</p>
                <p><strong>Issue Date:</strong> ${issueDate}</p>
                <p><strong>Status:</strong> ${invoice.status.toUpperCase()}</p>

                <table>
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th style="text-align: center;">Quantity</th>
                      <th style="text-align: right;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${lineItemsHtml}
                    <tr style="border-top: 2px solid #333;">
                      <td colspan="2" style="padding: 10px; text-align: right; font-weight: bold;">Subtotal:</td>
                      <td style="padding: 10px; text-align: right; font-weight: bold;">$${subtotal}</td>
                    </tr>
                    ${invoice.tax_cents > 0 ? `
                    <tr>
                      <td colspan="2" style="padding: 10px; text-align: right;">Tax:</td>
                      <td style="padding: 10px; text-align: right;">$${tax}</td>
                    </tr>
                    ` : ''}
                    <tr class="total-row">
                      <td colspan="2" style="padding: 15px; text-align: right;">TOTAL:</td>
                      <td style="padding: 15px; text-align: right; color: #059669;">$${total}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_SITE_URL}/api/invoices/${invoice.id}/pdf" class="button">
                  Download PDF Invoice
                </a>
              </p>

              <p>If you have any questions about this invoice, please don't hesitate to contact us at <a href="mailto:support@benefitsbuilder.com">support@benefitsbuilder.com</a>.</p>

              <p>Thank you for your business!</p>

              <p style="margin-top: 30px;">
                Best regards,<br>
                <strong>Benefits Builder Team</strong>
              </p>
            </div>

            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Benefits Builder. All rights reserved.</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email
    await transporter.sendMail({
      from: `${process.env.EMAIL_FROM_NAME || "Benefits Builder"} <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: company.contact_email,
      subject: `Invoice for ${invoice.period} - Benefits Builder`,
      html: htmlContent,
    });

    // Update invoice status to 'sent'
    await db
      .from("invoices")
      .update({ status: "sent" })
      .eq("id", invoice.id);

    return NextResponse.json({
      ok: true,
      message: `Invoice sent to ${company.contact_email}`,
    });
  } catch (error: any) {
    console.error("Email sending error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
