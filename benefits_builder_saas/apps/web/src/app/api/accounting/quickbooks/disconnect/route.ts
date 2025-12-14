// apps/web/src/app/api/accounting/quickbooks/disconnect/route.ts
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const db = createServiceClient();

    // First check if there's an active connection
    const { data: activeConnection, error: checkError } = await db
      .from("quickbooks_connections")
      .select("id, realm_id")
      .eq("status", "active")
      .maybeSingle();

    console.log("Active connection check:", { activeConnection, checkError });

    if (!activeConnection) {
      return NextResponse.json({
        ok: false,
        error: "No active QuickBooks connection found",
      }, { status: 404 });
    }

    // Set the connection to disconnected (keep tokens but mark inactive)
    // Note: access_token has NOT NULL constraint so we can't clear it
    const { data: updateData, error: connError } = await db
      .from("quickbooks_connections")
      .update({
        status: "disconnected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", activeConnection.id)
      .select();

    console.log("Disconnect update result:", { updateData, connError });

    if (connError) {
      console.error("Error updating quickbooks_connections:", connError);
      return NextResponse.json({
        ok: false,
        error: `Failed to disconnect: ${connError.message}`,
      }, { status: 500 });
    }

    // Also clear from system_settings if it exists (ignore errors)
    await db
      .from("system_settings")
      .update({
        qb_access_token: null,
        qb_refresh_token: null,
        qb_realm_id: null,
        qb_token_expires_at: null,
      })
      .eq("id", 1);

    // Revalidate the accounting page to force refresh
    revalidatePath("/accounting");

    return NextResponse.json({
      ok: true,
      message: "QuickBooks disconnected successfully",
      disconnected_realm: activeConnection.realm_id,
    });
  } catch (error: any) {
    console.error("Error disconnecting QuickBooks:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
