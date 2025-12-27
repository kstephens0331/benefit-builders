import { createServiceClient } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import PaymentAlertsManager from "@/components/PaymentAlertsManager";

export const metadata = {
  title: "Payment Alerts - Accounting",
};

export default async function PaymentAlertsPage() {
  const db = createServiceClient();
  const user = await getCurrentUser();

  // Fetch all payment alerts
  const { data: alerts } = await db
    .from("payment_alerts")
    .select(`
      *,
      company:companies(id, name, contact_email),
      invoice:invoices(
        id,
        invoice_number,
        total_cents,
        amount_paid_cents,
        due_date,
        payment_status
      ),
      payment:payment_transactions(id, amount, payment_date, status)
    `)
    .order("created_at", { ascending: false });

  // Fetch payment reminders history
  const { data: reminders } = await db
    .from("payment_reminders")
    .select(`
      *,
      invoice:invoices(invoice_number, company:companies(name))
    `)
    .order("sent_at", { ascending: false })
    .limit(20);

  // Get counts by status and severity
  const stats = {
    total: alerts?.length || 0,
    active: alerts?.filter(a => a.status === 'active').length || 0,
    acknowledged: alerts?.filter(a => a.status === 'acknowledged').length || 0,
    resolved: alerts?.filter(a => a.status === 'resolved').length || 0,
    critical: alerts?.filter(a => a.severity === 'critical' && a.status === 'active').length || 0,
    warning: alerts?.filter(a => a.severity === 'warning' && a.status === 'active').length || 0,
    info: alerts?.filter(a => a.severity === 'info' && a.status === 'active').length || 0,
  };

  return (
    <PaymentAlertsManager
      alerts={alerts || []}
      reminders={reminders || []}
      stats={stats}
      userId={user?.id || null}
    />
  );
}
