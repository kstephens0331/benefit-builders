// src/app/companies/[id]/deductions-report/pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// Helper to parse plan_code into provider and category
function parsePlanCode(planCode: string): { provider: string; category: string } {
  if (planCode.includes(" - ")) {
    const [provider, ...rest] = planCode.split(" - ");
    return { provider: provider.trim(), category: rest.join(" - ").trim() };
  }
  return { provider: planCode, category: "-" };
}

type EmployeeBenefit = {
  id: string;
  plan_code: string;
  per_pay_amount: number;
};

type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  employee_benefits: EmployeeBenefit[];
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await context.params;
  const db = createServiceClient();

  // Get company info
  const { data: company } = await db
    .from("companies")
    .select("id, name, pay_frequency, address, city, state, zip")
    .eq("id", companyId)
    .single();

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  // Get all employees with their benefits
  const { data: employees } = await db
    .from("employees")
    .select(`
      id,
      first_name,
      last_name,
      employee_benefits (
        id,
        plan_code,
        per_pay_amount
      )
    `)
    .eq("company_id", companyId)
    .eq("active", true)
    .order("last_name", { ascending: true });

  const employeesWithBenefits = ((employees as Employee[]) ?? []).filter(
    (emp) => emp.employee_benefits && emp.employee_benefits.length > 0
  );

  // Calculate grand total
  let grandTotal = 0;
  let totalBenefits = 0;
  employeesWithBenefits.forEach((emp) => {
    emp.employee_benefits.forEach((b) => {
      grandTotal += Number(b.per_pay_amount || 0);
      totalBenefits++;
    });
  });

  // Format pay frequency
  const payFreqDisplay: Record<string, string> = {
    weekly: "Weekly",
    biweekly: "Bi-Weekly",
    semimonthly: "Semi-Monthly",
    monthly: "Monthly",
  };

  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Generate HTML for PDF
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Deduction Report - ${company.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #1e293b;
      padding: 40px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 20px;
    }
    .header h1 {
      font-size: 24pt;
      color: #1e40af;
      margin-bottom: 5px;
    }
    .header .company-name {
      font-size: 18pt;
      color: #1e293b;
      margin-bottom: 10px;
    }
    .header .date {
      color: #64748b;
      font-size: 10pt;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 30px;
      padding: 15px;
      background: #f8fafc;
      border-radius: 8px;
    }
    .info-item label {
      display: block;
      font-size: 9pt;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .info-item span {
      font-weight: 600;
    }
    .employee-section {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    .employee-header {
      background: #f1f5f9;
      padding: 10px 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 6px 6px 0 0;
      border: 1px solid #e2e8f0;
      border-bottom: none;
    }
    .employee-name {
      font-weight: 600;
      font-size: 12pt;
    }
    .employee-total {
      font-size: 10pt;
      color: #64748b;
    }
    .employee-total strong {
      color: #1e293b;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #e2e8f0;
      border-top: none;
    }
    th {
      background: #e2e8f0;
      text-align: left;
      padding: 8px 15px;
      font-size: 9pt;
      text-transform: uppercase;
      color: #475569;
      border-bottom: 1px solid #cbd5e1;
    }
    th:last-child {
      text-align: right;
    }
    td {
      padding: 10px 15px;
      border-bottom: 1px solid #f1f5f9;
    }
    td:last-child {
      text-align: right;
      font-weight: 500;
    }
    tr:nth-child(even) td {
      background: #fafafa;
    }
    .grand-total {
      margin-top: 30px;
      padding: 20px;
      background: #1e40af;
      color: white;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .grand-total .label {
      font-size: 10pt;
      opacity: 0.9;
    }
    .grand-total .summary {
      font-size: 11pt;
    }
    .grand-total .amount {
      font-size: 24pt;
      font-weight: 700;
    }
    .grand-total .per-check {
      font-size: 10pt;
      opacity: 0.9;
    }
    .footer {
      margin-top: 40px;
      padding-top: 15px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 9pt;
      color: #94a3b8;
    }
    @media print {
      body { padding: 20px; }
      .employee-section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Benefit Deduction Report</h1>
    <div class="company-name">${company.name}</div>
    <div class="date">${currentDate}</div>
  </div>

  <div class="info-grid">
    <div class="info-item">
      <label>Company</label>
      <span>${company.name}</span>
    </div>
    <div class="info-item">
      <label>Pay Frequency</label>
      <span>${payFreqDisplay[company.pay_frequency || "biweekly"] || "Bi-Weekly"}</span>
    </div>
    <div class="info-item">
      <label>Report Generated</label>
      <span>${currentDate}</span>
    </div>
    <div class="info-item">
      <label>Employees with Deductions</label>
      <span>${employeesWithBenefits.length}</span>
    </div>
  </div>

  ${employeesWithBenefits.length === 0 ? `
    <div style="text-align: center; padding: 40px; color: #64748b;">
      <p>No employees have enrolled benefits</p>
    </div>
  ` : employeesWithBenefits.map((emp) => {
    const empTotal = emp.employee_benefits.reduce(
      (sum, b) => sum + Number(b.per_pay_amount || 0),
      0
    );
    return `
      <div class="employee-section">
        <div class="employee-header">
          <span class="employee-name">${emp.last_name}, ${emp.first_name}</span>
          <span class="employee-total">Total: <strong>$${empTotal.toFixed(2)}</strong></span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Provider</th>
              <th>Benefit Type</th>
              <th>Per Check</th>
            </tr>
          </thead>
          <tbody>
            ${emp.employee_benefits.map((b) => {
              const { provider, category } = parsePlanCode(b.plan_code);
              return `
                <tr>
                  <td>${provider}</td>
                  <td>${category}</td>
                  <td>$${Number(b.per_pay_amount || 0).toFixed(2)}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }).join("")}

  ${employeesWithBenefits.length > 0 ? `
    <div class="grand-total">
      <div>
        <div class="label">Total Deductions per Pay Period</div>
        <div class="summary">${employeesWithBenefits.length} employees with ${totalBenefits} benefits</div>
      </div>
      <div style="text-align: right;">
        <div class="amount">$${grandTotal.toFixed(2)}</div>
        <div class="per-check">per paycheck</div>
      </div>
    </div>
  ` : ""}

  <div class="footer">
    Generated by Benefits Builder &bull; ${currentDate}
  </div>
</body>
</html>
  `;

  // Return HTML that can be printed to PDF
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
