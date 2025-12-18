// apps/web/src/app/api/accounting/quickbooks/status/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = createServiceClient();

    // Check quickbooks_connections table (same as sync-bidirectional uses)
    const { data: connection, error: connError } = await db
      .from("quickbooks_connections")
      .select("*")
      .eq("status", "active")
      .maybeSingle();

    if (connError) {
      console.error("Error checking QB connection:", connError);
      return NextResponse.json({
        ok: true,
        connected: false,
        lastSync: null,
        error: connError.message,
      });
    }

    if (!connection) {
      return NextResponse.json({
        ok: true,
        connected: false,
        lastSync: null,
      });
    }

    // Check if token is expired
    let tokenValid = false;
    if (connection.token_expires_at) {
      const expiresAt = new Date(connection.token_expires_at);
      tokenValid = expiresAt > new Date();
    }

    // Get last sync time from quickbooks_sync_log
    let lastSync = null;
    const { data: lastSyncData } = await db
      .from("quickbooks_sync_log")
      .select("synced_at")
      .order("synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastSyncData) {
      lastSync = lastSyncData.synced_at;
    }

    return NextResponse.json({
      ok: true,
      connected: tokenValid,
      companyName: connection.company_name || null,
      realmId: connection.realm_id || null,
      lastSync: lastSync,
      tokenExpiresAt: connection.token_expires_at,
      tokenExpired: !tokenValid,
    });
  } catch (error: any) {
    console.error("Error checking QuickBooks status:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
