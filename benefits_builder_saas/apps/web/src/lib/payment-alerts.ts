/**
 * Payment Alerts & Credit Management System
 *
 * Handles:
 * - Late payment alerts
 * - Underpayment detection and follow-up
 * - Overpayment credits applied to next invoice
 * - Automated reminders
 */

import { createServiceClient } from "./supabase";
import { sendPaymentReminderEmail } from "./email/resend";

export interface PaymentAlert {
  id: string;
  type: "late" | "underpaid" | "overpaid" | "failed" | "reminder";
  severity: "critical" | "warning" | "info";
  companyId: string;
  companyName: string;
  invoiceId?: string;
  invoiceNumber?: string;
  amount: number;
  daysLate?: number;
  message: string;
  actionRequired: string;
  createdAt: string;
}

export interface CompanyCredit {
  id: string;
  companyId: string;
  amount: number; // in cents
  source: "overpayment" | "refund" | "adjustment";
  sourceInvoiceId?: string;
  appliedToInvoiceId?: string | null;
  status: "available" | "applied" | "expired";
  expiresAt?: string;
  createdAt: string;
  appliedAt?: string;
  notes?: string;
}

/**
 * Get all active payment alerts
 */
export async function getPaymentAlerts(): Promise<PaymentAlert[]> {
  const db = createServiceClient();
  const alerts: PaymentAlert[] = [];

  // Check for late payments
  const lateAlerts = await checkLatePayments(db);
  alerts.push(...lateAlerts);

  // Check for underpayments
  const underpaidAlerts = await checkUnderpayments(db);
  alerts.push(...underpaidAlerts);

  // Check for overpayments
  const overpaidAlerts = await checkOverpayments(db);
  alerts.push(...overpaidAlerts);

  // Check for failed payments
  const failedAlerts = await checkFailedPayments(db);
  alerts.push(...failedAlerts);

  return alerts;
}

/**
 * Check for late payments
 */
async function checkLatePayments(db: any): Promise<PaymentAlert[]> {
  const today = new Date();
  const { data: overdueInvoices } = await db
    .from("invoices")
    .select(`
      id,
      invoice_number,
      due_date,
      total_cents,
      amount_paid_cents,
      company:companies(id, name)
    `)
    .lt("due_date", today.toISOString())
    .neq("payment_status", "paid")
    .order("due_date");

  return (overdueInvoices || []).map((invoice: any) => {
    const dueDate = new Date(invoice.due_date);
    const daysLate = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    const amountDue = (invoice.total_cents - invoice.amount_paid_cents) / 100;

    let severity: "critical" | "warning" | "info" = "warning";
    if (daysLate > 60) severity = "critical";

    return {
      id: `late-${invoice.id}`,
      type: "late",
      severity,
      companyId: invoice.company.id,
      companyName: invoice.company.name,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      amount: amountDue,
      daysLate,
      message: `Invoice ${invoice.invoice_number} is ${daysLate} days overdue ($${amountDue.toFixed(2)})`,
      actionRequired: daysLate > 30
        ? "Send final notice and consider late fees"
        : "Send payment reminder email",
      createdAt: new Date().toISOString()
    };
  });
}

/**
 * Check for underpayments
 */
async function checkUnderpayments(db: any): Promise<PaymentAlert[]> {
  const { data: partiallyPaid } = await db
    .from("invoices")
    .select(`
      id,
      invoice_number,
      total_cents,
      amount_paid_cents,
      company:companies(id, name)
    `)
    .eq("payment_status", "partial")
    .order("created_at", { ascending: false });

  return (partiallyPaid || []).map((invoice: any) => {
    const amountDue = (invoice.total_cents - invoice.amount_paid_cents) / 100;
    const paidAmount = invoice.amount_paid_cents / 100;

    return {
      id: `underpaid-${invoice.id}`,
      type: "underpaid",
      severity: "warning",
      companyId: invoice.company.id,
      companyName: invoice.company.name,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      amount: amountDue,
      message: `Invoice ${invoice.invoice_number} partially paid: $${paidAmount.toFixed(2)} received, $${amountDue.toFixed(2)} still due`,
      actionRequired: "Contact customer about remaining balance",
      createdAt: new Date().toISOString()
    };
  });
}

/**
 * Check for overpayments
 */
async function checkOverpayments(db: any): Promise<PaymentAlert[]> {
  const { data: overpayments } = await db
    .from("payment_transactions")
    .select(`
      id,
      amount,
      payment_date,
      invoice:invoices(
        id,
        invoice_number,
        total_cents,
        company:companies(id, name)
      )
    `)
    .gt("amount", db.raw("invoice.total_cents"))
    .is("refunded", false);

  return (overpayments || []).map((payment: any) => {
    const overpaidAmount = (payment.amount - payment.invoice.total_cents) / 100;

    return {
      id: `overpaid-${payment.id}`,
      type: "overpaid",
      severity: "info",
      companyId: payment.invoice.company.id,
      companyName: payment.invoice.company.name,
      invoiceId: payment.invoice.id,
      invoiceNumber: payment.invoice.invoice_number,
      amount: overpaidAmount,
      message: `Customer overpaid invoice ${payment.invoice.invoice_number} by $${overpaidAmount.toFixed(2)}`,
      actionRequired: "Create credit for next invoice or issue refund",
      createdAt: new Date().toISOString()
    };
  });
}

/**
 * Check for failed payment attempts
 */
async function checkFailedPayments(db: any): Promise<PaymentAlert[]> {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  const { data: failures } = await db
    .from("payment_transactions")
    .select(`
      id,
      amount,
      failure_reason,
      created_at,
      invoice:invoices(
        id,
        invoice_number,
        company:companies(id, name)
      )
    `)
    .eq("status", "failed")
    .gte("created_at", threeDaysAgo.toISOString())
    .order("created_at", { ascending: false });

  return (failures || []).map((failure: any) => {
    return {
      id: `failed-${failure.id}`,
      type: "failed",
      severity: "critical",
      companyId: failure.invoice.company.id,
      companyName: failure.invoice.company.name,
      invoiceId: failure.invoice.id,
      invoiceNumber: failure.invoice.invoice_number,
      amount: failure.amount / 100,
      message: `Payment failed for invoice ${failure.invoice.invoice_number}: ${failure.failure_reason}`,
      actionRequired: "Contact customer to update payment method and retry",
      createdAt: failure.created_at
    };
  });
}

/**
 * Create credit from overpayment
 */
export async function createCreditFromOverpayment(
  companyId: string,
  amount: number, // in cents
  sourceInvoiceId: string,
  notes?: string
): Promise<CompanyCredit> {
  const db = createServiceClient();

  // Create credit record
  const { data: credit, error } = await db
    .from("company_credits")
    .insert({
      company_id: companyId,
      amount,
      source: "overpayment",
      source_invoice_id: sourceInvoiceId,
      status: "available",
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      notes: notes || `Credit from overpayment on invoice`
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: credit.id,
    companyId: credit.company_id,
    amount: credit.amount,
    source: credit.source,
    sourceInvoiceId: credit.source_invoice_id,
    appliedToInvoiceId: null,
    status: credit.status,
    expiresAt: credit.expires_at,
    createdAt: credit.created_at,
    notes: credit.notes
  };
}

/**
 * Apply credit to invoice
 */
export async function applyCreditToInvoice(
  creditId: string,
  invoiceId: string
): Promise<{ success: boolean; appliedAmount: number }> {
  const db = createServiceClient();

  // Get credit and invoice
  const { data: credit } = await db
    .from("company_credits")
    .select("*")
    .eq("id", creditId)
    .eq("status", "available")
    .single();

  if (!credit) {
    throw new Error("Credit not found or already applied");
  }

  const { data: invoice } = await db
    .from("invoices")
    .select("total_cents, amount_paid_cents")
    .eq("id", invoiceId)
    .single();

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  const amountDue = invoice.total_cents - invoice.amount_paid_cents;
  const amountToApply = Math.min(credit.amount, amountDue);

  // Apply credit (Note: Supabase doesn't support transactions, so we run sequentially)
  // Update credit
  const { error: creditError } = await db
    .from("company_credits")
    .update({
      applied_to_invoice_id: invoiceId,
      status: amountToApply === credit.amount ? "applied" : "available",
      amount: credit.amount - amountToApply,
      applied_at: new Date().toISOString()
    })
    .eq("id", creditId);

  if (creditError) {
    throw new Error(`Failed to update credit: ${creditError.message}`);
  }

  // Update invoice
  const { error: invoiceError } = await db
    .from("invoices")
    .update({
      amount_paid_cents: invoice.amount_paid_cents + amountToApply
    })
    .eq("id", invoiceId);

  if (invoiceError) {
    throw new Error(`Failed to update invoice: ${invoiceError.message}`);
  }

  // Create payment transaction record
  const { error: transactionError } = await db.from("payment_transactions").insert({
    invoice_id: invoiceId,
    amount: amountToApply,
    payment_type: "credit",
    payment_date: new Date().toISOString().split("T")[0],
    status: "completed",
    notes: `Applied credit ${creditId}`,
    metadata: { credit_id: creditId }
  });

  if (transactionError) {
    throw new Error(`Failed to create payment transaction: ${transactionError.message}`);
  }

  return {
    success: true,
    appliedAmount: amountToApply / 100
  };
}

/**
 * Get available credits for a company
 */
export async function getAvailableCredits(companyId: string): Promise<CompanyCredit[]> {
  const db = createServiceClient();

  const { data: credits } = await db
    .from("company_credits")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "available")
    .gt("amount", 0)
    .order("created_at");

  return (credits || []).map((c: any) => ({
    id: c.id,
    companyId: c.company_id,
    amount: c.amount,
    source: c.source,
    sourceInvoiceId: c.source_invoice_id,
    appliedToInvoiceId: c.applied_to_invoice_id,
    status: c.status,
    expiresAt: c.expires_at,
    createdAt: c.created_at,
    appliedAt: c.applied_at,
    notes: c.notes
  }));
}

/**
 * Auto-apply credits to new invoice
 */
export async function autoApplyCreditsToInvoice(
  invoiceId: string
): Promise<{ totalApplied: number; creditsUsed: number }> {
  const db = createServiceClient();

  // Get invoice
  const { data: invoice } = await db
    .from("invoices")
    .select("company_id, total_cents")
    .eq("id", invoiceId)
    .single();

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  // Get available credits
  const credits = await getAvailableCredits(invoice.company_id);

  let totalApplied = 0;
  let creditsUsed = 0;

  for (const credit of credits) {
    if (totalApplied >= invoice.total_cents) break;

    const result = await applyCreditToInvoice(credit.id, invoiceId);
    totalApplied += result.appliedAmount * 100; // Convert back to cents
    creditsUsed++;
  }

  return {
    totalApplied: totalApplied / 100,
    creditsUsed
  };
}

/**
 * Send payment reminder
 */
export async function sendPaymentReminder(
  invoiceId: string,
  reminderType: "gentle" | "firm" | "final"
): Promise<{ sent: boolean; message: string }> {
  const db = createServiceClient();

  const { data: invoice } = await db
    .from("invoices")
    .select(`
      id,
      invoice_number,
      due_date,
      total_cents,
      amount_paid_cents,
      company:companies(name, contact_email)
    `)
    .eq("id", invoiceId)
    .single();

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  // Supabase returns related objects as arrays, get the first item
  const company = (invoice.company as any)?.[0] || invoice.company;

  const amountDue = (invoice.total_cents - invoice.amount_paid_cents) / 100;
  const daysOverdue = Math.floor(
    (Date.now() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Generate payment link (TODO: Replace with actual payment portal URL)
  const paymentLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.benefitsbuilder.com'}/invoices/${invoiceId}/pay`;

  // Send email via Resend
  let emailResult;
  try {
    emailResult = await sendPaymentReminderEmail(
      reminderType,
      company.contact_email,
      {
        companyName: company.name,
        invoiceNumber: invoice.invoice_number,
        amountDue,
        dueDate: invoice.due_date,
        daysOverdue,
        paymentLink,
      }
    );
  } catch (error) {
    console.error('Failed to send payment reminder:', error);
    throw new Error(`Failed to send payment reminder: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Log the reminder
  await db.from("payment_reminders").insert({
    invoice_id: invoiceId,
    reminder_type: reminderType,
    sent_at: new Date().toISOString(),
    sent_to: invoice.company.contact_email,
    email_id: emailResult.id,
  });

  return {
    sent: emailResult.success,
    message: `${reminderType} reminder sent to ${invoice.company.contact_email}`,
    emailId: emailResult.id,
  };
}
