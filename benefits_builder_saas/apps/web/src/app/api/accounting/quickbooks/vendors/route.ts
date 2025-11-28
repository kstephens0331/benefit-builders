/**
 * QuickBooks Vendors API
 * GET: Fetch all vendors from QuickBooks
 * POST: Create or update vendor in QuickBooks
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  syncVendorToQB,
  getAllVendorsFromQB,
  ensureValidToken,
  type QBTokens
} from "@/lib/quickbooks";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get QB connection
    const { data: integration, error: integrationError } = await supabase
      .from("company_integrations")
      .select("*")
      .eq("integration_type", "quickbooks")
      .eq("status", "active")
      .single();

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: "QuickBooks not connected" },
        { status: 404 }
      );
    }

    const tokens: QBTokens = {
      realmId: integration.realm_id,
      accessToken: integration.access_token,
      refreshToken: integration.refresh_token,
      accessTokenExpiry: integration.access_token_expiry,
      refreshTokenExpiry: integration.refresh_token_expiry
    };

    // Ensure token is valid and refresh if needed
    const validTokens = await ensureValidToken(tokens);

    // Update tokens in database if refreshed
    if (validTokens.accessToken !== tokens.accessToken) {
      await supabase
        .from("company_integrations")
        .update({
          access_token: validTokens.accessToken,
          refresh_token: validTokens.refreshToken,
          access_token_expiry: validTokens.accessTokenExpiry,
          refresh_token_expiry: validTokens.refreshTokenExpiry
        })
        .eq("id", integration.id);
    }

    // Fetch all vendors
    const result = await getAllVendorsFromQB(validTokens);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to fetch vendors" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      vendors: result.vendors || [],
      count: result.vendors?.length || 0
    });
  } catch (error: any) {
    console.error("Error fetching QB vendors:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vendor_id, name, email, phone } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Vendor name is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get QB connection
    const { data: integration, error: integrationError } = await supabase
      .from("company_integrations")
      .select("*")
      .eq("integration_type", "quickbooks")
      .eq("status", "active")
      .single();

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: "QuickBooks not connected" },
        { status: 404 }
      );
    }

    const tokens: QBTokens = {
      realmId: integration.realm_id,
      accessToken: integration.access_token,
      refreshToken: integration.refresh_token,
      accessTokenExpiry: integration.access_token_expiry,
      refreshTokenExpiry: integration.refresh_token_expiry
    };

    // Ensure token is valid
    const validTokens = await ensureValidToken(tokens);

    // Update tokens if refreshed
    if (validTokens.accessToken !== tokens.accessToken) {
      await supabase
        .from("company_integrations")
        .update({
          access_token: validTokens.accessToken,
          refresh_token: validTokens.refreshToken,
          access_token_expiry: validTokens.accessTokenExpiry,
          refresh_token_expiry: validTokens.refreshTokenExpiry
        })
        .eq("id", integration.id);
    }

    // Get existing QB vendor ID if available
    let qb_vendor_id: string | undefined;
    if (vendor_id) {
      const { data: existingVendor } = await supabase
        .from("vendors")
        .select("qb_vendor_id")
        .eq("id", vendor_id)
        .single();

      qb_vendor_id = existingVendor?.qb_vendor_id;
    }

    // Sync vendor to QB
    const result = await syncVendorToQB(validTokens, {
      id: vendor_id,
      name,
      email,
      phone,
      qb_vendor_id
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to sync vendor" },
        { status: 500 }
      );
    }

    // Update local database with QB vendor ID
    if (vendor_id && result.qb_vendor_id) {
      await supabase
        .from("vendors")
        .update({
          qb_vendor_id: result.qb_vendor_id,
          qb_synced_at: new Date().toISOString()
        })
        .eq("id", vendor_id);
    }

    return NextResponse.json({
      success: true,
      qb_vendor_id: result.qb_vendor_id
    });
  } catch (error: any) {
    console.error("Error syncing vendor to QB:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
