# Client Proposal Generation System - User Guide

## Overview

The Benefits Builder proposal generation system allows you to upload employee census files and automatically generate professional PDF proposals that match the Benefits Booster template design.

## Features

✅ **Excel Census Upload** - Upload .xlsx or .xls census files
✅ **Flexible Parsing** - Auto-detects census format and header row
✅ **Automatic Calculations** - Section 125 safe harbor, FICA savings, benefit allotments
✅ **Professional PDFs** - Generates branded proposals matching Benefits Booster template
✅ **Employee Qualification** - Automatically identifies qualifying vs non-qualifying employees
✅ **Multi-Page Support** - Handles any number of employees (20 per page)
✅ **Company Management** - Link proposals to existing companies or create new ones

---

## How to Create a Proposal

### Step 1: Navigate to Proposals

Click **"Proposals"** in the main navigation menu.

### Step 2: Click "New Proposal"

Click the **"+ New Proposal"** button in the top right.

### Step 3: Upload Census File

1. Click **"Choose File"** and select your employee census Excel file
2. Supported formats: `.xlsx`, `.xls`

### Step 4: Fill in Company Information

**Required Fields:**
- **Company Name** - The client company name
- **Effective Date** - When the benefits plan takes effect

**Optional Fields:**
- **Existing Company** - Link to an existing company in your database
- **Company Address** - Full street address
- **City** - City name
- **State** - 2-letter state code
- **Phone** - Company phone number
- **Email** - Company email address
- **Contact Person** - Primary contact name

**Proposal Settings:**
- **Model Percentage** - Default: `5/1` (5% employee, 1% employer)
- **Pay Period** - Default: `Bi-Weekly` (options: Weekly, Bi-Weekly, Semi-Monthly, Monthly)

### Step 5: Generate Proposal

Click **"Generate Proposal"** to process the census and create the proposal.

The system will:
- Parse the census file
- Calculate benefits for each employee
- Determine who qualifies for Section 125
- Calculate employer FICA savings
- Store the proposal in the database

### Step 6: Download PDF

Once generated, click **"Download PDF"** to get the professional proposal document.

---

## Census File Format

### Required Columns

The census file should contain the following columns (order doesn't matter):

| Column Name | Description | Example |
|-------------|-------------|---------|
| Last Name | Employee last name | Smith |
| First Name | Employee first name | John |
| ST or State | 2-letter state code | MO, TX |
| Pay Period | W, B, S, M, or A | B (Bi-Weekly) |
| Paycheck Gross Pay | Gross pay per paycheck | 1000.00 |
| Marital Status | S, M, or HOH | M (Married) |
| Dependents | Number of dependents | 2 |

### Pay Period Codes

- `W` = Weekly (52 pays/year)
- `B` = Bi-Weekly (26 pays/year)
- `S` = Semi-Monthly (24 pays/year)
- `M` = Monthly (12 pays/year)
- `A` = Annual (1 pay/year)

### Marital Status Codes

- `S` = Single
- `M` = Married
- `HOH` = Head of Household

### Non-Qualifying Employees

Employees are **automatically disqualified** if:
- Gross pay is less than $500 per paycheck
- Name contains an asterisk (`*`) - e.g., `*John Smith`

These employees will appear in the proposal with `$0.00` savings and an asterisk marker.

---

## Calculation Logic

### Section 125 Safe Harbor Limit

The system calculates the maximum pretax deduction using:

```
Annual Gross = Paycheck Gross × Pay Periods Per Year
Safety Cap = MIN(Annual Gross × 5%, $5,000)
```

### Gross Benefit Allotment

This is the monthly amount the employee can contribute pretax:

```
Annual Pretax Amount = MIN(Annual Gross × Employee Rate, Safety Cap)
Monthly Benefit = Annual Pretax Amount ÷ 12
```

### Employer FICA Savings

Employer saves 7.65% FICA on the pretax amount:

```
Annual FICA Savings = Annual Pretax Amount × 7.65%
Monthly FICA Savings = Annual FICA Savings ÷ 12
```

### Net Employer Savings

The proposal uses **standardized savings rates** based on marital status:

| Marital Status | Monthly Savings | Annual Savings |
|----------------|-----------------|----------------|
| Single | $18.55 | $222.60 |
| Married | $29.15 | $349.80 |
| Head of Household | $29.15 | $349.80 |

---

## PDF Output

### Design Elements

The generated PDF matches the Benefits Booster proposal template:

- **Header**: Benefits Booster logo and "Making your benefits soar" tagline
- **Title**: "Benefits Booster Proposal" centered
- **Company Info**: 3-column layout with all company details
- **Employee Table**: Professional table with 9 columns
  - Employee Name
  - State
  - Pay Freq
  - Paycheck Gross Amount
  - Marital Status
  - Deps
  - Employee Gross Benefit Allotment
  - Net Monthly Employer Savings
  - Net Annual Employer Savings
- **Footer**: Employee count and totals, disclaimer for non-qualifying employees

### Multi-Page Support

- Each page shows up to **20 employees**
- Headers repeat on each page
- Totals appear on the last page
- Professional table styling with alternating row colors

---

## Database Schema

### `proposals` Table

Stores main proposal records:

```sql
- id (uuid)
- company_id (uuid) - Link to companies table
- proposal_name (text)
- company_name, address, city, state, phone, email, contact
- effective_date (date)
- model_percentage (text) - e.g., "5/1"
- pay_period (text)
- total_employees (int)
- qualified_employees (int)
- total_monthly_savings (numeric)
- total_annual_savings (numeric)
- status (draft, sent, accepted, rejected)
- pdf_data (bytea) - Stored PDF
- census_data (jsonb) - Original census data
- created_at, updated_at
```

### `proposal_employees` Table

Stores per-employee breakdown:

```sql
- id (uuid)
- proposal_id (uuid)
- employee_name (text)
- state, pay_frequency, paycheck_gross
- marital_status, dependents
- gross_benefit_allotment (numeric)
- net_monthly_employer_savings (numeric)
- net_annual_employer_savings (numeric)
- qualifies (boolean)
- disqualification_reason (text)
```

---

## API Endpoints

### Generate Proposal from Census

```
POST /api/proposals/generate
Content-Type: multipart/form-data

Body:
- file: Excel file
- companyName: string (required)
- companyAddress: string
- companyCity: string
- companyState: string
- companyPhone: string
- companyEmail: string
- companyContact: string
- effectiveDate: string (YYYY-MM-DD, required)
- modelPercentage: string (default: "5/1")
- payPeriod: string (default: "Bi-Weekly")
- companyId: string (optional)

Response:
{
  ok: true,
  message: "Proposal created successfully with 33 employees (15 qualified)",
  proposalId: "uuid",
  data: {
    totalEmployees: 33,
    qualifiedEmployees: 15,
    totalMonthlySavings: 360.40,
    totalAnnualSavings: 4324.80
  }
}
```

### List All Proposals

```
GET /api/proposals

Response:
{
  ok: true,
  data: [
    {
      id: "uuid",
      proposal_name: "Advanced Assisted Living - 11/04/25",
      company_name: "Advanced Assisted Living",
      total_employees: 33,
      qualified_employees: 15,
      total_monthly_savings: 360.40,
      total_annual_savings: 4324.80,
      status: "draft",
      created_at: "2025-01-03T..."
    }
  ]
}
```

### Download Proposal PDF

```
GET /api/proposals/{id}/pdf

Response: PDF file (application/pdf)
```

---

## Example Census File

See: `C:\Users\usmc3\Downloads\OLD CENSUS.xlsx`

**Sample Structure:**

| Last Name | First Name | ST | Pay Period | Paycheck Gross Pay | Marital Status | Dependents |
|-----------|------------|----|-----------|--------------------|----------------|------------|
| Smith | John | MO | B | 1000.00 | M | 2 |
| Johnson | Sarah | TX | W | 750.00 | S | 0 |
| *Williams | Mike | MO | B | 450.00 | S | 0 |

In this example:
- John Smith: Qualifies, bi-weekly, married
- Sarah Johnson: Qualifies, weekly, single
- Mike Williams: **Does not qualify** (asterisk marker)

---

## Troubleshooting

### "Could not find employee data header row"

**Problem**: Census file format not recognized
**Solution**: Ensure your census has a header row with "Last Name", "First Name", etc. within the first 20 rows

### "No employees found in census file"

**Problem**: No valid employee rows after header
**Solution**: Check that employees have valid names and the header row is correctly identified

### All employees showing $0.00 savings

**Problem**: Employees may not meet qualification criteria
**Solution**:
- Check gross pay is at least $500
- Remove asterisks from names if employees should qualify
- Verify census data is in correct columns

### PDF not generating correctly

**Problem**: Missing logo or formatting issues
**Solution**:
- Ensure Benefits Booster logo is at `public/benefits-booster-logo.png`
- PDF will still generate with text logo if image is missing

---

## Best Practices

1. **Clean Census Data**: Remove extra rows/columns before uploading
2. **Verify Qualifications**: Review asterisk markers before generating proposal
3. **Check Company Info**: Fill in all relevant fields for professional appearance
4. **Review Before Sending**: Download and review PDF before sending to client
5. **Update Status**: Mark proposals as "sent" when delivered to client
6. **Link to Companies**: Connect proposals to existing companies for better tracking

---

## Future Enhancements

Potential features for future releases:

- Email proposals directly to clients
- Custom branding/logo upload
- Editable proposal templates
- Comparison reports (multiple scenarios)
- E-signature integration
- Client portal for proposal viewing
- Proposal versioning and revisions
- Custom calculation rules per company

---

## Support

For questions or issues with the proposal system:

1. Check this guide first
2. Review the example census file
3. Test with a small census file (5-10 employees)
4. Contact development team with specific error messages

---

**Created**: January 2025
**Last Updated**: January 2025
**Version**: 1.0
