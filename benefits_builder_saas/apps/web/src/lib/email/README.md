# Email Service Integration

This directory contains email service integrations for the Benefits Builder SaaS application.

## Resend Integration

We use [Resend](https://resend.com) for transactional email delivery. Resend provides:

- Modern API for sending emails
- Built-in templates and styling
- Delivery tracking and analytics
- Email click/open tracking
- Reliable delivery infrastructure

### Setup

1. **Sign up for Resend**
   - Go to https://resend.com
   - Create an account
   - Get your API key from the dashboard

2. **Configure Environment Variables**

   Add to your `.env.local` file:
   ```env
   RESEND_API_KEY=re_your_api_key_here
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   ```

3. **Verify Your Domain (Production)**

   For production use, you must verify your sending domain:
   - In Resend dashboard, go to "Domains"
   - Add your domain (e.g., `benefitsbuilder.com`)
   - Add the provided DNS records to your domain
   - Wait for verification (usually takes a few minutes)
   - Update `RESEND_FROM_EMAIL` to use your verified domain

### Email Types

The integration supports three types of emails:

#### 1. Payment Reminders

Three levels of payment reminders:

- **Gentle**: Friendly reminder for recently due invoices
- **Firm**: Warning for invoices 30+ days overdue
- **Final**: Urgent notice for invoices 60+ days overdue with late fee warning

Usage:
```typescript
import { sendPaymentReminderEmail } from '@/lib/email/resend';

await sendPaymentReminderEmail('gentle', 'customer@example.com', {
  companyName: 'Acme Corp',
  invoiceNumber: 'INV-001',
  amountDue: 1500.00,
  dueDate: '2024-01-15',
  daysOverdue: 5,
  paymentLink: 'https://app.benefitsbuilder.com/invoices/123/pay',
});
```

#### 2. Invoice Delivery

Send new invoices to customers:

```typescript
import { sendInvoiceEmail } from '@/lib/email/resend';

await sendInvoiceEmail('customer@example.com', {
  companyName: 'Acme Corp',
  invoiceNumber: 'INV-001',
  totalAmount: 1500.00,
  dueDate: '2024-02-15',
  invoiceUrl: 'https://app.benefitsbuilder.com/invoices/123.pdf',
  paymentLink: 'https://app.benefitsbuilder.com/invoices/123/pay',
});
```

#### 3. Payment Receipts

Confirmation emails when payment is received:

```typescript
import { sendPaymentReceiptEmail } from '@/lib/email/resend';

await sendPaymentReceiptEmail('customer@example.com', {
  companyName: 'Acme Corp',
  invoiceNumber: 'INV-001',
  amountPaid: 1500.00,
  paymentDate: '2024-01-20',
  paymentMethod: 'Credit Card',
  receiptUrl: 'https://app.benefitsbuilder.com/receipts/456.pdf',
});
```

### Email Templates

All email templates are fully styled with:

- Responsive HTML design
- Professional branding
- Clear call-to-action buttons
- Plain text fallback

Templates are located in [resend.ts](./resend.ts) and can be customized as needed.

### Testing Emails

For development, Resend provides a test mode:

1. Use your API key even in development
2. Emails sent to `@resend.dev` domains are test emails
3. View sent emails in the Resend dashboard under "Emails"

Example test:
```typescript
await sendPaymentReminderEmail('gentle', 'test@resend.dev', {
  // ... your test data
});
```

### Error Handling

The email service includes proper error handling:

```typescript
try {
  const result = await sendPaymentReminderEmail(...);
  console.log('Email sent:', result.id);
} catch (error) {
  console.error('Failed to send email:', error);
  // Handle error (retry, log, alert admin, etc.)
}
```

### Tracking & Analytics

Email tracking is automatically handled:

- **Email ID**: Each sent email returns a unique ID
- **Delivery Status**: Check delivery in Resend dashboard
- **Opens/Clicks**: Track customer engagement (if enabled)

The email ID is stored in the `payment_reminders` table for tracking purposes.

### Rate Limits

Resend free tier includes:
- 100 emails per day
- 3,000 emails per month

For production, consider upgrading to a paid plan.

### Best Practices

1. **Use Environment-Specific URLs**: Different URLs for dev/staging/production
2. **Test Before Production**: Always test emails in development first
3. **Monitor Bounces**: Check Resend dashboard for bounced emails
4. **Update Templates**: Keep email templates professional and on-brand
5. **Track Engagement**: Monitor which reminder types get the best response

### Alternatives

If you prefer SendGrid instead of Resend:

1. Install SendGrid SDK: `pnpm add @sendgrid/mail`
2. Create a similar service file for SendGrid
3. Update the import in `payment-alerts.ts`
4. Configure `SENDGRID_API_KEY` environment variable

## Migration from SMTP

The legacy SMTP configuration is still available but deprecated. To migrate:

1. Set up Resend as described above
2. Remove old SMTP environment variables
3. Delete or archive the old email service files

The Resend integration is more reliable, easier to debug, and provides better tracking than SMTP.
