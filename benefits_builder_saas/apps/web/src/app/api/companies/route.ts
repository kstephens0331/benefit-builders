import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET() {
  const db = createServiceClient();
  const { data, error } = await db.from("companies").select("*").order("name");
  if (error) return NextResponse.json({ ok:false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok:true, count: data?.length ?? 0, data });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const db = createServiceClient();

    const { data, error } = await db
      .from("companies")
      .insert({
        name: body.name,
        state: body.state,
        pay_frequency: body.pay_frequency || 'biweekly',
        model: body.model || '5/3',
        employer_rate: body.employer_rate || 5.0,
        employee_rate: body.employee_rate || 3.0,
        contact_email: body.contact_email || null,
        contact_phone: body.contact_phone || null,
        address: body.address || null,
        city: body.city || null,
        zip: body.zip || null,
        status: body.status || 'active',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Company ID is required" },
        { status: 400 }
      );
    }

    const db = createServiceClient();

    const { data, error } = await db
      .from("companies")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Company ID is required" },
        { status: 400 }
      );
    }

    const db = createServiceClient();

    // Check if company has employees
    const { data: employees } = await db
      .from("employees")
      .select("id")
      .eq("company_id", id)
      .limit(1);

    if (employees && employees.length > 0) {
      return NextResponse.json(
        { ok: false, error: "Cannot delete company with existing employees. Archive instead." },
        { status: 400 }
      );
    }

    const { error } = await db
      .from("companies")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, message: "Company deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
