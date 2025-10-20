// src/app/api/billing/invoices/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET(req: Request) {
  const db = createServiceClient();
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || undefined;

  let query = db
    .from("invoices")
    .select("id,company_id,period,status,subtotal_cents,tax_cents,total_cents,companies(name)")
    .order("period", { ascending: false });

  if (period) query = query.eq("period", period);

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok:false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok:true, count: data?.length ?? 0, data });
}
