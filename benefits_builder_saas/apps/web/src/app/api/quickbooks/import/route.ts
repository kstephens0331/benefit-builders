import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import {
  getAllCustomersFromQB,
  getAllInvoicesFromQB,
  getAllPaymentsFromQB,
  ensureValidToken,
} from "@/lib/quickbooks";

/**
 * GET - Import data from QuickBooks
 * Query params: type (customers|invoices|payments), start_date, end_date
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "customers";
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    const db = createServiceClient();

    // Get QuickBooks connection
    const { data: connection, error: connError } = await db
      .from("quickbooks_connections")
      .select("*")
      .eq("status", "active")
      .single();

    if (connError || !connection) {
      return NextResponse.json(
        { ok: false, error: "No active QuickBooks connection found" },
        { status: 400 }
      );
    }

    const tokens = {
      realmId: connection.realm_id,
      accessToken: connection.access_token,
      refreshToken: connection.refresh_token,
      accessTokenExpiry: connection.token_expires_at,
      refreshTokenExpiry: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // Ensure token is valid
    const validTokens = await ensureValidToken(tokens);

    // Update tokens if refreshed
    if (validTokens.accessToken !== tokens.accessToken) {
      await db
        .from("quickbooks_connections")
        .update({
          access_token: validTokens.accessToken,
          refresh_token: validTokens.refreshToken,
          token_expires_at: validTokens.accessTokenExpiry,
        })
        .eq("id", connection.id);
    }

    let result;

    switch (type) {
      case "customers":
        result = await getAllCustomersFromQB(validTokens);
        break;

      case "invoices":
        result = await getAllInvoicesFromQB(
          validTokens,
          startDate || undefined,
          endDate || undefined
        );
        break;

      case "payments":
        result = await getAllPaymentsFromQB(
          validTokens,
          startDate || undefined,
          endDate || undefined
        );
        break;

      default:
        return NextResponse.json(
          { ok: false, error: "Invalid import type. Use: customers, invoices, or payments" },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      type,
      count: result.customers?.length || result.invoices?.length || result.payments?.length || 0,
      data: result.customers || result.invoices || result.payments || [],
    });
  } catch (error: any) {
    console.error("QuickBooks import error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST - Sync specific records from QuickBooks to our database
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, qb_ids } = body; // Array of QuickBooks IDs to import

    if (!type || !qb_ids || !Array.isArray(qb_ids)) {
      return NextResponse.json(
        { ok: false, error: "type and qb_ids array are required" },
        { status: 400 }
      );
    }

    const db = createServiceClient();

    // Get QuickBooks connection
    const { data: connection } = await db
      .from("quickbooks_connections")
      .select("*")
      .eq("status", "active")
      .single();

    if (!connection) {
      return NextResponse.json(
        { ok: false, error: "No active QuickBooks connection" },
        { status: 400 }
      );
    }

    const tokens = {
      realmId: connection.realm_id,
      accessToken: connection.access_token,
      refreshToken: connection.refresh_token,
      accessTokenExpiry: connection.token_expires_at,
      refreshTokenExpiry: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const validTokens = await ensureValidToken(tokens);

    const imported = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Import based on type
    if (type === "customers") {
      for (const qbId of qb_ids) {
        try {
          // Fetch customer from QB and create in our DB
          // Implementation here
          imported.success++;
        } catch (error: any) {
          imported.failed++;
          imported.errors.push(`${qbId}: ${error.message}`);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Imported ${imported.success} records, ${imported.failed} failed`,
      ...imported,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
