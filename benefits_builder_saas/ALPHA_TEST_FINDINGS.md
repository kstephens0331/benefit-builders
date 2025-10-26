# Alpha Testing Findings & Security Audit

**Date**: October 25, 2025
**Status**: In Progress
**Tested By**: Claude Code Assistant

---

## Critical Bugs Fixed

### 1. ❌ employee_benefits.active Column References (FIXED)
**Severity**: HIGH - Causes runtime errors
**Files Affected**:
- ✅ FIXED: `apps/web/src/app/api/reports/employees/route.ts:27` - Removed `.eq("active", true)`
- ✅ FIXED: `apps/web/src/app/api/optimizer/preview/route.ts:65` - Removed `.eq("active", true)`

**Issue**: Multiple endpoints referenced a non-existent `active` column on the `employee_benefits` table.
**Root Cause**: Schema does not include an `active` column for benefits - benefits are managed by employee active status.
**Fix**: Removed all references to `employee_benefits.active`.

---

## Security Vulnerabilities

### 1. ⚠️ No Input Validation on Numeric Fields
**Severity**: MEDIUM
**Files Affected**: All POST endpoints accepting numeric input

**Issue**: Endpoints don't validate:
- Negative values for gross_pay, pretax_benefits, dependents
- Pretax amount exceeding gross pay
- Extreme values (e.g., $999,999,999 salary)

**Recommendation**: Add Zod schemas for input validation

**Example Fix Needed**:
```typescript
import { z } from "zod";

const OptimizerSchema = z.object({
  gross_pay: z.number().min(0).max(1000000),
  pretax_benefits: z.number().min(0),
  dependents: z.number().int().min(0).max(20),
  tax_year: z.number().int().min(2020).max(2100)
}).refine(data => data.pretax_benefits <= data.gross_pay, {
  message: "Pretax benefits cannot exceed gross pay"
});
```

### 2. ⚠️ No Rate Limiting
**Severity**: MEDIUM
**Files Affected**: All API routes

**Issue**: No rate limiting on API endpoints - vulnerable to DoS attacks

**Recommendation**: Implement rate limiting middleware
- Use Next.js middleware or Vercel Edge Config
- Limit: 100 requests/minute per IP for read endpoints
- Limit: 10 requests/minute per IP for write endpoints (billing/close, bulk-upload)

### 3. ⚠️ Missing CORS Configuration
**Severity**: LOW
**Files Affected**: All API routes

**Issue**: No explicit CORS headers - relies on Next.js defaults

**Recommendation**: Add explicit CORS configuration for production

### 4. ✅ SQL Injection Protection
**Severity**: N/A - PROTECTED

**Status**: ✅ SAFE - Using Supabase client with parameterized queries
- All database queries use Supabase's query builder
- No raw SQL with string concatenation
- UUIDs validated by Supabase client

---

## Data Integrity Issues

### 1. ⚠️ Missing Foreign Key Validation
**Severity**: MEDIUM

**Issue**: API endpoints don't validate that referenced IDs exist before operations
- `/api/billing/close` doesn't check if company exists before billing
- Relies on database foreign key constraints (which is good, but errors aren't user-friendly)

**Recommendation**: Add explicit existence checks with better error messages

### 2. ⚠️ No Transaction Support for Multi-Step Operations
**Severity**: MEDIUM
**Files Affected**: `/api/billing/close`, `/api/bulk-upload`

**Issue**: Complex operations that insert multiple records don't use transactions
- If billing close fails midway, partial data may exist
- Bulk upload could create company but fail on employees

**Recommendation**: Wrap multi-step operations in database transactions

**Example**:
```typescript
const { data, error } = await db.rpc('close_billing_period', {
  period_param: '2025-01'
});
```

### 3. ⚠️ Duplicate Invoice Prevention
**Severity**: LOW

**Issue**: `/api/billing/close` checks for existing invoice but could have race conditions
- Multiple simultaneous calls might create duplicate invoices

**Recommendation**: Add unique constraint on `invoices(company_id, period)` in schema

---

## Performance Issues

### 1. 🐌 N+1 Query Problem
**Severity**: HIGH
**Files Affected**:
- `apps/web/src/app/api/billing/close/route.ts`
- `apps/web/src/app/api/billing/[period]/route.ts`

**Issue**: Loops through employees and makes separate benefit queries for each
```typescript
for (const emp of emps) {
  const { data: benefits } = await db
    .from("employee_benefits")
    .select("...")
    .eq("employee_id", emp.id); // ← Separate query per employee!
}
```

**Impact**: For 100 employees, makes 100+ database queries

**Recommendation**: Use JOIN or fetch all benefits at once and group by employee_id

**Optimized Approach**:
```typescript
// Fetch all benefits for all employees in one query
const employeeIds = emps.map(e => e.id);
const { data: allBenefits } = await db
  .from("employee_benefits")
  .select("employee_id, per_pay_amount, reduces_fica")
  .in("employee_id", employeeIds);

// Group by employee
const benefitsByEmployee = new Map();
for (const benefit of allBenefits || []) {
  if (!benefitsByEmployee.has(benefit.employee_id)) {
    benefitsByEmployee.set(benefit.employee_id, []);
  }
  benefitsByEmployee.get(benefit.employee_id).push(benefit);
}
```

### 2. 🐌 No Response Caching
**Severity**: MEDIUM

**Issue**: Analytics and billing reports recalculate on every request
- `/api/analytics/summary` could be cached for 5-10 minutes
- `/api/billing/[period]` results don't change once period is closed

**Recommendation**: Add caching headers for closed periods

---

## Missing Validations

### 1. ⚠️ Pay Frequency Validation
**Files**: All billing/optimizer endpoints

**Issue**: Accepts any string for pay_frequency, falls back to "biweekly"
- Should validate against: weekly, biweekly, semimonthly, monthly
- Silent failures lead to incorrect calculations

### 2. ⚠️ Period Format Validation
**Files**: `/api/billing/[period]`, `/api/billing/close`

**Issue**: Regex validates YYYY-MM format but doesn't check:
- Month is 01-12 (accepts "2025-13")
- Year is reasonable (accepts "1800-01" or "9999-12")

**Recommendation**:
```typescript
function validatePeriod(period: string): boolean {
  const match = period.match(/^(\d{4})-(\d{2})$/);
  if (!match) return false;

  const year = parseInt(match[1]);
  const month = parseInt(match[2]);

  return year >= 2020 && year <= 2100 && month >= 1 && month <= 12;
}
```

### 3. ⚠️ Filing Status Validation
**Files**: `/api/optimizer/preview`

**Issue**: Accepts any filing status, falls back to "single"
- Should validate against: single, married, head

### 4. ⚠️ State Code Validation
**Files**: All endpoints accepting state

**Issue**: Accepts any 2-character string
- Should validate against valid US state codes

---

## Error Handling Issues

### 1. ⚠️ Generic Error Messages
**Severity**: LOW

**Issue**: Database errors exposed to client
```typescript
return NextResponse.json({ ok: false, error: cErr.message }, { status: 500 });
```

**Recommendation**: Log detailed errors server-side, return generic messages to client

### 2. ⚠️ Missing Try-Catch Blocks
**Severity**: MEDIUM

**Issue**: Some endpoints don't catch errors, leading to unhandled promise rejections

**Recommendation**: Wrap all route handlers in try-catch

---

## Business Logic Issues

### 1. ⚠️ No Profit-Sharing Cap
**Severity**: LOW

**Issue**: profit_share_percent can be set to any value (even > 100%)
- Could result in negative invoices if set to 200%

**Recommendation**: Add constraint in schema and validation in UI

### 2. ⚠️ Inactive Employee Billing Edge Case
**Severity**: LOW

**Issue**: If employee becomes inactive mid-month, they're excluded from end-of-month billing
- May lose revenue for partial month

**Recommendation**: Document this behavior or track effective dates

---

## Recommendations Summary

### High Priority (Fix Before Production)
1. ✅ Fix employee_benefits.active references (DONE)
2. 🔴 Fix N+1 query problem in billing endpoints
3. 🔴 Add input validation with Zod schemas
4. 🔴 Add unique constraint on invoices(company_id, period)

### Medium Priority (Fix Soon)
1. 🟡 Implement rate limiting
2. 🟡 Add transaction support for multi-step operations
3. 🟡 Improve error handling with proper logging
4. 🟡 Add period/state/frequency validation

### Low Priority (Nice to Have)
1. 🟢 Add response caching for analytics
2. 🟢 Add profit-sharing percentage caps
3. 🟢 Document billing period cutoff behavior

---

## Testing Checklist

- [x] Schema validation (employee_benefits.active removed)
- [ ] N+1 query optimization
- [ ] Input validation (Zod)
- [ ] Error handling improvements
- [ ] Rate limiting implementation
- [ ] Load testing (100+ companies, 1000+ employees)
- [ ] Billing calculation accuracy (match PDF example)
- [ ] Profit-sharing calculations
- [ ] All 4 billing models (5/3, 4/3, 5/1, 4/4)
- [ ] Edge cases (zero employees, extreme values, negative values)

---

**Next Steps**:
1. Run alpha-test.ts script to identify runtime failures
2. Fix N+1 queries in billing endpoints
3. Add Zod validation schemas
4. Build advanced analytics dashboard

