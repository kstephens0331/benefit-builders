/**
 * QuickBooks Bills API
 * GET: Fetch all bills from QuickBooks
 * POST: Create bill in QuickBooks
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import {
  createBillInQB,
  getAllBillsFromQB,
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

    // Fetch bills
    const result = await getAllBillsFromQB(
      validTokens,
      startDate || undefined,
      endDate || undefined
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to fetch bills" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      bills: result.bills || [],
      count: result.bills?.length || 0
    });
  } catch (error: any) {
    console.error("Error fetching QB bills:", error);
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
      vendor_qb_id,
      bill_number,
      bill_date,
      due_date,
      line_items,
      total
    } = body;

    if (!vendor_qb_id || !bill_date || !due_date || !line_items || !total) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

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

    // Create bill in QB
    const result = await createBillInQB(validTokens, {
      vendor_qb_id,
      bill_number,
      bill_date,
      due_date,
      line_items,
      total
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to create bill" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      qb_bill_id: result.qb_bill_id
    });
  } catch (error: any) {
    console.error("Error creating bill in QB:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
