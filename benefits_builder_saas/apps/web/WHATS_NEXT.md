# What's Next: Implementation Roadmap

## ✅ What We Have (Complete)

### Database & Backend Infrastructure
- ✅ **Database Tables** - All 17 tables created via migrations
- ✅ **QuickBooks Library** - Full integration with all QB features (1,344 lines)
- ✅ **Payment Alerts System** - Late, underpaid, overpaid detection
- ✅ **Month-End Validation** - 12-check system before closing books
- ✅ **Accounting Guidance** - Plain English explanations for all actions
- ✅ **Credit Management** - Auto-apply overpayments to next invoice
- ✅ **Audit Trail** - Complete logging of all accounting actions
- ✅ **Database Triggers** - Auto-credit application, closed month protection

### API Routes (Existing)
- ✅ `/api/accounting/quickbooks/*` - All QB operations
- ✅ `/api/accounting/ar` - Accounts receivable
- ✅ `/api/accounting/ap` - Accounts payable
- ✅ `/api/accounting/payments` - Payment tracking
- ✅ `/api/invoices` - Invoice management
- ✅ `/api/companies` - Company CRUD

### Documentation
- ✅ **ACCOUNTING_SAFETY_GUIDE.md** - 60+ page guide for non-accountants
- ✅ **QUICKBOOKS_INTEGRATION.md** - Complete QB integration docs
- ✅ **INVOICING_PAYMENT_SYSTEM.md** - Invoice & payment guide
- ✅ **MIGRATION_INSTRUCTIONS.md** - How to run migrations

---

## 🚧 What Needs to Be Built

### 1. API Routes for New Features (HIGH PRIORITY)

#### Payment Alerts API
```
📁 src/app/api/accounting/alerts/
├── route.ts          GET  - List all active alerts
├── [id]/route.ts     GET  - Get specific alert
│                     PATCH - Acknowledge/resolve alert
└── remind/route.ts   POST - Send payment reminder
```

**What it does:**
- Fetch late/underpaid/overpaid alerts
- Mark alerts as acknowledged/resolved
- Trigger payment reminder emails (gentle/firm/final)

#### Credits API
```
📁 src/app/api/accounting/credits/
├── route.ts              GET  - List available credits by company
│                         POST - Create credit from overpayment
├── [id]/route.ts         GET  - Get credit details
│                         DELETE - Remove unused credit
└── [id]/apply/route.ts   POST - Manually apply credit to invoice
```

**What it does:**
- View customer credits
- Create credits from overpayments
- Apply credits to specific invoices
- Track credit history

#### Month-End Closing API
```
📁 src/app/api/accounting/month-end/
├── validate/route.ts     POST - Run 12-check validation for a month
├── close/route.ts        POST - Close a month (lock transactions)
├── history/route.ts      GET  - View closed months history
└── reopen/route.ts       POST - Reopen closed month (requires approval)
```

**What it does:**
- Run validation before closing
- Close months and lock transactions
- View closing history
- Reopen months with accountant approval

#### Bank Reconciliation API
```
📁 src/app/api/accounting/reconciliation/
├── route.ts              GET  - List reconciliations
│                         POST - Create new reconciliation
├── [id]/route.ts         GET  - Get reconciliation details
│                         PATCH - Update reconciliation
└── transactions/route.ts GET  - Unmatched bank transactions
                          POST - Match transaction to payment
```

**What it does:**
- Import bank transactions (CSV/API)
- Match bank transactions to payments
- Track reconciliation status
- Calculate differences

#### Recurring Invoices API
```
📁 src/app/api/invoices/recurring/
├── route.ts          GET  - List recurring invoice templates
│                     POST - Create recurring invoice template
├── [id]/route.ts     GET  - Get template details
│                     PATCH - Update template
│                     DELETE - Delete template
└── generate/route.ts POST - Manually trigger invoice generation
```

**What it does:**
- Set up monthly recurring invoices
- Auto-generate invoices on schedule
- Update recurring templates
- Track generation history

#### Payment Processing API
```
📁 src/app/api/payments/
├── processors/route.ts       GET  - List payment processors (Stripe, Plaid)
│                             POST - Configure processor
├── methods/route.ts          GET  - List saved payment methods
│                             POST - Add new payment method (card/ACH)
├── charge/route.ts           POST - Process payment
└── refund/route.ts           POST - Issue refund
```

**What it does:**
- Configure Stripe/Plaid integration
- Save customer payment methods
- Process ACH and credit card payments
- Handle refunds

---

### 2. UI Pages (HIGH PRIORITY)

#### Accounting Dashboard
```
📁 src/app/accounting/
└── page.tsx
```

**What to show:**
- 🚨 **Active Alerts** (late payments, underpayments, failed charges)
- 💰 **Financial Summary** (A/R, A/P, cash balance)
- 📊 **Quick Stats** (outstanding invoices, overdue count, credits available)
- ⚠️ **Month-End Status** (ready to close? validation results)
- 📅 **Recent Activity** (last 10 transactions)

#### Payment Alerts Page
```
📁 src/app/accounting/alerts/
└── page.tsx
```

**Features:**
- List all active alerts (filterable by type/severity)
- Send payment reminders (gentle/firm/final)
- Acknowledge/resolve alerts
- View alert history

#### Credits Management Page
```
📁 src/app/accounting/credits/
└── page.tsx
```

**Features:**
- View all customer credits
- Create credit from overpayment
- Apply credit to invoice
- Credit expiration tracking

#### Month-End Closing Page
```
📁 src/app/accounting/month-end/
├── page.tsx              List closed months
└── [year]/[month]/
    └── page.tsx          Closing workflow for specific month
```

**Features:**
- Run validation checklist (12 checks)
- View issues blocking close
- Close month with confirmation
- View closed month reports
- Reopen month (with approval)

#### Bank Reconciliation Page
```
📁 src/app/accounting/reconciliation/
├── page.tsx              List of reconciliations
└── [id]/page.tsx         Reconciliation workflow
```

**Features:**
- Upload bank statement (CSV/PDF)
- Match transactions automatically
- Manual transaction matching
- Mark reconciliation complete
- View difference report

#### Recurring Invoices Page
```
📁 src/app/invoices/recurring/
├── page.tsx              List recurring templates
└── [id]/page.tsx         Edit template
```

**Features:**
- Create monthly recurring invoice
- Set frequency (weekly/monthly/quarterly)
- Auto-send on/off
- Auto-charge on/off
- View generation history

#### Invoice Detail Enhancements
```
📁 src/app/invoices/[id]/
└── page.tsx (ENHANCE)
```

**Add:**
- Show applied credits as line items
- Payment reminder button (gentle/firm/final)
- Delivery tracking (emailed, opened, clicked)
- Payment method selector
- Refund button (high-risk with approval)

---

### 3. Components to Build (MEDIUM PRIORITY)

#### Alert Components
```tsx
<AlertBadge type="late" severity="critical" />
<AlertCard alert={alert} onResolve={handleResolve} />
<PaymentReminderModal invoice={invoice} onSend={sendReminder} />
```

#### Credit Components
```tsx
<CreditBalance companyId={id} />
<CreditHistory companyId={id} />
<ApplyCreditModal credit={credit} invoice={invoice} />
```

#### Month-End Components
```tsx
<ValidationChecklist results={validation} />
<CloseMonthModal month={month} year={year} onClose={handleClose} />
<ClosedMonthBadge />
```

#### Reconciliation Components
```tsx
<BankTransactionList transactions={unmatched} />
<TransactionMatcher bankTxn={txn} payments={possible} />
<ReconciliationSummary reconciliation={data} />
```

#### Approval Components
```tsx
<HighRiskActionModal
  action="void_invoice"
  guidance={guidanceData}
  onConfirm={handleVoid}
/>
<ApprovalRequired
  action="close_month"
  requiresText="CLOSE FEBRUARY 2024"
/>
```

---

### 4. Email Notifications (MEDIUM PRIORITY)

#### Payment Reminder Emails
- **Gentle reminder** (1-30 days late)
- **Firm reminder** (31-60 days late)
- **Final notice** (60+ days late)

**Implementation:**
- Use Resend or Nodemailer
- Templates in `/emails/payment-reminders/`
- Track opens/clicks (webhook)

#### Invoice Delivery Emails
- **New invoice notification**
- **Payment received confirmation**
- **Credit applied notification**

#### Month-End Notifications
- **Ready to close** email to admin
- **Critical issues** alert
- **Month closed** confirmation

---

### 5. Payment Processing Integration (HIGH PRIORITY)

#### Stripe Integration
```
📁 src/lib/stripe.ts
```

**Features:**
- Create payment intents
- Save payment methods (cards)
- Process charges
- Handle webhooks (payment success/failure)
- Issue refunds

#### Plaid Integration
```
📁 src/lib/plaid.ts
```

**Features:**
- Link bank accounts
- Verify ACH details
- Initiate ACH payments
- Handle webhooks (ACH status updates)

#### Payment Method UI
```
📁 src/app/companies/[id]/payment-methods/
└── page.tsx
```

**Features:**
- Add credit card (Stripe)
- Add bank account (Plaid)
- Set default payment method
- Remove payment method
- Auto-charge toggle

---

### 6. Reporting Enhancements (LOW PRIORITY)

#### New Reports to Add
- **Accounts Receivable Aging** (show in UI)
- **Accounts Payable Aging** (show in UI)
- **Cash Flow Report** (integrate from QB)
- **Credit Usage Report** (credits applied by month)
- **Payment Alert Report** (alert history/trends)

#### Export Features
- Export to Excel (all reports)
- Schedule monthly email reports
- PDF generation for accounting

---

### 7. Mobile Responsiveness (LOW PRIORITY)

Ensure all new pages work on mobile:
- Accounting dashboard
- Alerts list
- Month-end closing
- Invoice management

---

## 📋 Recommended Implementation Order

### Phase 1: Core Functionality (Week 1)
1. ✅ Payment Alerts API
2. ✅ Credits API
3. ✅ Accounting Dashboard UI
4. ✅ Alerts Page UI
5. ✅ Credits Page UI

### Phase 2: Month-End & Reconciliation (Week 2)
1. ✅ Month-End API
2. ✅ Bank Reconciliation API
3. ✅ Month-End Closing UI
4. ✅ Reconciliation UI

### Phase 3: Invoicing & Payments (Week 3)
1. ✅ Recurring Invoices API
2. ✅ Stripe Integration
3. ✅ Plaid Integration
4. ✅ Payment Processing UI
5. ✅ Recurring Invoices UI

### Phase 4: Polish & Extras (Week 4)
1. ✅ Email notifications
2. ✅ Reporting enhancements
3. ✅ Mobile responsiveness
4. ✅ Testing & QA

---

## 🎯 Quick Wins (Do These First!)

1. **Accounting Dashboard** - Shows alerts, gives overview
2. **Payment Alerts API + UI** - Immediate value for tracking late payments
3. **Credits API + UI** - Auto-applying credits saves manual work
4. **Invoice Enhancements** - Show credits, add reminder button

These 4 items give you immediate usable functionality!

---

## 💡 Questions to Answer

1. **Payment Processing:**
   - Do you already have Stripe/Plaid accounts set up?
   - Which payment methods do you want to support first? (ACH? Cards? Both?)
   - Do you want auto-charging for recurring invoices?

2. **Email Notifications:**
   - Do you have Resend set up? (or prefer Nodemailer with SMTP?)
   - What email address should reminders come from?
   - Do you want to customize reminder templates?

3. **Bank Reconciliation:**
   - Do you manually download bank statements or use Plaid API?
   - How often do you reconcile? (monthly? weekly?)
   - Do you need multi-bank account support?

4. **Month-End Process:**
   - Who should be able to close months? (admin only? accounting role?)
   - Do you want email notifications when ready to close?
   - Should closed months require two-person approval?

---

## 🚀 Next Steps

Based on your priorities, I recommend starting with:

1. **Build Accounting Dashboard** - Central hub for all accounting features
2. **Payment Alerts System** - Most urgent for cash flow
3. **Credits Management** - Automates overpayment handling

Would you like me to start with any of these? Or do you have different priorities?
