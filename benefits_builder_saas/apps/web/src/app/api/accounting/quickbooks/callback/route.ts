import { NextRequest, NextResponse } from "next/server";
import { getQBTokensFromCode } from "@/lib/quickbooks";
import { createServiceClient } from "@/lib/supabase";

// GET - Handle QuickBooks OAuth callback
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const realmId = searchParams.get("realmId");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL(`/accounting?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code || !realmId) {
      return NextResponse.redirect(
        new URL("/accounting?error=missing_params", request.url)
      );
    }

    // Exchange code for tokens
    const tokens = await getQBTokensFromCode(code, realmId);

    if (!tokens) {
      return NextResponse.redirect(
        new URL("/accounting?error=token_exchange_failed", request.url)
      );
    }

    // Store tokens in database
    const db = createServiceClient();

    // Deactivate any existing connections
    await db
      .from("quickbooks_connections")
      .update({ status: "disconnected" })
      .eq("status", "active");

    // Insert new connection
    const { error: insertError } = await db
      .from("quickbooks_connections")
      .insert({
        realm_id: tokens.realmId,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_expires_at: tokens.accessTokenExpiry,
        status: "active",
      });

    if (insertError) {
      console.error("Error storing QuickBooks connection:", insertError);
      return NextResponse.redirect(
        new URL("/accounting?error=storage_failed", request.url)
      );
    }

    // Redirect back to accounting page with success
    return NextResponse.redirect(
      new URL("/accounting?success=qb_connected", request.url)
    );
  } catch (error: any) {
    console.error("QuickBooks callback error:", error);
    return NextResponse.redirect(
      new URL(`/accounting?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}
