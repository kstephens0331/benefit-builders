# Executive Dashboard Guide

**Benefits Builder SaaS - Advanced Analytics & KPI Dashboard**

---

## Overview

The Executive Dashboard provides real-time business intelligence with comprehensive KPIs, revenue projections, goal tracking, and actionable insights to help Benefits Builder owners make data-driven decisions for growth and profitability.

**Access**: Navigate to `/dashboard`

---

## Key Performance Indicators (KPIs)

### Primary Metrics

#### 1. Monthly Revenue
- **Definition**: Total BB profit from all active companies for the current month
- **Calculation**: Sum of (employee fees + employer fees) across all companies
- **Formula**: `Σ(pretax_monthly × (employee_rate + employer_rate))`
- **Use**: Track current revenue performance
- **Target**: Set via Goals feature

#### 2. Active Companies
- **Definition**: Companies with status = "active"
- **Calculation**: Count of companies where `status = 'active'`
- **Use**: Track customer base growth
- **Target**: Growth % month-over-month

#### 3. Total Employees
- **Definition**: All active employees across all companies
- **Calculation**: Count of employees where `active = true`
- **Use**: Measure total market reach
- **Insight**: More employees = more revenue potential

#### 4. Profit Margin %
- **Definition**: BB profit as a percentage of total employer savings
- **Calculation**: `(BB Profit / Employer FICA Savings) × 100`
- **Healthy Range**: 60-80% (typical billing models)
- **Use**: Measure value delivered to employers

### Secondary Metrics

#### 5. Enrollment Rate
- **Definition**: Percentage of employees enrolled in benefits
- **Calculation**: `(Enrolled Employees / Total Employees) × 100`
- **Target**: 70-90%
- **Action**: Low enrollment = opportunity for growth

#### 6. Avg Employees per Company
- **Definition**: Average company size
- **Calculation**: `Total Employees / Active Companies`
- **Use**: Understand ideal customer profile
- **Insight**: Larger companies = more revenue per customer

#### 7. Avg Revenue per Company
- **Definition**: Average monthly revenue per active company
- **Calculation**: `Monthly Revenue / Active Companies`
- **Use**: Track account value
- **Target**: Increase through upselling

#### 8. Avg Revenue per Employee
- **Definition**: Average monthly revenue per enrolled employee
- **Calculation**: `Monthly Revenue / Enrolled Employees`
- **Benchmark**: $15-30/employee (varies by model)
- **Use**: Pricing strategy validation

---

## Dashboard Sections

### 1. Key Metrics Grid (Top Row)

**4 Large Cards**:
- Monthly Revenue (Green border)
- Active Companies (Blue border)
- Total Employees (Purple border)
- Profit Margin % (Orange border)

**Each card shows**:
- Primary metric (large number)
- Secondary context (small text below)

**Refresh**: Real-time data on page load

---

### 2. Secondary Metrics Row

**3 Medium Cards**:
- Avg Employees/Company
- Avg Revenue/Company
- Avg Revenue/Employee

**Use**: Quick efficiency ratios

---

### 3. Revenue Trend Chart

**6-Month Historical View**:
- Month-by-month revenue
- Employer savings for context
- Profit margin %

**Insights**:
- Growth trajectory
- Seasonality patterns
- Margin trends

**Data Source**: `billing_usage_snapshots` table

---

### 4. Active Goals Panel

**Displays**:
- Goal type (e.g., "Monthly Revenue", "Total Companies")
- Target value vs current value
- Progress bar (visual %)
- Target date

**Goal Types Available**:
1. `monthly_revenue` - Monthly revenue target
2. `annual_revenue` - Annual revenue target
3. `total_companies` - Company count goal
4. `total_employees` - Employee count goal
5. `avg_employees_per_company` - Average company size
6. `profit_margin` - Profit margin target

**Progress Calculation**: Automatic
- Updates when `current_value` changes
- Auto-completes when reaching 100%

---

### 5. Revenue Projection Calculator

**Purpose**: Answer "How many companies do we need to hit $X revenue?"

**Inputs**:
1. **Target Companies** - Desired number of clients
2. **Avg Employees per Company** - Typical company size
3. **Avg Pretax per Employee** - Monthly pretax benefits amount
4. **Avg Model Rate** - Combined fee % (default 6% for 5/1 model)
5. **Months to Achieve** - Timeline

**Outputs**:
- Projected Monthly Revenue
- Projected Annual Revenue
- Companies Needed (gap from current)
- Companies per Month (acquisition rate needed)

**Example Scenario**:
```
Target: 50 companies
Avg Size: 15 employees
Avg Pretax: $300/employee
Model Rate: 6%

Result:
- Total Employees: 750
- Monthly Pretax: $225,000
- Monthly Revenue: $13,500
- Annual Revenue: $162,000
- Need: 30 more companies (if currently at 20)
- Rate: 2.5 companies/month over 12 months
```

**Save Feature**: Stores projections for historical comparison

---

### 6. Company Distribution by Size

**Segments**:
- 1-10 employees (Small)
- 11-25 employees (Medium)
- 26-50 employees (Large)
- 51-100 employees (Enterprise)
- 100+ employees (Enterprise+)

**Insights**:
- Customer mix
- Ideal customer profile
- Market segment focus

**Visual**: Horizontal bar chart with percentages

---

### 7. Top 10 Companies by Revenue

**Columns**:
- Company Name
- Employees
- Monthly Revenue

**Use**:
- Identify top accounts
- Retention focus
- Upsell opportunities

**Sorting**: Highest revenue first

---

### 8. Key Insights & Actions (Bottom Banner)

**Blue Gradient Card** with 3 action items:

1. **Enrollment Opportunity**
   - Shows: Non-enrolled employees count
   - Action: Increase enrollment campaigns

2. **Potential Additional Revenue**
   - Shows: Revenue if 100% enrolled
   - Formula: `(Total - Enrolled) × Avg Revenue per Employee`
   - Action: Focus on enrollment

3. **Target Status**
   - Shows: Whether to "Increase" or "Maintain" enrollment
   - Threshold: 80% enrollment rate
   - Action: Operational focus

---

## Using the Dashboard for Decision Making

### Monthly Review Process

**Step 1: Review Core Metrics**
- Is monthly revenue trending up?
- Are we on track for goals?
- Is enrollment rate healthy (>70%)?

**Step 2: Analyze Trends**
- Look at 6-month revenue chart
- Identify growth patterns
- Check profit margin consistency

**Step 3: Check Goal Progress**
- Review active goals
- Update current values if needed
- Adjust targets if necessary

**Step 4: Run Projections**
- Use calculator for growth scenarios
- Determine acquisition targets
- Plan sales/marketing efforts

**Step 5: Take Action**
- Focus on top revenue opportunities
- Address low enrollment companies
- Optimize company mix (size distribution)

---

## Growth Planning Scenarios

### Scenario 1: "Double Revenue in 12 Months"

**Current State**:
- 20 companies
- Avg 10 employees
- $200/employee pretax
- 6% model rate
- Current monthly revenue: $2,400

**Target**: $4,800/month

**Projection Calculator Inputs**:
- Target Companies: 40 (double)
- Avg Employees: 10 (same)
- Avg Pretax: $200 (same)
- Months: 12

**Result**: Need 20 more companies = 1.67/month acquisition rate

**Actions**:
- Sales target: 2 new companies/month
- Marketing: Lead gen for 4-6 qualified leads/month
- Retention: Keep all existing clients

---

### Scenario 2: "Increase Average Deal Size"

**Current State**:
- Avg revenue/company: $150/month
- Avg employees/company: 8

**Target**: $300/month per company

**Strategies**:
1. Target larger companies (15-25 employees)
2. Increase enrollment rate (more employees enrolled)
3. Increase avg pretax per employee (promote more benefits)

**Projection Calculator**:
- Keep company count same
- Increase avg employees to 16
- Result: Double revenue without acquisition

---

### Scenario 3: "Optimize Profit Margin"

**Current Margin**: 65%

**Target**: 75%

**Levers**:
1. Shift to higher-margin models (5/3 vs 4/4)
2. Reduce profit-sharing agreements
3. Increase base fees
4. Focus on high-pretax companies

**Dashboard Monitoring**:
- Track margin % trend
- Compare by company
- Identify low-margin accounts

---

## Goal Setting Best Practices

### SMART Goals

**Specific**: "Reach 50 active companies" not "Get more clients"
**Measurable**: Use dashboard metrics
**Achievable**: Based on projection calculator
**Relevant**: Aligned with revenue targets
**Time-bound**: Set target dates

### Recommended Goals for Year 1

1. **Monthly Revenue**: $10,000/month
   - Target Date: 12 months
   - Track: Via primary KPI

2. **Total Companies**: 30 active companies
   - Target Date: 12 months
   - Acquisition: 2.5/month

3. **Enrollment Rate**: 80%
   - Target Date: 6 months
   - Focus: Operational excellence

4. **Avg Employees per Company**: 15
   - Target Date: 12 months
   - Focus: Target larger companies

---

## API Endpoints

### Get Dashboard Analytics
```
GET /api/dashboard/analytics?months=6
```

**Response**:
```json
{
  "ok": true,
  "summary": { ... },
  "trends": [ ... ],
  "goals": [ ... ],
  "company_distribution": [ ... ],
  "top_companies": [ ... ]
}
```

### Create Goal
```
POST /api/dashboard/goals
Content-Type: application/json

{
  "goal_type": "monthly_revenue",
  "target_value": 10000,
  "target_date": "2026-10-25",
  "description": "Reach $10k MRR"
}
```

### Calculate Projection
```
POST /api/dashboard/projections
Content-Type: application/json

{
  "target_companies": 50,
  "avg_employees_per_company": 15,
  "avg_pretax_per_employee": 300,
  "avg_model_rate": 0.06,
  "months_to_achieve": 12,
  "save": true
}
```

---

## Database Schema

### business_goals Table
```sql
- id: UUID
- goal_type: enum (monthly_revenue, annual_revenue, etc.)
- target_value: numeric
- current_value: numeric
- progress_percent: numeric (auto-calculated)
- status: enum (active, completed, abandoned)
- target_date: date
- description: text
```

### company_performance_snapshots Table
```sql
- company_id: UUID
- snapshot_date: date
- employees_active: int
- employees_enrolled: int
- enrollment_rate: numeric
- total_pretax_monthly: numeric
- bb_profit_monthly: numeric
```

### revenue_projections Table
```sql
- projection_date: date
- projected_companies: int
- projected_avg_employees: numeric
- projected_monthly_revenue: numeric
- assumptions: jsonb
- notes: text
```

---

## Troubleshooting

### "Dashboard loading slowly"
**Cause**: Large dataset (100+ companies)
**Solution**: Analytics endpoint is optimized with single queries, but consider caching for 5 minutes

### "Trends showing $0 for past months"
**Cause**: No billing snapshots for those periods
**Solution**: Run `/api/billing/close` for each historical month

### "Goals not auto-updating"
**Cause**: `current_value` not being updated
**Solution**: Manually update via PUT request or create automated sync job

### "Projection calculator results seem off"
**Cause**: Incorrect avg_model_rate input
**Solution**:
- 5/1 model = 0.06 (5% + 1%)
- 5/3 model = 0.08 (5% + 3%)
- 4/3 model = 0.07 (4% + 3%)
- 4/4 model = 0.08 (4% + 4%)

---

## Next Steps

1. **Set Your First Goals**
   - Navigate to dashboard
   - Use projection calculator to determine targets
   - Create 2-3 SMART goals

2. **Establish Monthly Review Cadence**
   - First Monday of each month
   - Review all KPIs
   - Update goal progress
   - Adjust strategy

3. **Track Historical Data**
   - Run billing close monthly
   - Build 6+ months of trend data
   - Identify patterns

4. **Optimize Based on Insights**
   - Focus on high-value companies
   - Improve enrollment rate
   - Target ideal company size
   - Adjust pricing/models

---

## Support

For questions or feature requests related to the dashboard:
- Check [FIXES_APPLIED.md](FIXES_APPLIED.md) for technical details
- Review [ALPHA_TEST_FINDINGS.md](ALPHA_TEST_FINDINGS.md) for testing results
- Contact development team

**Dashboard Version**: 1.0
**Last Updated**: October 25, 2025
