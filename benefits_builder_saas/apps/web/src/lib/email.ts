// Email Notification Service
// Uses SMTP with one-time password for automated emails

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

// Email configuration from environment variables
const EMAIL_HOST = process.env.EMAIL_HOST || "smtp.gmail.com";
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || "587");
const EMAIL_USER = process.env.EMAIL_USER || "";
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD || ""; // One-time password from Bill
const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@benefitsbuilder.com";
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || "Benefits Builder";

let transporter: Transporter | null = null;

/**
 * Get email transporter (creates once, reuses)
 */
function getTransporter(): Transporter {
  if (!transporter) {
    if (!EMAIL_USER || !EMAIL_PASSWORD) {
      throw new Error("Email credentials not configured. Set EMAIL_USER and EMAIL_PASSWORD in .env.local");
    }

    transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_PORT === 465, // true for 465, false for other ports
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD
      }
    });
  }

  return transporter;
}

/**
 * Send email
 */
async function sendEmail(
  to: string | string[],
  subject: string,
  html: string,
  text?: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const transport = getTransporter();

    const info = await transport.sendMail({
      from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      html,
      text: text || stripHtml(html)
    });

    console.log("✅ Email sent:", info.messageId);

    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error: any) {
    console.error("❌ Email send error:", error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Strip HTML tags for plain text version
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(amount);
}

/**
 * Format date
 */
function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

/**
 * Send welcome email to new company
 */
export async function sendWelcomeEmail(companyName: string, contactEmail: string) {
  const subject = "Welcome to Benefits Builder";
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .highlight { background: #f0f4ff; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Benefits Builder!</h1>
        </div>
        <div class="content">
          <p>Dear ${companyName},</p>

          <p>Thank you for partnering with Benefits Builder for your Section 125 Cafeteria Plan administration.</p>

          <div class="highlight">
            <h3>What's Next?</h3>
            <ul>
              <li><strong>Employee Enrollment:</strong> Your employees can now enroll in pre-tax benefits</li>
              <li><strong>Monthly Billing:</strong> You'll receive detailed billing reports each month</li>
              <li><strong>Tax Savings:</strong> Watch your FICA tax savings grow automatically</li>
              <li><strong>Dedicated Support:</strong> We're here to help every step of the way</li>
            </ul>
          </div>

          <p><strong>Your Benefits:</strong></p>
          <ul>
            <li>Reduce employer FICA taxes on every pre-tax benefit dollar</li>
            <li>Employees save on federal and state income taxes</li>
            <li>Automated compliance with IRS regulations</li>
            <li>Simple, transparent pricing</li>
          </ul>

          <p>If you have any questions, please don't hesitate to reach out to our team.</p>

          <p>Best regards,<br>
          <strong>Benefits Builder Team</strong></p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Benefits Builder. All rights reserved.</p>
          <p>This is an automated notification. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(contactEmail, subject, html);
}

/**
 * Send monthly billing notification
 */
export async function sendBillingNotification(
  companyName: string,
  contactEmail: string,
  period: string,
  invoiceDetails: {
    subtotal: number;
    tax: number;
    total: number;
    employerSavings: number;
    netSavings: number;
  }
) {
  const subject = `Benefits Builder Invoice - ${period}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
        .invoice-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .invoice-table td { padding: 12px; border-bottom: 1px solid #e0e0e0; }
        .invoice-table .label { font-weight: bold; width: 60%; }
        .invoice-table .amount { text-align: right; width: 40%; }
        .invoice-table .total { background: #f0f4ff; font-size: 18px; font-weight: bold; }
        .savings-highlight { background: #d4edda; color: #155724; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .savings-highlight .amount { font-size: 32px; font-weight: bold; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Monthly Invoice</h1>
          <p style="font-size: 18px; margin: 0;">${period}</p>
        </div>
        <div class="content">
          <p>Dear ${companyName},</p>

          <p>Your Benefits Builder invoice for <strong>${period}</strong> is ready.</p>

          <table class="invoice-table">
            <tr>
              <td class="label">Services Subtotal</td>
              <td class="amount">${formatCurrency(invoiceDetails.subtotal)}</td>
            </tr>
            <tr>
              <td class="label">Tax</td>
              <td class="amount">${formatCurrency(invoiceDetails.tax)}</td>
            </tr>
            <tr class="total">
              <td class="label">Total Due</td>
              <td class="amount">${formatCurrency(invoiceDetails.total)}</td>
            </tr>
          </table>

          <div class="savings-highlight">
            <p style="margin: 0; font-size: 14px;">Your Employer FICA Savings This Month</p>
            <div class="amount">${formatCurrency(invoiceDetails.employerSavings)}</div>
            <p style="margin: 0; font-size: 14px;">Net Savings: ${formatCurrency(invoiceDetails.netSavings)}</p>
          </div>

          <p><strong>Payment Information:</strong><br>
          Payment is due within 30 days of invoice date. Please reference invoice number on payment.</p>

          <p>Thank you for your business!</p>

          <p>Best regards,<br>
          <strong>Benefits Builder Team</strong></p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Benefits Builder. All rights reserved.</p>
          <p>Questions? Contact us at info@benefitsbuilder.com</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(contactEmail, subject, html);
}

/**
 * Send monthly report to company
 */
export async function sendMonthlyReport(
  companyName: string,
  contactEmail: string,
  period: string,
  reportData: {
    totalEmployees: number;
    enrolledEmployees: number;
    enrollmentRate: number;
    totalPretax: number;
    employerSavings: number;
    employeeSavings: number;
  }
) {
  const subject = `Benefits Builder Monthly Report - ${period}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
        .metrics { display: flex; flex-wrap: wrap; gap: 15px; margin: 20px 0; }
        .metric-card { flex: 1; min-width: 45%; background: #f0f4ff; padding: 20px; border-radius: 8px; text-align: center; }
        .metric-card .value { font-size: 28px; font-weight: bold; color: #667eea; margin: 10px 0; }
        .metric-card .label { font-size: 14px; color: #666; }
        .highlight-green { background: #d4edda; color: #155724; padding: 15px; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Monthly Benefits Report</h1>
          <p style="font-size: 18px; margin: 0;">${period}</p>
        </div>
        <div class="content">
          <p>Dear ${companyName},</p>

          <p>Here's your monthly benefits summary for <strong>${period}</strong>.</p>

          <h3>Enrollment Metrics</h3>
          <div class="metrics">
            <div class="metric-card">
              <div class="label">Total Employees</div>
              <div class="value">${reportData.totalEmployees}</div>
            </div>
            <div class="metric-card">
              <div class="label">Enrolled</div>
              <div class="value">${reportData.enrolledEmployees}</div>
            </div>
            <div class="metric-card">
              <div class="label">Enrollment Rate</div>
              <div class="value">${reportData.enrollmentRate.toFixed(1)}%</div>
            </div>
            <div class="metric-card">
              <div class="label">Total Pre-Tax Benefits</div>
              <div class="value">${formatCurrency(reportData.totalPretax)}</div>
            </div>
          </div>

          <h3>Tax Savings Summary</h3>
          <div class="highlight-green">
            <p style="margin: 0; font-weight: bold;">Employer FICA Savings: ${formatCurrency(reportData.employerSavings)}</p>
            <p style="margin: 10px 0 0 0;">Employee Tax Savings: ${formatCurrency(reportData.employeeSavings)}</p>
          </div>

          <p><strong>What This Means:</strong></p>
          <ul>
            <li>Your company saved <strong>${formatCurrency(reportData.employerSavings)}</strong> in FICA taxes</li>
            <li>Your employees saved approximately <strong>${formatCurrency(reportData.employeeSavings)}</strong> in income taxes</li>
            <li><strong>${formatCurrency(reportData.totalPretax)}</strong> in pre-tax benefits processed</li>
          </ul>

          <p>Thank you for trusting Benefits Builder with your cafeteria plan administration!</p>

          <p>Best regards,<br>
          <strong>Benefits Builder Team</strong></p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Benefits Builder. All rights reserved.</p>
          <p>Questions? Contact us at info@benefitsbuilder.com</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(contactEmail, subject, html);
}

/**
 * Send test email to verify configuration
 */
export async function sendTestEmail(to: string) {
  const subject = "Benefits Builder - Email System Test";
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
        .success { background: #d4edda; color: #155724; padding: 20px; border-radius: 8px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Email System Test</h1>
        </div>
        <div class="content">
          <div class="success">
            <h2>✅ Success!</h2>
            <p>Email notifications are working correctly.</p>
          </div>

          <p>This is a test email from Benefits Builder's automated notification system.</p>

          <p><strong>System Information:</strong></p>
          <ul>
            <li>Email Service: Configured</li>
            <li>SMTP Connection: Working</li>
            <li>Template Rendering: Success</li>
            <li>Timestamp: ${new Date().toISOString()}</li>
          </ul>

          <p>All email notifications are now operational:</p>
          <ul>
            <li>✅ Welcome emails for new companies</li>
            <li>✅ Monthly billing notifications</li>
            <li>✅ Monthly benefit reports</li>
          </ul>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Benefits Builder. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(to, subject, html);
}

export { sendEmail };
