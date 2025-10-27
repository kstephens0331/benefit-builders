// apps/web/src/app/api/bulk-upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as XLSX from 'xlsx';
import { sendWelcomeEmail } from '@/lib/email';

const geminiApiKey = process.env.GEMINI_API_KEY!;

if (!geminiApiKey) {
  console.warn('GEMINI_API_KEY not set - AI parsing will not work');
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { ok: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Read the Excel file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Parse Excel to JSON
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Try to find the header row by looking for common employee data column names
    // Convert sheet to array of arrays first
    const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

    console.log('Excel parsing - total rows:', sheetData.length);
    console.log('First 5 rows sample:');
    sheetData.slice(0, 5).forEach((row, idx) => {
      console.log(`Row ${idx}:`, row);
    });

    // Find the header row (look for rows with "Last Name" or "First Name")
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(15, sheetData.length); i++) {
      const row = sheetData[i];
      if (!row || row.length === 0) continue;

      // Filter out empty cells and join
      const rowStr = row.filter((cell: any) => cell !== null && cell !== undefined && cell !== '').join('|').toLowerCase();

      console.log(`Checking row ${i} for headers: "${rowStr.substring(0, 100)}"`);

      if (rowStr.includes('last name') || rowStr.includes('first name') ||
          rowStr.includes('paycheck gross') || rowStr.includes('gross pay')) {
        headerRowIndex = i;
        console.log(`✓ Found header row at index ${i}`);
        break;
      }
    }

    if (headerRowIndex === -1) {
      console.log('⚠ No header row found - using first row as headers');
    }

    // If we found a header row, parse from that row
    const rawData = headerRowIndex >= 0
      ? XLSX.utils.sheet_to_json(worksheet, { range: headerRowIndex, defval: '' })
      : XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    console.log('Parsed raw data - row count:', rawData.length);
    if (rawData.length > 0) {
      console.log('First row columns:', Object.keys(rawData[0] as object));
      console.log('First row sample:', JSON.stringify(rawData[0], null, 2));
    }

    if (!rawData || rawData.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No data found in file' },
        { status: 400 }
      );
    }

    // Use Gemini AI to analyze and structure the data
    const structuredData = await parseWithGemini(rawData);

    if (!structuredData) {
      return NextResponse.json(
        { ok: false, error: 'Failed to parse file with AI' },
        { status: 500 }
      );
    }

    // Log structured data for debugging
    console.log('Structured data:', JSON.stringify(structuredData, null, 2));
    console.log('Employees count:', structuredData.employees?.length || 0);

    // Process the structured data
    const result = await processStructuredData(structuredData);

    return NextResponse.json({
      ok: true,
      message: 'File processed successfully',
      debug_info: {
        columns_found: Object.keys(rawData[0] || {}),
        employees_parsed: structuredData.employees?.length || 0,
      },
      ...result,
    });
  } catch (error: any) {
    console.error('Bulk upload error:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

async function parseWithGemini(rawData: any[]): Promise<any> {
  if (!geminiApiKey) {
    // Fallback to manual parsing if no API key
    return manualParse(rawData);
  }

  try {
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    // Use gemini-1.5-flash for faster, cost-effective parsing
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
You are a data extraction specialist for a benefits administration system.
Analyze this employee census data and extract the following information in strict JSON format:

COMPANY INFORMATION:
- Company name
- State (2-letter code)
- Pay frequency (weekly, biweekly, semimonthly, or monthly)
- Billing model (one of: 5/3, 4/3, 5/1, 4/4)

EMPLOYEE INFORMATION (array):
For each employee:
- First name
- Last name
- Date of birth (YYYY-MM-DD format)
- Filing status (single, married, or head)
- Number of dependents (integer)
- Gross pay per paycheck (number)
- Tobacco use (boolean)
- State (2-letter code, can be different from company)

BENEFIT ELECTIONS (array per employee):
For each benefit:
- Plan code (e.g., HSA, FSA_HEALTH, FSA_DEPENDENT_CARE, DENTAL, VISION, etc.)
- Per-pay amount (number)
- Reduces FIT (boolean, default true for most pre-tax benefits)
- Reduces FICA (boolean, default true for most pre-tax benefits)

Raw census data:
${JSON.stringify(rawData, null, 2)}

Return ONLY valid JSON in this exact structure:
{
  "company": {
    "name": "Company Name",
    "state": "TX",
    "pay_frequency": "biweekly",
    "model": "5/3"
  },
  "employees": [
    {
      "first_name": "John",
      "last_name": "Doe",
      "dob": "1985-03-15",
      "filing_status": "married",
      "dependents": 2,
      "gross_pay": 3500.00,
      "tobacco_use": false,
      "state": "TX",
      "benefits": [
        {
          "plan_code": "HSA",
          "per_pay_amount": 200.00,
          "reduces_fit": true,
          "reduces_fica": true
        }
      ]
    }
  ]
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
                      text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }

    const jsonText = jsonMatch[1] || jsonMatch[0];
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Gemini parsing error:', error);
    // Fallback to manual parsing
    return manualParse(rawData);
  }
}

function manualParse(rawData: any[]): any {
  // Basic manual parsing logic
  // This is a fallback when AI is not available

  console.log('Manual parse - raw data sample:', JSON.stringify(rawData[0], null, 2));
  console.log('Manual parse - available columns:', Object.keys(rawData[0] || {}));

  const companyName = rawData[0]?.['Company Name'] || rawData[0]?.company || 'Imported Company';
  const state = rawData[0]?.['State'] || rawData[0]?.state || 'TX';

  const employees = rawData.map((row: any, index: number) => {
    // Try to find first name from various possible column names
    const first_name = row['First Name'] || row['first_name'] || row['firstName'] ||
                       row['First'] || row['first'] || row['FIRST NAME'] ||
                       row['Employee First Name'] || row['EE First Name'] || '';

    // Try to find last name from various possible column names
    const last_name = row['Last Name'] || row['last_name'] || row['lastName'] ||
                      row['Last'] || row['last'] || row['LAST NAME'] ||
                      row['Employee Last Name'] || row['EE Last Name'] || '';

    // Find gross pay value - check all possible column names
    const grossPayValue = row['Paycheck Gross Pay'] || row['Gross Pay'] || row['gross'] ||
                          row['salary'] || row['Gross'] || row['Pay'] ||
                          row['Gross Salary'] || row['Annual Salary'] || row['Wage'] ||
                          row['wages'] || row['GROSS PAY'] || row['PAYCHECK GROSS PAY'];

    console.log(`Row ${index + 1} (${first_name} ${last_name}):`, {
      availableColumns: Object.keys(row),
      grossPayColumn: Object.keys(row).find(k => k.toLowerCase().includes('gross') || k.toLowerCase().includes('pay')),
      grossPayValue,
    });

    const emp = {
      first_name,
      last_name,
      dob: parseDateOfBirth(row['DOB'] || row['dob'] || row['Date of Birth'] || row['Birth Date'] || row['Birthdate']),
      filing_status: parseFilingStatus(row['W-4 Marital Status'] || row['Filing Status'] || row['filing'] || row['status'] || row['Filing'] || row['Tax Filing Status'] || row['Marital Status']),
      dependents: parseInt(row['W-4 Dependents'] || row['Dependents'] || row['dependents'] || row['Deps'] || row['# Dependents'] || row['Number of Dependents'] || '0', 10),
      gross_pay: parseGrossPay(grossPayValue),
      tobacco_use: parseTobacco(row['Tobacco'] || row['tobacco'] || row['smoker'] || row['Tobacco Use'] || row['Smoker']),
      state: row['ST'] || row['State'] || row['state'] || row['st'] || state,
      hire_date: parseDateOfBirth(row['Hire Date'] || row['hire_date'] || row['HireDate'] || row['Start Date']),
      ssn: row['Social Security Number'] || row['SSN'] || row['ssn'] || null,
      pay_period: row['Pay Period'] || row['pay_period'] || null,
      benefits: parseBenefits(row),
    };
    console.log('Parsed employee:', emp.first_name, emp.last_name, 'gross:', emp.gross_pay, 'ssn:', emp.ssn ? 'present' : 'missing');
    return emp;
  });

  const filteredEmployees = employees.filter((e: any) => e.first_name && e.last_name);
  console.log(`Manual parse - filtered ${filteredEmployees.length} of ${employees.length} employees`);

  return {
    company: {
      name: companyName,
      state: state,
      pay_frequency: 'biweekly', // default
      model: '5/3', // default
    },
    employees: filteredEmployees,
  };
}

function parseDateOfBirth(dob: any): string {
  if (!dob) return '';
  try {
    const date = new Date(dob);
    return date.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

function parseFilingStatus(status: any): string {
  if (!status) return 'single';
  const s = status.toString().toLowerCase();
  if (s.includes('marr')) return 'married';
  if (s.includes('head')) return 'head';
  return 'single';
}

function parseTobacco(value: any): boolean {
  if (!value) return false;
  const v = value.toString().toLowerCase();
  return v === 'yes' || v === 'true' || v === '1' || v === 'y';
}

function parseGrossPay(value: any): number {
  if (!value) return 0;

  // Handle various formats: "$1,234.56", "1234.56", "1,234", etc.
  const str = value.toString().replace(/[$,]/g, '').trim();
  const num = parseFloat(str);

  console.log('Parsing gross pay:', value, '→', str, '→', num);

  return isNaN(num) ? 0 : num;
}

function parseBenefits(row: any): any[] {
  const benefits = [];

  // Common benefit columns
  const benefitMappings = [
    { key: ['HSA', 'hsa', 'Health Savings Account'], code: 'HSA' },
    { key: ['FSA', 'fsa', 'FSA Health', 'Health FSA'], code: 'FSA_HEALTH' },
    { key: ['Dependent Care', 'Dep Care', 'DCFSA', 'dep_care'], code: 'FSA_DEPENDENT_CARE' },
    { key: ['Dental', 'dental'], code: 'DENTAL' },
    { key: ['Vision', 'vision'], code: 'VISION' },
    { key: ['Life', 'life', 'Life Insurance'], code: 'LIFE' },
    { key: ['LTD', 'ltd', 'Long Term Disability'], code: 'LTD' },
    { key: ['STD', 'std', 'Short Term Disability'], code: 'STD' },
  ];

  for (const mapping of benefitMappings) {
    for (const key of mapping.key) {
      const amount = parseFloat(row[key] || row[key.toLowerCase()] || '0');
      if (amount > 0) {
        benefits.push({
          plan_code: mapping.code,
          per_pay_amount: amount,
          reduces_fit: true,
          reduces_fica: !mapping.code.includes('STD') && !mapping.code.includes('LTD'), // STD/LTD typically don't reduce FICA
        });
        break; // Found this benefit, move to next
      }
    }
  }

  return benefits;
}

async function processStructuredData(data: any) {
  const supabase = createServiceClient();

  // Create company
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert({
      name: data.company.name,
      state: data.company.state,
      pay_frequency: data.company.pay_frequency,
      model: data.company.model,
      contact_email: data.company.contact_email || null,
      status: 'active',
    })
    .select()
    .single();

  if (companyError || !company) {
    throw new Error(`Failed to create company: ${companyError?.message}`);
  }

  // Send welcome email to new company
  if (company.contact_email) {
    await sendWelcomeEmail(company.name, company.contact_email).catch((err) => {
      console.error(`Failed to send welcome email to ${company.contact_email}:`, err);
      // Don't fail the upload process if email fails
    });
  }

  const employeesCreated = [];
  const employeesFailed = [];

  // Create employees and their benefits
  for (const empData of data.employees) {
    try {
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .insert({
          company_id: company.id,
          first_name: empData.first_name,
          last_name: empData.last_name,
          dob: empData.dob || null,
          filing_status: empData.filing_status,
          dependents: empData.dependents,
          gross_pay: empData.gross_pay,
          tobacco_use: empData.tobacco_use,
          active: true,
          consent_status: 'pending',
        })
        .select()
        .single();

      if (empError || !employee) {
        employeesFailed.push({
          name: `${empData.first_name} ${empData.last_name}`,
          error: empError?.message,
        });
        continue;
      }

      // Add benefits
      if (empData.benefits && empData.benefits.length > 0) {
        const benefitsToInsert = empData.benefits.map((b: any) => ({
          employee_id: employee.id,
          plan_code: b.plan_code,
          per_pay_amount: b.per_pay_amount,
          reduces_fit: b.reduces_fit ?? true,
          reduces_fica: b.reduces_fica ?? true,
          effective_date: new Date().toISOString().split('T')[0],
        }));

        const { error: benefitsError } = await supabase
          .from('employee_benefits')
          .insert(benefitsToInsert);

        if (benefitsError) {
          console.warn(`Benefits error for ${employee.id}:`, benefitsError);
        }
      }

      employeesCreated.push({
        id: employee.id,
        name: `${employee.first_name} ${employee.last_name}`,
        benefits_count: empData.benefits?.length || 0,
      });
    } catch (error: any) {
      employeesFailed.push({
        name: `${empData.first_name} ${empData.last_name}`,
        error: error.message,
      });
    }
  }

  return {
    company: {
      id: company.id,
      name: company.name,
    },
    employees_created: employeesCreated.length,
    employees_failed: employeesFailed.length,
    employees: employeesCreated,
    failures: employeesFailed,
  };
}
