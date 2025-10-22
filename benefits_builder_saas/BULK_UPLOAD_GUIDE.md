# Bulk Upload Guide - Benefits Builder

## Overview

The Bulk Upload feature allows you to import entire company census files with employee data and benefit elections in a single operation. The system uses **Google Gemini AI** to intelligently parse and structure the data, making it flexible enough to handle various file formats and column naming conventions.

---

## Features

✅ **AI-Powered Parsing** - Gemini AI automatically identifies and maps columns
✅ **Flexible Format** - Handles various column names and structures
✅ **Complete Import** - Creates company, employees, and benefit elections
✅ **Error Handling** - Reports successful imports and failures separately
✅ **Automatic Calculations** - Tax calculations triggered after import

---

## How It Works

### 1. File Upload
- User uploads Excel (.xlsx) or CSV file
- File is processed on the server

### 2. AI Analysis
- Gemini AI analyzes the raw data
- Identifies company information
- Extracts employee records
- Maps benefit elections

### 3. Data Validation
- Validates required fields
- Converts data types
- Checks for duplicates

### 4. Database Import
- Creates company record
- Creates employee records
- Creates benefit election records
- Links all related data

### 5. Results
- Shows success/failure summary
- Lists all imported employees
- Reports any errors

---

## File Format Requirements

### Required Company Information

The file should include (column names are flexible):

| Information | Example Values | Variations Accepted |
|-------------|----------------|---------------------|
| Company Name | "ABC Manufacturing" | company, company_name, employer |
| State | "TX" | state, st |
| Pay Frequency | "biweekly" | pay_freq, frequency, payroll_frequency |
| Billing Model | "5/3" | model, billing_model, plan |

### Required Employee Information

| Information | Example Values | Variations Accepted |
|-------------|----------------|---------------------|
| First Name | "John" | first_name, firstName, fname |
| Last Name | "Doe" | last_name, lastName, lname |
| Date of Birth | "1985-03-15" | DOB, dob, birth_date, date_of_birth |
| Filing Status | "married" | filing, status, tax_status |
| Dependents | 2 | dependents, deps, num_dependents |
| Gross Pay | 3500.00 | gross_pay, gross, salary, pay |
| Tobacco Use | "no" | tobacco, smoker, tobacco_use |
| State | "TX" | state, st, employee_state |

### Optional Benefit Elections

Common benefit columns (amount per pay period):

| Benefit | Column Names Accepted |
|---------|----------------------|
| Health Savings Account | HSA, hsa, Health Savings Account |
| Health FSA | FSA, fsa, FSA Health, Health FSA |
| Dependent Care FSA | Dependent Care, Dep Care, DCFSA, dep_care |
| Dental Insurance | Dental, dental |
| Vision Insurance | Vision, vision |
| Life Insurance | Life, life, Life Insurance |
| Long Term Disability | LTD, ltd, Long Term Disability |
| Short Term Disability | STD, std, Short Term Disability |

---

## Sample File Structure

### Option 1: All-in-One Format

```csv
Company Name,State,Pay Frequency,Billing Model,First Name,Last Name,DOB,Filing Status,Dependents,Gross Pay,Tobacco,HSA,FSA,Dental,Vision
ABC Manufacturing,TX,biweekly,5/3,John,Doe,1985-03-15,married,2,3500.00,no,200.00,0,50.00,25.00
ABC Manufacturing,TX,biweekly,5/3,Jane,Smith,1990-07-22,single,0,2800.00,no,150.00,100.00,50.00,25.00
```

### Option 2: Separate Sections

The AI can also handle files with company info in headers and employee data in rows:

```
Company: ABC Manufacturing
State: TX
Pay Frequency: Biweekly
Billing Model: 5/3

First Name,Last Name,DOB,Filing,Deps,Gross Pay,HSA,Dental
John,Doe,03/15/1985,Married,2,3500,200,50
Jane,Smith,07/22/1990,Single,0,2800,150,50
```

---

## Using the Bulk Upload Feature

### Step 1: Access Bulk Upload

1. Navigate to **Companies** page
2. Click **+ Bulk Upload** button in top right
3. You'll see the upload interface

### Step 2: Prepare Your File

Ensure your file includes:
- ✅ Company information
- ✅ Employee personal information
- ✅ Benefit elections (optional but recommended)

### Step 3: Upload

1. Click **"Select Excel or CSV File"**
2. Choose your census file
3. Click **"Upload and Process"**

The system will:
- Upload the file
- Use Gemini AI to parse and structure the data
- Validate all information
- Create database records

### Step 4: Review Results

After processing, you'll see:
- ✅ Company created (with link to view)
- ✅ Number of employees successfully created
- ✅ Number of employees that failed (if any)
- ✅ List of all imported employees with benefit counts
- ✅ Details of any failures

---

## Environment Setup

### Required Environment Variable

Add to your `.env.local` file:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### Get a Gemini API Key

1. Go to https://makersuite.google.com/app/apikey
2. Create a new API key
3. Copy the key
4. Add to `.env.local`

### Fallback Behavior

If `GEMINI_API_KEY` is not set:
- System will use manual parsing logic
- Less flexible but still functional
- Requires standard column names

---

## API Endpoint

### POST `/api/bulk-upload`

**Request:**
- Content-Type: `multipart/form-data`
- Body: File upload with key `file`

**Response (Success):**
```json
{
  "ok": true,
  "company": {
    "id": "uuid",
    "name": "ABC Manufacturing"
  },
  "employees_created": 25,
  "employees_failed": 0,
  "employees": [
    {
      "id": "uuid",
      "name": "John Doe",
      "benefits_count": 3
    }
  ],
  "failures": []
}
```

**Response (Failure):**
```json
{
  "ok": false,
  "error": "Error message"
}
```

---

## Example Census Files

### Example 1: Simple Format

```csv
Company Name,State,First Name,Last Name,DOB,Filing Status,Dependents,Gross Pay,HSA,Dental
My Company,CA,John,Doe,1985-01-15,married,2,5000,300,75
My Company,CA,Jane,Smith,1990-06-22,single,0,4000,250,75
```

### Example 2: Detailed Format

```csv
Company,St,Pay Freq,Model,First,Last,Birth Date,Status,Deps,Pay,Tobacco,HSA,FSA Health,Dep Care,Dental,Vision,Life,LTD,STD
ABC Co,TX,biweekly,5/3,John,Doe,03/15/1985,Married,2,3500,N,200,0,0,50,25,0,0,0
ABC Co,TX,biweekly,5/3,Jane,Smith,07/22/1990,Single,0,2800,N,150,100,0,50,25,10,5,5
```

---

## Data Validation Rules

### Company
- **Name**: Required, cannot be empty
- **State**: 2-letter state code
- **Pay Frequency**: Must be one of: weekly, biweekly, semimonthly, monthly
- **Billing Model**: Must be one of: 5/3, 4/3, 5/1, 4/4

### Employee
- **First Name**: Required
- **Last Name**: Required
- **DOB**: Valid date, converted to YYYY-MM-DD
- **Filing Status**: Must be one of: single, married, head
- **Dependents**: Integer, defaults to 0
- **Gross Pay**: Positive number
- **Tobacco Use**: Boolean (yes/no, true/false, 1/0)

### Benefits
- **Plan Code**: Valid benefit code
- **Per Pay Amount**: Positive number
- **Reduces FIT**: Boolean, defaults to true
- **Reduces FICA**: Boolean, defaults to true

---

## Error Handling

### Common Errors and Solutions

**"No data found in file"**
- Ensure file has data rows
- Check file format is .xlsx or .csv
- Verify file isn't corrupted

**"Failed to parse file with AI"**
- Check GEMINI_API_KEY is set correctly
- Verify API key is active
- System will fall back to manual parsing

**"Employees failed to import"**
- Check required fields are present
- Verify data types are correct
- Review failure details in results

---

## Benefits of AI Parsing

### Flexibility
- Handles various column naming conventions
- Adapts to different file structures
- Understands context

### Accuracy
- Intelligent data type conversion
- Validates relationships
- Catches inconsistencies

### Time Saving
- No need for template files
- Processes files of any reasonable format
- Reduces manual data entry

---

## Troubleshooting

### Issue: Upload button is disabled
**Solution**: Select a file first

### Issue: "Processing with AI..." takes too long
**Possible causes**:
- Large file size (>1000 employees)
- Slow API response
- Complex file structure

**Solutions**:
- Split large files into smaller batches
- Check internet connection
- Try again later

### Issue: Many employees failed to import
**Check**:
- Required fields are present
- Data types are correct (dates, numbers)
- No duplicate employees
- Review failure details for specific errors

### Issue: Gemini AI not available
**Fallback**: System will use manual parsing
**Note**: Requires more standard column names

---

## Best Practices

1. **Test with small file first** - Upload 2-3 employees to verify format
2. **Use consistent naming** - Helps AI parse more accurately
3. **Include all company info** - Company name, state, pay frequency, billing model
4. **Verify dates** - Use consistent date format (MM/DD/YYYY or YYYY-MM-DD)
5. **Check numbers** - No currency symbols, use decimals for cents
6. **Review results** - Always check the results summary after upload

---

## Technical Details

### Dependencies Required

```json
{
  "@google/generative-ai": "0.21.0",
  "xlsx": "0.18.5"
}
```

### Files Created

- **API Route**: `apps/web/src/app/api/bulk-upload/route.ts`
- **UI Page**: `apps/web/src/app/companies/bulk-upload/page.tsx`
- **Updated**: `apps/web/src/app/companies/page.tsx` (added button)

### Database Tables Updated

- `companies` - One record created
- `employees` - Multiple records created
- `employee_benefits` - Multiple records per employee

---

## Future Enhancements

Potential improvements:
- [ ] Support for updating existing companies
- [ ] Duplicate detection and merging
- [ ] Preview before import
- [ ] Batch processing for very large files
- [ ] Export template file
- [ ] Import audit log
- [ ] Rollback capability

---

## Support

For issues or questions about bulk upload:
1. Check this documentation
2. Review error messages in upload results
3. Verify file format matches examples
4. Check environment variables are set

---

**Last Updated**: October 21, 2025
**Feature Status**: ✅ Ready to Use (requires Gemini API key)
