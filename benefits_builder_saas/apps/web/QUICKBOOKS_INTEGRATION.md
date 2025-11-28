# QuickBooks Online Integration - Complete Documentation

A comprehensive, production-ready integration with QuickBooks Online for the Benefits Builder SaaS application. This integration provides full accounting functionality including customers, invoices, payments, bills, vendors, estimates, and advanced reporting.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Setup](#setup)
- [API Reference](#api-reference)
- [Webhooks](#webhooks)
- [Error Handling](#error-handling)
- [Batch Operations](#batch-operations)
- [Reports](#reports)
- [Testing](#testing)

---

## Features

### Core A/R (Accounts Receivable)
- ✅ **Customer Management** - Create, update, and sync customers
- ✅ **Invoice Creation** - Generate invoices with line items, tax, and due dates
- ✅ **Payment Recording** - Track and record customer payments
- ✅ **Payment Retrieval** - Pull payments from QB for reconciliation
- ✅ **Bidirectional Sync** - Automated 3-hour sync cycle

### A/P (Accounts Payable)
- ✅ **Vendor Management** - Create and update vendors
- ✅ **Bill Creation** - Generate bills with expense tracking
- ✅ **Bill Payment** - Record bill payments from bank accounts
- ✅ **Bill Retrieval** - Query bills by date range

### Sales & Proposals
- ✅ **Estimates/Quotes** - Create estimates for proposals
- ✅ **Credit Memos** - Issue credit memos for refunds/adjustments
- ✅ **Refund Receipts** - Process customer refunds

### Products & Services
- ✅ **Service Items** - Create service items with pricing
- ✅ **Item Retrieval** - Fetch all items from QuickBooks

### Advanced Features
- ✅ **Financial Reports** - P&L, Balance Sheet, Cash Flow, A/R Aging, A/P Aging
- ✅ **Real-time Webhooks** - Instant notifications for entity changes
- ✅ **Batch Operations** - Process multiple operations with retry logic
- ✅ **Error Handling** - Exponential backoff and automatic retry
- ✅ **Duplicate Detection** - Prevent duplicate entity creation
- ✅ **Token Management** - Automatic OAuth token refresh

---

## Architecture

### File Structure

```
src/
├── lib/
│   └── quickbooks.ts          # Core QB library (1,344 lines)
└── app/api/accounting/quickbooks/
    ├── auth/route.ts           # OAuth authorization
    ├── callback/route.ts       # OAuth callback handler
    ├── status/route.ts         # Connection status
    ├── disconnect/route.ts     # Disconnect QB
    ├── sync/route.ts           # Manual sync trigger
    ├── vendors/route.ts        # Vendor CRUD operations
    ├── bills/route.ts          # Bill operations
    ├── estimates/route.ts      # Estimate operations
    ├── reports/route.ts        # Financial reports
    └── webhooks/route.ts       # Real-time webhook handler
```

### Data Flow

```
┌─────────────────┐
│  Benefits       │
│  Builder App    │
└────────┬────────┘
         │
         ├─> Manual Sync (On-Demand)
         ├─> Bidirectional Sync (Every 3 hours)
         └─> Webhooks (Real-time)
                ↓
         ┌──────────────┐
         │  QuickBooks  │
         │   Online API │
         └──────────────┘
```

---

## Setup

### 1. Environment Variables

Add these to your `.env.local`:

```bash
# QuickBooks OAuth Credentials
QB_CLIENT_ID=your_client_id
QB_CLIENT_SECRET=your_client_secret
QB_REDIRECT_URI=https://yourdomain.com/api/accounting/quickbooks/callback
QB_ENVIRONMENT=sandbox  # or 'production'

# Webhook Security
QB_WEBHOOK_VERIFIER_TOKEN=your_webhook_token

# Cron Job Security
CRON_SECRET=your_cron_secret
```

### 2. QuickBooks App Configuration

1. Go to [QuickBooks Developer Portal](https://developer.intuit.com)
2. Create a new app
3. Configure OAuth redirect URI
4. Enable the following scopes:
   - `com.intuit.quickbooks.accounting`
   - `openid`
   - `profile`
   - `email`
5. Set up webhooks (optional for real-time updates)

### 3. Database Schema

Required tables (migrations should be run):

```sql
-- QuickBooks connections
CREATE TABLE quickbooks_connections (
  id UUID PRIMARY KEY,
  realm_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Webhook queue
CREATE TABLE quickbooks_webhook_queue (
  id UUID PRIMARY KEY,
  connection_id UUID REFERENCES quickbooks_connections(id),
  realm_id TEXT,
  entity_type TEXT,
  entity_id TEXT,
  operation TEXT,
  received_at TIMESTAMP,
  processed BOOLEAN DEFAULT FALSE
);

-- Payment processing queue
CREATE TABLE quickbooks_payment_queue (
  id UUID PRIMARY KEY,
  connection_id UUID,
  qb_payment_id TEXT,
  queued_at TIMESTAMP,
  processed BOOLEAN DEFAULT FALSE
);

-- Sync log
CREATE TABLE quickbooks_sync_log (
  id UUID PRIMARY KEY,
  connection_id UUID,
  sync_type TEXT,
  customers_pushed INTEGER DEFAULT 0,
  customers_pulled INTEGER DEFAULT 0,
  invoices_pushed INTEGER DEFAULT 0,
  invoices_pulled INTEGER DEFAULT 0,
  payments_pushed INTEGER DEFAULT 0,
  payments_pulled INTEGER DEFAULT 0,
  errors JSONB,
  synced_at TIMESTAMP
);
```

---

## API Reference

### Authentication

#### Connect to QuickBooks
```typescript
GET /api/accounting/quickbooks/auth
```
Redirects user to QuickBooks OAuth authorization page.

#### OAuth Callback
```typescript
GET /api/accounting/quickbooks/callback?code=xxx&realmId=xxx
```
Handles OAuth callback and stores tokens.

#### Connection Status
```typescript
GET /api/accounting/quickbooks/status

Response:
{
  "connected": true,
  "realm_id": "123456",
  "company_name": "Acme Corp",
  "token_expires_in": 3456
}
```

#### Disconnect
```typescript
POST /api/accounting/quickbooks/disconnect

Response:
{
  "success": true,
  "message": "Disconnected from QuickBooks"
}
```

### Vendors & Bills

#### Get All Vendors
```typescript
GET /api/accounting/quickbooks/vendors

Response:
{
  "vendors": [
    {
      "Id": "123",
      "DisplayName": "Office Supply Co",
      "PrimaryEmailAddr": { "Address": "vendor@example.com" },
      "Balance": 2500.00
    }
  ],
  "count": 1
}
```

#### Create/Update Vendor
```typescript
POST /api/accounting/quickbooks/vendors

Body:
{
  "vendor_id": "uuid-here",  // Optional, for updates
  "name": "Office Supply Co",
  "email": "vendor@example.com",
  "phone": "555-1234"
}

Response:
{
  "success": true,
  "qb_vendor_id": "123"
}
```

#### Get All Bills
```typescript
GET /api/accounting/quickbooks/bills?start_date=2024-01-01&end_date=2024-12-31

Response:
{
  "bills": [...],
  "count": 10
}
```

#### Create Bill
```typescript
POST /api/accounting/quickbooks/bills

Body:
{
  "vendor_qb_id": "123",
  "bill_number": "BILL-001",
  "bill_date": "2024-01-15",
  "due_date": "2024-02-15",
  "line_items": [
    {
      "description": "Office supplies",
      "amount": 25000,  // in cents
      "account_ref": "45"  // QB account ID
    }
  ],
  "total": 25000
}

Response:
{
  "success": true,
  "qb_bill_id": "456"
}
```

### Estimates

#### Get All Estimates
```typescript
GET /api/accounting/quickbooks/estimates?start_date=2024-01-01&end_date=2024-12-31

Response:
{
  "estimates": [...],
  "count": 5
}
```

#### Create Estimate
```typescript
POST /api/accounting/quickbooks/estimates

Body:
{
  "customer_qb_id": "789",
  "estimate_date": "2024-01-15",
  "expiration_date": "2024-02-15",
  "customer_memo": "Annual benefits proposal",
  "line_items": [
    {
      "description": "Pre-tax benefits setup",
      "quantity": 1,
      "rate": 500000,  // in cents ($5,000)
      "amount": 500000
    }
  ],
  "total": 500000
}

Response:
{
  "success": true,
  "qb_estimate_id": "999"
}
```

### Reports

#### Get Financial Reports
```typescript
GET /api/accounting/quickbooks/reports?type={report_type}&start_date=2024-01-01&end_date=2024-12-31

Report Types:
- profit-loss      (requires start_date, end_date)
- balance-sheet    (requires as_of_date)
- cash-flow        (requires start_date, end_date)
- ar-aging         (optional as_of_date)
- ap-aging         (optional as_of_date)

Example:
GET /api/accounting/quickbooks/reports?type=profit-loss&start_date=2024-01-01&end_date=2024-12-31

Response:
{
  "reportType": "profit-loss",
  "report": {
    "Header": {...},
    "Rows": {...},
    "Columns": {...}
  }
}
```

---

## Webhooks

### Setup

1. **Register Webhook URL** in QuickBooks Developer Portal:
   ```
   https://yourdomain.com/api/accounting/quickbooks/webhooks
   ```

2. **Set Verifier Token** in environment variables:
   ```bash
   QB_WEBHOOK_VERIFIER_TOKEN=your_token_from_qb_portal
   ```

3. **Subscribe to Entities**:
   - Customer
   - Invoice
   - Payment
   - Bill
   - Vendor
   - Estimate

### Webhook Flow

```
QuickBooks → Webhook → Verification → Queue → Processing → Database Update
```

### Supported Events

| Entity    | Operations         | Action                                    |
|-----------|--------------------|-------------------------------------------|
| Customer  | Create/Update/Delete | Mark for re-sync                         |
| Invoice   | Create/Update/Delete | Update sync status                       |
| Payment   | Create/Update       | **Immediate pull** and reconciliation    |
| Bill      | Create/Update       | Queue for next sync                      |
| Vendor    | Create/Update/Delete | Mark for re-sync                         |
| Estimate  | Create/Update       | Track for proposal sync                  |

---

## Error Handling

### Retry Logic

The integration includes exponential backoff retry logic:

```typescript
import { retryWithBackoff } from '@/lib/quickbooks';

const result = await retryWithBackoff(
  () => syncCustomerToQB(tokens, customer),
  {
    maxAttempts: 3,
    initialDelay: 1000,    // 1 second
    maxDelay: 10000        // 10 seconds max
  }
);
```

### Retryable Errors

Automatically retries on:
- **Rate Limits** (429 errors)
- **Network Errors** (ECONNRESET, ETIMEDOUT)
- **Server Errors** (5xx responses)

### Error Responses

All API endpoints return consistent error format:

```json
{
  "error": "Descriptive error message",
  "code": "QB_AUTH_FAILED",
  "details": {...}
}
```

---

## Batch Operations

For processing multiple entities efficiently:

```typescript
import { batchOperation } from '@/lib/quickbooks';

// Sync 100 customers in batches of 5
const operations = customers.map(customer =>
  () => syncCustomerToQB(tokens, customer)
);

const { results, errors } = await batchOperation(operations, {
  maxConcurrent: 5,      // Process 5 at a time
  retryAttempts: 3,      // Retry failures 3 times
  retryDelay: 1000       // 1 second between retries
});

console.log(`Success: ${results.length}, Failures: ${errors.length}`);
```

### Benefits
- **Rate Limit Compliance** - Respects QB API limits
- **Error Isolation** - One failure doesn't stop the batch
- **Performance** - Concurrent processing with controlled concurrency
- **Resilience** - Automatic retry with exponential backoff

---

## Reports

### Available Reports

#### Profit & Loss (P&L)
```typescript
import { getProfitAndLossReport } from '@/lib/quickbooks';

const result = await getProfitAndLossReport(
  tokens,
  '2024-01-01',
  '2024-12-31'
);
```

#### Balance Sheet
```typescript
import { getBalanceSheetReport } from '@/lib/quickbooks';

const result = await getBalanceSheetReport(
  tokens,
  '2024-12-31'  // As of date
);
```

#### Cash Flow
```typescript
import { getCashFlowReport } from '@/lib/quickbooks';

const result = await getCashFlowReport(
  tokens,
  '2024-01-01',
  '2024-12-31'
);
```

#### A/R Aging (Accounts Receivable)
```typescript
import { getARAgingReport } from '@/lib/quickbooks';

const result = await getARAgingReport(
  tokens,
  '2024-12-31'  // Optional, defaults to today
);
```

#### A/P Aging (Accounts Payable)
```typescript
import { getAPAgingReport } from '@/lib/quickbooks';

const result = await getAPAgingReport(
  tokens,
  '2024-12-31'  // Optional, defaults to today
);
```

---

## Testing

### Unit Tests

```bash
pnpm test src/lib/quickbooks.test.ts
```

### Integration Tests

1. **Set up sandbox account** in QB Developer Portal
2. **Configure test credentials** in `.env.test`
3. **Run integration tests**:

```bash
pnpm test:integration
```

### Manual Testing

1. **Connect to QuickBooks**:
   ```
   http://localhost:3000/api/accounting/quickbooks/auth
   ```

2. **Check Status**:
   ```bash
   curl http://localhost:3000/api/accounting/quickbooks/status
   ```

3. **Create Vendor**:
   ```bash
   curl -X POST http://localhost:3000/api/accounting/quickbooks/vendors \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test Vendor",
       "email": "test@vendor.com"
     }'
   ```

4. **Get Reports**:
   ```bash
   curl "http://localhost:3000/api/accounting/quickbooks/reports?type=profit-loss&start_date=2024-01-01&end_date=2024-12-31"
   ```

---

## Best Practices

### 1. Token Management
- ✅ Tokens are automatically refreshed 5 minutes before expiry
- ✅ All QB operations check token validity first
- ✅ Refresh tokens are securely stored in database

### 2. Error Handling
- ✅ Use `retryWithBackoff` for critical operations
- ✅ Log all errors with context for debugging
- ✅ Gracefully handle QB service outages

### 3. Performance
- ✅ Use batch operations for bulk syncs
- ✅ Leverage webhooks for real-time updates
- ✅ Limit concurrent requests to respect rate limits

### 4. Security
- ✅ Verify webhook signatures
- ✅ Protect cron endpoints with secrets
- ✅ Never log sensitive token data

### 5. Data Integrity
- ✅ Use duplicate detection before creating entities
- ✅ Track sync status in database
- ✅ Maintain audit log of all sync operations

---

## Troubleshooting

### Common Issues

#### "Token expired" errors
**Solution**: Tokens refresh automatically. If persistent, re-authenticate.

#### "Rate limit exceeded"
**Solution**: Use batch operations with `maxConcurrent: 5` or lower.

#### Webhook not receiving events
**Solution**:
1. Verify webhook URL is HTTPS
2. Check verifier token matches QB portal
3. Ensure entities are subscribed in QB portal

#### Sync not running
**Solution**:
1. Check cron job is configured (Vercel Cron or similar)
2. Verify CRON_SECRET is set
3. Check sync logs in database

---

## API Limits

QuickBooks Online API has the following limits:

| Limit Type        | Value                  |
|-------------------|------------------------|
| Requests/minute   | 500 (Production)       |
| Requests/minute   | 100 (Sandbox)          |
| Max results/query | 1000                   |
| Token lifetime    | 1 hour (access token)  |
| Refresh token     | 100 days               |

**Recommendation**: Use batch operations with `maxConcurrent: 5` to stay well below limits.

---

## Support

For issues or questions:

1. **Check this documentation** first
2. **Review error logs** in database (`quickbooks_sync_log`)
3. **Test in QB sandbox** before production
4. **Consult QB API docs**: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/customer

---

**Built for Benefits Builder SaaS** - Complete accounting integration for pre-tax benefits management.
