import { createServiceClient } from "@/lib/supabase";
import QuickBooksSyncDashboard from "@/components/QuickBooksSyncDashboard";
import { redirect } from "next/navigation";

export const metadata = {
  title: "QuickBooks Sync - Benefits Builder",
};

export default async function QuickBooksSyncPage() {
  const db = createServiceClient();

  // Get QuickBooks connection status
  const { data: connection } = await db
    .from("quickbooks_connections")
    .select("*")
    .eq("status", "active")
    .single();

  if (!connection) {
    return <QuickBooksSyncDashboard connected={false} lastSync={null} pendingSync={{ customers: 0, invoices: 0 }} syncHistory={[]} />;
  }

  // Get sync status
  const syncStatusRes = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/quickbooks/sync-bidirectional`,
    {
      method: "GET",
      cache: "no-store",
    }
  );

  const syncStatus = await syncStatusRes.json();

  return (
    <QuickBooksSyncDashboard
      connected={true}
      lastSync={syncStatus.last_sync}
      pendingSync={syncStatus.pending_sync}
      syncHistory={syncStatus.sync_history}
    />
  );
}
