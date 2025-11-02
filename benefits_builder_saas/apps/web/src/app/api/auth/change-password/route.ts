import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { hashPassword } from "@/lib/auth";

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

    // Hash the current password to compare
    const currentPasswordHash = hashPassword(currentPassword);

    // Get user - try both auth_users and internal_users tables
    let user = null;
    let tableName = "";

    // Try auth_users first
    const { data: authUser } = await db
      .from("auth_users")
      .select("*")
      .eq("email", email)
      .eq("password_hash", currentPasswordHash)
      .single();

    if (authUser) {
      user = authUser;
      tableName = "auth_users";
    } else {
      // Try internal_users
      const { data: internalUser } = await db
        .from("internal_users")
        .select("*")
        .eq("email", email)
        .eq("password_hash", currentPasswordHash)
        .single();

      if (internalUser) {
        user = internalUser;
        tableName = "internal_users";
      }
    }

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Invalid email or current password" },
        { status: 401 }
      );
    }

    // Hash new password
    const newPasswordHash = hashPassword(newPassword);

    // Update password in the correct table
    const { error: updateError } = await db
      .from(tableName)
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
    await db.from("audit_log").insert({
      user_id: user.id,
      username: user.username || email,
      action: "password_changed",
      resource_type: "auth",
      ip_address: request.headers.get("x-forwarded-for") || "unknown",
      user_agent: request.headers.get("user-agent") || "unknown",
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
