// apps/web/src/app/companies/[id]/roster/pdf/route.ts
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createServiceClient } from "@/lib/supabase";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params;
  const db = createServiceClient();

  const { data: company, error: cErr } = await db
    .from("companies")
    .select("id,name,state,model,status")
    .eq("id", companyId)
    .single();
  if (cErr || !company) {
    return new Response(JSON.stringify({ ok: false, error: cErr?.message ?? "Company not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  const { data: emps, error: eErr } = await db
    .from("employees")
    .select(
      "first_name,last_name,state,pay_period,paycheck_gross,filing_status,dependents,active,inactive_date,hire_date"
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

  let page = pdf.addPage([612, 792]);
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

    draw(`Employee Roster`, 16, 50, true);
    line(24);
    draw(`${company.name} — ${company.state ?? "-"} — Model ${company.model ?? "-"}`);
    line();
  };

  drawPageHeader();

  // Column headers
  const cols = [
    { label: "Employee", x: 50 },
    { label: "Active", x: 220 },
    { label: "Pay Period", x: 280 },
    { label: "Gross/Pay", x: 360 },
    { label: "Filing", x: 440 },
    { label: "Deps", x: 500 },
  ];

  const drawHeader = () => {
    draw("Employee", 12, cols[0].x);
    draw("Active", 12, cols[1].x);
    draw("Pay Period", 12, cols[2].x);
    draw("Gross/Pay", 12, cols[3].x);
    draw("Filing", 12, cols[4].x);
    draw("Deps", 12, cols[5].x);
    line();
  };

  drawHeader();

  const ppMap: Record<string, string> = { w: "Weekly", b: "Biweekly", s: "Semi", m: "Monthly" };

  for (const e of emps ?? []) {
    if (y < 80) {
      page = pdf.addPage([612, 792]);
      y = height - 50;
      drawPageHeader();
      drawHeader();
    }

    const name = `${e.last_name}, ${e.first_name}`;
    const active = e.active ? "Yes" : e.inactive_date ? `No (${String(e.inactive_date).slice(0, 10)})` : "No";
    const pp = ppMap[e.pay_period ?? "b"] ?? "-";
    const gross = Number(e.paycheck_gross ?? 0).toFixed(2);
    const filing = e.filing_status?.toUpperCase?.() ?? "-";
    const deps = String(e.dependents ?? 0);

    draw(name, 11, cols[0].x);
    draw(active, 11, cols[1].x);
    draw(pp, 11, cols[2].x);
    draw(`$${gross}`, 11, cols[3].x);
    draw(filing, 11, cols[4].x);
    draw(deps, 11, cols[5].x);
    line();
  }

  const bytes = await pdf.save(); // Uint8Array
  const ab = new ArrayBuffer(bytes.length);
  new Uint8Array(ab).set(bytes);

  return new Response(ab, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="roster-${company.name}.pdf"`,
    },
  });
}
