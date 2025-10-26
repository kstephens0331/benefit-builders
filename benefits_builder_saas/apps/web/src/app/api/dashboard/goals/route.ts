// Goals Management API
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { CreateGoalSchema, validateRequestBody } from "@/lib/validation";

export const runtime = "nodejs";

// GET - Fetch all goals
export async function GET() {
  const db = createServiceClient();

  const { data: goals, error } = await db
    .from("business_goals")
    .select("*")
    .order("target_date", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, goals: goals || [] });
}

// POST - Create new goal
export async function POST(req: Request) {
  const db = createServiceClient();

  const validation = await validateRequestBody(req, CreateGoalSchema);
  if (!validation.valid) {
    return NextResponse.json(
      { ok: false, error: validation.error, issues: validation.issues },
      { status: 400 }
    );
  }

  const { goal_type, target_amount, target_date, description } = validation.data;

  const { data: goal, error } = await db
    .from("business_goals")
    .insert({
      goal_type,
      target_value: target_amount,
      target_date,
      description,
      current_value: 0,
      status: "active"
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, goal });
}

// PUT - Update goal progress
export async function PUT(req: Request) {
  const db = createServiceClient();

  const { id, current_value } = await req.json().catch(() => ({}));

  if (!id || current_value === undefined) {
    return NextResponse.json(
      { ok: false, error: "id and current_value required" },
      { status: 400 }
    );
  }

  const { data: goal, error } = await db
    .from("business_goals")
    .update({ current_value })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, goal });
}

// DELETE - Remove goal
export async function DELETE(req: Request) {
  const db = createServiceClient();

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  }

  const { error } = await db
    .from("business_goals")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
