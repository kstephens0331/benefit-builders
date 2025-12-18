import { createServiceClient } from "@/lib/supabase";
import QuickBooksSyncDashboard from "@/components/QuickBooksSyncDashboard";

export const metadata = {
  title: "QuickBooks Sync - Benefits Builder",
};

export const dynamic = "force-dynamic";

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

  // Get sync status directly from database instead of fetching API
  // Get last 10 sync runs
  const { data: syncHistory } = await db
    .from("quickbooks_sync_log")
    .select("*")
    .order("synced_at", { ascending: false })
    .limit(10);

  // Get counts of unsynced items
  const { count: unsyncedCompanies } = await db
    .from("companies")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")
    .or("qb_customer_id.is.null,qb_synced_at.is.null");

  const { count: unsyncedInvoices } = await db
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("qb_synced", false);

  const lastSync = syncHistory?.[0]?.synced_at || null;

  return (
    <QuickBooksSyncDashboard
      connected={true}
      companyName={connection.company_name || "Connected"}
      lastSync={lastSync}
      pendingSync={{
        customers: unsyncedCompanies || 0,
        invoices: unsyncedInvoices || 0,
      }}
      syncHistory={syncHistory || []}
    />
  );
}
