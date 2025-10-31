import { NextRequest, NextResponse } from "next/server";
import { getQBAuthUrl } from "@/lib/quickbooks";

// GET - Redirect to QuickBooks OAuth
export async function GET(request: NextRequest) {
  try {
    const authUrl = getQBAuthUrl();
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
