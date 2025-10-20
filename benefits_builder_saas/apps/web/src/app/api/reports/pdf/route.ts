// apps/web/src/app/api/reports/pdf/route.ts
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const period = url.searchParams.get("period") ?? (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  })();

  const base = (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3002").replace(/\/$/, "");
  const res = await fetch(`${base}/api/reports/summary?period=${encodeURIComponent(period)}`, {
    cache: "no-store",
  });
  const json = await res.json();
  if (!json?.ok) {
    return NextResponse.json({ ok: false, error: json?.error ?? "Summary failed" }, { status: 500 });
  }

  const rows: Array<{
    company_name: string;
    state: string | null;
    model: string | null;
    employees_active: number;
    pretax_monthly: number;
    employer_fica_saved_monthly: number;
    employee_fee_monthly: number;
    employer_fee_monthly: number;
    employer_net_monthly: number;
  }> = json.data ?? [];

  // Build PDF
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  let page = pdf.addPage([612, 792]); // US Letter
  const { height } = page.getSize();
  let y = height - 50;

  const draw = (t: string, size = 12, x = 50) => {
    page.drawText(t, { x, y, size, font, color: rgb(0, 0, 0) });
  };
  const line = (dy = 18) => (y -= dy);

  draw(`Benefits Builder — Companies Summary`, 16);
  line(24);
  draw(`Period: ${period}`);
  line(24);

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
      "content-disposition": `inline; filename="companies-${period}.pdf"`,
    },
  });
}
