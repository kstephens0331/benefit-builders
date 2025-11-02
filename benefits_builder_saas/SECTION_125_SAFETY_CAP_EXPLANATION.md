# Section 125 Safety Cap - How It Works

## The Problem You Identified

**Original Issue**: The system would calculate Section 125 deductions based purely on tier rules without checking if the employee could actually afford them.

**Example Problem Scenario**:
- Employee makes $600/month
- Tier says they should get $1,300/month Section 125 benefit
- System would try to deduct $1,300 from $600
- **Result**: Mathematically impossible, would create negative paycheck

You were 100% correct - this doesn't make sense!

## The Solution

### Safety Cap Logic

The system now works in two stages:

#### Stage 1: Calculate Target Amount (Tier Rules)
Based on company tier and employee details:
- State School: $1,300/month (all employees)
- 2025 Tier: $1,300 (S/0) or $1,700 (others)
- Pre-2025: $800-$1,600 depending on status
- Original 6%: $700-$1,500 depending on status

#### Stage 2: Apply Safety Cap (Reality Check)
Before deducting, the system checks:
```
Maximum Allowed Deduction = Gross Pay × 30%
Actual Deduction = MINIMUM of (Target Amount, Maximum Allowed)
```

**This ensures the deduction NEVER exceeds what the employee can afford.**

## Real-World Examples

### Example 1: Low-Wage Worker (The Problem Case)
**Employee Details:**
- Gross Pay: $600/month
- Pay Frequency: Biweekly (26 paychecks/year)
- Gross Per Paycheck: $276.92
- Company Tier: 2025
- Filing Status: Single, 0 dependents

**What Happens:**
```
Target Monthly: $1,300 (from tier rules)
Target Per Paycheck: $600

Safety Check:
  Maximum Allowed = $276.92 × 30% = $83.08

Actual Deduction: $83.08 (CAPPED)
Shortfall: $600 - $83.08 = $516.92 per paycheck
```

**System Display:**
- ⚠️ WARNING: "INSUFFICIENT GROSS PAY"
- Shows target: $1,300/month
- Shows actual: $180.50/month (capped)
- Shows shortfall: $1,119.50/month
- Orange/yellow warning colors
- "*CAPPED*" labels

### Example 2: Minimum Coverage Scenario
**Employee Details:**
- Gross Pay: $2,000/month
- Pay Frequency: Biweekly
- Gross Per Paycheck: $923.08
- Company Tier: Pre-2025
- Filing Status: Single, 0 dependents

**What Happens:**
```
Target Monthly: $800
Target Per Paycheck: $369.23

Safety Check:
  Maximum Allowed = $923.08 × 30% = $276.92
  Target ($369.23) > Maximum Allowed ($276.92)

Actual Deduction: $276.92 (CAPPED)
Shortfall: $369.23 - $276.92 = $92.31 per paycheck
```

**Result:** Partial coverage with warning displayed

### Example 3: Adequate Pay (Normal Scenario)
**Employee Details:**
- Gross Pay: $5,000/month
- Pay Frequency: Biweekly
- Gross Per Paycheck: $2,307.69
- Company Tier: 2025
- Filing Status: Married, 2 dependents

**What Happens:**
```
Target Monthly: $1,700
Target Per Paycheck: $784.62

Safety Check:
  Maximum Allowed = $2,307.69 × 30% = $692.31
  Target ($784.62) > Maximum Allowed ($692.31)

Actual Deduction: $692.31 (CAPPED at 30%)
```

**Result:** Slight warning, but closer to target

### Example 4: High Earner (No Cap Needed)
**Employee Details:**
- Gross Pay: $10,000/month
- Pay Frequency: Biweekly
- Gross Per Paycheck: $4,615.38
- Company Tier: 2025
- Filing Status: Married, 2 dependents

**What Happens:**
```
Target Monthly: $1,700
Target Per Paycheck: $784.62

Safety Check:
  Maximum Allowed = $4,615.38 × 30% = $1,384.61
  Target ($784.62) < Maximum Allowed ($1,384.61)

Actual Deduction: $784.62 (FULL TARGET AMOUNT)
```

**Result:** No warning, full benefit applied, normal blue display

## Why 30% Cap?

The 30% cap is based on:
1. **Legal considerations**: Most states limit wage deductions
2. **Practical limits**: Employee needs take-home pay for living expenses
3. **Industry standard**: Most benefit deductions don't exceed 30% of gross
4. **Flexibility**: Can be adjusted if needed (parameter in function)

## What Happens When There's a Shortfall?

### System Behavior
1. Calculates safe deduction (up to 30% of gross)
2. Applies that amount to paycheck
3. Shows warning to administrator
4. Tracks shortfall amount for reporting

### UI Indicators
- **Color Change**: Blue → Orange/Yellow
- **Warning Banner**: Red box with details
- **Labels**: "*CAPPED*" on amounts
- **Comparison**: Shows target vs. actual
- **Percentage**: Shows % of gross being deducted

### What It Means
- Employee gets partial Section 125 benefit
- Coverage is reduced but not eliminated
- Employee still gets tax savings on reduced amount
- Paycheck remains positive and valid

## Business Rules

### When Full Benefit Applies
Employee's gross pay allows the full target deduction without exceeding 30%

### When Capped Benefit Applies
Employee's gross pay is insufficient for full benefit, so system caps at 30%

### When Zero Benefit Applies
Employee's gross pay is below minimum threshold (extremely rare)

## How to Adjust the Cap

If you need to change the 30% cap:

1. **In Code** ([section125.ts:189](apps/web/src/lib/section125.ts#L189)):
```typescript
calculateSafeSection125Deduction(
  tier,
  filingStatus,
  dependents,
  grossPay,
  payPeriod,
  35  // Change from 30 to 35 for 35% cap
)
```

2. **Common Cap Values**:
   - 25%: More conservative, smaller deductions
   - 30%: Current default, balanced
   - 35%: More aggressive, larger deductions
   - 40%: Very aggressive, may cause hardship

## Reporting & Monitoring

### Administrator View
The system now shows:
- How many employees are capped
- Total shortfall across all employees
- Which employees need pay increases
- Coverage percentage by employee

### Employee View
The benefits calculator shows:
- Their target amount
- Their actual (safe) amount
- Why it's capped
- What percentage of their pay it represents

## Next Steps

### For Employees with Shortfalls
1. **Option 1**: Accept reduced benefit
2. **Option 2**: Increase gross pay to meet target
3. **Option 3**: Change company tier (if applicable)
4. **Option 4**: Adjust their family/dependent status

### For Company Administrators
1. Review employees with warnings
2. Consider if tier assignments are appropriate
3. Evaluate pay structures
4. Communicate with affected employees

## Key Takeaways

✅ **Prevents impossible math** - No more $1,300 deductions from $600 paychecks
✅ **Protects employees** - Always ensures take-home pay remains
✅ **Maintains compliance** - Follows legal wage deduction limits
✅ **Clear communication** - Visual warnings when caps apply
✅ **Flexible system** - Can adjust cap percentage if needed
✅ **Maintains benefits** - Employees still get partial coverage

The system now makes sense mathematically AND practically!
