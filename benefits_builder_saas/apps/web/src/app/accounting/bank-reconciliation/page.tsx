import { createServiceClient } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import BankReconciliationManager from "@/components/BankReconciliationManager";

export const metadata = {
  title: "Bank Reconciliation - Accounting",
};

export default async function BankReconciliationPage() {
  const db = createServiceClient();
  const user = await getCurrentUser();

  // Fetch all bank reconciliations
  const { data: reconciliations } = await db
    .from("bank_reconciliations")
    .select("*")
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  // Calculate stats
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const reconciled = reconciliations?.filter(r => r.reconciled).length || 0;
  const pending = reconciliations?.filter(r => !r.reconciled).length || 0;
  const thisYear = reconciliations?.filter(r => r.year === currentYear).length || 0;
  const hasDiscrepancies = reconciliations?.filter(r => Math.abs(r.difference || 0) > 0.01).length || 0;

  // Get current month status
  const currentMonthRec = reconciliations?.find(
    r => r.year === currentYear && r.month === currentMonth
  );

  return (
    <BankReconciliationManager
      initialReconciliations={reconciliations || []}
      stats={{
        total: reconciliations?.length || 0,
        reconciled,
        pending,
        thisYear,
        hasDiscrepancies,
      }}
      currentMonth={{
        year: currentYear,
        month: currentMonth,
        exists: !!currentMonthRec,
        reconciled: currentMonthRec?.reconciled || false,
      }}
      userId={user?.id || null}
    />
  );
}
