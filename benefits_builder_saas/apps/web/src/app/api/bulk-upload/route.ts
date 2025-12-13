// apps/web/src/app/api/bulk-upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';
import * as XLSX from 'xlsx';
import { sendWelcomeEmail } from '@/lib/email';

// Dynamic import for pdf-parse to avoid Next.js/Vercel initialization issues
async function parsePDFBuffer(buffer: Buffer): Promise<{ text: string }> {
  // pdf-parse has issues in serverless environments - it tries to load a test PDF
  // We need to dynamically import and pass a custom render function to avoid this
  // @ts-ignore - pdf-parse doesn't have proper types
  const pdfParse = (await import('pdf-parse')).default;

  // Pass options to prevent pdf-parse from trying to load its test file
  const options = {
    // Custom page render to extract text
    pagerender: function(pageData: any) {
      return pageData.getTextContent().then(function(textContent: any) {
        let text = '';
        for (let item of textContent.items) {
          text += item.str + ' ';
        }
        return text;
      });
    }
  };

  return await pdfParse(buffer, options);
}

const anthropicApiKey = process.env.ANTHROPIC_API_KEY!;

if (!anthropicApiKey) {
  console.warn('ANTHROPIC_API_KEY not set - AI parsing will not work');
}

// Valid billing models
const VALID_MODELS = ['5/3', '3/4', '5/1', '5/0', '4/4', '6/0', '1/5'];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const pdfUrl = formData.get('url') as string | null;
    const selectedModel = formData.get('model') as string | null;

    // Validate we have either a file or URL
    if (!file && !pdfUrl) {
      return NextResponse.json(
        { ok: false, error: 'No file uploaded and no URL provided' },
        { status: 400 }
      );
    }

    let buffer: Buffer;
    let fileName: string;
    let fileType: string;

    // Handle URL-based PDF fetch
    if (pdfUrl) {
      console.log('Fetching PDF from URL:', pdfUrl);
      try {
        const response = await fetch(pdfUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
        fileName = pdfUrl.split('/').pop() || 'downloaded.pdf';
        fileType = 'application/pdf';
        console.log('PDF fetched successfully, size:', buffer.length);
      } catch (fetchError: any) {
        return NextResponse.json(
          { ok: false, error: `Failed to fetch PDF from URL: ${fetchError.message}` },
          { status: 400 }
        );
      }
    } else if (file) {
      // Handle file upload
      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
      fileName = file.name;
      fileType = file.type;
    } else {
      return NextResponse.json(
        { ok: false, error: 'No file or URL provided' },
        { status: 400 }
      );
    }

    // Detect if this is a PDF
    const isPDF = fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');

    if (isPDF) {
      // Handle PDF file
      return await processPDF(buffer, selectedModel);
    }

    // Handle Excel/CSV file (existing logic)

    // Parse Excel to JSON
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Try to find the header row by looking for common employee data column names
    // Convert sheet to array of arrays first
    const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

    console.log('Excel parsing - total rows:', sheetData.length);
    console.log('First 10 rows sample:');
    sheetData.slice(0, 10).forEach((row, idx) => {
      console.log(`Row ${idx}:`, row);
    });

    // Extract company info from specific cells
    // Excel columns: A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7, I=8, J=9
    // Row indices are 0-based: Row 4 = index 3, Row 5 = index 4, etc.
    let extractedCompanyName = '';
    let extractedAddress = '';
    let extractedCity = '';
    let extractedState = '';
    let extractedZip = '';
    let extractedContactName = '';
    let extractedPayFrequency = '';

    // Company name is ALWAYS in cell F4 (row 3, column 5 in 0-indexed)
    if (sheetData[3] && sheetData[3][5]) {
      extractedCompanyName = sheetData[3][5].toString().trim();
      console.log(`✓ Found company name in F4: "${extractedCompanyName}"`);
    }

    // Address is in cell F5 (row 4, column 5)
    if (sheetData[4] && sheetData[4][5]) {
      extractedAddress = sheetData[4][5].toString().trim();
      console.log(`✓ Found address in F5: "${extractedAddress}"`);
    }

    // City is in cell F6 (row 5, column 5)
    if (sheetData[5] && sheetData[5][5]) {
      extractedCity = sheetData[5][5].toString().trim();
      console.log(`✓ Found city in F6: "${extractedCity}"`);
    }

    // State and ZIP are in cell F7 (row 6, column 5) - format: "TX 75001" or "TX, 75001"
    if (sheetData[6] && sheetData[6][5]) {
      const stateZip = sheetData[6][5].toString().trim();
      console.log(`✓ Found state/zip in F7: "${stateZip}"`);
      // Parse state and zip - typically "TX 75001" or "TX, 75001" or "Texas 75001"
      const stateZipMatch = stateZip.match(/^([A-Za-z]{2})[,\s]+(\d{5}(?:-\d{4})?)$/);
      if (stateZipMatch) {
        extractedState = stateZipMatch[1].toUpperCase();
        extractedZip = stateZipMatch[2];
      } else {
        // Try to extract state code if it's just a 2-letter code
        const stateMatch = stateZip.match(/([A-Z]{2})/);
        const zipMatch = stateZip.match(/(\d{5}(?:-\d{4})?)/);
        if (stateMatch) extractedState = stateMatch[1];
        if (zipMatch) extractedZip = zipMatch[1];
      }
      console.log(`  → Parsed state: "${extractedState}", zip: "${extractedZip}"`);
    }

    // Point of contact is in cell J8 (row 7, column 9)
    if (sheetData[7] && sheetData[7][9]) {
      extractedContactName = sheetData[7][9].toString().trim();
      console.log(`✓ Found point of contact in J8: "${extractedContactName}"`);
    }

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

    // Look for pay frequency and state in the header area
    const rowsBeforeHeader = headerRowIndex > 0 ? headerRowIndex : 10;
    for (let i = 0; i < rowsBeforeHeader; i++) {
      const row = sheetData[i];
      if (!row || row.length === 0) continue;

      // Convert row to string for pattern matching
      const rowText = row.filter((cell: any) => cell !== null && cell !== undefined && cell !== '').join(' ');
      const rowTextLower = rowText.toLowerCase();

      console.log(`Scanning row ${i} for company info: "${rowText.substring(0, 100)}"`);

      // Look for pay frequency
      if (!extractedPayFrequency) {
        if (rowTextLower.includes('weekly') || rowTextLower.includes('biweekly') ||
            rowTextLower.includes('bi-weekly') || rowTextLower.includes('semimonthly') ||
            rowTextLower.includes('semi-monthly') || rowTextLower.includes('monthly')) {
          if (rowTextLower.includes('biweekly') || rowTextLower.includes('bi-weekly')) {
            extractedPayFrequency = 'biweekly';
          } else if (rowTextLower.includes('semimonthly') || rowTextLower.includes('semi-monthly')) {
            extractedPayFrequency = 'semimonthly';
          } else if (rowTextLower.includes('monthly') && !rowTextLower.includes('semi')) {
            extractedPayFrequency = 'monthly';
          } else if (rowTextLower.includes('weekly') && !rowTextLower.includes('bi')) {
            extractedPayFrequency = 'weekly';
          }
          if (extractedPayFrequency) {
            console.log(`✓ Found pay frequency: "${extractedPayFrequency}"`);
          }
        }
      }

      // Look for state code (2-letter abbreviation)
      if (!extractedState) {
        for (const cell of row) {
          const cellStr = (cell?.toString() || '').trim().toUpperCase();
          // Match 2-letter state codes
          if (cellStr.match(/^[A-Z]{2}$/) && isValidStateCode(cellStr)) {
            extractedState = cellStr;
            console.log(`✓ Found state code: "${extractedState}"`);
            break;
          }
        }
      }
    }

    console.log('Extracted company info:', { extractedCompanyName, extractedPayFrequency, extractedState });

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

    // Use Claude AI to analyze and structure the data
    // Pass the extracted company info to help with parsing
    const structuredData = await parseWithClaude(rawData, {
      companyName: extractedCompanyName,
      address: extractedAddress,
      city: extractedCity,
      state: extractedState,
      zip: extractedZip,
      contactName: extractedContactName,
      payFrequency: extractedPayFrequency,
      sheetName: sheetName,  // Sheet name sometimes contains company name
    }, selectedModel);

    if (!structuredData) {
      return NextResponse.json(
        {
          ok: false,
          error: anthropicApiKey
            ? 'Failed to parse file with AI'
            : 'ANTHROPIC_API_KEY not configured. AI-powered parsing unavailable. Please configure the API key or use manual data entry.'
        },
        { status: 500 }
      );
    }

    // Apply user-selected model if provided (overrides AI detection)
    if (selectedModel && selectedModel !== 'auto' && VALID_MODELS.includes(selectedModel)) {
      structuredData.company = structuredData.company || {};
      structuredData.company.model = selectedModel;
      console.log('Using user-selected model:', selectedModel);
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
        company_name_extracted: extractedCompanyName || '(none)',
        model_used: structuredData.company?.model || '5/3',
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

// Helper function to validate US state codes
function isValidStateCode(code: string): boolean {
  const validStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
  ];
  return validStates.includes(code);
}

// Process PDF files using pdf-parse and Claude AI
async function processPDF(buffer: Buffer, selectedModel: string | null): Promise<NextResponse> {
  let structuredData: any = null;
  let parseMethod = 'unknown';

  try {
    // Try pdf-parse first (faster, works locally)
    try {
      console.log('Attempting pdf-parse extraction...');
      const pdfData = await parsePDFBuffer(buffer);
      const pdfText = pdfData.text;

      console.log('PDF text extracted, length:', pdfText.length);

      if (pdfText && pdfText.trim().length > 100) {
        // Use Claude AI to parse the extracted text
        structuredData = await parsePDFWithClaude(pdfText, selectedModel);
        parseMethod = 'pdf-parse';
        console.log('Successfully parsed with pdf-parse');
      } else {
        console.log('pdf-parse returned insufficient text, falling back to Claude vision');
      }
    } catch (pdfParseError: any) {
      console.log('pdf-parse failed, falling back to Claude vision:', pdfParseError.message);
    }

    // Fallback: Use Claude's native PDF vision (works on Vercel/serverless)
    if (!structuredData) {
      console.log('Using Claude native PDF vision...');
      structuredData = await parsePDFWithClaudeVision(buffer, selectedModel);
      parseMethod = 'claude-vision';
      console.log('Successfully parsed with Claude vision');
    }

    if (!structuredData) {
      return NextResponse.json(
        {
          ok: false,
          error: anthropicApiKey
            ? 'Failed to parse PDF with AI'
            : 'ANTHROPIC_API_KEY not configured. AI-powered PDF parsing unavailable.'
        },
        { status: 500 }
      );
    }

    // Apply user-selected model if provided (overrides AI detection)
    if (selectedModel && selectedModel !== 'auto' && VALID_MODELS.includes(selectedModel)) {
      structuredData.company = structuredData.company || {};
      structuredData.company.model = selectedModel;
      console.log('Using user-selected model for PDF:', selectedModel);
    }

    // Log structured data for debugging
    console.log('PDF structured data:', JSON.stringify(structuredData, null, 2));

    // Process the structured data
    const result = await processStructuredData(structuredData);

    return NextResponse.json({
      ok: true,
      message: 'PDF processed successfully',
      debug_info: {
        parse_method: parseMethod,
        employees_parsed: structuredData.employees?.length || 0,
        model_used: structuredData.company?.model || '5/3',
      },
      ...result,
    });
  } catch (error: any) {
    console.error('PDF processing error:', error);
    return NextResponse.json(
      { ok: false, error: `PDF processing failed: ${error.message}` },
      { status: 500 }
    );
  }
}

// Parse PDF using Claude's native document vision (works on serverless)
async function parsePDFWithClaudeVision(buffer: Buffer, selectedModel: string | null): Promise<any> {
  if (!anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  try {
    // Convert buffer to base64
    const base64PDF = buffer.toString('base64');

    const prompt = `You are a data extraction specialist for a benefits administration system.
Analyze this employee census/payroll PDF document and extract the following information in strict JSON format.

IMPORTANT:
- The data may come from various payroll systems and formats
- Some PDFs have data split across pages (e.g., names on page 1, marital status on page 2) - correlate them by row order
- Look for patterns and extract as much data as possible
- Pay close attention to column headers

BILLING MODEL DETECTION:
- Look for patterns like "5/3", "3/4", "5/1", "4/4", "5/0", "6/0", "1/5"
- Default to "5/3" if not found

COMPANY INFORMATION:
- Company name (look for headers, titles, filename hints, or company identifiers)
- State (2-letter code, default "TX" if not found)
- Pay frequency: W=weekly, B=biweekly, S=semimonthly, M=monthly
- Billing model (one of: 5/3, 3/4, 5/1, 5/0, 4/4, 6/0, 1/5)

EMPLOYEE INFORMATION (array):
For each employee:
- first_name, last_name
- dob (YYYY-MM-DD format)
- filing_status: S/Single=single, HOH=head, MFJ/M/Married=married, E=single
- dependents (integer, 0 if blank)
- gross_pay (TOTAL COMPENSATION column)
- tobacco_use (false if not found)
- state (2-letter code)

${selectedModel && selectedModel !== 'auto' ? `USER SELECTED MODEL: ${selectedModel}` : ''}

Return ONLY valid JSON (no markdown, no explanation):
{"company":{"name":"...","state":"TX","pay_frequency":"weekly","model":"5/3"},"employees":[{"first_name":"...","last_name":"...","dob":"1990-01-01","filing_status":"single","dependents":0,"gross_pay":1000.00,"tobacco_use":false,"state":"TX","benefits":[]}]}`;

    // Use fetch to call Claude API directly with PDF beta header
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'pdfs-2024-09-25',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16384,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: base64PDF,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    // Extract text from Claude's response
    const textContent = result.content?.find((block: any) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in Claude response');
    }

    const text = textContent.text;
    console.log('Claude vision response length:', text.length);
    console.log('Claude vision response preview:', text.substring(0, 500));

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
                      text.match(/```\s*([\s\S]*?)\s*```/) ||
                      text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error('No valid JSON found in Claude vision response:', text.substring(0, 500));
      throw new Error('No valid JSON found in AI response');
    }

    const jsonText = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonText);

    console.log('Successfully parsed PDF with Claude vision:', {
      company: parsed.company?.name,
      model: parsed.company?.model,
      employees: parsed.employees?.length
    });

    return parsed;
  } catch (error) {
    console.error('Claude vision PDF parsing error:', error);
    throw error;
  }
}

// Parse PDF text using Claude AI
async function parsePDFWithClaude(pdfText: string, selectedModel: string | null): Promise<any> {
  if (!anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  try {
    const anthropic = new Anthropic({
      apiKey: anthropicApiKey,
    });

    const prompt = `You are a data extraction specialist for a benefits administration system.
Analyze this employee census/payroll data extracted from a PDF and extract the following information in strict JSON format.

IMPORTANT: The data may come from various payroll systems and formats. Look for patterns and extract as much data as possible.

BILLING MODEL DETECTION:
- Look for patterns like "5/3", "3/4", "5/1", "4/4", "5/0", "6/0", "1/5"
- "5% employee / 3% employer" means model "5/3"
- "3% employee / 4% employer" means model "3/4"
- Schools often use "5/0" (5% employee, 0% employer)
- Default to "5/3" if not found

COMPANY INFORMATION:
- Company name (look for headers, titles, or company identifiers)
- State (2-letter code)
- Pay frequency (weekly, biweekly, semimonthly, or monthly) - look for pay period indicators
- Billing model (one of: 5/3, 3/4, 5/1, 5/0, 4/4, 6/0, 1/5)

EMPLOYEE INFORMATION (array):
For each employee found:
- First name
- Last name
- Date of birth (YYYY-MM-DD format if available)
- Filing status (single, married, or head) - look for W-4 status, marital status
- Number of dependents (integer)
- Gross pay per paycheck (number) - look for wages, salary, gross pay columns
- Tobacco use (boolean, default false if not found)
- State (2-letter code, can be different from company)

BENEFIT ELECTIONS (array per employee):
For each benefit found:
- Plan code (HSA, FSA_HEALTH, FSA_DEPENDENT_CARE, DENTAL, VISION, LIFE, STD, LTD, etc.)
- Per-pay amount (number)
- Reduces FIT (boolean, default true for most pre-tax benefits)
- Reduces FICA (boolean, default true for most pre-tax benefits)

PDF TEXT CONTENT:
${pdfText.substring(0, 50000)}

${selectedModel && selectedModel !== 'auto' ? `USER SELECTED MODEL: ${selectedModel} - Use this model unless you find a different one explicitly stated in the document.` : ''}

Return ONLY valid JSON in this exact structure (no additional text):
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

    // Use Claude Haiku for fast, cost-effective parsing
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract text from Claude's response
    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in Claude response');
    }

    const text = textContent.text;
    console.log('Claude PDF parsing response length:', text.length);

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
                      text.match(/```\s*([\s\S]*?)\s*```/) ||
                      text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error('No valid JSON found in Claude response:', text.substring(0, 500));
      throw new Error('No valid JSON found in AI response');
    }

    const jsonText = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonText);

    console.log('Successfully parsed PDF data:', {
      company: parsed.company?.name,
      model: parsed.company?.model,
      employees: parsed.employees?.length
    });

    return parsed;
  } catch (error) {
    console.error('Claude PDF parsing error:', error);
    throw error;
  }
}

interface ExtractedCompanyInfo {
  companyName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  contactName: string;
  payFrequency: string;
  sheetName: string;
}

async function parseWithClaude(rawData: any[], extractedInfo?: ExtractedCompanyInfo, selectedModel?: string | null): Promise<any> {
  if (!anthropicApiKey) {
    // Fallback to manual parsing if no API key
    return manualParse(rawData, extractedInfo, selectedModel);
  }

  try {
    const anthropic = new Anthropic({
      apiKey: anthropicApiKey,
    });

    const prompt = `You are a data extraction specialist for a benefits administration system.
Analyze this employee census data and extract the following information in strict JSON format:

COMPANY INFORMATION:
- Company name
- State (2-letter code)
- Pay frequency (weekly, biweekly, semimonthly, or monthly)
- Billing model (one of: 5/3, 3/4, 5/1, 4/4)

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

    // Use Claude Haiku for fast, cost-effective parsing
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract text from Claude's response
    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in Claude response');
    }

    const text = textContent.text;

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
                      text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }

    const jsonText = jsonMatch[1] || jsonMatch[0];
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Claude parsing error:', error);
    // Fallback to manual parsing
    return manualParse(rawData, extractedInfo, selectedModel);
  }
}

function manualParse(rawData: any[], extractedInfo?: ExtractedCompanyInfo, selectedModel?: string | null): any {
  // Basic manual parsing logic
  // This is a fallback when AI is not available

  console.log('Manual parse - raw data sample:', JSON.stringify(rawData[0], null, 2));
  console.log('Manual parse - available columns:', Object.keys(rawData[0] || {}));
  console.log('Manual parse - extracted company info:', extractedInfo);
  console.log('Manual parse - selected model:', selectedModel);

  // Use extracted company info (from specific cells) or fall back to row data
  const companyName = extractedInfo?.companyName || rawData[0]?.['Company Name'] || rawData[0]?.company || 'Imported Company';
  const state = extractedInfo?.state || rawData[0]?.['State'] || rawData[0]?.state || 'TX';
  const address = extractedInfo?.address || '';
  const city = extractedInfo?.city || '';
  const zip = extractedInfo?.zip || '';
  const contactName = extractedInfo?.contactName || '';
  const payFrequency = extractedInfo?.payFrequency || 'biweekly';

  // Use selected model if valid, otherwise default to 5/3
  const model = (selectedModel && selectedModel !== 'auto' && VALID_MODELS.includes(selectedModel))
    ? selectedModel
    : '5/3';

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
      address: address,
      city: city,
      zip: zip,
      contact_name: contactName,
      pay_frequency: payFrequency,
      model: model,
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

  // Validate and provide defaults for required fields
  const companyName = data.company?.name || 'Imported Company';
  const companyState = data.company?.state || 'TX';
  const payFrequency = data.company?.pay_frequency || 'biweekly';
  // Model is required - use default if not provided
  const billingModel = data.company?.model || '5/3';
  // Optional address fields
  const address = data.company?.address || null;
  const city = data.company?.city || null;
  const zip = data.company?.zip || null;
  const contactName = data.company?.contact_name || null;

  console.log('Creating company with:', { companyName, companyState, payFrequency, billingModel, address, city, zip, contactName });

  // Create company
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert({
      name: companyName,
      state: companyState,
      pay_frequency: payFrequency,
      model: billingModel,
      contact_email: data.company?.contact_email || null,
      contact_name: contactName,
      address: address,
      city: city,
      zip: zip,
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
