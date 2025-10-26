// QuickBooks OAuth Flow
// Handle authorization and token exchange

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import { getQBAuthUrl, getQBTokensFromCode } from "@/lib/quickbooks";

export const runtime = "nodejs";

// GET - Initiate OAuth flow
export async function GET() {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: "Unauthorized - Admin only" },
      { status: 403 }
    );
  }

  const authUrl = getQBAuthUrl();

  return NextResponse.json({
    ok: true,
    auth_url: authUrl,
    instructions: "Redirect user to this URL to authorize QuickBooks access"
  });
}

// POST - Exchange code for tokens (callback handler)
export async function POST(req: Request) {
  const db = createServiceClient();
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: "Unauthorized - Admin only" },
      { status: 403 }
    );
  }

  const { code, realmId } = await req.json().catch(() => ({}));

  if (!code || !realmId) {
    return NextResponse.json(
      { ok: false, error: "code and realmId required" },
      { status: 400 }
    );
  }

  try {
    // Exchange code for tokens
    const tokens = await getQBTokensFromCode(code, realmId);

    if (!tokens) {
      return NextResponse.json(
        { ok: false, error: "Failed to get QuickBooks tokens" },
        { status: 500 }
      );
    }

    // Check if integration already exists
    const { data: existing } = await db
      .from("quickbooks_integration")
      .select("id")
      .eq("realm_id", realmId)
      .single();

    if (existing) {
      // Update existing integration
      const { error } = await db
        .from("quickbooks_integration")
        .update({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          access_token_expiry: tokens.accessTokenExpiry,
          refresh_token_expiry: tokens.refreshTokenExpiry,
          is_active: true,
          connected_at: new Date().toISOString()
        })
        .eq("realm_id", realmId);

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
    } else {
      // Create new integration
      const { error } = await db.from("quickbooks_integration").insert({
        realm_id: realmId,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        access_token_expiry: tokens.accessTokenExpiry,
        refresh_token_expiry: tokens.refreshTokenExpiry,
        is_active: true
      });

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      ok: true,
      message: "QuickBooks integration connected successfully",
      realm_id: realmId
    });
  } catch (error: any) {
    console.error("QuickBooks auth error:", error);
    return NextResponse.json(
      { ok: false, error: `QuickBooks authentication failed: ${error.message}` },
      { status: 500 }
    );
  }
}
