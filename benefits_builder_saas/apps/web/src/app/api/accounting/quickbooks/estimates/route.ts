/**
 * QuickBooks Estimates API
 * GET: Fetch all estimates from QuickBooks
 * POST: Create estimate in QuickBooks
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import {
  createEstimateInQB,
  getAllEstimatesFromQB,
  ensureValidToken,
  type QBTokens
} from "@/lib/quickbooks";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    const supabase = createServiceClient();

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

    const validTokens = await ensureValidToken(tokens);

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

    const result = await getAllEstimatesFromQB(
      validTokens,
      startDate || undefined,
      endDate || undefined
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to fetch estimates" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      estimates: result.estimates || [],
      count: result.estimates?.length || 0
    });
  } catch (error: any) {
    console.error("Error fetching QB estimates:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customer_qb_id,
      estimate_date,
      expiration_date,
      line_items,
      total,
      customer_memo
    } = body;

    if (!customer_qb_id || !estimate_date || !line_items || !total) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

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

    const validTokens = await ensureValidToken(tokens);

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

    const result = await createEstimateInQB(validTokens, {
      customer_qb_id,
      estimate_date,
      expiration_date,
      line_items,
      total,
      customer_memo
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to create estimate" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      qb_estimate_id: result.qb_estimate_id
    });
  } catch (error: any) {
    console.error("Error creating estimate in QB:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
