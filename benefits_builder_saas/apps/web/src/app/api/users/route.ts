// apps/web/src/app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { hashPassword } from "@/lib/auth";

export async function GET() {
  const db = createServiceClient();

  const { data, error } = await db
    .from("internal_users")
    .select("id, username, full_name, email, role, active, last_login_at, created_at")
    .order("username");

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const db = createServiceClient();

    // Hash the password
    const password_hash = hashPassword(body.password);

    const { data, error } = await db
      .from("internal_users")
      .insert({
        username: body.username,
        password_hash,
        full_name: body.full_name,
        email: body.email,
        role: body.role || "user",
        active: body.active !== undefined ? body.active : true,
      })
      .select("id, username, full_name, email, role, active, created_at")
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
    const { id, password, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    const db = createServiceClient();

    // If password is provided, hash it
    if (password) {
      updates.password_hash = hashPassword(password);
    }

    const { data, error } = await db
      .from("internal_users")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, username, full_name, email, role, active, updated_at")
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
        { ok: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    const db = createServiceClient();

    // Check if this is the only admin
    const { data: admins } = await db
      .from("internal_users")
      .select("id")
      .eq("role", "admin")
      .eq("active", true);

    if (admins && admins.length === 1 && admins[0].id === id) {
      return NextResponse.json(
        { ok: false, error: "Cannot delete the only active admin user" },
        { status: 400 }
      );
    }

    const { error } = await db.from("internal_users").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "User deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
