# QuickBooks Online Integration Setup Guide

## Overview

QuickBooks Online integration automatically syncs:
- **Companies** → QuickBooks Customers
- **Invoices** → QuickBooks Invoices
- **Payments** → QuickBooks Payments (future feature)

This eliminates manual data entry and ensures accounting records stay in sync with Benefits Builder.

---

## Prerequisites

1. **QuickBooks Online account** (will get credentials from Bill)
2. **QuickBooks Developer account** to create OAuth app
3. **Admin access** to Benefits Builder system

---

## Step 1: Create QuickBooks Developer App

### 1.1 Go to QuickBooks Developer Portal

Visit: [https://developer.intuit.com/](https://developer.intuit.com/)

### 1.2 Create New App

1. Sign in with Intuit account
2. Click **Dashboard** → **My Apps** → **Create an App**
3. Select **QuickBooks Online and Payments**
4. Fill in app details:
   - **App Name**: Benefits Builder Integration
   - **App Type**: Desktop/Web App
   - **Redirect URI**: `https://your-domain.vercel.app/api/quickbooks/callback`
     - For development: `http://localhost:3002/api/quickbooks/callback`

### 1.3 Get Credentials

After creating the app:
1. Go to **Keys & OAuth**
2. Copy **Client ID**
3. Copy **Client Secret**
4. Select **Production** or **Sandbox** environment

---

## Step 2: Configure Environment Variables

Add to `.env.local`:

```env
# QuickBooks Online Integration
QB_CLIENT_ID=your_client_id_from_step_1.3
QB_CLIENT_SECRET=your_client_secret_from_step_1.3
QB_REDIRECT_URI=https://your-domain.vercel.app/api/quickbooks/callback
QB_ENVIRONMENT=sandbox  # or 'production'
```

**Deploy to Vercel:**

```bash
vercel env add QB_CLIENT_ID production
# Enter: your_client_id_here

vercel env add QB_CLIENT_SECRET production
# Enter: your_client_secret_here

vercel env add QB_REDIRECT_URI production
# Enter: https://your-domain.vercel.app/api/quickbooks/callback

vercel env add QB_ENVIRONMENT production
# Enter: production (or sandbox for testing)

# Redeploy
vercel --prod
```

---

## Step 3: Apply Database Migration

**Option A: Supabase Dashboard (Recommended)**
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of [supabase/migrations/005_quickbooks_integration.sql](supabase/migrations/005_quickbooks_integration.sql)
3. Paste and click **RUN**

**Option B: Command Line**
```bash
cd supabase
supabase db push
```

This creates 3 tables:
- `quickbooks_integration` - OAuth tokens and connection status
- `quickbooks_sync_mappings` - Maps local entities to QuickBooks entities
- `quickbooks_sync_log` - Complete audit trail of all sync operations

---

## Step 4: Connect QuickBooks

### 4.1 Get Authorization URL

**API Request:**
```bash
curl https://your-domain.vercel.app/api/quickbooks/auth \
  -H "Cookie: bb_session=YOUR_SESSION_TOKEN"
```

**Response:**
```json
{
  "ok": true,
  "auth_url": "https://appcenter.intuit.com/connect/oauth2?...",
  "instructions": "Redirect user to this URL to authorize QuickBooks access"
}
```

### 4.2 Authorize Application

1. Copy the `auth_url` from response
2. Open in browser
3. Sign in to QuickBooks
4. Select company to connect
5. Click **Authorize**
6. You'll be redirected to your callback URL with `code` and `realmId` parameters

### 4.3 Exchange Code for Tokens

**API Request:**
```bash
curl -X POST https://your-domain.vercel.app/api/quickbooks/auth \
  -H "Content-Type: application/json" \
  -H "Cookie: bb_session=YOUR_SESSION_TOKEN" \
  -d '{
    "code": "CODE_FROM_REDIRECT",
    "realmId": "REALM_ID_FROM_REDIRECT"
  }'
```

**Response:**
```json
{
  "ok": true,
  "message": "QuickBooks integration connected successfully",
  "realm_id": "123456789"
}
```

---

## Step 5: Sync Invoices

### Sync Single Invoice

**API Request:**
```bash
curl -X POST https://your-domain.vercel.app/api/quickbooks/sync-invoice \
  -H "Content-Type: application/json" \
  -H "Cookie: bb_session=YOUR_SESSION_TOKEN" \
  -d '{
    "invoice_id": "invoice-uuid-here"
  }'
```

**Response:**
```json
{
  "ok": true,
  "message": "Invoice synced to QuickBooks successfully",
  "qb_invoice_id": "123",
  "qb_customer_id": "456",
  "execution_time_ms": 1234
}
```

### What Happens During Sync:

1. **Customer Sync**: If company doesn't exist in QuickBooks, it's created as a Customer
2. **Invoice Creation**: Invoice is created in QuickBooks with all line items
3. **Mapping Storage**: Local ID → QuickBooks ID mapping is saved
4. **Audit Logging**: Complete sync operation is logged

---

## Features Implemented

### 1. Automatic Customer Creation
- Creates QuickBooks Customer from company data
- Syncs company name, email, phone
- Stores mapping for future syncs

### 2. Invoice Sync
- Creates detailed invoices with line items
- Includes subtotal, tax, total
- Sets 30-day payment terms
- Links to customer automatically

### 3. Token Management
- Automatic token refresh before expiry
- Secure storage of OAuth tokens
- Token expiration monitoring

### 4. Sync Tracking
- Complete audit trail of all operations
- Success/failure status
- Error messages for troubleshooting
- Execution time tracking

### 5. Conflict Resolution
- Prevents duplicate syncs
- Updates existing entities when needed
- Handles QuickBooks errors gracefully

---

## Files Added

### Core Integration
- [apps/web/src/lib/quickbooks.ts](apps/web/src/lib/quickbooks.ts) - QuickBooks client library

### Database
- [supabase/migrations/005_quickbooks_integration.sql](supabase/migrations/005_quickbooks_integration.sql) - Database schema

### API Endpoints
- [apps/web/src/app/api/quickbooks/auth/route.ts](apps/web/src/app/api/quickbooks/auth/route.ts) - OAuth flow
- [apps/web/src/app/api/quickbooks/sync-invoice/route.ts](apps/web/src/app/api/quickbooks/sync-invoice/route.ts) - Invoice sync

### Dependencies
- `node-quickbooks` - Official QuickBooks SDK

---

## Sync Workflow Examples

### Automatic Sync After Billing

You can automatically sync invoices to QuickBooks after billing close. Add this to the billing close endpoint:

```typescript
// After invoice is created
if (qbIntegrationEnabled) {
  await fetch("/api/quickbooks/sync-invoice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invoice_id: invoiceId })
  });
}
```

### Batch Sync All Invoices

```bash
# Get all invoices for a period
invoices=$(curl https://your-domain.vercel.app/api/billing/2025-01)

# Sync each invoice
for invoice_id in $invoices; do
  curl -X POST https://your-domain.vercel.app/api/quickbooks/sync-invoice \
    -d "{\"invoice_id\": \"$invoice_id\"}"
done
```

---

## Monitoring & Troubleshooting

### View Sync Log

```sql
SELECT
  operation,
  entity_type,
  status,
  error_message,
  execution_time_ms,
  created_at
FROM quickbooks_sync_log
ORDER BY created_at DESC
LIMIT 50;
```

### View Sync Mappings

```sql
SELECT
  local_entity_type,
  qb_entity_type,
  qb_entity_id,
  sync_status,
  last_synced_at
FROM quickbooks_sync_mappings
WHERE sync_status = 'synced';
```

### Check Failed Syncs

```sql
SELECT
  *
FROM quickbooks_sync_log
WHERE status = 'failed'
ORDER BY created_at DESC;
```

### View Token Expiration

```sql
SELECT
  realm_id,
  is_active,
  access_token_expiry,
  refresh_token_expiry,
  last_sync_at
FROM quickbooks_integration;
```

---

## Common Issues

### Issue: "QuickBooks not connected"
**Solution:** Run Step 4 to authorize QuickBooks integration

### Issue: "Token expired"
**Solution:** Tokens auto-refresh. If refresh fails, re-authorize via Step 4

### Issue: "Customer already exists"
**Solution:** System will update existing customer instead of creating duplicate

### Issue: "Invalid invoice number"
**Solution:** QuickBooks invoice numbers must be unique. System uses invoice UUID prefix

---

## Security Best Practices

1. **Never commit credentials** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate credentials** every 6 months
4. **Monitor sync logs** for unusual activity
5. **Use sandbox** for testing, production for live data
6. **Limit API access** to admin users only

---

## Testing Checklist

Before going live:

- [ ] OAuth flow works correctly
- [ ] Tokens refresh automatically
- [ ] Customers sync to QuickBooks
- [ ] Invoices sync with correct amounts
- [ ] Line items appear correctly
- [ ] Tax calculations match
- [ ] Sync mappings are stored
- [ ] Audit log captures all operations
- [ ] Failed syncs are logged
- [ ] Duplicate syncs are prevented

---

## Future Enhancements

### 1. Payment Sync
- Record payments from QuickBooks back to Benefits Builder
- Match payments to invoices automatically
- Update invoice status to "paid"

### 2. Bidirectional Sync
- Pull customer updates from QuickBooks
- Sync payment status back
- Handle QuickBooks edits

### 3. Scheduled Sync
- Automatically sync new invoices
- Nightly batch sync
- Real-time webhooks from QuickBooks

### 4. Reporting Integration
- Pull QuickBooks financial data
- Reconciliation reports
- Revenue recognition

---

## QuickBooks API Limits

**Production Limits:**
- 500 API calls per minute
- 5,000 API calls per day per realm

**Sandbox Limits:**
- 100 API calls per minute
- No daily limit

**Best Practices:**
- Batch operations when possible
- Cache QuickBooks data locally
- Use webhooks instead of polling

---

## Getting QuickBooks Credentials from Bill

**What to Ask Bill For:**
1. QuickBooks Company ID (Realm ID)
2. Which environment to use (Sandbox or Production)
3. Confirmation of QuickBooks Online subscription (not Desktop)
4. Admin access to QuickBooks for OAuth authorization

**Bill will need to:**
1. Log in to QuickBooks Online
2. Authorize the Benefits Builder app
3. Provide the authorization code/realm ID

---

**System Status**: 🟡 **QUICKBOOKS READY** (pending OAuth credentials and Bill's authorization)

All QuickBooks integration code is complete and ready to use once OAuth app is configured and authorized.
