// apps/web/src/app/api/employees/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("company_id");

  const db = createServiceClient();

  let query = db.from("employees").select("*").order("last_name");

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data, error } = await query;

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
      .from("employees")
      .insert({
        company_id: body.company_id,
        first_name: body.first_name,
        last_name: body.last_name,
        dob: body.dob || null,
        filing_status: body.filing_status || "single",
        dependents: body.dependents || 0,
        gross_pay: body.gross_pay || 0,
        tobacco_use: body.tobacco_use || false,
        active: body.active !== undefined ? body.active : true,
        consent_status: body.consent_status || "pending",
        // Local tax fields
        city: body.city || null,
        county: body.county || null,
        work_city: body.work_city || null,
        work_county: body.work_county || null,
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
        { ok: false, error: "Employee ID is required" },
        { status: 400 }
      );
    }

    // Sanitize date fields - convert empty strings to null
    const sanitizedUpdates = { ...updates };
    const dateFields = ['dob', 'hire_date', 'inactive_date'];

    for (const field of dateFields) {
      if (field in sanitizedUpdates) {
        // Convert empty strings, undefined, or "undefined" strings to null
        if (sanitizedUpdates[field] === "" ||
            sanitizedUpdates[field] === undefined ||
            sanitizedUpdates[field] === "undefined" ||
            sanitizedUpdates[field] === null) {
          sanitizedUpdates[field] = null;
        }
      }
    }

    // Remove undefined values from the update object
    Object.keys(sanitizedUpdates).forEach(key => {
      if (sanitizedUpdates[key] === undefined || sanitizedUpdates[key] === "undefined") {
        delete sanitizedUpdates[key];
      }
    });

    const db = createServiceClient();

    const { data, error } = await db
      .from("employees")
      .update(sanitizedUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Employee update error:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    console.error("Employee PATCH error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Employee ID is required" },
        { status: 400 }
      );
    }

    const db = createServiceClient();

    // Delete associated benefits first
    await db.from("employee_benefits").delete().eq("employee_id", id);

    // Delete employee
    const { error } = await db.from("employees").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "Employee deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
