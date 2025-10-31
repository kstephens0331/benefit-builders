# A/R A/P & QuickBooks Integration Setup Guide

Complete guide for setting up and using the Accounts Receivable, Accounts Payable, and QuickBooks integration features.

## Database Setup

### 1. Run Migration 008

```bash
# Connect to your Supabase project and run:
psql $DATABASE_URL -f supabase/migrations/008_add_ar_ap_tables.sql
```

This creates:
- `quickbooks_connections` - QuickBooks OAuth tokens
- `accounts_receivable` - Customer invoices
- `accounts_payable` - Vendor bills
- `payment_transactions` - All payments
- Automatic triggers for status updates

## QuickBooks App Setup

### 2. Create QuickBooks App

1. Go to [QuickBooks Developer Portal](https://developer.intuit.com/)
2. Sign in with your Intuit account
3. Click "Create an app"
4. Choose "QuickBooks Online Accounting"
5. Fill in app details:
   - **App Name**: Benefits Builder SaaS
   - **Redirect URI**: `https://your-domain.com/api/accounting/quickbooks/callback`

### 3. Get Credentials

After creating the app:
1. Go to "Keys & credentials"
2. Copy your **Client ID**
3. Copy your **Client Secret**
4. Choose environment (Sandbox for testing, Production for live)

### 4. Configure Environment Variables

Add to your `.env.local` (development) and Vercel environment variables (production):

```bash
# QuickBooks OAuth Credentials
QUICKBOOKS_CLIENT_ID=your_client_id_here
QUICKBOOKS_CLIENT_SECRET=your_client_secret_here
QUICKBOOKS_REDIRECT_URI=https://your-domain.com/api/accounting/quickbooks/callback
QUICKBOOKS_ENVIRONMENT=sandbox  # or 'production'
```

### 5. Deploy Environment Variables to Vercel

```bash
# Add each environment variable
vercel env add QUICKBOOKS_CLIENT_ID production
# Enter value when prompted

vercel env add QUICKBOOKS_CLIENT_SECRET production
# Enter value when prompted

vercel env add QUICKBOOKS_REDIRECT_URI production
# Enter: https://your-domain.com/api/accounting/quickbooks/callback

vercel env add QUICKBOOKS_ENVIRONMENT production
# Enter: production (or sandbox for testing)
```

### 6. Redeploy

After adding environment variables, redeploy:
```bash
cd apps/web
vercel --prod
```

## Using the A/R A/P System

### Accessing the Page

Navigate to: **https://your-domain.com/accounting**

### Connect QuickBooks (One-Time Setup)

1. Click "Connect QuickBooks" button
2. Sign in to your QuickBooks account
3. Authorize the app
4. You'll be redirected back with "QuickBooks Connected" status

### Creating Invoices (A/R)

1. Go to "Accounts Receivable" tab
2. Click "+ New Invoice"
3. Fill in details:
   - **Company**: Select from dropdown
   - **Invoice Number**: Your invoice reference
   - **Invoice Date**: Date issued
   - **Due Date**: Payment deadline
   - **Amount**: Invoice total
   - **Description**: What the invoice is for
   - **Notes**: Any additional info
4. Click "Create Invoice"

### Syncing to QuickBooks

After creating an invoice:
1. Click "Sync to QB" button next to the invoice
2. System will:
   - Create customer in QuickBooks (if not exists)
   - Create invoice in QuickBooks
   - Link the records
3. Status changes to "✓ Synced"

### Recording Payments

When a customer pays an invoice:
1. Click "Record Payment" next to the invoice
2. Fill in payment details:
   - **Payment Date**: When received
   - **Amount**: How much was paid
   - **Payment Method**: Check, ACH, wire, etc.
   - **Check Number**: If applicable
   - **Reference Number**: Transaction ID
   - **Notes**: Any details
3. Click "Record Payment"
4. Invoice status updates automatically:
   - **Partial**: If partially paid
   - **Paid**: If fully paid
   - **Overdue**: If past due date and unpaid

### Creating Bills (A/P)

1. Go to "Accounts Payable" tab
2. Click "+ New Bill"
3. Fill in details:
   - **Vendor Name**: Who you owe
   - **Bill Number**: Vendor's invoice number
   - **Bill Date**: Date received
   - **Due Date**: Payment deadline
   - **Amount**: Bill total
   - **Description**: What the bill is for
   - **Notes**: Any additional info
4. Click "Create Bill"

### Paying Bills

When you pay a vendor:
1. Click "Pay Bill" next to the bill
2. Fill in payment details
3. Click "Record Payment"
4. Bill status updates automatically

### Payment History

View all payments:
1. Go to "Payment History" tab
2. See all A/R payments (received) and A/P payments (made)
3. Color-coded by type
4. Full details including dates, methods, amounts

## Summary Cards

At the top of the page, you'll see:

### Accounts Receivable Card
- **Total Outstanding**: All unpaid invoices
- **Overdue**: Past due invoices
- **Open Invoices**: Count of unpaid invoices

### Accounts Payable Card
- **Total Outstanding**: All unpaid bills
- **Overdue**: Past due bills
- **Open Bills**: Count of unpaid bills

## QuickBooks Sync Details

### What Gets Synced

**When syncing A/R:**
1. Customer record (if doesn't exist)
2. Invoice with line items
3. Invoice status
4. Payment status (when recorded)

**What's Stored:**
- QuickBooks invoice ID
- Sync timestamp
- Sync status (true/false)

### Token Management

The system automatically:
- Refreshes access tokens before they expire
- Handles token expiration
- Maintains connection status
- Shows connection status in UI

### If Connection Fails

1. Check QuickBooks connection status
2. Click "Connect QuickBooks" to reconnect
3. Authorize the app again
4. Retry syncing

## Troubleshooting

### "No active QuickBooks connection found"
- Solution: Click "Connect QuickBooks" and authorize

### "Failed to create customer"
- Check that company has valid contact info
- Ensure QuickBooks is accessible
- Try disconnecting and reconnecting

### "Failed to sync to QuickBooks"
- Check QuickBooks connection
- Verify environment variables are set
- Check Vercel logs for details

### Database Migration Errors
- Ensure you have proper database permissions
- Check that tables don't already exist
- Run migration in correct order

## Best Practices

### Invoice Management
- Use consistent invoice numbering
- Set accurate due dates
- Add detailed descriptions
- Sync to QuickBooks immediately

### Payment Recording
- Record payments promptly
- Include check/reference numbers
- Add notes for context
- Verify amounts before saving

### Regular Reconciliation
- Compare totals with QuickBooks monthly
- Review overdue items weekly
- Follow up on unpaid invoices
- Track payment trends

## Security Notes

- QuickBooks credentials are stored encrypted
- Access tokens auto-refresh
- Tokens stored in secure database
- OAuth 2.0 authentication
- No passwords stored

## Support

For issues:
1. Check Vercel deployment logs
2. Verify environment variables
3. Test QuickBooks connection
4. Check database migration status
5. Review API response errors

## Next Steps

After setup:
1. ✅ Run database migration
2. ✅ Configure QuickBooks app
3. ✅ Set environment variables
4. ✅ Deploy to production
5. ✅ Connect QuickBooks account
6. ✅ Create first invoice
7. ✅ Sync to QuickBooks
8. ✅ Record first payment

You're now ready to manage all A/R and A/P through the app without touching QuickBooks directly!
