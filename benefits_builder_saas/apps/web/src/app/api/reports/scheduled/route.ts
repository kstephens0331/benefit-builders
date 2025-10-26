// Scheduled Reports API
// Manage automated report generation and email delivery

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

// GET - Fetch all scheduled reports
export async function GET() {
  const db = createServiceClient();

  const { data: scheduled, error } = await db
    .from("scheduled_reports")
    .select(`
      *,
      template:template_id(name, report_type)
    `)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, scheduled: scheduled || [] });
}

// POST - Create new scheduled report
export async function POST(req: Request) {
  const db = createServiceClient();
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: "Unauthorized - Admin only" },
      { status: 403 }
    );
  }

  const { template_id, name, schedule, day_of_week, day_of_month, recipients, format, active } =
    await req.json().catch(() => ({}));

  if (!template_id || !name || !schedule || !recipients || recipients.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "template_id, name, schedule, and recipients (array) are required"
      },
      { status: 400 }
    );
  }

  // Validate schedule parameters
  if (schedule === "weekly" && (day_of_week === undefined || day_of_week < 0 || day_of_week > 6)) {
    return NextResponse.json(
      { ok: false, error: "day_of_week (0-6) required for weekly schedule" },
      { status: 400 }
    );
  }

  if (
    (schedule === "monthly" || schedule === "quarterly") &&
    (day_of_month === undefined || day_of_month < 1 || day_of_month > 31)
  ) {
    return NextResponse.json(
      { ok: false, error: "day_of_month (1-31) required for monthly/quarterly schedule" },
      { status: 400 }
    );
  }

  const { data: scheduledReport, error } = await db
    .from("scheduled_reports")
    .insert({
      template_id,
      name,
      schedule,
      day_of_week,
      day_of_month,
      recipients,
      format: format || "pdf",
      active: active !== undefined ? active : true,
      created_by: user.id
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, scheduled_report: scheduledReport });
}

// PUT - Update scheduled report
export async function PUT(req: Request) {
  const db = createServiceClient();
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: "Unauthorized - Admin only" },
      { status: 403 }
    );
  }

  const { id, active } = await req.json().catch(() => ({}));

  if (!id) {
    return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  }

  const { data: scheduledReport, error } = await db
    .from("scheduled_reports")
    .update({ active })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, scheduled_report: scheduledReport });
}

// DELETE - Remove scheduled report
export async function DELETE(req: Request) {
  const db = createServiceClient();
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: "Unauthorized - Admin only" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  }

  const { error } = await db.from("scheduled_reports").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
