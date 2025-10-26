// Login API Endpoint
import { NextResponse } from "next/server";
import { authenticateUser, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { ok: false, error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Get IP and user agent for audit logging
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Authenticate
    const result = await authenticateUser(username, password, ipAddress, userAgent);

    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 401 }
      );
    }

    // Set session cookie
    await setSessionCookie(result.session.session_token, result.session.expires_at);

    return NextResponse.json({
      ok: true,
      user: result.session.user
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { ok: false, error: "An error occurred during login" },
      { status: 500 }
    );
  }
}
