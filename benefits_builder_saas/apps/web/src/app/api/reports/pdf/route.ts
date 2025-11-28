// apps/web/src/app/api/reports/pdf/route.ts
import { NextRequest } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createServiceClient } from "@/lib/supabase";
import { computeFeesForPretaxMonthly } from "@/lib/fees";
import { calcFICA } from "@/lib/tax";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const db = createServiceClient();
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  })();

  const [yearStr] = period.split("-");
  const taxYear = Number(yearStr) || new Date().getFullYear();

  try {
    // Get federal tax rates
    const { data: fed } = await db
      .from("tax_federal_params")
      .select("ss_rate, med_rate")
      .eq("tax_year", taxYear)
      .single();

    // Get companies
    const { data: companiesData } = await db
      .from("companies")
      .select("id,name,state,model,status")
      .eq("status", "active");

    // Get employees
    const { data: emps } = await db
      .from("employees")
      .select("id,company_id,active,pay_period,paycheck_gross")
      .eq("active", true);

    // Get benefits
    const { data: bens } = await db
      .from("employee_benefits")
      .select("employee_id, per_pay_amount, reduces_fica");

    const payMap: Record<string, number> = { w: 52, b: 26, s: 24, m: 12 };
    const ppm = (pp: string | null | undefined) => (payMap[pp ?? "b"] ?? 26) / 12;

    // Build company summaries
    const byCompany: Record<string, any> = {};
    for (const c of companiesData ?? []) {
      byCompany[c.id] = {
        company_id: c.id,
        company_name: c.name,
        state: c.state,
        model: c.model,
        status: c.status,
        employees_active: 0,
        pretax_monthly: 0,
        employer_fica_saved_monthly: 0,
      };
    }

    // Index benefits by employee
    const benByEmp = new Map<string, { perPay: number; reducesFICA: boolean }>();
    for (const b of bens ?? []) {
      const key = String(b.employee_id);
      const prev = benByEmp.get(key) ?? { perPay: 0, reducesFICA: true };
      prev.perPay += Number(b.per_pay_amount ?? 0);
      prev.reducesFICA = prev.reducesFICA && !!b.reduces_fica;
      benByEmp.set(key, prev);
    }

    for (const e of emps ?? []) {
      const bucket = byCompany[e.company_id];
      if (!bucket) continue;
      bucket.employees_active += 1;

      const perPayPretax = benByEmp.get(e.id)?.perPay ?? 0;
      const perMonth = ppm(e.pay_period);
      bucket.pretax_monthly += perPayPretax * perMonth;

      // Calculate employer FICA savings
      const gross = Number(e.paycheck_gross ?? 0);
      const before = calcFICA(gross, 0, Number(fed?.ss_rate || 0.062), Number(fed?.med_rate || 0.0145));
      const after = calcFICA(gross, perPayPretax, Number(fed?.ss_rate || 0.062), Number(fed?.med_rate || 0.0145));
      const savedPerPay = +(before.fica - after.fica).toFixed(2);
      bucket.employer_fica_saved_monthly += savedPerPay * perMonth;
    }

    // Finalize company rows with fees
    const rows = Object.values(byCompany).map((r: any) => {
      const fees = computeFeesForPretaxMonthly(+r.pretax_monthly.toFixed(2), r.model);
      const employer_net = +(+r.employer_fica_saved_monthly.toFixed(2) - fees.employerFeeMonthly).toFixed(2);
      return {
        company_name: r.company_name,
        state: r.state,
        model: r.model,
        employees_active: r.employees_active,
        pretax_monthly: +r.pretax_monthly.toFixed(2),
        employer_fica_saved_monthly: +r.employer_fica_saved_monthly.toFixed(2),
        employee_fee_monthly: fees.employeeFeeMonthly,
        employer_fee_monthly: fees.employerFeeMonthly,
        employer_net_monthly: employer_net,
      };
    });

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

    let page = pdf.addPage([612, 792]); // US Letter
    const { height } = page.getSize();

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

      draw(`Companies Summary`, 16, 50, true);
      line(24);
      draw(`Period: ${period}`);
      line(24);
    };

    drawPageHeader();

    const header = [
      { label: "Company", x: 50 },
      { label: "State", x: 240 },
      { label: "Model", x: 290 },
      { label: "Active", x: 350 },
      { label: "Pretax/mo", x: 410 },
      { label: "ER FICA/mo", x: 485 },
      { label: "ER Net/mo", x: 560 },
    ];
    for (const h of header) draw(h.label, 12, h.x);
    line();

    const money = (n: number) => `$${n.toFixed(2)}`;

    for (const r of rows) {
      if (y < 80) {
        page = pdf.addPage([612, 792]);
        y = height - 50;
        drawPageHeader();
        for (const h of header) draw(h.label, 12, h.x);
        line();
      }
      draw(r.company_name, 11, header[0].x);
      draw(String(r.state ?? "-"), 11, header[1].x);
      draw(String(r.model ?? "-"), 11, header[2].x);
      draw(String(r.employees_active), 11, header[3].x);
      draw(money(Number(r.pretax_monthly)), 11, header[4].x);
      draw(money(Number(r.employer_fica_saved_monthly)), 11, header[5].x);
      draw(money(Number(r.employer_net_monthly)), 11, header[6].x);
      line();
    }

    // Uint8Array -> ArrayBuffer (avoid BodyInit typing issues)
    const bytes = await pdf.save();
    const ab = new ArrayBuffer(bytes.length);
    new Uint8Array(ab).set(bytes);

    return new Response(ab, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="BenefitsBuilder-Report-${period}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("PDF generation error:", error);
    return new Response("Error generating PDF: " + error.message, { status: 500 });
  }
}
