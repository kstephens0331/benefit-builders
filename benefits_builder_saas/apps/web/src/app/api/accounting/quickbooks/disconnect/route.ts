// apps/web/src/app/api/accounting/quickbooks/disconnect/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST() {
  try {
    const db = createServiceClient();

    // Set all QuickBooks connections to inactive
    const { error: connError } = await db
      .from("quickbooks_connections")
      .update({
        status: "disconnected",
        access_token: null,
        refresh_token: null,
      })
      .eq("status", "active");

    if (connError) {
      console.error("Error updating quickbooks_connections:", connError);
    }

    // Also clear from system_settings if it exists
    const { error } = await db
      .from("system_settings")
      .update({
        qb_access_token: null,
        qb_refresh_token: null,
        qb_realm_id: null,
        qb_token_expires_at: null,
      })
      .eq("id", 1);

    // Ignore system_settings error as it may not exist

    return NextResponse.json({
      ok: true,
      message: "QuickBooks disconnected successfully",
    });
  } catch (error: any) {
    console.error("Error disconnecting QuickBooks:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
