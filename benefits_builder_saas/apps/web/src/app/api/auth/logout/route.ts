// Logout API Endpoint
import { NextResponse } from "next/server";
import { logout, clearSessionCookie } from "@/lib/auth";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const SESSION_COOKIE_NAME = "bb_session";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (sessionToken) {
      await logout(sessionToken);
    }

    await clearSessionCookie();

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { ok: false, error: "An error occurred during logout" },
      { status: 500 }
    );
  }
}
