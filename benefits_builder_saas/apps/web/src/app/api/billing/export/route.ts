// src/app/api/billing/export/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET(req: Request) {
  const db = createServiceClient();
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period");
  if (!period) return NextResponse.json({ ok:false, error:"period required" }, { status: 400 });

  const { data, error } = await db
    .from("invoices")
    .select("id,company_id,period,status,subtotal_cents,tax_cents,total_cents,companies(name)")
    .eq("period", period)
    .order("company_id");
  if (error) return NextResponse.json({ ok:false, error: error.message }, { status: 500 });

  const header = ["company","company_id","period","status","subtotal_cents","tax_cents","total_cents"];
  const rows = (data ?? []).map((r:any) => [
    r.companies?.name ?? "",
    r.company_id,
    r.period,
    r.status,
    r.subtotal_cents,
    r.tax_cents,
    r.total_cents
  ]);

  const csv = [header, ...rows]
    .map(r => r.map(String).map(s => `"${s.replace(/"/g,'""')}"`).join(","))
    .join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="billing_${period}.csv"`
    }
  });
}
