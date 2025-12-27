import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { sendPasswordResetEmail, sendPasswordResetConfirmationEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Simple rate limiting
const rateLimitMap = new Map<string, number[]>();
const MAX_REQUESTS = 5;
const TIME_WINDOW = 15 * 60 * 1000; // 15 minutes

// Common passwords to block
const COMMON_PASSWORDS = ['Password123!', 'Welcome123!', 'Admin123!'];

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters long" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one uppercase letter" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one lowercase letter" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one number" };
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, error: "Password must contain at least one special character" };
  }
  if (COMMON_PASSWORDS.includes(password)) {
    return { valid: false, error: "Password is too common. Please choose a different password." };
  }
  return { valid: true };
}

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const requests = rateLimitMap.get(email) || [];

  // Remove requests outside the time window
  const recentRequests = requests.filter(time => now - time < TIME_WINDOW);

  if (recentRequests.length >= MAX_REQUESTS) {
    return false;
  }

  recentRequests.push(now);
  rateLimitMap.set(email, recentRequests);
  return true;
}

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  try {
    const { email, token, new_password } = body;

    const db = createServiceClient();

    // Handle password reset request (send email)
    if (email && !token && !new_password) {
      // Validate email format
      if (!validateEmail(email)) {
        return NextResponse.json(
          { ok: false, error: "Invalid email format" },
          { status: 400 }
        );
      }

      // Check rate limit
      if (!checkRateLimit(email)) {
        return NextResponse.json(
          { ok: false, error: "Too many requests. Please try again later." },
          { status: 429 }
        );
      }

      // Look up user
      const { data: user, error: userError } = await db
        .from("auth_users")
        .select("*")
        .eq("email", email)
        .single();

      // Always return success to prevent email enumeration
      if (!user || userError) {
        return NextResponse.json({
          ok: true,
          message: "If an account exists with that email, a password reset link has been sent.",
        });
      }

      // Invalidate previous tokens
      await db
        .from("password_reset_tokens")
        .update({ used: true })
        .eq("user_id", user.id);

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      // Store token
      await db.from("password_reset_tokens").insert({
        token: resetToken,
        user_id: user.id,
        expires_at: expiresAt,
        used: false,
      });

      // Send email with reset link
      await sendPasswordResetEmail(email, resetToken);

      return NextResponse.json({
        ok: true,
        message: "If an account exists with that email, a password reset link has been sent.",
      });
    }

    // Handle password reset completion (with token)
    if (token && new_password) {
      // Validate password
      const passwordValidation = validatePassword(new_password);
      if (!passwordValidation.valid) {
        return NextResponse.json(
          { ok: false, error: passwordValidation.error },
          { status: 400 }
        );
      }

      // Look up token
      const { data: resetToken, error: tokenError } = await db
        .from("password_reset_tokens")
        .select("*")
        .eq("token", token)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (!resetToken || tokenError) {
        return NextResponse.json(
          { ok: false, error: "Invalid or expired reset token" },
          { status: 400 }
        );
      }

      // Check if token is already used
      if (resetToken.used) {
        return NextResponse.json(
          { ok: false, error: "This reset token has already been used" },
          { status: 400 }
        );
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(new_password, 12);

      // Update user password
      const updateResult = await db
        .from("auth_users")
        .update({ password_hash: hashedPassword })
        .eq("id", resetToken.user_id)
        .single();

      const updateError = updateResult?.error;

      if (updateError) {
        return NextResponse.json(
          { ok: false, error: "Failed to update password" },
          { status: 500 }
        );
      }

      // Mark token as used
      await db
        .from("password_reset_tokens")
        .update({ used: true })
        .eq("token", token);

      // Invalidate all sessions for this user
      await db
        .from("sessions")
        .delete()
        .eq("user_id", resetToken.user_id);

      // Get user email for confirmation
      const { data: userData } = await db
        .from("auth_users")
        .select("email")
        .eq("id", resetToken.user_id)
        .single();

      // Send confirmation email
      if (userData?.email) {
        await sendPasswordResetConfirmationEmail(userData.email);
      }

      return NextResponse.json({
        ok: true,
        message: "Password has been reset successfully",
      });
    }

    // Invalid request
    return NextResponse.json(
      { ok: false, error: "Invalid request. Provide either email or token with new_password." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { ok: false, error: "An error occurred processing your request" },
      { status: 500 }
    );
  }
}
