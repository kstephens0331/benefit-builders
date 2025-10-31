import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";
import AccountingManager from "@/components/AccountingManager";

export const metadata = {
  title: "A/R & A/P - Accounting",
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

  // Calculate summary stats
  const arSummary = {
    total: arData?.reduce((sum, ar) => sum + parseFloat(ar.amount_due as any), 0) || 0,
    overdue: arData?.filter(ar => ar.status === 'overdue').reduce((sum, ar) => sum + parseFloat(ar.amount_due as any), 0) || 0,
    count: arData?.filter(ar => ar.status !== 'paid').length || 0,
  };

  const apSummary = {
    total: apData?.reduce((sum, ap) => sum + parseFloat(ap.amount_due as any), 0) || 0,
    overdue: apData?.filter(ap => ap.status === 'overdue').reduce((sum, ap) => sum + parseFloat(ap.amount_due as any), 0) || 0,
    count: apData?.filter(ap => ap.status !== 'paid').length || 0,
  };

  return (
    <AccountingManager
      initialAR={arData || []}
      initialAP={apData || []}
      initialPayments={paymentsData || []}
      companies={companies || []}
      qbConnected={!!qbConnection}
      arSummary={arSummary}
      apSummary={apSummary}
    />
  );
}
