// Test Email API
// Send test email to verify configuration

import { NextResponse } from "next/server";
import { sendTestEmail } from "@/lib/email";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // Verify user is authenticated (admin only)
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { ok: false, error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "Email address required" },
        { status: 400 }
      );
    }

    const result = await sendTestEmail(email);

    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: `Test email sent to ${email}`,
      messageId: result.messageId
    });
  } catch (error: any) {
    console.error("Test email error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
