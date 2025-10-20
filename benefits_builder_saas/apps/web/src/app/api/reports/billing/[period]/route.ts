// apps/web/src/app/api/reports/billing/[period]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { createPdfDoc, addPage, drawHeaderFooter, drawTable } from "@/lib/pdf";

type InvoiceRow = {
  company_id: string;
  period: string;
  status: string;
  subtotal_cents: number | null;
  tax_cents: number | null;
  total_cents: number | null;
  companies: { name?: string } | null; // <- explicitly a single object or null
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ period: string }> }
) {
  const { period } = await ctx.params;
  const db = createServiceClient();

  const { data, error } = await db
    .from("invoices")
    .select("company_id, period, status, subtotal_cents, tax_cents, total_cents, companies(name)")
    .eq("period", period)
    .order("company_id");

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = (data as InvoiceRow[]) ?? [];

  const { doc, font, bold } = await createPdfDoc();
  let page = addPage(doc);
  drawHeaderFooter(page, { font, bold }, {
    titleLeft: `Billing Summary — ${period}`,
    titleRight: new Date().toLocaleDateString(),
  });

  const sum = (pick: (r: InvoiceRow) => number) =>
    rows.reduce((s, r) => s + pick(r), 0);

  const table = {
    title: "Invoices",
    columns: [
      { key: "company", header: "Company", width: 220 },
      { key: "status", header: "Status", width: 80 },
      { key: "subtotal", header: "Subtotal", width: 90 },
      { key: "tax", header: "Tax", width: 70 },
      { key: "total", header: "Total", width: 90 },
    ],
    rows: rows.map((r) => ({
      company: r.companies?.name ?? r.company_id,
      status: r.status,
      subtotal: `$${(Number(r.subtotal_cents || 0) / 100).toFixed(2)}`,
      tax: `$${(Number(r.tax_cents || 0) / 100).toFixed(2)}`,
      total: `$${(Number(r.total_cents || 0) / 100).toFixed(2)}`,
    })),
    footerNote: `Grand Total: $${(
      sum((r) => Number(r.total_cents || 0)) / 100
    ).toFixed(2)} · Open Count: ${rows.filter((d) => d.status === "open").length}`,
  };

  drawTable({ page, fonts: { font, bold }, table, topY: 720 });

  const bytes = await doc.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="billing_${period}.pdf"`
    }
  });
}
