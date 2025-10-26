// apps/web/src/app/api/benefits/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employee_id");

  if (!employeeId) {
    return NextResponse.json(
      { ok: false, error: "Employee ID is required" },
      { status: 400 }
    );
  }

  const db = createServiceClient();

  const { data, error } = await db
    .from("employee_benefits")
    .select("*")
    .eq("employee_id", employeeId)
    .order("plan_code");

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const db = createServiceClient();

    const { data, error } = await db
      .from("employee_benefits")
      .insert({
        employee_id: body.employee_id,
        plan_code: body.plan_code,
        per_pay_amount: body.per_pay_amount || 0,
        reduces_fit: body.reduces_fit !== undefined ? body.reduces_fit : true,
        reduces_fica: body.reduces_fica !== undefined ? body.reduces_fica : true,
        effective_date: body.effective_date || new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Benefit ID is required" },
        { status: 400 }
      );
    }

    const db = createServiceClient();

    const { data, error } = await db
      .from("employee_benefits")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Benefit ID is required" },
        { status: 400 }
      );
    }

    const db = createServiceClient();

    const { error } = await db.from("employee_benefits").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "Benefit deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
