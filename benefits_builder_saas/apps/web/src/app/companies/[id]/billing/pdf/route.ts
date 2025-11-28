// apps/web/src/app/companies/[id]/billing/pdf/route.ts
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createServiceClient } from "@/lib/supabase";
import { computeFeesForPretaxMonthly } from "@/lib/fees";
import { calcFICA } from "@/lib/tax";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params;
  const db = createServiceClient();

  // Determine period from query (?period=YYYY-MM), default to current month
  const url = new URL(_req.url);
  const qPeriod = url.searchParams.get("period");
  const now = new Date();
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const period = qPeriod ?? defaultPeriod;

  const [yearStr] = period.split("-");
  const taxYear = Number(yearStr) || now.getFullYear();

  // Company
  const { data: company, error: cErr } = await db
    .from("companies")
    .select("id,name,model,state")
    .eq("id", companyId)
    .single();
  if (cErr || !company) {
    return new Response(JSON.stringify({ ok: false, error: cErr?.message ?? "Company not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  // Federal FICA params
  const { data: fed, error: fErr } = await db
    .from("tax_federal_params")
    .select("ss_rate, med_rate")
    .eq("tax_year", taxYear)
    .single();
  if (fErr || !fed) {
    return new Response(JSON.stringify({ ok: false, error: "Federal params missing" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  // Employees
  const { data: emps, error: eErr } = await db
    .from("employees")
    .select("id,first_name,last_name,paycheck_gross,pay_period,active")
    .eq("company_id", companyId)
    .eq("active", true);
  if (eErr) {
    return new Response(JSON.stringify({ ok: false, error: eErr.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const payMap: Record<string, number> = { w: 52, b: 26, s: 24, m: 12 };
  const periodsPerMonth = (pp: string | null | undefined) =>
    (payMap[pp ?? "b"] ?? 26) / 12;

  let totalPretaxMonthly = 0;
  let totalEmployerFicaMonthlySaved = 0;

  // For detail lines (optional; we’ll show a few in the PDF)
  const detail: Array<{
    name: string;
    pretaxMonthly: number;
    employerFicaSavedMonthly: number;
  }> = [];

  for (const e of emps ?? []) {
    // Sum of active pre-tax per-pay
    const { data: bens } = await db
      .from("employee_benefits")
      .select("per_pay_amount, reduces_fica, active")
      .eq("employee_id", e.id)
      .eq("active", true);

    const perPayPretax = (bens ?? []).reduce(
      (sum, b) => sum + Number(b.per_pay_amount || 0),
      0
    );

    const perMonth = periodsPerMonth(e.pay_period);
    const pretaxMonthly = +(perPayPretax * perMonth).toFixed(2);
    totalPretaxMonthly += pretaxMonthly;

    // Employer FICA savings per pay -> monthly
    const gross = Number(e.paycheck_gross || 0);
    const before = calcFICA(gross, 0, Number(fed.ss_rate), Number(fed.med_rate));
    const after = calcFICA(gross, perPayPretax, Number(fed.ss_rate), Number(fed.med_rate));
    const ficaSavedPerPay = +(before.fica - after.fica).toFixed(2);
    const ficaSavedMonthly = +(ficaSavedPerPay * perMonth).toFixed(2);
    totalEmployerFicaMonthlySaved += ficaSavedMonthly;

    detail.push({
      name: `${e.last_name}, ${e.first_name}`,
      pretaxMonthly,
      employerFicaSavedMonthly: ficaSavedMonthly,
    });
  }

  // Model fees from totalPretaxMonthly
  const { employeeFeeMonthly, employerFeeMonthly, employeeRate, employerRate } =
    computeFeesForPretaxMonthly(totalPretaxMonthly, company.model);

  const employerNetMonthly = +(
    totalEmployerFicaMonthlySaved - employerFeeMonthly
  ).toFixed(2);

  // Build PDF
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Load Benefits Booster logo if available
  let logoImage = null;
  const logoPath = path.join(process.cwd(), "public", "benefits-booster-logo.png");
  if (fs.existsSync(logoPath)) {
    try {
      const logoBytes = fs.readFileSync(logoPath);
      logoImage = await pdf.embedPng(logoBytes);
    } catch (e) {
      console.log("Logo not found, skipping");
    }
  }

  const page = pdf.addPage([612, 792]);
  const { height, width } = page.getSize();
  let y = height - 50;

  // Colors matching Benefits Booster theme
  const primaryBlue = rgb(0.05, 0.32, 0.62); // #0D5280
  const accentRed = rgb(0.8, 0.1, 0.1);
  const textGray = rgb(0.2, 0.2, 0.2);

  // Header Section with Logo and Branding
  if (logoImage) {
    const logoWidth = 80;
    const logoHeight = 48;
    page.drawImage(logoImage, {
      x: 50,
      y: y - logoHeight,
      width: logoWidth,
      height: logoHeight,
    });
    // Add tagline below logo in red
    page.drawText("Making your benefits soar", {
      x: 50,
      y: y - logoHeight - 15,
      size: 9,
      font: font,
      color: accentRed,
    });
    y -= logoHeight + 25;
  } else {
    // Draw text logo if image not available
    page.drawText("Benefits Booster", {
      x: 50,
      y: y,
      size: 16,
      font: boldFont,
      color: primaryBlue,
    });
    page.drawText("Making your benefits soar", {
      x: 50,
      y: y - 18,
      size: 9,
      font: font,
      color: accentRed,
    });
    y -= 35;
  }

  const text = (t: string, size = 12, isBold = false) => {
    page.drawText(t, { x: 50, y, size, font: isBold ? boldFont : font, color: textGray });
    y -= size + 6;
  };

  text(`Invoice Summary`, 16, true);
  text(`${company.name} (${company.model ?? "-"})`, 13, true);
  text(`Period: ${period}    State: ${company.state ?? "-"}`);
  text(
    `Rates — Employee: ${(employeeRate * 100).toFixed(1)}%  Employer: ${(employerRate * 100).toFixed(1)}%`
  );
  y -= 6;

  text(`Totals`, 13);
  text(`Pretax (Monthly): $${totalPretaxMonthly.toFixed(2)}`);
  text(`Employer FICA Saved (Monthly): $${totalEmployerFicaMonthlySaved.toFixed(2)}`);
  text(`Employer Fee: $${employerFeeMonthly.toFixed(2)}`);
  text(`Employee Fee Total: $${employeeFeeMonthly.toFixed(2)}`);
  text(`Employer Net (Monthly): $${employerNetMonthly.toFixed(2)}`);
  y -= 6;

  text(`Sample Employees`, 13);
  const sample = detail.slice(0, 10);
  for (const d of sample) {
    text(
      `${d.name} — Pretax/mo $${d.pretaxMonthly.toFixed(
        2
      )} — ER FICA saved/mo $${d.employerFicaSavedMonthly.toFixed(2)}`
    );
    if (y < 80) {
      pdf.addPage();
      y = height - 60;
    }
  }

  // Return bytes as ArrayBuffer to avoid TS BodyInit issues
  const bytes = await pdf.save(); // Uint8Array
  const ab = new ArrayBuffer(bytes.length);
  new Uint8Array(ab).set(bytes);

  return new Response(ab, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="invoice-${company.name}-${period}.pdf"`,
    },
  });
}
