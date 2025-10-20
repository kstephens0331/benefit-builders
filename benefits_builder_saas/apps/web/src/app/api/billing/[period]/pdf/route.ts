// apps/web/src/app/api/billing/[period]/pdf/route.ts
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ period: string }> }
) {
  const { period } = await params;

  // 🔗 Adjust this if your JSON lives elsewhere
  // If your JSON route is /api/reports/billing/[period], keep this:
  const base = (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3002").replace(/\/$/, "");
  const jsonUrl = `${base}/api/reports/billing/${encodeURIComponent(period)}`;

  // If you also moved JSON under /api/billing/[period], use:
  // const jsonUrl = `${base}/api/billing/${encodeURIComponent(period)}`;

  const res = await fetch(jsonUrl, { cache: "no-store" });
  const data = await res.json();

  if (!data?.ok) {
    return new Response(JSON.stringify({ ok: false, error: data?.error ?? "Report failed" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  // Build PDF
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([612, 792]); // US Letter
  const { height } = page.getSize();

  let y = height - 50;
  const draw = (text: string, size = 12) => {
    page.drawText(text, { x: 50, y, size, font, color: rgb(0, 0, 0) });
    y -= size + 6;
  };

  draw(`Benefits Builder Monthly Billing — ${period}`, 16);
  y -= 10;

  for (const inv of (data.invoices ?? []) as any[]) {
    draw(`${inv.company_name} (${inv.model})`, 13);
    draw(`Rates: ${inv.rates}`);
    draw(`Pretax Total: $${Number(inv.total_pretax).toFixed(2)}`);
    draw(`Employer FICA Saved: $${Number(inv.total_employer_fica_saved).toFixed(2)}`);
    draw(`Employer Fee: $${Number(inv.employer_fee).toFixed(2)}`);
    draw(`Employer Net Savings: $${Number(inv.employer_net_savings).toFixed(2)}`);
    draw(`Employee Fee Total: $${Number(inv.employee_fee_total).toFixed(2)}`);
    y -= 10;
    if (y < 100) {
      pdf.addPage();
      y = height - 60;
    }
  }

  const bytes = await pdf.save(); // Uint8Array

  // ✅ Copy to a plain ArrayBuffer (avoids SharedArrayBuffer typing issues)
  const ab = new ArrayBuffer(bytes.length);
  new Uint8Array(ab).set(bytes);

  // Return as ArrayBuffer (BodyInit accepts ArrayBuffer)
  return new Response(ab, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="billing-${period}.pdf"`,
    },
  });
}
