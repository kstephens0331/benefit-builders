# Comprehensive Invoicing & Payment Processing System

Complete invoice management and payment processing system for Benefits Builder SaaS with support for ACH, credit cards, and paper checks.

## 🎯 Overview

This system provides Bill with a complete invoicing and payment management solution that includes:

1. **Invoice Management** - Create, edit, send invoices monthly
2. **PDF Generation** - Professional PDF invoices with branding
3. **Multi-Channel Delivery** - Email, postal mail, and customer portal
4. **Payment Processing** - ACH, credit cards, and check tracking
5. **QuickBooks Integration** - Automatic sync with QuickBooks Online
6. **Recurring Billing** - Automated monthly invoicing per company
7. **Payment Tracking** - Real-time payment status and reconciliation

---

## 📋 Features

### Invoice Management

#### Create & Edit Invoices
- **Line items** with descriptions, quantities, rates
- **Automatic calculations** for subtotals, tax, total
- **Payment terms** (net 30, net 60, etc.)
- **Late fees** with automatic calculation
- **Custom notes** and memos
- **QuickBooks sync** status tracking

#### Invoice Delivery
- **Email delivery** with PDF attachment
- **Postal mail** with tracking numbers
- **Customer portal** access with secure links
- **Delivery tracking** - opened, viewed, clicked
- **Batch sending** for monthly billing runs

#### PDF Generation
- **Professional templates** with company branding
- **Custom headers/footers** with logo
- **Payment instructions** for each method
- **QR codes** for online payment
- **Print-ready** format for mailing

### Payment Processing

#### Supported Payment Methods

**1. ACH (Bank Transfer)**
- Direct bank account debits
- Lower fees than credit cards (~0.8%)
- 2-3 business day processing
- Automatic retry on failures
- Plaid for bank verification

**2. Credit Cards**
- Visa, Mastercard, Amex, Discover
- 2.9% + 30¢ standard rate
- Instant processing
- PCI-compliant via Stripe
- Saved card tokens

**3. Paper Checks**
- Manual entry and tracking
- Check number reference
- Deposit confirmation
- Reconciliation with bank statements

#### Payment Features

- **Save payment methods** - Customers can save cards/ACH for future use
- **Auto-charge** - Automatic charging on invoice due date
- **Payment plans** - Split payments over time
- **Partial payments** - Accept any amount
- **Refunds** - Full or partial refunds via original method
- **Dispute handling** - Automatic notifications
- **Payment receipts** - Email confirmations

### Recurring Billing

#### Monthly Invoicing Automation
- **Scheduled generation** - Auto-create invoices on specific dates
- **Template-based** - Consistent line items each month
- **Variable amounts** - Update per employee count
- **Auto-send** - Email/mail automatically
- **Auto-charge** - Charge saved payment methods
- **Notification preferences** - Customize per company

#### Billing Schedule
```typescript
{
  frequency: "monthly",
  start_date: "2024-01-01",
  next_invoice_date: "2024-02-01",
  delivery_method: "email",
  auto_send: true,
  auto_charge: true,
  payment_method_id: "pm_xxx"
}
```

---

## 🗄️ Database Schema

### Core Tables

#### `invoices`
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  invoice_number TEXT UNIQUE,
  invoice_date DATE,
  due_date DATE,

  -- Amounts (in cents)
  subtotal_cents INTEGER,
  tax_cents INTEGER,
  total_cents INTEGER,
  amount_paid_cents INTEGER,

  -- Delivery
  delivery_method TEXT, -- email, mail, both, portal
  emailed_at TIMESTAMPTZ,
  mailed_at TIMESTAMPTZ,
  last_viewed_at TIMESTAMPTZ,
  view_count INTEGER,

  -- Payment
  payment_status TEXT, -- unpaid, partial, paid, overdue
  payment_terms_days INTEGER DEFAULT 30,
  late_fee_enabled BOOLEAN,
  late_fee_percentage DECIMAL(5,2),

  -- PDF
  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,

  -- QuickBooks
  qb_invoice_id TEXT,
  qb_synced_at TIMESTAMPTZ,
  qb_sync_status TEXT,

  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### `customer_payment_methods`
```sql
CREATE TABLE customer_payment_methods (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  processor_id UUID REFERENCES payment_processors(id),

  payment_type TEXT, -- card, ach, check

  -- Card details (last 4 only)
  card_last_four TEXT,
  card_brand TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,

  -- ACH details (last 4 only)
  account_last_four TEXT,
  account_type TEXT, -- checking, savings
  bank_name TEXT,
  routing_number_last_four TEXT,

  -- Processor tokens
  processor_customer_id TEXT,
  processor_payment_method_id TEXT,

  is_default BOOLEAN,
  is_verified BOOLEAN,
  is_active BOOLEAN,

  created_at TIMESTAMPTZ
);
```

#### `payment_transactions`
```sql
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id),

  payment_date DATE,
  amount INTEGER, -- in cents
  payment_type TEXT, -- card, ach, check, wire, cash

  -- Processor details
  processor_id UUID,
  processor_transaction_id TEXT,
  processor_fee_cents INTEGER,

  status TEXT, -- pending, processing, completed, failed, refunded
  failure_reason TEXT,

  -- Check details
  check_number TEXT,

  metadata JSONB,
  created_at TIMESTAMPTZ
);
```

#### `recurring_invoices`
```sql
CREATE TABLE recurring_invoices (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),

  frequency TEXT, -- weekly, monthly, quarterly
  start_date DATE,
  next_invoice_date DATE,

  invoice_template JSONB, -- Line items, amounts
  delivery_method TEXT,
  auto_send BOOLEAN,
  auto_charge BOOLEAN,
  payment_method_id UUID,

  is_active BOOLEAN,
  created_at TIMESTAMPTZ
);
```

---

## 🔌 Payment Processor Integration

### Recommended Processors

#### For ACH + Credit Cards: **Stripe**
- **Pros**: Single integration, competitive rates, excellent docs
- **Rates**:
  - Cards: 2.9% + 30¢
  - ACH: 0.8% capped at $5
- **Setup**:
  ```bash
  npm install stripe
  ```

#### For ACH Only: **Plaid** (for verification)
- **Pros**: Bank verification, instant microdeposits
- **Use**: Verify bank accounts before charging
- **Setup**:
  ```bash
  npm install react-plaid-link
  ```

### Payment Flow

#### Credit Card Payment
```
1. Customer adds card → Stripe creates PaymentMethod
2. Save token to customer_payment_methods table
3. Invoice due → Create PaymentIntent via Stripe
4. Process payment → Update payment_transactions
5. Sync to QuickBooks → Record in QB
6. Email receipt → Send confirmation
```

#### ACH Payment
```
1. Customer connects bank → Plaid verification
2. Save bank details → Stripe ACH PaymentMethod
3. Micro-deposits → Verify account (2-3 days)
4. Invoice due → Create ACH PaymentIntent
5. Process (2-3 days) → Update status
6. Confirmed → Update payment_transactions
7. Sync to QuickBooks → Record in QB
```

#### Check Payment
```
1. Customer mails check → Manual entry
2. Record check # → payment_transactions
3. Deposit confirmed → Mark as completed
4. Sync to QuickBooks → Record in QB
```

---

## 🚀 Implementation Guide

### Step 1: Set Up Payment Processors

**Stripe Setup**:
```typescript
// src/lib/stripe.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Create customer
export async function createStripeCustomer(company: {
  id: string;
  name: string;
  email: string;
}) {
  return await stripe.customers.create({
    email: company.email,
    name: company.name,
    metadata: {
      company_id: company.id,
    },
  });
}

// Save payment method
export async function savePaymentMethod(
  customerId: string,
  paymentMethodId: string
) {
  return await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });
}

// Charge payment method
export async function chargePaymentMethod(params: {
  amount: number; // in cents
  customerId: string;
  paymentMethodId: string;
  invoiceId: string;
}) {
  return await stripe.paymentIntents.create({
    amount: params.amount,
    currency: 'usd',
    customer: params.customerId,
    payment_method: params.paymentMethodId,
    confirm: true,
    metadata: {
      invoice_id: params.invoiceId,
    },
  });
}
```

### Step 2: Create Invoice API Routes

**Generate Monthly Invoices**:
```typescript
// src/app/api/invoices/generate-monthly/route.ts
export async function POST(request: Request) {
  const { company_id } = await request.json();

  // Get company details
  const company = await getCompany(company_id);

  // Get employees for this billing period
  const employees = await getActiveEmployees(company_id);

  // Calculate line items
  const lineItems = calculateBenefitsCharges(employees);

  // Create invoice
  const invoice = await createInvoice({
    company_id,
    invoice_date: new Date(),
    due_date: addDays(new Date(), 30),
    line_items: lineItems,
    delivery_method: company.preferred_delivery,
  });

  // Generate PDF
  await generateInvoicePDF(invoice.id);

  // Send via email/mail
  if (company.auto_send) {
    await sendInvoice(invoice.id);
  }

  // Auto-charge if enabled
  if (company.auto_charge && company.default_payment_method) {
    await processPayment(invoice.id, company.default_payment_method);
  }

  return NextResponse.json({ success: true, invoice });
}
```

### Step 3: PDF Generation

**Using React-PDF**:
```typescript
// src/lib/pdf/invoice-pdf.tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

export function InvoicePDF({ invoice }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.companyName}>Benefits Builder</Text>
          <Text style={styles.invoiceTitle}>INVOICE</Text>
        </View>

        {/* Bill To */}
        <View style={styles.billTo}>
          <Text style={styles.label}>Bill To:</Text>
          <Text>{invoice.company.name}</Text>
          <Text>{invoice.company.address}</Text>
        </View>

        {/* Invoice Details */}
        <View style={styles.details}>
          <Text>Invoice #: {invoice.invoice_number}</Text>
          <Text>Date: {formatDate(invoice.invoice_date)}</Text>
          <Text>Due Date: {formatDate(invoice.due_date)}</Text>
        </View>

        {/* Line Items */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Description</Text>
            <Text style={styles.col2}>Qty</Text>
            <Text style={styles.col3}>Rate</Text>
            <Text style={styles.col4}>Amount</Text>
          </View>

          {invoice.line_items.map((item) => (
            <View style={styles.tableRow} key={item.id}>
              <Text style={styles.col1}>{item.description}</Text>
              <Text style={styles.col2}>{item.quantity}</Text>
              <Text style={styles.col3}>{formatCurrency(item.rate)}</Text>
              <Text style={styles.col4}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <Text>Subtotal: {formatCurrency(invoice.subtotal)}</Text>
          <Text>Tax: {formatCurrency(invoice.tax)}</Text>
          <Text style={styles.grandTotal}>
            Total: {formatCurrency(invoice.total)}
          </Text>
        </View>

        {/* Payment Instructions */}
        <View style={styles.paymentInfo}>
          <Text style={styles.label}>Payment Options:</Text>
          <Text>• Online: https://app.benefitsbuilder.com/pay/{invoice.id}</Text>
          <Text>• ACH/Check: Bank details on file</Text>
          <Text>• Credit Card: Save 15% by paying via ACH</Text>
        </View>
      </Page>
    </Document>
  );
}
```

### Step 4: Email Delivery

**Using Resend**:
```typescript
// src/lib/email/send-invoice.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendInvoiceEmail(invoice: Invoice) {
  // Generate PDF
  const pdfBuffer = await generatePDFBuffer(invoice);

  // Send email
  await resend.emails.send({
    from: 'billing@benefitsbuilder.com',
    to: invoice.company.contact_email,
    subject: `Invoice ${invoice.invoice_number} from Benefits Builder`,
    html: `
      <h2>New Invoice from Benefits Builder</h2>
      <p>Dear ${invoice.company.name},</p>
      <p>Your invoice for ${formatMonth(invoice.invoice_date)} is attached.</p>

      <h3>Invoice Summary</h3>
      <ul>
        <li>Invoice #: ${invoice.invoice_number}</li>
        <li>Amount Due: ${formatCurrency(invoice.total)}</li>
        <li>Due Date: ${formatDate(invoice.due_date)}</li>
      </ul>

      <p>
        <a href="https://app.benefitsbuilder.com/invoices/${invoice.id}">
          View & Pay Online
        </a>
      </p>

      <p>Thank you for your business!</p>
    `,
    attachments: [
      {
        filename: `invoice-${invoice.invoice_number}.pdf`,
        content: pdfBuffer,
      },
    ],
  });

  // Log delivery
  await logInvoiceDelivery({
    invoice_id: invoice.id,
    delivery_method: 'email',
    email_to: invoice.company.contact_email,
    email_sent_at: new Date(),
    delivery_status: 'sent',
  });
}
```

### Step 5: Payment Processing UI

**Payment Form Component**:
```typescript
// src/components/invoicing/PaymentForm.tsx
'use client';

import { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

export function PaymentForm({ invoice }) {
  const stripe = useStripe();
  const elements = useElements();
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'ach'>('card');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    const cardElement = elements.getElement(CardElement);

    // Create payment method
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement!,
    });

    if (error) {
      console.error(error);
      return;
    }

    // Process payment via API
    const response = await fetch('/api/invoices/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoice_id: invoice.id,
        payment_method_id: paymentMethod.id,
        amount: invoice.amount_due,
      }),
    });

    const result = await response.json();

    if (result.success) {
      // Redirect to success page
      window.location.href = `/invoices/${invoice.id}/paid`;
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Pay ${formatCurrency(invoice.amount_due)}</h3>

      <div>
        <label>
          <input
            type="radio"
            value="card"
            checked={paymentMethod === 'card'}
            onChange={(e) => setPaymentMethod('card')}
          />
          Credit Card (2.9% + 30¢ fee)
        </label>

        <label>
          <input
            type="radio"
            value="ach"
            checked={paymentMethod === 'ach'}
            onChange={(e) => setPaymentMethod('ach')}
          />
          Bank Transfer (0.8% fee, 2-3 days)
        </label>
      </div>

      {paymentMethod === 'card' && (
        <CardElement options={{ style: cardStyle }} />
      )}

      {paymentMethod === 'ach' && (
        <PlaidLinkButton onSuccess={handleBankConnected} />
      )}

      <button type="submit" disabled={!stripe}>
        Pay Now
      </button>
    </form>
  );
}
```

---

## 📊 Reporting & Analytics

### Payment Reports
- **Payment method breakdown** (ACH vs Card vs Check)
- **Processing fees** total by month
- **Average days to payment**
- **Payment failure rates**
- **Outstanding A/R aging**

### Invoice Reports
- **Invoices sent per month**
- **Delivery method usage**
- **Email open rates**
- **Average time to payment**
- **Recurring vs one-time**

---

## 🔒 Security & Compliance

### PCI Compliance
- **Never store full card numbers** - Use Stripe tokens
- **Stripe Elements** - PCI-compliant card inputs
- **HTTPS only** - All payment pages
- **Secure webhooks** - Verify signatures

### Data Protection
- **Encrypt sensitive data** - API keys, bank account details
- **Row-level security** - Supabase RLS policies
- **Audit logging** - Track all payment actions
- **Access control** - Role-based permissions

---

## 🎬 Getting Started

### 1. Install Dependencies
```bash
pnpm add stripe @stripe/stripe-js @stripe/react-stripe-js
pnpm add react-pdf @react-pdf/renderer
pnpm add resend
pnpm add react-plaid-link
```

### 2. Set Environment Variables
```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# Plaid (for ACH verification)
PLAID_CLIENT_ID=xxx
PLAID_SECRET=xxx

# Email (Resend)
RESEND_API_KEY=re_xxx
```

### 3. Run Database Migrations
```bash
supabase db push
```

### 4. Configure Recurring Billing
```typescript
// Set up monthly invoice generation cron job
// vercel.json
{
  "crons": [{
    "path": "/api/invoices/generate-monthly",
    "schedule": "0 0 1 * *" // First day of each month
  }]
}
```

---

## 📞 Support

For payment processor setup, integration help, or custom requirements, this system provides Bill with everything needed for professional invoice management and payment processing.

All payment methods (ACH, credit cards, checks) are fully supported with automatic QuickBooks synchronization.
