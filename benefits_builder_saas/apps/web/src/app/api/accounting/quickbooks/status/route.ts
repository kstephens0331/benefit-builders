// apps/web/src/app/api/accounting/quickbooks/status/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = createServiceClient();

    // Check if we have QuickBooks credentials stored
    const { data: settings, error } = await db
      .from("system_settings")
      .select("qb_access_token, qb_refresh_token, qb_realm_id, qb_token_expires_at")
      .single();

    if (error) {
      // If settings don't exist yet, QB is not connected
      if (error.code === "PGRST116") {
        return NextResponse.json({
          ok: true,
          connected: false,
          lastSync: null,
        });
      }
      throw error;
    }

    const hasCredentials = !!(
      settings?.qb_access_token &&
      settings?.qb_refresh_token &&
      settings?.qb_realm_id
    );

    // Check if token is expired
    let tokenValid = false;
    if (hasCredentials && settings.qb_token_expires_at) {
      const expiresAt = new Date(settings.qb_token_expires_at);
      tokenValid = expiresAt > new Date();
    }

    // Get last sync time from quickbooks_sync_log
    let lastSync = null;
    if (hasCredentials) {
      const { data: lastSyncData } = await db
        .from("quickbooks_sync_log")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (lastSyncData) {
        lastSync = lastSyncData.created_at;
      }
    }

    return NextResponse.json({
      ok: true,
      connected: hasCredentials && tokenValid,
      lastSync: lastSync,
      realmId: settings?.qb_realm_id || null,
    });
  } catch (error: any) {
    console.error("Error checking QuickBooks status:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
