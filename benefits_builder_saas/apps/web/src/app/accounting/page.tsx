import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";
import AccountingDashboard from "@/components/AccountingDashboard";

export const metadata = {
  title: "Accounting Dashboard",
};

export default async function AccountingPage() {
  const db = createServiceClient();

  // Fetch companies for dropdown
  const { data: companies } = await db
    .from("companies")
    .select("id, name")
    .eq("status", "active")
    .order("name");

  // Fetch Accounts Receivable
  const { data: arData } = await db
    .from("accounts_receivable")
    .select(`
      id,
      company_id,
      invoice_number,
      invoice_date,
      due_date,
      amount,
      amount_paid,
      amount_due,
      status,
      description,
      notes,
      synced_to_qb,
      companies(name)
    `)
    .order("invoice_date", { ascending: false });

  // Fetch Accounts Payable
  const { data: apData } = await db
    .from("accounts_payable")
    .select("*")
    .order("bill_date", { ascending: false });

  // Fetch recent payment transactions
  const { data: paymentsData } = await db
    .from("payment_transactions")
    .select("*")
    .order("payment_date", { ascending: false })
    .limit(50);

  // Fetch QuickBooks connection status
  const { data: qbConnection } = await db
    .from("quickbooks_connections")
    .select("*")
    .eq("status", "active")
    .single();

  // Fetch recent QuickBooks sync logs
  const { data: qbSyncLogs } = await db
    .from("quickbooks_sync_log")
    .select("*")
    .order("synced_at", { ascending: false })
    .limit(5);

  // Get last successful sync
  const lastSuccessfulSync = qbSyncLogs?.find(log => log.status === 'success');

  // Fetch payment alerts
  const { data: alerts } = await db
    .from("payment_alerts")
    .select(`
      *,
      company:companies(id, name),
      invoice:invoices(id, invoice_number, total_cents)
    `)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch company credits (available)
  const { data: credits } = await db
    .from("company_credits")
    .select("company_id, amount")
    .eq("status", "available");

  // Get current month info for month-end status
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const { data: monthEndStatus } = await db
    .from("month_end_closings")
    .select("*")
    .eq("year", currentYear)
    .eq("month", currentMonth - 1) // Check last month
    .single();

  // Calculate summary stats (with safe fallbacks for missing tables)
  const arArray = arData || [];
  const apArray = apData || [];
  const alertsArray = alerts || [];
  const creditsArray = credits || [];

  const arSummary = {
    total: arArray.reduce((sum, ar) => sum + parseFloat(ar.amount_due as any || 0), 0),
    overdue: arArray.filter(ar => ar.status === 'overdue').reduce((sum, ar) => sum + parseFloat(ar.amount_due as any || 0), 0),
    count: arArray.filter(ar => ar.status !== 'paid').length,
  };

  const apSummary = {
    total: apArray.reduce((sum, ap) => sum + parseFloat(ap.amount_due as any || 0), 0),
    overdue: apArray.filter(ap => ap.status === 'overdue').reduce((sum, ap) => sum + parseFloat(ap.amount_due as any || 0), 0),
    count: apArray.filter(ap => ap.status !== 'paid').length,
  };

  // Count alerts by severity
  const alertsSummary = {
    critical: alertsArray.filter(a => a.severity === 'critical').length,
    warning: alertsArray.filter(a => a.severity === 'warning').length,
    info: alertsArray.filter(a => a.severity === 'info').length,
    total: alertsArray.length,
  };

  // Calculate total available credits
  const totalCredits = creditsArray.reduce((sum, c) => sum + (c.amount || 0), 0);

  return (
    <AccountingDashboard
      initialAR={arData || []}
      initialAP={apData || []}
      initialPayments={paymentsData || []}
      companies={companies || []}
      qbConnected={!!qbConnection}
      qbConnection={qbConnection}
      qbSyncLogs={qbSyncLogs || []}
      lastSuccessfulSync={lastSuccessfulSync}
      arSummary={arSummary}
      apSummary={apSummary}
      alerts={alerts || []}
      alertsSummary={alertsSummary}
      totalCredits={totalCredits / 100} // Convert to dollars
      monthEndStatus={monthEndStatus}
      currentMonth={currentMonth}
      currentYear={currentYear}
    />
  );
}
