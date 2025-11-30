/**
 * QuickBooks Reports API
 * GET: Fetch various financial reports from QuickBooks
 * Supported reports: profit-loss, balance-sheet, cash-flow, ar-aging, ap-aging
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import {
  getProfitAndLossReport,
  getBalanceSheetReport,
  getCashFlowReport,
  getARAgingReport,
  getAPAgingReport,
  ensureValidToken,
  type QBTokens
} from "@/lib/quickbooks";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("type");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const asOfDate = searchParams.get("as_of_date");

    if (!reportType) {
      return NextResponse.json(
        { error: "Report type is required (profit-loss, balance-sheet, cash-flow, ar-aging, ap-aging)" },
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

    let result;

    switch (reportType) {
      case "profit-loss":
        if (!startDate || !endDate) {
          return NextResponse.json(
            { error: "start_date and end_date are required for Profit & Loss report" },
            { status: 400 }
          );
        }
        result = await getProfitAndLossReport(validTokens, startDate, endDate);
        break;

      case "balance-sheet":
        if (!asOfDate) {
          return NextResponse.json(
            { error: "as_of_date is required for Balance Sheet report" },
            { status: 400 }
          );
        }
        result = await getBalanceSheetReport(validTokens, asOfDate);
        break;

      case "cash-flow":
        if (!startDate || !endDate) {
          return NextResponse.json(
            { error: "start_date and end_date are required for Cash Flow report" },
            { status: 400 }
          );
        }
        result = await getCashFlowReport(validTokens, startDate, endDate);
        break;

      case "ar-aging":
        result = await getARAgingReport(validTokens, asOfDate || undefined);
        break;

      case "ap-aging":
        result = await getAPAgingReport(validTokens, asOfDate || undefined);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown report type: ${reportType}` },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to fetch report" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      reportType,
      report: result.report
    });
  } catch (error: any) {
    console.error("Error fetching QB report:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
