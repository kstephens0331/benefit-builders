/**
 * Accounting Guidance System
 *
 * Provides plain English explanations and warnings for all accounting actions.
 * Helps non-accountants understand what they're doing before making changes.
 */

export interface ActionGuidance {
  action: string;
  plainEnglish: string;
  whatItDoes: string;
  whenToUse: string;
  warnings: string[];
  example: string;
  reversible: boolean;
  impactAreas: string[];
  requiresApproval?: boolean;
}

/**
 * Complete guide for all accounting actions
 */
export const ACCOUNTING_ACTIONS: Record<string, ActionGuidance> = {
  // CUSTOMER ACTIONS
  create_customer: {
    action: "Create Customer",
    plainEnglish: "Add a new company to your client list",
    whatItDoes: "Creates a new customer record in QuickBooks so you can send them invoices",
    whenToUse: "When you sign up a new company for your benefits program",
    warnings: [
      "Make sure the company doesn't already exist to avoid duplicates",
      "Double-check the company name spelling - it's hard to change later"
    ],
    example: "Creating 'Acme Corporation' will let you bill them monthly for employee benefits",
    reversible: true,
    impactAreas: ["Customer List", "QuickBooks"],
    requiresApproval: false
  },

  update_customer: {
    action: "Update Customer",
    plainEnglish: "Change a company's contact information",
    whatItDoes: "Updates email, phone, or address for an existing customer",
    whenToUse: "When a company's contact person changes or they move offices",
    warnings: [
      "Changes sync to QuickBooks immediately",
      "This won't affect past invoices, only future ones"
    ],
    example: "Updating email from old-contact@company.com to new-contact@company.com",
    reversible: true,
    impactAreas: ["Customer List", "QuickBooks", "Future Invoices"],
    requiresApproval: false
  },

  // INVOICE ACTIONS
  create_invoice: {
    action: "Create Invoice",
    plainEnglish: "Bill a company for this month's services",
    whatItDoes: "Creates a bill that will be sent to the company for payment",
    whenToUse: "At the start of each month to bill for the previous month's benefits",
    warnings: [
      "Double-check employee count and amounts before creating",
      "Invoice will sync to QuickBooks and show up in their accounting",
      "Once sent, you can only void it (not delete)"
    ],
    example: "Creating February 2024 invoice for $5,000 (50 employees × $100/each)",
    reversible: false, // Can void, but not delete
    impactAreas: ["Accounts Receivable", "QuickBooks", "Customer Portal"],
    requiresApproval: false
  },

  send_invoice: {
    action: "Send Invoice",
    plainEnglish: "Email the bill to the company",
    whatItDoes: "Sends a professional PDF invoice to the company's billing contact",
    whenToUse: "After creating an invoice and confirming all details are correct",
    warnings: [
      "Company will receive this immediately - make sure everything is correct",
      "Invoice will also appear in QuickBooks",
      "Company can pay online via credit card or ACH"
    ],
    example: "Sending invoice #1234 to billing@acmecorp.com",
    reversible: false, // Can't unsend
    impactAreas: ["Email", "Customer Notification", "Payment Timeline"],
    requiresApproval: false
  },

  void_invoice: {
    action: "Void Invoice",
    plainEnglish: "Cancel this bill (mark it as 'never happened')",
    whatItDoes: "Cancels an invoice completely - it won't be counted in reports",
    whenToUse: "When you created an invoice by mistake or billed the wrong amount",
    warnings: [
      "⚠️ This is permanent and can't be undone",
      "⚠️ Company will see 'VOID' on the invoice if they already received it",
      "⚠️ Creates an accounting record of the void in QuickBooks",
      "⚠️ If already paid, you must issue a refund separately"
    ],
    example: "Voiding invoice #1234 because you billed wrong company",
    reversible: false,
    impactAreas: ["Accounts Receivable", "QuickBooks", "Financial Reports"],
    requiresApproval: true // Big deal!
  },

  // PAYMENT ACTIONS
  record_payment: {
    action: "Record Payment",
    plainEnglish: "Mark that a company paid their bill",
    whatItDoes: "Records that money was received for an invoice",
    whenToUse: "When you receive payment via check, ACH, or credit card",
    warnings: [
      "Make sure the amount matches what you actually received",
      "Syncs to QuickBooks and reduces accounts receivable",
      "If recording a check, make sure it clears before closing the month"
    ],
    example: "Recording $5,000 payment via check #1234 for invoice #5678",
    reversible: true, // Can delete payment if needed
    impactAreas: ["Cash/Bank Account", "Accounts Receivable", "QuickBooks"],
    requiresApproval: false
  },

  process_refund: {
    action: "Issue Refund",
    plainEnglish: "Give money back to a company",
    whatItDoes: "Returns money to the customer (reverses a payment)",
    whenToUse: "When you overcharged or need to return a payment",
    warnings: [
      "⚠️ Money will leave your bank account",
      "⚠️ Creates a credit memo in QuickBooks",
      "⚠️ If using credit card, expect 2-3% processing fee loss",
      "⚠️ Document the reason for the refund"
    ],
    example: "Refunding $500 overpayment to Acme Corp via original payment method",
    reversible: false, // Can't un-refund
    impactAreas: ["Bank Account", "Accounts Receivable", "QuickBooks"],
    requiresApproval: true
  },

  // VENDOR/BILL ACTIONS
  create_vendor: {
    action: "Create Vendor",
    plainEnglish: "Add a company you pay money to",
    whatItDoes: "Creates a vendor record for tracking bills you need to pay",
    whenToUse: "When you start working with a new supplier or service provider",
    warnings: [
      "Check for duplicates before creating",
      "Make sure W-9 is on file for tax purposes"
    ],
    example: "Creating 'Office Supply Co.' as a vendor to track supply purchases",
    reversible: true,
    impactAreas: ["Vendor List", "QuickBooks"],
    requiresApproval: false
  },

  create_bill: {
    action: "Create Bill",
    plainEnglish: "Record money you owe to a vendor",
    whatItDoes: "Creates a bill that you need to pay (increases accounts payable)",
    whenToUse: "When you receive an invoice from a vendor",
    warnings: [
      "This increases your accounts payable (money you owe)",
      "Make sure to set the correct due date",
      "Syncs to QuickBooks immediately"
    ],
    example: "Creating $1,000 bill from Office Supply Co. due March 31st",
    reversible: true, // Can delete if not paid
    impactAreas: ["Accounts Payable", "QuickBooks", "Cash Flow"],
    requiresApproval: false
  },

  pay_bill: {
    action: "Pay Bill",
    plainEnglish: "Send payment to a vendor",
    whatItDoes: "Records that you paid a bill (money leaves your bank account)",
    whenToUse: "When you write a check or send payment to a vendor",
    warnings: [
      "⚠️ Reduces your bank account balance",
      "⚠️ Make sure you have enough money in the account",
      "⚠️ Syncs to QuickBooks and reduces accounts payable",
      "If paying by check, make sure check number is correct"
    ],
    example: "Paying $1,000 bill to Office Supply Co. via check #5678",
    reversible: true, // Can void payment if needed
    impactAreas: ["Bank Account", "Accounts Payable", "QuickBooks"],
    requiresApproval: false
  },

  // ESTIMATE/QUOTE ACTIONS
  create_estimate: {
    action: "Create Estimate",
    plainEnglish: "Send a quote/proposal to a potential customer",
    whatItDoes: "Creates a proposal showing what you'll charge (not a bill yet)",
    whenToUse: "When a company asks 'how much will this cost?'",
    warnings: [
      "This is NOT an invoice - no money is owed yet",
      "Company can accept or decline",
      "Can convert to invoice once accepted"
    ],
    example: "Estimate showing $5,000/month for 50 employees' benefits",
    reversible: true,
    impactAreas: ["Sales Pipeline", "QuickBooks"],
    requiresApproval: false
  },

  convert_estimate_to_invoice: {
    action: "Convert Estimate to Invoice",
    plainEnglish: "Turn a quote into an actual bill",
    whatItDoes: "Takes an accepted estimate and creates a real invoice from it",
    whenToUse: "After the company accepts your estimate and you start services",
    warnings: [
      "This creates a real invoice that company must pay",
      "Original estimate will be marked 'Converted'",
      "Can't convert back - invoice must be voided if needed"
    ],
    example: "Converting accepted estimate #1234 to invoice #5678",
    reversible: false,
    impactAreas: ["Accounts Receivable", "Sales Pipeline", "QuickBooks"],
    requiresApproval: false
  },

  // MONTH-END ACTIONS
  close_month: {
    action: "Close Month",
    plainEnglish: "Lock the books for last month",
    whatItDoes: "Prevents changes to last month's transactions (makes them final)",
    whenToUse: "After reviewing all transactions and confirming everything is correct",
    warnings: [
      "⚠️⚠️ THIS IS PERMANENT - Can't undo without accountant approval",
      "⚠️ Run month-end checklist FIRST",
      "⚠️ All transactions must be reconciled",
      "⚠️ Bank accounts must be balanced",
      "⚠️ QuickBooks must be synced"
    ],
    example: "Closing February 2024 - all Feb transactions become locked",
    reversible: false, // Requires accountant
    impactAreas: ["All Financial Data", "QuickBooks", "Tax Records"],
    requiresApproval: true
  },

  reconcile_bank: {
    action: "Reconcile Bank Account",
    plainEnglish: "Match your records with the bank statement",
    whatItDoes: "Confirms that your books match what the bank shows",
    whenToUse: "Monthly, when you receive your bank statement",
    warnings: [
      "Must be done before closing the month",
      "Any differences must be investigated",
      "Missing transactions can indicate fraud or errors"
    ],
    example: "Reconciling checking account - your books show $50,000, bank shows $50,000 ✓",
    reversible: true, // Can un-reconcile if needed
    impactAreas: ["Bank Accounts", "Financial Accuracy"],
    requiresApproval: false
  }
};

/**
 * Get guidance for an action
 */
export function getActionGuidance(action: string): ActionGuidance | null {
  return ACCOUNTING_ACTIONS[action] || null;
}

/**
 * Format guidance for display
 */
export function formatGuidanceText(guidance: ActionGuidance): string {
  return `
📋 ${guidance.action}

What this means in plain English:
${guidance.plainEnglish}

What it does:
${guidance.whatItDoes}

When to use it:
${guidance.whenToUse}

Example:
${guidance.example}

⚠️ Important warnings:
${guidance.warnings.map(w => `• ${w}`).join('\n')}

${guidance.reversible ? '✅ This can be reversed if needed' : '⛔ This CANNOT be undone'}

This will affect:
${guidance.impactAreas.map(area => `• ${area}`).join('\n')}
  `.trim();
}

/**
 * Check if action requires approval
 */
export function requiresApproval(action: string): boolean {
  const guidance = ACCOUNTING_ACTIONS[action];
  return guidance?.requiresApproval || false;
}

/**
 * Get all high-risk actions
 */
export function getHighRiskActions(): ActionGuidance[] {
  return Object.values(ACCOUNTING_ACTIONS).filter(
    g => g.requiresApproval || !g.reversible
  );
}
