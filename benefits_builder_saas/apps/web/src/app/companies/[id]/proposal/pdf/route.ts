// apps/web/src/app/companies/[id]/proposal/pdf/route.ts
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createServiceClient } from "@/lib/supabase";
import { computeFeesForPretaxMonthly, computeAllModels } from "@/lib/fees";
import { getModelRates, formatRates, type BillingModel } from "@/lib/models";
import { calcFICA } from "@/lib/tax";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params;
  const db = createServiceClient();

  // period (?period=YYYY-MM) defaults to current month
  const url = new URL(req.url);
  const qPeriod = url.searchParams.get("period");
  const now = new Date();
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const period = qPeriod ?? defaultPeriod;

  // tax year from YYYY-MM
  const [yearStr] = period.split("-");
  const taxYear = Number(yearStr) || now.getFullYear();

  // Load company
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

  // Federal FICA params (employer SS + Med rates)
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
  const ficaRate = Number(fed.ss_rate) + Number(fed.med_rate); // e.g., 0.062 + 0.0145 = 0.0765

  // Employees (active)
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

  // 1) Aggregate **actual** monthly pre-tax total from employee_benefits
  let totalPretaxMonthly = 0;
  let totalEmployerFicaMonthlySaved = 0;

  for (const e of emps ?? []) {
    // Active, pre-tax benefits per pay
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

    // Employer FICA savings per pay -> monthly (using actual gross and per-pay pretax)
    const gross = Number(e.paycheck_gross || 0);
    const before = calcFICA(gross, 0, Number(fed.ss_rate), Number(fed.med_rate));
    const after = calcFICA(gross, perPayPretax, Number(fed.ss_rate), Number(fed.med_rate));
    const ficaSavedPerPay = +(before.fica - after.fica).toFixed(2);
    const ficaSavedMonthly = +(ficaSavedPerPay * perMonth).toFixed(2);
    totalEmployerFicaMonthlySaved += ficaSavedMonthly;
  }

  // 2) Compute fees for the company's current model
  const currentModel = (company.model as BillingModel | null) ?? "5/3";
  const currentFees = computeFeesForPretaxMonthly(totalPretaxMonthly, currentModel);
  const currentEmployerNet = +(
    totalEmployerFicaMonthlySaved - currentFees.employerFeeMonthly
  ).toFixed(2);

  // 3) Build a comparison for all models
  const models: BillingModel[] = ["5/3", "3/4", "5/1", "4/4"];
  const all = computeAllModels(totalPretaxMonthly, models).map((row) => ({
    ...row,
    employerNetMonthly: +(totalEmployerFicaMonthlySaved - row.employerFeeMonthly).toFixed(2),
  }));

  // 4) PDF
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

  let page = pdf.addPage([612, 792]); // Letter
  const { height, width } = page.getSize();

  // Colors matching Benefits Booster theme
  const primaryBlue = rgb(0.05, 0.32, 0.62); // #0D5280
  const accentRed = rgb(0.8, 0.1, 0.1);
  const textGray = rgb(0.2, 0.2, 0.2);

  let y = height - 50;
  const draw = (t: string, size = 12, x = 50, isBold = false, color = textGray) => {
    page.drawText(t, { x, y, size, font: isBold ? boldFont : font, color });
  };
  const line = (dy = 18) => (y -= dy);

  // Header Section with Logo and Branding
  const drawPageHeader = () => {
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
      draw("Benefits Booster", 16, 50, true, primaryBlue);
      line(20);
      draw("Making your benefits soar", 9, 50, false, accentRed);
      line(20);
    }

    draw(`Proposal`, 16, 50, true);
    line(24);
    draw(`${company.name} — ${company.state ?? "-"} — Current Model ${company.model ?? "-"}`);
    line();
  };

  drawPageHeader();
  draw(`Period: ${period}`);
  line();
  draw(
    `Current totals  |  Pretax (mo): $${totalPretaxMonthly.toFixed(
      2
    )}  |  Employer FICA saved (mo): $${totalEmployerFicaMonthlySaved.toFixed(2)}`
  );
  line();
  draw(
    `Current fees    |  Employee: ${(currentFees.employeeRate * 100).toFixed(
      1
    )}%  Employer: ${(currentFees.employerRate * 100).toFixed(1)}%`
  );
  line();
  draw(
    `Current result  |  Employer fee: $${currentFees.employerFeeMonthly.toFixed(
      2
    )}  |  Employer net (mo): $${currentEmployerNet.toFixed(2)}`
  );
  line(24);

  // Comparison table header
  draw(`Model Comparison (based on actual monthly pretax)`, 13);
  line();
  const cols = [
    { label: "Model", x: 50 },
    { label: "Rates (EE/ER)", x: 120 },
    { label: "EE Fees / mo", x: 250 },
    { label: "ER Fees / mo", x: 350 },
    { label: "ER FICA Saved / mo", x: 450 },
    { label: "ER Net / mo", x: 540 },
  ];
  for (const c of cols) draw(c.label, 12, c.x);
  line();

  const highlight = (m: BillingModel) => m === currentModel;

  for (const row of all) {
    if (y < 80) {
      page = pdf.addPage([612, 792]);
      y = height - 50;
      drawPageHeader();
      for (const c of cols) draw(c.label, 12, c.x);
      line();
    }
    const tag = highlight(row.model) ? " (current)" : "";
    draw(`${row.model}${tag}`, 11, cols[0].x);
    draw(formatRates(row.model), 11, cols[1].x);
    draw(`$${row.employeeFeeMonthly.toFixed(2)}`, 11, cols[2].x);
    draw(`$${row.employerFeeMonthly.toFixed(2)}`, 11, cols[3].x);
    draw(`$${totalEmployerFicaMonthlySaved.toFixed(2)}`, 11, cols[4].x);
    draw(`$${row.employerNetMonthly.toFixed(2)}`, 11, cols[5].x);
    line();
  }

  // Footer note
  line(12);
  draw(
    `Notes: Employer FICA savings uses federal SS + Medicare rates for ${taxYear}.`,
    10
  );
  line();
  draw(`This proposal reflects current active pre-tax enrollments and actual pay frequencies.`, 10);

  // Return bytes as ArrayBuffer (avoid BodyInit typing issues)
  const bytes = await pdf.save();
  const ab = new ArrayBuffer(bytes.length);
  new Uint8Array(ab).set(bytes);

  return new Response(ab, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="proposal-${company.name}-${period}.pdf"`,
    },
  });
}
