import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { verifyPassword, hashPassword } from "@/lib/auth";

// POST - Change user password
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, currentPassword, newPassword } = body;

    if (!email || !currentPassword || !newPassword) {
      return NextResponse.json(
        { ok: false, error: "Email, current password, and new password are required" },
        { status: 400 }
      );
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return NextResponse.json(
        { ok: false, error: "New password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    const db = createServiceClient();

    // Get user
    const { data: user, error: userError } = await db
      .from("auth_users")
      .select("*")
      .eq("email", email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.password_hash);

    if (!isValid) {
      return NextResponse.json(
        { ok: false, error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    const { error: updateError } = await db
      .from("auth_users")
      .update({
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 }
      );
    }

    // Log audit event
    await db.from("auth_audit_log").insert({
      user_id: user.id,
      action: "password_changed",
      ip_address: request.headers.get("x-forwarded-for") || "unknown",
      user_agent: request.headers.get("user-agent") || "unknown",
      success: true,
      metadata: { email },
    });

    return NextResponse.json({
      ok: true,
      message: "Password changed successfully",
    });
  } catch (error: any) {
    console.error("❌ Change password error:", error.message);

    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
