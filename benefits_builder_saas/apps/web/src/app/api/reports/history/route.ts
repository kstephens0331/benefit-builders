// Report History API
// View historical generated reports

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

// GET - Fetch report history
export async function GET(req: Request) {
  const db = createServiceClient();
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");
  const templateId = searchParams.get("template_id");
  const reportType = searchParams.get("report_type");

  let query = db
    .from("report_history")
    .select(`
      *,
      template:template_id(name, report_type),
      generated_by_user:generated_by(full_name)
    `)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (templateId) {
    query = query.eq("template_id", templateId);
  }

  if (reportType) {
    query = query.eq("report_type", reportType);
  }

  const { data: history, error } = await query;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Get total count
  const { count } = await db
    .from("report_history")
    .select("*", { count: "exact", head: true });

  return NextResponse.json({
    ok: true,
    history: history || [],
    total: count || 0,
    limit,
    offset
  });
}
