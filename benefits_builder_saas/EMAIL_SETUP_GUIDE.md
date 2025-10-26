# Email Notifications Setup Guide

## Overview

Automated email notifications have been integrated into the Benefits Builder system. Emails are sent for:

1. **Welcome Emails** - When a new company is onboarded via bulk upload
2. **Monthly Billing Notifications** - When invoices are generated
3. **Monthly Reports** - Performance summaries for companies (future feature)

---

## Quick Setup

### Step 1: Get Email Credentials from Bill

You mentioned you'll get a **one-time password** from Bill. This is typically an **App Password** for Gmail or an SMTP password.

**For Gmail:**
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Security → 2-Step Verification (must be enabled)
3. App Passwords → Generate new app password
4. Select "Mail" and "Other" (custom name: "Benefits Builder")
5. Copy the 16-character password

### Step 2: Configure Environment Variables

Add to your `.env.local` file:

```env
# Email Configuration (SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_16_char_app_password_here
EMAIL_FROM=noreply@benefitsbuilder.com
EMAIL_FROM_NAME=Benefits Builder
```

**Important Notes:**
- If using Gmail, `EMAIL_USER` should be your Gmail address
- `EMAIL_PASSWORD` should be the **App Password**, not your regular Gmail password
- `EMAIL_FROM` can be any email address (it's the "From" header, not authentication)
- Port 587 uses STARTTLS (recommended), port 465 uses SSL

### Step 3: Deploy Environment Variables to Vercel

```bash
# Add email credentials to Vercel
vercel env add EMAIL_HOST production
# Enter: smtp.gmail.com

vercel env add EMAIL_PORT production
# Enter: 587

vercel env add EMAIL_USER production
# Enter: your_email@gmail.com

vercel env add EMAIL_PASSWORD production
# Enter: your_app_password_here

vercel env add EMAIL_FROM production
# Enter: noreply@benefitsbuilder.com

vercel env add EMAIL_FROM_NAME production
# Enter: Benefits Builder

# Redeploy to apply changes
vercel --prod
```

### Step 4: Test Email System

**Option A: Via API (Requires authentication)**
```bash
curl -X POST https://your-domain.vercel.app/api/email/test \
  -H "Content-Type: application/json" \
  -H "Cookie: bb_session=YOUR_SESSION_TOKEN" \
  -d '{"email":"test@example.com"}'
```

**Option B: Via Dashboard (Recommended)**
1. Log in as admin
2. Navigate to Settings (future UI)
3. Click "Send Test Email"

---

## Email Templates

### 1. Welcome Email
**Sent When:** New company is created via bulk upload
**Recipient:** Company contact email
**Content:**
- Welcome message
- What's next steps
- Benefits overview
- Support contact information

**Triggered By:** `POST /api/bulk-upload`

### 2. Billing Notification
**Sent When:** Invoice is generated via billing close
**Recipient:** Company contact email
**Content:**
- Invoice period
- Subtotal, tax, total due
- Employer FICA savings
- Net savings calculation
- Payment instructions

**Triggered By:** `POST /api/billing/close`

### 3. Monthly Report (Future)
**Sent When:** Monthly report is requested
**Recipient:** Company contact email
**Content:**
- Enrollment metrics
- Total pre-tax benefits processed
- Employer & employee tax savings
- Enrollment rate

**Triggered By:** (To be implemented)

---

## Files Added

### Core Email Library
- [apps/web/src/lib/email.ts](apps/web/src/lib/email.ts) - Email service with templates

### API Endpoints
- [apps/web/src/app/api/email/test/route.ts](apps/web/src/app/api/email/test/route.ts) - Test email endpoint (admin only)

### Integration Points
- [apps/web/src/app/api/bulk-upload/route.ts](apps/web/src/app/api/bulk-upload/route.ts#L272) - Welcome email on company creation
- [apps/web/src/app/api/billing/close/route.ts](apps/web/src/app/api/billing/close/route.ts#L188) - Billing notification on invoice generation

### Configuration
- [apps/web/.env.example](apps/web/.env.example#L12) - Email configuration template
- [package.json](apps/web/package.json) - Added nodemailer dependency

---

## Email Providers

### Gmail (Recommended)
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

**Limitations:**
- 500 emails/day for free Gmail accounts
- 2000 emails/day for Google Workspace accounts
- Requires 2FA and App Password

### Outlook/Office 365
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=your_email@outlook.com
EMAIL_PASSWORD=your_password
```

### SendGrid (Enterprise Option)
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=your_sendgrid_api_key
```

**Benefits:**
- 100 emails/day free tier
- 40,000+ emails/day on paid plans
- Better deliverability
- Email analytics

### Mailgun (Enterprise Option)
```env
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=postmaster@your-domain.mailgun.org
EMAIL_PASSWORD=your_mailgun_password
```

---

## Troubleshooting

### Error: "Invalid login"
- Verify `EMAIL_USER` and `EMAIL_PASSWORD` are correct
- If using Gmail, ensure you're using an **App Password**, not your account password
- Check that 2FA is enabled on Gmail account

### Error: "Connection refused"
- Verify `EMAIL_PORT` is correct (587 for STARTTLS, 465 for SSL)
- Check firewall isn't blocking SMTP connections

### Error: "Self-signed certificate"
- For development only, you can disable TLS verification (NOT recommended for production):
  ```typescript
  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: false,
    auth: { user: EMAIL_USER, pass: EMAIL_PASSWORD },
    tls: { rejectUnauthorized: false } // DEVELOPMENT ONLY
  });
  ```

### Emails Going to Spam
1. **SPF Record**: Add SPF record to your domain DNS
   ```
   v=spf1 include:_spf.google.com ~all
   ```

2. **DKIM**: Configure DKIM signing (requires enterprise email service)

3. **Email Content**: Avoid spam trigger words, include unsubscribe link

---

## Future Enhancements

### 1. Email Templates System
- Store templates in database
- Allow customization via admin UI
- Variable replacement engine

### 2. Email Queue
- Batch send emails to avoid rate limits
- Retry failed sends
- Track delivery status

### 3. Email Analytics
- Track open rates
- Track click rates
- Bounce management

### 4. Scheduled Reports
- Weekly digest emails
- Quarterly business reviews
- Annual tax summaries

---

## Security Best Practices

1. **Never commit email credentials** to version control
2. Use **App Passwords** instead of main passwords
3. Use **environment variables** for all sensitive data
4. Enable **2FA** on email accounts
5. Rotate credentials **every 90 days**
6. Monitor **failed login attempts**
7. Use **TLS/SSL** for all SMTP connections

---

## Testing Checklist

Before going live, test:

- [ ] Welcome email sends correctly
- [ ] Billing notification sends correctly
- [ ] Test email endpoint works (admin only)
- [ ] Emails don't go to spam
- [ ] Email formatting looks good on desktop
- [ ] Email formatting looks good on mobile
- [ ] Links in emails work
- [ ] Unsubscribe functionality (if implemented)
- [ ] Rate limits don't block sends

---

## Production Deployment

1. **Get credentials from Bill**
2. **Add to Vercel environment variables**
3. **Deploy to production**
4. **Send test email** to verify
5. **Monitor email logs** for first week
6. **Check spam folder** of recipients

---

**System Status**: 🟡 **EMAIL READY** (pending credentials from Bill)

All email functionality is implemented and ready to use once SMTP credentials are configured.
