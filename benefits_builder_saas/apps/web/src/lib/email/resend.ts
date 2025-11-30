/**
 * Resend Email Service
 *
 * Handles all email sending through Resend API
 * - Payment reminders (gentle, firm, final)
 * - Invoice delivery
 * - Payment receipts
 */

import { Resend } from 'resend';

// Lazy initialization to avoid build-time errors when env var is not set
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY || 're_placeholder';
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@benefitsbuilder.com';
const COMPANY_NAME = 'Benefits Builder Program';

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email using Resend
 */
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<{ id: string; success: boolean }> {
  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text: text || stripHtml(html),
    });

    if (error) {
      console.error('Resend error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return {
      id: data?.id || '',
      success: true,
    };
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

/**
 * Strip HTML tags for plain text version
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format date
 */
function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Generate payment reminder email templates
 */
export function generatePaymentReminderTemplate(
  reminderType: 'gentle' | 'firm' | 'final',
  data: {
    companyName: string;
    invoiceNumber: string;
    amountDue: number;
    dueDate: string;
    daysOverdue: number;
    paymentLink?: string;
  }
): EmailTemplate {
  const { companyName, invoiceNumber, amountDue, dueDate, daysOverdue, paymentLink } = data;
  const formattedAmount = formatCurrency(amountDue);
  const formattedDate = formatDate(dueDate);
  const paymentUrl = paymentLink || '#';

  const templates = {
    gentle: {
      subject: `Friendly Reminder: Invoice ${invoiceNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
              .content { padding: 20px 0; }
              .invoice-details { background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
              .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { font-size: 12px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>${COMPANY_NAME}</h2>
              </div>
              <div class="content">
                <p>Hi ${companyName},</p>

                <p>This is a friendly reminder that the following invoice is now due:</p>

                <div class="invoice-details">
                  <strong>Invoice #:</strong> ${invoiceNumber}<br>
                  <strong>Amount Due:</strong> ${formattedAmount}<br>
                  <strong>Due Date:</strong> ${formattedDate}
                </div>

                <p>If you've already sent payment, please disregard this message. Otherwise, you can conveniently pay online using the button below:</p>

                <center>
                  <a href="${paymentUrl}" class="button">Pay Invoice</a>
                </center>

                <p>Thank you for your business!</p>

                <p>Best regards,<br>
                The ${COMPANY_NAME} Team</p>
              </div>
              <div class="footer">
                <p>If you have any questions about this invoice, please contact us.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    },
    firm: {
      subject: `Payment Overdue: Invoice ${invoiceNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #fff3cd; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #ffc107; }
              .content { padding: 20px 0; }
              .invoice-details { background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107; }
              .warning { color: #856404; font-weight: bold; }
              .button { display: inline-block; padding: 12px 24px; background-color: #ffc107; color: #000; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
              .footer { font-size: 12px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2 class="warning">⚠ Payment Overdue</h2>
              </div>
              <div class="content">
                <p>Hello ${companyName},</p>

                <p>Our records show that the following invoice is now <strong>${daysOverdue} days overdue</strong>:</p>

                <div class="invoice-details">
                  <strong>Invoice #:</strong> ${invoiceNumber}<br>
                  <strong>Amount Due:</strong> ${formattedAmount}<br>
                  <strong>Original Due Date:</strong> ${formattedDate}<br>
                  <strong>Days Overdue:</strong> ${daysOverdue} days
                </div>

                <p><strong>Please submit payment immediately</strong> to avoid potential service interruption.</p>

                <center>
                  <a href="${paymentUrl}" class="button">Pay Now</a>
                </center>

                <p>If you're experiencing payment difficulties or have questions about this invoice, please contact us immediately to discuss payment arrangements.</p>

                <p>Sincerely,<br>
                The ${COMPANY_NAME} Accounting Team</p>
              </div>
              <div class="footer">
                <p>For immediate assistance, please reply to this email or contact our accounting department.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    },
    final: {
      subject: `FINAL NOTICE: Invoice ${invoiceNumber} - Action Required`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #f8d7da; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #dc3545; }
              .content { padding: 20px 0; }
              .invoice-details { background-color: #f8d7da; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545; }
              .critical { color: #721c24; font-weight: bold; }
              .consequences { background-color: #fff; border: 2px solid #dc3545; padding: 15px; border-radius: 8px; margin: 20px 0; }
              .consequences ul { margin: 10px 0; padding-left: 20px; }
              .button { display: inline-block; padding: 12px 24px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
              .footer { font-size: 12px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2 class="critical">🚨 FINAL NOTICE - IMMEDIATE ACTION REQUIRED</h2>
              </div>
              <div class="content">
                <p class="critical">FINAL NOTICE - ${companyName},</p>

                <p>This is our final notice regarding the following seriously overdue invoice:</p>

                <div class="invoice-details">
                  <strong>Invoice #:</strong> ${invoiceNumber}<br>
                  <strong>Amount Due:</strong> ${formattedAmount}<br>
                  <strong>Original Due Date:</strong> ${formattedDate}<br>
                  <strong>Days Overdue:</strong> <span class="critical">${daysOverdue} days</span>
                </div>

                <div class="consequences">
                  <p><strong>Payment must be received within 7 days or the following actions will be taken:</strong></p>
                  <ul>
                    <li>A 10% late fee will be applied to your account</li>
                    <li>Services may be suspended or terminated</li>
                    <li>Your account may be sent to a collections agency</li>
                    <li>This may negatively impact your credit rating</li>
                  </ul>
                </div>

                <center>
                  <a href="${paymentUrl}" class="button">Pay Immediately</a>
                </center>

                <p><strong>If you need to discuss payment arrangements, you must contact us within 48 hours.</strong></p>

                <p>We value your business and hope to resolve this matter immediately.</p>

                <p>Sincerely,<br>
                The ${COMPANY_NAME} Accounting Department</p>
              </div>
              <div class="footer">
                <p><strong>URGENT:</strong> Contact us immediately at accounting@benefitsbuilder.com or call during business hours.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    },
  };

  return templates[reminderType];
}

/**
 * Send payment reminder email
 */
export async function sendPaymentReminderEmail(
  reminderType: 'gentle' | 'firm' | 'final',
  recipientEmail: string,
  data: {
    companyName: string;
    invoiceNumber: string;
    amountDue: number;
    dueDate: string;
    daysOverdue: number;
    paymentLink?: string;
  }
): Promise<{ id: string; success: boolean }> {
  const template = generatePaymentReminderTemplate(reminderType, data);

  return await sendEmail(
    recipientEmail,
    template.subject,
    template.html,
    template.text
  );
}

/**
 * Generate invoice delivery email
 */
export function generateInvoiceDeliveryTemplate(data: {
  companyName: string;
  invoiceNumber: string;
  totalAmount: number;
  dueDate: string;
  invoiceUrl?: string;
  paymentLink?: string;
}): EmailTemplate {
  const { companyName, invoiceNumber, totalAmount, dueDate, invoiceUrl, paymentLink } = data;
  const formattedAmount = formatCurrency(totalAmount);
  const formattedDate = formatDate(dueDate);

  return {
    subject: `Invoice ${invoiceNumber} from ${COMPANY_NAME}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #007bff; color: white; padding: 20px; border-radius: 8px; text-align: center; }
            .content { padding: 20px 0; }
            .invoice-summary { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
            .button-secondary { background-color: #6c757d; }
            .footer { font-size: 12px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>New Invoice from ${COMPANY_NAME}</h2>
            </div>
            <div class="content">
              <p>Hi ${companyName},</p>

              <p>Thank you for your business! A new invoice has been generated for your account:</p>

              <div class="invoice-summary">
                <h3>Invoice Summary</h3>
                <strong>Invoice Number:</strong> ${invoiceNumber}<br>
                <strong>Total Amount:</strong> ${formattedAmount}<br>
                <strong>Due Date:</strong> ${formattedDate}
              </div>

              <center>
                ${paymentLink ? `<a href="${paymentLink}" class="button">Pay Invoice</a>` : ''}
                ${invoiceUrl ? `<a href="${invoiceUrl}" class="button button-secondary">View Invoice PDF</a>` : ''}
              </center>

              <p>Please remit payment by ${formattedDate} to avoid late fees.</p>

              <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>

              <p>Best regards,<br>
              The ${COMPANY_NAME} Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

/**
 * Send invoice delivery email
 */
export async function sendInvoiceEmail(
  recipientEmail: string,
  data: {
    companyName: string;
    invoiceNumber: string;
    totalAmount: number;
    dueDate: string;
    invoiceUrl?: string;
    paymentLink?: string;
  }
): Promise<{ id: string; success: boolean }> {
  const template = generateInvoiceDeliveryTemplate(data);

  return await sendEmail(
    recipientEmail,
    template.subject,
    template.html,
    template.text
  );
}

/**
 * Generate payment receipt email
 */
export function generatePaymentReceiptTemplate(data: {
  companyName: string;
  invoiceNumber: string;
  amountPaid: number;
  paymentDate: string;
  paymentMethod: string;
  receiptUrl?: string;
}): EmailTemplate {
  const { companyName, invoiceNumber, amountPaid, paymentDate, paymentMethod, receiptUrl } = data;
  const formattedAmount = formatCurrency(amountPaid);
  const formattedDate = formatDate(paymentDate);

  return {
    subject: `Payment Receipt - Invoice ${invoiceNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #28a745; color: white; padding: 20px; border-radius: 8px; text-align: center; }
            .content { padding: 20px 0; }
            .receipt-details { background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745; }
            .checkmark { font-size: 48px; color: #28a745; }
            .button { display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { font-size: 12px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="checkmark">✓</div>
              <h2>Payment Received</h2>
            </div>
            <div class="content">
              <p>Hi ${companyName},</p>

              <p>Thank you! We have successfully received your payment.</p>

              <div class="receipt-details">
                <h3>Payment Details</h3>
                <strong>Invoice Number:</strong> ${invoiceNumber}<br>
                <strong>Amount Paid:</strong> ${formattedAmount}<br>
                <strong>Payment Date:</strong> ${formattedDate}<br>
                <strong>Payment Method:</strong> ${paymentMethod}
              </div>

              ${receiptUrl ? `
                <center>
                  <a href="${receiptUrl}" class="button">Download Receipt</a>
                </center>
              ` : ''}

              <p>This payment has been applied to your account. If you have any questions, please contact us.</p>

              <p>Thank you for your business!</p>

              <p>Best regards,<br>
              The ${COMPANY_NAME} Team</p>
            </div>
            <div class="footer">
              <p>Please keep this email for your records.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

/**
 * Send payment receipt email
 */
export async function sendPaymentReceiptEmail(
  recipientEmail: string,
  data: {
    companyName: string;
    invoiceNumber: string;
    amountPaid: number;
    paymentDate: string;
    paymentMethod: string;
    receiptUrl?: string;
  }
): Promise<{ id: string; success: boolean }> {
  const template = generatePaymentReceiptTemplate(data);

  return await sendEmail(
    recipientEmail,
    template.subject,
    template.html,
    template.text
  );
}

export default {
  sendPaymentReminderEmail,
  sendInvoiceEmail,
  sendPaymentReceiptEmail,
  generatePaymentReminderTemplate,
  generateInvoiceDeliveryTemplate,
  generatePaymentReceiptTemplate,
};
