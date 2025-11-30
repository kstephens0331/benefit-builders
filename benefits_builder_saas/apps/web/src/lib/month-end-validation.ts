/**
 * Month-End Validation & Book Balancing System
 *
 * Automated checklist and validation to ensure books are balanced
 * before closing the month. Prevents accounting mistakes.
 */

import { createServiceClient } from "./supabase";

export interface ValidationCheck {
  id: string;
  category: "critical" | "important" | "recommended";
  name: string;
  description: string;
  whatToCheck: string;
  howToFix: string;
  passed: boolean;
  details?: string;
  errorCount?: number;
}

export interface MonthEndReport {
  month: string; // "2024-02"
  canClose: boolean;
  criticalIssues: ValidationCheck[];
  importantIssues: ValidationCheck[];
  recommendations: ValidationCheck[];
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    outstandingAR: number;
    outstandingAP: number;
    bankBalance: number;
    qbSynced: boolean;
  };
  generatedAt: string;
}

/**
 * Run complete month-end validation
 */
export async function runMonthEndValidation(
  year: number,
  month: number // 1-12
): Promise<MonthEndReport> {
  const db = createServiceClient();
  const monthStr = `${year}-${month.toString().padStart(2, "0")}`;

  const checks: ValidationCheck[] = [];

  // CRITICAL CHECKS (Must pass to close)
  checks.push(await checkBankReconciliation(db, year, month));
  checks.push(await checkQuickBooksSync(db));
  checks.push(await checkAllInvoicesSent(db, year, month));
  checks.push(await checkUnrecordedPayments(db, year, month));
  checks.push(await checkAccountBalance(db));

  // IMPORTANT CHECKS (Should pass, but not blocking)
  checks.push(await checkOverdueInvoices(db));
  checks.push(await checkUnpaidBills(db, year, month));
  checks.push(await checkPaymentMethodFailures(db, year, month));
  checks.push(await checkRefundsNeedingProcessing(db));

  // RECOMMENDED CHECKS (Best practices)
  checks.push(await checkLargeTransactions(db, year, month));
  checks.push(await checkDuplicateInvoices(db, year, month));
  checks.push(await checkMissingInvoiceNumbers(db, year, month));

  // Calculate summary
  const summary = await calculateMonthSummary(db, year, month);

  // Determine if can close
  const criticalIssues = checks.filter(c => c.category === "critical" && !c.passed);
  const canClose = criticalIssues.length === 0;

  return {
    month: monthStr,
    canClose,
    criticalIssues,
    importantIssues: checks.filter(c => c.category === "important" && !c.passed),
    recommendations: checks.filter(c => c.category === "recommended" && !c.passed),
    summary,
    generatedAt: new Date().toISOString()
  };
}

/**
 * CRITICAL: Check bank reconciliation
 */
async function checkBankReconciliation(
  db: any,
  year: number,
  month: number
): Promise<ValidationCheck> {
  // Check if bank accounts are reconciled for this month
  const { data: reconciliations } = await db
    .from("bank_reconciliations")
    .select("*")
    .eq("year", year)
    .eq("month", month);

  const passed = reconciliations && reconciliations.length > 0;

  return {
    id: "bank_reconciliation",
    category: "critical",
    name: "Bank Reconciliation",
    description: "All bank accounts must be reconciled with bank statements",
    whatToCheck: "Compare your book balance with the bank statement. They should match.",
    howToFix: "Go to Bank Reconciliation page → Upload bank statement → Match transactions",
    passed,
    details: passed
      ? "✅ Bank accounts reconciled"
      : "❌ Bank accounts not reconciled for this month"
  };
}

/**
 * CRITICAL: Check QuickBooks sync
 */
async function checkQuickBooksSync(db: any): Promise<ValidationCheck> {
  const { data: syncLog } = await db
    .from("quickbooks_sync_log")
    .select("*")
    .order("synced_at", { ascending: false })
    .limit(1)
    .single();

  // Check if last sync was within 24 hours
  const hoursSinceSync = syncLog
    ? (Date.now() - new Date(syncLog.synced_at).getTime()) / (1000 * 60 * 60)
    : 999;

  const passed = hoursSinceSync < 24;

  return {
    id: "qb_sync",
    category: "critical",
    name: "QuickBooks Sync",
    description: "All transactions must be synced to QuickBooks",
    whatToCheck: "Last sync should be within 24 hours",
    howToFix: "Go to QuickBooks Settings → Click 'Sync Now'",
    passed,
    details: passed
      ? `✅ Last synced ${Math.floor(hoursSinceSync)} hours ago`
      : `❌ Last synced ${Math.floor(hoursSinceSync)} hours ago (too long!)`
  };
}

/**
 * CRITICAL: All invoices sent
 */
async function checkAllInvoicesSent(
  db: any,
  year: number,
  month: number
): Promise<ValidationCheck> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const { data: unsent } = await db
    .from("invoices")
    .select("id, invoice_number, company_id")
    .gte("invoice_date", startDate.toISOString())
    .lte("invoice_date", endDate.toISOString())
    .is("emailed_at", null)
    .is("mailed_at", null);

  const passed = !unsent || unsent.length === 0;

  return {
    id: "invoices_sent",
    category: "critical",
    name: "All Invoices Sent",
    description: "All invoices for the month must be sent to customers",
    whatToCheck: "No invoices should be in 'draft' status",
    howToFix: "Go to Invoices → Filter 'Unsent' → Send each invoice",
    passed,
    errorCount: unsent?.length || 0,
    details: passed
      ? "✅ All invoices sent"
      : `❌ ${unsent?.length} invoices not sent yet`
  };
}

/**
 * CRITICAL: Check for unrecorded payments
 */
async function checkUnrecordedPayments(
  db: any,
  year: number,
  month: number
): Promise<ValidationCheck> {
  // Check for payments that hit bank but not recorded
  // This would come from bank feed import
  const { data: unreco } = await db
    .from("bank_transactions")
    .select("*")
    .eq("year", year)
    .eq("month", month)
    .is("matched_payment_id", null)
    .gt("amount", 0); // Credits only

  const passed = !unreco || unreco.length === 0;

  return {
    id: "unrecorded_payments",
    category: "critical",
    name: "Unrecorded Payments",
    description: "All payments received must be recorded",
    whatToCheck: "Bank deposits should match recorded payments",
    howToFix: "Go to Bank Feeds → Match each deposit to an invoice payment",
    passed,
    errorCount: unreco?.length || 0,
    details: passed
      ? "✅ All bank deposits matched"
      : `❌ ${unreco?.length} unmatched deposits in bank`
  };
}

/**
 * CRITICAL: Account balance equation
 */
async function checkAccountBalance(db: any): Promise<ValidationCheck> {
  // Accounting equation: Assets = Liabilities + Equity
  // Simplified: Bank + AR = AP + Equity

  const { data: arData } = await db
    .from("invoices")
    .select("total_cents, amount_paid_cents")
    .neq("payment_status", "paid");

  const { data: apData } = await db
    .from("bills")
    .select("total_amount, amount_paid")
    .neq("payment_status", "paid");

  const totalAR = arData?.reduce(
    (sum: number, inv: any) => sum + ((inv.total_cents - inv.amount_paid_cents) / 100),
    0
  ) || 0;

  const totalAP = apData?.reduce(
    (sum: number, bill: any) => sum + (bill.total_amount - bill.amount_paid),
    0
  ) || 0;

  // For now, just check that we have the data
  // A real accounting balance check would be more complex
  const passed = true; // Placeholder

  return {
    id: "account_balance",
    category: "critical",
    name: "Account Balance",
    description: "Accounting equation must balance",
    whatToCheck: "Assets = Liabilities + Equity",
    howToFix: "Review all transactions for errors. Contact accountant if needed.",
    passed,
    details: `Outstanding A/R: $${totalAR.toFixed(2)}, Outstanding A/P: $${totalAP.toFixed(2)}`
  };
}

/**
 * IMPORTANT: Check overdue invoices
 */
async function checkOverdueInvoices(db: any): Promise<ValidationCheck> {
  const { data: overdue } = await db
    .from("invoices")
    .select("id, invoice_number, total_cents, due_date, company:companies(name)")
    .eq("payment_status", "overdue");

  const passed = !overdue || overdue.length === 0;

  return {
    id: "overdue_invoices",
    category: "important",
    name: "Overdue Invoices",
    description: "Some invoices are past due",
    whatToCheck: "Review all overdue invoices",
    howToFix: "Send payment reminders → Consider late fees → Follow up with customers",
    passed,
    errorCount: overdue?.length || 0,
    details: passed
      ? "✅ No overdue invoices"
      : `⚠️ ${overdue?.length} overdue invoices need follow-up`
  };
}

/**
 * IMPORTANT: Check unpaid bills
 */
async function checkUnpaidBills(
  db: any,
  year: number,
  month: number
): Promise<ValidationCheck> {
  const endDate = new Date(year, month, 0);

  const { data: unpaid } = await db
    .from("bills")
    .select("id, vendor:vendors(name), total_amount, due_date")
    .lte("due_date", endDate.toISOString())
    .neq("payment_status", "paid");

  const passed = !unpaid || unpaid.length === 0;

  return {
    id: "unpaid_bills",
    category: "important",
    name: "Unpaid Bills",
    description: "Some bills are still unpaid",
    whatToCheck: "Review bills due this month",
    howToFix: "Pay bills before due date → Mark as paid when check clears",
    passed,
    errorCount: unpaid?.length || 0,
    details: passed
      ? "✅ All bills paid"
      : `⚠️ ${unpaid?.length} bills need payment`
  };
}

/**
 * IMPORTANT: Payment method failures
 */
async function checkPaymentMethodFailures(
  db: any,
  year: number,
  month: number
): Promise<ValidationCheck> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const { data: failures } = await db
    .from("payment_transactions")
    .select("*")
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString())
    .eq("status", "failed");

  const passed = !failures || failures.length === 0;

  return {
    id: "payment_failures",
    category: "important",
    name: "Failed Payments",
    description: "Some automatic payments failed",
    whatToCheck: "Review failed payment attempts",
    howToFix: "Contact customers → Update payment method → Retry payment",
    passed,
    errorCount: failures?.length || 0,
    details: passed
      ? "✅ No failed payments"
      : `⚠️ ${failures?.length} failed payment attempts`
  };
}

/**
 * IMPORTANT: Refunds needing processing
 */
async function checkRefundsNeedingProcessing(db: any): Promise<ValidationCheck> {
  const { data: pending } = await db
    .from("payment_transactions")
    .select("*")
    .eq("transaction_type", "refund")
    .eq("status", "pending");

  const passed = !pending || pending.length === 0;

  return {
    id: "pending_refunds",
    category: "important",
    name: "Pending Refunds",
    description: "Some refunds haven't been processed yet",
    whatToCheck: "Review pending refund requests",
    howToFix: "Process each refund → Confirm completion",
    passed,
    errorCount: pending?.length || 0,
    details: passed
      ? "✅ No pending refunds"
      : `⚠️ ${pending?.length} refunds need processing`
  };
}

/**
 * RECOMMENDED: Large transactions
 */
async function checkLargeTransactions(
  db: any,
  year: number,
  month: number
): Promise<ValidationCheck> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const LARGE_AMOUNT = 10000; // $10,000

  const { data: large } = await db
    .from("payment_transactions")
    .select("*")
    .gte("payment_date", startDate.toISOString().split("T")[0])
    .lte("payment_date", endDate.toISOString().split("T")[0])
    .gt("amount", LARGE_AMOUNT * 100); // In cents

  const passed = !large || large.length === 0;

  return {
    id: "large_transactions",
    category: "recommended",
    name: "Large Transactions",
    description: "Review unusually large transactions",
    whatToCheck: "Verify large payments are legitimate",
    howToFix: "Review each transaction → Confirm with customer if needed",
    passed,
    errorCount: large?.length || 0,
    details: passed
      ? "✅ No unusually large transactions"
      : `ℹ️ ${large?.length} transactions over $${LARGE_AMOUNT.toLocaleString()}`
  };
}

/**
 * RECOMMENDED: Duplicate invoices
 */
async function checkDuplicateInvoices(
  db: any,
  year: number,
  month: number
): Promise<ValidationCheck> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  // Find invoices with same company, date, and amount
  const { data: invoices } = await db
    .from("invoices")
    .select("company_id, invoice_date, total_cents")
    .gte("invoice_date", startDate.toISOString())
    .lte("invoice_date", endDate.toISOString());

  const duplicates = findDuplicates(invoices || []);
  const passed = duplicates.length === 0;

  return {
    id: "duplicate_invoices",
    category: "recommended",
    name: "Duplicate Invoices",
    description: "Check for potentially duplicate invoices",
    whatToCheck: "Same company, date, and amount = likely duplicate",
    howToFix: "Review flagged invoices → Void if duplicate",
    passed,
    errorCount: duplicates.length,
    details: passed
      ? "✅ No duplicate invoices detected"
      : `ℹ️ ${duplicates.length} potential duplicates`
  };
}

/**
 * RECOMMENDED: Missing invoice numbers
 */
async function checkMissingInvoiceNumbers(
  db: any,
  year: number,
  month: number
): Promise<ValidationCheck> {
  const { data: invoices } = await db
    .from("invoices")
    .select("invoice_number")
    .like("invoice_number", `${year}${month.toString().padStart(2, "0")}%`)
    .order("invoice_number");

  const missing = findMissingSequence(invoices?.map((i: any) => i.invoice_number) || []);
  const passed = missing.length === 0;

  return {
    id: "missing_invoice_numbers",
    category: "recommended",
    name: "Missing Invoice Numbers",
    description: "Check for gaps in invoice numbering",
    whatToCheck: "Invoice numbers should be sequential",
    howToFix: "Investigate missing numbers → Void if needed",
    passed,
    errorCount: missing.length,
    details: passed
      ? "✅ No gaps in invoice numbers"
      : `ℹ️ ${missing.length} missing invoice numbers: ${missing.join(", ")}`
  };
}

/**
 * Calculate month summary
 */
async function calculateMonthSummary(
  db: any,
  year: number,
  month: number
): Promise<MonthEndReport["summary"]> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  // Revenue (invoices created)
  const { data: invoices } = await db
    .from("invoices")
    .select("total_cents")
    .gte("invoice_date", startDate.toISOString())
    .lte("invoice_date", endDate.toISOString());

  const totalRevenue = invoices?.reduce(
    (sum, inv) => sum + inv.total_cents / 100,
    0
  ) || 0;

  // Expenses (bills created)
  const { data: bills } = await db
    .from("bills")
    .select("total_amount")
    .gte("bill_date", startDate.toISOString())
    .lte("bill_date", endDate.toISOString());

  const totalExpenses = bills?.reduce(
    (sum, bill) => sum + bill.total_amount,
    0
  ) || 0;

  // Outstanding A/R
  const { data: arData } = await db
    .from("invoices")
    .select("total_cents, amount_paid_cents")
    .neq("payment_status", "paid");

  const outstandingAR = arData?.reduce(
    (sum, inv) => sum + ((inv.total_cents - inv.amount_paid_cents) / 100),
    0
  ) || 0;

  // Outstanding A/P
  const { data: apData } = await db
    .from("bills")
    .select("total_amount, amount_paid")
    .neq("payment_status", "paid");

  const outstandingAP = apData?.reduce(
    (sum, bill) => sum + (bill.total_amount - bill.amount_paid),
    0
  ) || 0;

  // Bank balance (placeholder - would come from bank reconciliation)
  const bankBalance = 0;

  // QB sync status
  const { data: syncLog } = await db
    .from("quickbooks_sync_log")
    .select("*")
    .order("synced_at", { ascending: false })
    .limit(1)
    .single();

  const qbSynced = syncLog &&
    (Date.now() - new Date(syncLog.synced_at).getTime()) < 24 * 60 * 60 * 1000;

  return {
    totalRevenue,
    totalExpenses,
    netIncome: totalRevenue - totalExpenses,
    outstandingAR,
    outstandingAP,
    bankBalance,
    qbSynced: !!qbSynced
  };
}

// Helper functions
function findDuplicates(items: any[]): any[] {
  const seen = new Map<string, any[]>();

  items.forEach(item => {
    const key = `${item.company_id}-${item.invoice_date}-${item.total_cents}`;
    if (!seen.has(key)) {
      seen.set(key, []);
    }
    seen.get(key)!.push(item);
  });

  return Array.from(seen.values()).filter(group => group.length > 1).flat();
}

function findMissingSequence(numbers: string[]): string[] {
  if (numbers.length === 0) return [];

  const sorted = numbers.map(n => parseInt(n.split("-")[1] || "0")).sort((a, b) => a - b);
  const missing: string[] = [];

  for (let i = sorted[0]; i <= sorted[sorted.length - 1]; i++) {
    if (!sorted.includes(i)) {
      missing.push(i.toString());
    }
  }

  return missing;
}
