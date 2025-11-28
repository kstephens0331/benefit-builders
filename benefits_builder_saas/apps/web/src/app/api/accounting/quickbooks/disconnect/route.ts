// apps/web/src/app/api/accounting/quickbooks/disconnect/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST() {
  try {
    const db = createServiceClient();

    // Clear QuickBooks credentials from system_settings
    const { error } = await db
      .from("system_settings")
      .update({
        qb_access_token: null,
        qb_refresh_token: null,
        qb_realm_id: null,
        qb_token_expires_at: null,
      })
      .eq("id", 1); // Assuming single row for system settings

    if (error) {
      throw error;
    }

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
