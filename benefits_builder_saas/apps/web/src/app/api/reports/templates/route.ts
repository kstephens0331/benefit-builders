// Report Templates API
// Manage custom report templates

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

// GET - Fetch all report templates
export async function GET() {
  const db = createServiceClient();

  const { data: templates, error } = await db
    .from("report_templates")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, templates: templates || [] });
}

// POST - Create new report template
export async function POST(req: Request) {
  const db = createServiceClient();
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { name, description, report_type, filters, columns, sort_by, sort_order, is_public } =
    await req.json().catch(() => ({}));

  if (!name || !report_type || !columns) {
    return NextResponse.json(
      { ok: false, error: "name, report_type, and columns are required" },
      { status: 400 }
    );
  }

  const { data: template, error } = await db
    .from("report_templates")
    .insert({
      name,
      description,
      report_type,
      filters: filters || {},
      columns,
      sort_by,
      sort_order: sort_order || "desc",
      is_public: is_public || false,
      created_by: user.id
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, template });
}

// DELETE - Remove report template
export async function DELETE(req: Request) {
  const db = createServiceClient();
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Unauthorized - Admin only" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  }

  const { error } = await db.from("report_templates").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
