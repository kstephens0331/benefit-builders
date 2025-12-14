import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getQBTokensFromCode, getQBCompanyInfo } from "@/lib/quickbooks";

// GET - Handle QuickBooks OAuth callback
export async function GET(request: NextRequest) {
  const db = createServiceClient();
  const searchParams = request.nextUrl.searchParams;

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const realmId = searchParams.get("realmId");
  const error = searchParams.get("error");

  // Handle errors from QuickBooks
  if (error) {
    const errorDescription = searchParams.get("error_description") || error;
    console.error("QuickBooks OAuth error:", errorDescription);
    return NextResponse.redirect(
      new URL(`/accounting?error=${encodeURIComponent(errorDescription)}`, request.url)
    );
  }

  // Validate required parameters
  if (!code || !realmId) {
    console.error("Missing OAuth parameters:", { code: !!code, realmId: !!realmId });
    return NextResponse.redirect(
      new URL("/accounting?error=Missing+OAuth+parameters", request.url)
    );
  }

  try {
    // Exchange authorization code for tokens
    const tokens = await getQBTokensFromCode(code, realmId);

    if (!tokens) {
      return NextResponse.redirect(
        new URL("/accounting?error=Failed+to+exchange+code+for+tokens", request.url)
      );
    }

    // Get QuickBooks company info
    let qbCompanyName = "Unknown Company";
    try {
      const companyInfo = await getQBCompanyInfo(tokens);
      if (companyInfo.success && companyInfo.company) {
        qbCompanyName = companyInfo.company.CompanyName || companyInfo.company.LegalName || "Unknown Company";
      }
    } catch (e) {
      console.warn("Failed to get QB company info:", e);
    }

    // Check if connection already exists
    const { data: existingConnection } = await db
      .from("quickbooks_connections")
      .select("id")
      .eq("realm_id", realmId)
      .maybeSingle();

    if (existingConnection) {
      // Update existing connection
      const { error: updateError } = await db
        .from("quickbooks_connections")
        .update({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          token_expires_at: tokens.accessTokenExpiry,
          status: "active",
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("realm_id", realmId);

      if (updateError) {
        console.error("Failed to update QuickBooks connection:", updateError);
        return NextResponse.redirect(
          new URL("/accounting?error=Failed+to+update+connection", request.url)
        );
      }
    } else {
      // Create new connection
      const { error: insertError } = await db
        .from("quickbooks_connections")
        .insert({
          realm_id: realmId,
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          token_expires_at: tokens.accessTokenExpiry,
          status: "active",
          last_sync_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("Failed to save QuickBooks connection:", insertError);
        return NextResponse.redirect(
          new URL("/accounting?error=Failed+to+save+connection", request.url)
        );
      }
    }

    // Redirect to accounting page with success message
    return NextResponse.redirect(
      new URL(`/accounting?success=QuickBooks+connected+successfully&company=${encodeURIComponent(qbCompanyName)}`, request.url)
    );
  } catch (error: any) {
    console.error("QuickBooks callback error:", error);
    return NextResponse.redirect(
      new URL(`/accounting?error=${encodeURIComponent(error.message || "Failed to connect QuickBooks")}`, request.url)
    );
  }
}
