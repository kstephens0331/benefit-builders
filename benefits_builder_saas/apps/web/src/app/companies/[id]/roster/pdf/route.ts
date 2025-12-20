// apps/web/src/app/companies/[id]/roster/pdf/route.ts
import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "pdf-lib";
import { createServiceClient } from "@/lib/supabase";
import { readFileSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";

// Benefit Builder company info (matches invoice)
const BENEFIT_BUILDER = {
  name: "Benefit Builder",
  address: "206A S Loop 336 W Box 322",
  cityStateZip: "Conroe, TX 77304-3300",
  email: "billdawson.bb@gmail.com",
  phone: "+1 (972) 741-5663",
  website: "https://web-dun-three-87.vercel.app",
};

// Helper to draw page header (matches invoice style)
async function drawPageHeader(
  page: PDFPage,
  helveticaBold: PDFFont,
  helvetica: PDFFont,
  company: any,
  logoImage: any,
  pageNumber: number,
  totalPages: number
) {
  const { width, height } = page.getSize();
  const leftMargin = 40;
  const rightMargin = width - 40;
  let y = height - 30;

  const bluePrimary = rgb(0.1, 0.4, 0.7);
  const grayText = rgb(0.3, 0.3, 0.3);

  // Calculate logo dimensions
  let logoHeight = 0;
  if (logoImage) {
    const logoDims = logoImage.scale(0.10);
    logoHeight = logoDims.height;
  }

  // "EMPLOYEE ROSTER" title (top left, blue)
  page.drawText("EMPLOYEE ROSTER", {
    x: leftMargin,
    y: y,
    size: 18,
    font: helveticaBold,
    color: bluePrimary,
  });

  // Logo (top right)
  if (logoImage) {
    const logoDims = logoImage.scale(0.10);
    page.drawImage(logoImage, {
      x: rightMargin - logoDims.width,
      y: y - logoDims.height + 20,
      width: logoDims.width,
      height: logoDims.height,
    });
  }

  y -= 16;

  // Benefit Builder company info (stacked on left side)
  page.drawText(BENEFIT_BUILDER.name, {
    x: leftMargin,
    y: y,
    size: 8,
    font: helveticaBold,
    color: grayText,
  });
  y -= 10;
  page.drawText(BENEFIT_BUILDER.address, {
    x: leftMargin,
    y: y,
    size: 8,
    font: helvetica,
    color: grayText,
  });
  y -= 10;
  page.drawText(BENEFIT_BUILDER.cityStateZip, {
    x: leftMargin,
    y: y,
    size: 8,
    font: helvetica,
    color: grayText,
  });
  y -= 10;
  page.drawText(BENEFIT_BUILDER.email, {
    x: leftMargin,
    y: y,
    size: 8,
    font: helvetica,
    color: grayText,
  });
  y -= 10;
  page.drawText(BENEFIT_BUILDER.phone, {
    x: leftMargin,
    y: y,
    size: 8,
    font: helvetica,
    color: grayText,
  });

  // Move Y down past the logo
  const logoBottomY = height - 30 - logoHeight + 20;
  y = Math.min(y - 12, logoBottomY - 5);

  // Company info on left
  page.drawText(`Company: ${company?.name || "Unknown"}`, {
    x: leftMargin,
    y: y,
    size: 9,
    font: helveticaBold,
    color: grayText,
  });

  // Model and date on right
  const today = new Date().toLocaleDateString("en-US");
  page.drawText(`Model: ${company?.model || "5/3"}  |  Generated: ${today}  |  Page ${pageNumber} of ${totalPages}`, {
    x: rightMargin - 250,
    y: y,
    size: 8,
    font: helvetica,
    color: grayText,
  });

  y -= 8;

  // Divider line
  page.drawLine({
    start: { x: leftMargin, y: y },
    end: { x: rightMargin, y: y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });

  return y - 10;
}

// Helper to draw page footer (matches invoice style)
function drawPageFooter(page: PDFPage, helvetica: PDFFont) {
  const { width } = page.getSize();
  const leftMargin = 40;
  const rightMargin = width - 40;
  const footerY = 30;

  const grayText = rgb(0.3, 0.3, 0.3);

  page.drawLine({
    start: { x: leftMargin, y: footerY + 10 },
    end: { x: rightMargin, y: footerY + 10 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });

  page.drawText("Benefit Builder - Empowering Your Benefits Program", {
    x: leftMargin,
    y: footerY,
    size: 8,
    font: helvetica,
    color: grayText,
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params;
  const db = createServiceClient();

  const { data: company, error: cErr } = await db
    .from("companies")
    .select("id,name,state,model,status,pay_frequency")
    .eq("id", companyId)
    .single();
  if (cErr || !company) {
    return new Response(JSON.stringify({ ok: false, error: cErr?.message ?? "Company not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  // Query with correct column names from schema
  const { data: emps, error: eErr } = await db
    .from("employees")
    .select(
      "first_name,last_name,gross_pay,filing_status,dependents,active,inactive_date,consent_status,tobacco_use,dob"
    )
    .eq("company_id", companyId)
    .order("last_name", { ascending: true });
  if (eErr) {
    return new Response(JSON.stringify({ ok: false, error: eErr.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const pdf = await PDFDocument.create();
  const helvetica = await pdf.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Load Benefit Builder logo (same as invoice)
  let logoImage: any = null;
  try {
    const logoPath = join(process.cwd(), "public", "benefit-builder-logo-trans.png");
    const logoBytes = readFileSync(logoPath);
    logoImage = await pdf.embedPng(logoBytes);
  } catch (e) {
    console.warn("Logo not found, skipping...");
  }

  const employees = emps ?? [];
  const employeesPerPage = 28;
  const totalPages = Math.max(1, Math.ceil(employees.length / employeesPerPage));

  // Colors
  const bluePrimary = rgb(0.1, 0.4, 0.7);
  const blueLight = rgb(0.9, 0.95, 1);
  const grayText = rgb(0.3, 0.3, 0.3);
  const greenText = rgb(0.1, 0.6, 0.1);
  const redText = rgb(0.7, 0.1, 0.1);

  // Filing status mapping
  const filingMap: Record<string, string> = {
    single: "Single",
    married: "Married",
    head: "HOH",
  };

  // Pay frequency mapping
  const payFreqMap: Record<string, string> = {
    weekly: "Weekly",
    biweekly: "Biweekly",
    semimonthly: "Semi-Monthly",
    monthly: "Monthly",
  };

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const page = pdf.addPage([612, 792]);
    const { width, height } = page.getSize();
    const leftMargin = 40;
    const rightMargin = width - 40;

    let y = await drawPageHeader(page, helveticaBold, helvetica, company, logoImage, pageIdx + 1, totalPages);

    // Summary box on first page
    if (pageIdx === 0) {
      const boxHeight = 50;
      page.drawRectangle({
        x: leftMargin,
        y: y - boxHeight,
        width: rightMargin - leftMargin,
        height: boxHeight,
        color: blueLight,
      });

      const activeCount = employees.filter((e: any) => e.active).length;
      const enrolledCount = employees.filter((e: any) => e.consent_status === "elect").length;
      const pendingCount = employees.filter((e: any) => e.consent_status === "pending").length;
      const declinedCount = employees.filter((e: any) => e.consent_status === "dont").length;

      // Summary stats
      const colWidth = (rightMargin - leftMargin) / 4;
      let statsY = y - 15;

      page.drawText("Total Employees", { x: leftMargin + 10, y: statsY, size: 8, font: helvetica, color: grayText });
      page.drawText(String(employees.length), { x: leftMargin + 10, y: statsY - 12, size: 14, font: helveticaBold, color: bluePrimary });

      page.drawText("Active", { x: leftMargin + colWidth + 10, y: statsY, size: 8, font: helvetica, color: grayText });
      page.drawText(String(activeCount), { x: leftMargin + colWidth + 10, y: statsY - 12, size: 14, font: helveticaBold, color: greenText });

      page.drawText("Enrolled", { x: leftMargin + colWidth * 2 + 10, y: statsY, size: 8, font: helvetica, color: grayText });
      page.drawText(String(enrolledCount), { x: leftMargin + colWidth * 2 + 10, y: statsY - 12, size: 14, font: helveticaBold, color: greenText });

      page.drawText("Pending", { x: leftMargin + colWidth * 3 + 10, y: statsY, size: 8, font: helvetica, color: grayText });
      page.drawText(String(pendingCount), { x: leftMargin + colWidth * 3 + 10, y: statsY - 12, size: 14, font: helveticaBold, color: bluePrimary });

      y -= boxHeight + 15;

      // Company details line
      const payFreq = payFreqMap[company.pay_frequency || "biweekly"] || company.pay_frequency;
      page.drawText(`State: ${company.state || "-"}  |  Pay Frequency: ${payFreq}  |  Model: ${company.model || "5/3"}`, {
        x: leftMargin,
        y: y,
        size: 9,
        font: helvetica,
        color: grayText,
      });
      y -= 20;
    }

    // Table header
    page.drawLine({
      start: { x: leftMargin, y: y + 5 },
      end: { x: rightMargin, y: y + 5 },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });

    // Column positions
    const cols = {
      name: leftMargin + 5,
      status: leftMargin + 160,
      consent: leftMargin + 220,
      grossPay: leftMargin + 300,
      filing: leftMargin + 380,
      deps: leftMargin + 440,
      tobacco: leftMargin + 480,
    };

    page.drawText("Employee Name", { x: cols.name, y, size: 8, font: helveticaBold, color: grayText });
    page.drawText("Status", { x: cols.status, y, size: 8, font: helveticaBold, color: grayText });
    page.drawText("Enrollment", { x: cols.consent, y, size: 8, font: helveticaBold, color: grayText });
    page.drawText("Gross Pay", { x: cols.grossPay, y, size: 8, font: helveticaBold, color: grayText });
    page.drawText("Filing", { x: cols.filing, y, size: 8, font: helveticaBold, color: grayText });
    page.drawText("Deps", { x: cols.deps, y, size: 8, font: helveticaBold, color: grayText });
    page.drawText("Tobacco", { x: cols.tobacco, y, size: 8, font: helveticaBold, color: grayText });

    y -= 15;
    page.drawLine({
      start: { x: leftMargin, y: y + 8 },
      end: { x: rightMargin, y: y + 8 },
      thickness: 1,
      color: rgb(0.9, 0.9, 0.9),
    });

    // Get employees for this page
    const startIdx = pageIdx * employeesPerPage;
    const endIdx = Math.min(startIdx + employeesPerPage, employees.length);
    const pageEmployees = employees.slice(startIdx, endIdx);

    for (const emp of pageEmployees) {
      y -= 6;

      const name = `${emp.last_name}, ${emp.first_name}`.substring(0, 25);
      const status = emp.active ? "Active" : "Inactive";
      const statusColor = emp.active ? greenText : redText;

      let consent = "Pending";
      let consentColor = bluePrimary;
      if (emp.consent_status === "elect") {
        consent = "Enrolled";
        consentColor = greenText;
      } else if (emp.consent_status === "dont") {
        consent = "Declined";
        consentColor = redText;
      }

      const grossPay = `$${Number(emp.gross_pay || 0).toFixed(2)}`;
      const filing = filingMap[emp.filing_status] || emp.filing_status || "-";
      const deps = String(emp.dependents || 0);
      const tobacco = emp.tobacco_use ? "Yes" : "No";
      const tobaccoColor = emp.tobacco_use ? redText : grayText;

      page.drawText(name, { x: cols.name, y, size: 8, font: helvetica, color: grayText });
      page.drawText(status, { x: cols.status, y, size: 8, font: helvetica, color: statusColor });
      page.drawText(consent, { x: cols.consent, y, size: 8, font: helvetica, color: consentColor });
      page.drawText(grossPay, { x: cols.grossPay, y, size: 8, font: helvetica, color: grayText });
      page.drawText(filing, { x: cols.filing, y, size: 8, font: helvetica, color: grayText });
      page.drawText(deps, { x: cols.deps, y, size: 8, font: helvetica, color: grayText });
      page.drawText(tobacco, { x: cols.tobacco, y, size: 8, font: helvetica, color: tobaccoColor });

      y -= 12;
    }

    // Page subtotals on last row
    if (pageIdx === totalPages - 1 && employees.length > 0) {
      y -= 10;
      page.drawLine({
        start: { x: leftMargin, y: y + 8 },
        end: { x: rightMargin, y: y + 8 },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8),
      });

      const totalGross = employees.reduce((sum: number, e: any) => sum + Number(e.gross_pay || 0), 0);
      const totalDeps = employees.reduce((sum: number, e: any) => sum + Number(e.dependents || 0), 0);

      page.drawText(`Total (${employees.length} employees):`, { x: cols.name, y, size: 8, font: helveticaBold, color: bluePrimary });
      page.drawText(`$${totalGross.toFixed(2)}`, { x: cols.grossPay, y, size: 8, font: helveticaBold, color: bluePrimary });
      page.drawText(String(totalDeps), { x: cols.deps, y, size: 8, font: helveticaBold, color: bluePrimary });
    }

    drawPageFooter(page, helvetica);
  }

  const bytes = await pdf.save();
  const ab = new ArrayBuffer(bytes.length);
  new Uint8Array(ab).set(bytes);

  const fileName = `Roster-${company.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
  return new Response(ab, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${fileName}"`,
    },
  });
}
