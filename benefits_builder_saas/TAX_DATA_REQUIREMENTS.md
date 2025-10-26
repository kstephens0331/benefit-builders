# Tax Data Requirements - CRITICAL

## ⚠️ **URGENT: Tax Calculation Accuracy**

Tax calculation is the **MOST IMPORTANT** part of this system. Inaccurate calculations will:
- Cause legal/compliance issues
- Result in incorrect invoices
- Damage client relationships
- Create IRS problems

---

## Current Status

### ✅ Federal Tax Data
- **Complete**: Federal withholding tables (Publication 15-T 2025)
- **Complete**: FICA rates (SS 6.2%, Medicare 1.45%)
- **Complete**: Standard deductions and brackets
- **File**: `supabase/seed/002_federal_tax_2025.sql`
- **File**: `supabase/seed/003_withholding_federal_15t_2025.sql`

### ⚠️ State Tax Data
- **Incomplete**: Only 7 states with sample data
- **Missing**: 43 states need EXACT bracket data
- **Risk**: Calculations will be WRONG for most states

---

## Required Actions BEFORE Production

### 1. Get Exact Tax Brackets for All 50 States

For EACH state, you need:

**Progressive Tax States** (need exact brackets):
- Income thresholds
- Tax rates for each bracket
- Base tax amounts
- Filing status variations (Single, Married, Head of Household)

**Flat Tax States** (need exact rates):
- Exact flat rate percentage
- Any deductions/exemptions
- Supplemental wage rate (bonuses, etc.)

**No Income Tax States** (already complete):
- Alaska, Florida, Nevada, South Dakota, Tennessee, Texas, Washington, Wyoming, New Hampshire

### 2. Data Sources

**Official State Sources** (use ONLY official data):
1. Each state's Department of Revenue website
2. 2025 withholding tables (employers)
3. Tax year 2025 (current year)

**DO NOT use**:
- Approximations
- Averages
- Old data from prior years
- Third-party calculators without verification

### 3. Critical States (Prioritize These)

**High Population States** (handle first):
1. **California** - ✅ Complete (9 brackets)
2. **Texas** - ✅ Complete (no income tax)
3. **Florida** - ✅ Complete (no income tax)
4. **New York** - ✅ Complete (9 brackets)
5. **Pennsylvania** - ✅ Complete (3.07% flat)
6. **Illinois** - ✅ Complete (4.95% flat)
7. **Ohio** - ⚠️ Needs exact brackets
8. **Georgia** - ✅ Complete (6 brackets)
9. **North Carolina** - ✅ Complete (4.5% flat)
10. **Michigan** - ✅ Complete (4.25% flat)

**Remaining 40 States**: Need exact data

---

## Data Format Required

For each state, provide:

```sql
INSERT INTO tax_state_params (
  state,                  -- 'CA', 'NY', etc.
  tax_year,              -- 2025
  method,                -- 'brackets', 'flat', or 'none'
  flat_rate,             -- 0.05 for 5% (null if brackets)
  standard_deduction,    -- Dollar amount
  personal_exemption,    -- Dollar amount per person
  dependent_exemption,   -- Dollar amount per dependent
  allowances_method,     -- 'federal_w4', 'per_allowance_amount', or 'none'
  brackets,              -- JSON array (if progressive)
  credits,               -- JSON object (if applicable)
  locality_mode,         -- 'none', 'some', or 'all'
  effective_from         -- '2025-01-01'
) VALUES (
  'CA', 2025, 'brackets', null, 5363, 151, 436, 'per_allowance_amount',
  '[
    {"max": 10412, "rate": 0.01, "base": 0},
    {"max": 24684, "rate": 0.02, "base": 104.12},
    {"max": 38959, "rate": 0.04, "base": 389.56},
    {"max": 54081, "rate": 0.06, "base": 960.56},
    {"max": 68350, "rate": 0.08, "base": 1867.88},
    {"max": 349137, "rate": 0.093, "base": 3009.40},
    {"max": 418961, "rate": 0.103, "base": 29123.59},
    {"max": 698271, "rate": 0.113, "base": 36315.46},
    {"max": null, "rate": 0.123, "base": 67857.50}
  ]'::jsonb,
  null, 'none', '2025-01-01'
);
```

---

## Filing Status Considerations

Most states have different brackets for:
- **Single**
- **Married Filing Jointly**
- **Married Filing Separately**
- **Head of Household**

**Current System Limitation**: We store ONE set of brackets per state per year.

**Options**:
1. **Use Single filer brackets** (most conservative, slightly over-withholds)
2. **Enhance schema** to support multiple filing statuses
3. **Use federal W-4 mapping** (let federal status determine state)

**Recommendation**: Start with option 1 (Single filer) for safety, enhance later.

---

## Local/County Taxes

Some states have local income taxes:
- **Pennsylvania**: All localities have local tax (0.5% - 3.9%)
- **Ohio**: Many cities have local tax (1% - 3%)
- **Indiana**: All counties have local tax (varies)
- **Maryland**: All counties have local tax (1.75% - 3.2%)
- **New York**: NYC has local tax (3.078% - 3.876%)
- **Alabama**: Some localities
- **Missouri**: Some localities

**Current System**: Tracks locality_mode ('none', 'some', 'all') but doesn't calculate local tax yet.

**Action Required**:
- Decide if local taxes will be calculated
- If yes, need locality data for each state
- If no, document this limitation clearly

---

## Verification Process

For EACH state configured:

1. **Get official withholding publication** from state revenue department
2. **Verify tax year** is 2025
3. **Check effective date** (some states change mid-year)
4. **Verify brackets** match official tables
5. **Test calculation** with official examples
6. **Document source** (URL to official publication)

---

## Testing Requirements

### Test Cases Needed:

For EACH state:
1. **Minimum wage** worker ($15k/year)
2. **Median wage** worker ($50k/year)
3. **High wage** worker ($200k/year)
4. **Executive** ($1M/year for states with top brackets)

For each test case, verify:
- State withholding matches official tables
- Federal withholding is correct
- FICA calculation is correct
- Total deductions match expected amounts

### Sample Test:

```typescript
// California - Single, $50,000/year, paid biweekly (26 pays)
Gross per pay: $1,923.08
Benefits per pay: $200.00
Taxable income: $1,723.08
Annual taxable: $44,800.04

Expected state withholding (CA): $97.60/pay
Expected federal withholding: $183.27/pay
Expected FICA: $147.22/pay (SS) + $27.89/pay (Medicare)

Total deductions: $455.98/pay
Net pay: $1,467.10/pay
```

---

## Production Readiness Checklist

Tax calculations cannot go to production until:

- [ ] All 50 states have exact tax data
- [ ] All data verified against official sources
- [ ] All data is for tax year 2025
- [ ] Test cases pass for all states
- [ ] Edge cases tested (zero income, max income, etc.)
- [ ] Local tax handling documented
- [ ] Filing status handling documented
- [ ] Supplemental wage rates documented
- [ ] Year-end reconciliation process defined

---

## Recommended Approach

### Phase 1: Top 10 States (Immediate)
Get exact brackets for the 10 highest population states (covers ~55% of US population):
1. California
2. Texas
3. Florida
4. New York
5. Pennsylvania
6. Illinois
7. Ohio
8. Georgia
9. North Carolina
10. Michigan

### Phase 2: Next 15 States (Week 2)
Cover next tier of states (another ~25% of population)

### Phase 3: Remaining 25 States (Week 3)
Complete all remaining states

### Phase 4: Local Taxes (Week 4)
Add local tax support for PA, OH, IN, MD, NY, AL, MO

---

## Alternative: Use Third-Party Service

If building/maintaining tax tables is too complex, consider:

**Paid Tax Calculation APIs**:
1. **ADP TotalSource** - Payroll tax API
2. **Gusto API** - Payroll calculations
3. **Symmetry Tax Engine** - Tax calculation service
4. **Vertex** - Tax calculation platform

**Pros**:
- Always up-to-date
- Multi-jurisdictional
- Professionally maintained
- Less liability

**Cons**:
- Monthly cost ($500-$2000/month)
- API dependency
- May be overkill for simple pre-tax calculations

---

## Current Risk Level

**🔴 HIGH RISK** - Production deployment without complete tax data will result in:
- Incorrect withholding calculations
- Wrong billing amounts
- Client dissatisfaction
- Potential legal issues
- IRS compliance problems

**Action Required**: COMPLETE tax data before any production use.

---

## Data Maintenance

Tax rates change YEARLY:
- Most states publish new tables in November/December
- Effective January 1st of new year
- System needs annual update process
- Old data must be retained for historical calculations

**Recommendation**: Create annual review process:
1. October: Begin reviewing state announcements
2. November: Collect new withholding tables
3. December: Update database
4. January 1: New rates go live
5. Keep old rates for historical reporting

---

## Contact Information

For questions about state tax data:
- Contact state revenue departments directly
- Use official employer withholding publications
- DO NOT rely on consumer tax calculators

---

**Status**: 🔴 **BLOCKED FOR PRODUCTION**

Complete and accurate tax data for ALL 50 states is REQUIRED before this system can be used in production.
