import { NextRequest, NextResponse } from "next/server";
import { getQBAuthUrl } from "@/lib/quickbooks";

// GET - Redirect to QuickBooks OAuth
export async function GET(request: NextRequest) {
  try {
    // Check if QuickBooks is configured
    if (!process.env.QB_CLIENT_ID || !process.env.QB_CLIENT_SECRET || !process.env.QB_REDIRECT_URI) {
      return NextResponse.json(
        {
          ok: false,
          error: "QuickBooks integration is not yet configured for this environment."
        },
        { status: 503 }
      );
    }

    const authUrl = getQBAuthUrl();
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error("QuickBooks auth error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to initialize QuickBooks OAuth" },
      { status: 500 }
    );
  }
}
