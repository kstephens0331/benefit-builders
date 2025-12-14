import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// GET - Debug QuickBooks configuration
export async function GET() {
  const db = createServiceClient();

  // Check environment variables (masked for security)
  const clientId = process.env.QB_CLIENT_ID || "";
  const clientSecret = process.env.QB_CLIENT_SECRET || "";
  const redirectUri = process.env.QB_REDIRECT_URI || "";
  const environment = process.env.QB_ENVIRONMENT || "sandbox";

  // Check existing connections
  const { data: connections, error: connError } = await db
    .from("quickbooks_connections")
    .select("id, realm_id, status, created_at, updated_at, last_sync_at, token_expires_at")
    .order("created_at", { ascending: false });

  return NextResponse.json({
    config: {
      client_id_set: clientId.length > 0,
      client_id_preview: clientId.substring(0, 8) + "...",
      client_secret_set: clientSecret.length > 0,
      redirect_uri: redirectUri, // Show full URI to verify it matches
      environment: environment,
    },
    connections: connections || [],
    connection_error: connError?.message || null,
    expected_callback_url: "https://web-dun-three-87.vercel.app/api/quickbooks/callback",
    note: "Make sure redirect_uri matches the expected_callback_url and is registered in QuickBooks Developer Portal"
  });
}
