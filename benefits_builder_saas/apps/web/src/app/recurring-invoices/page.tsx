import { createServiceClient } from "@/lib/supabase";
import RecurringInvoicesManager from "@/components/RecurringInvoicesManager";

export const metadata = {
  title: "Recurring Invoices",
};

export default async function RecurringInvoicesPage() {
  const db = createServiceClient();

  // Fetch all recurring invoices
  const { data: recurringInvoices } = await db
    .from("recurring_invoices")
    .select(`
      *,
      company:companies(id, name, contact_email),
      payment_method:customer_payment_methods(
        id,
        payment_type,
        card_last_four,
        account_last_four,
        bank_name
      )
    `)
    .order("next_invoice_date", { ascending: true });

  // Fetch all companies for the create form
  const { data: companies } = await db
    .from("companies")
    .select("id, name")
    .order("name");

  // Fetch payment methods (for auto-charge feature)
  const { data: paymentMethods } = await db
    .from("customer_payment_methods")
    .select(`
      id,
      company_id,
      payment_type,
      card_last_four,
      account_last_four,
      bank_name,
      is_verified,
      is_active
    `)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  // Calculate stats
  const activeCount = recurringInvoices?.filter(r => r.is_active).length || 0;
  const inactiveCount = recurringInvoices?.filter(r => !r.is_active).length || 0;
  const autoChargeCount = recurringInvoices?.filter(r => r.auto_charge && r.is_active).length || 0;

  // Get upcoming invoices (next 7 days)
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  const upcomingCount = recurringInvoices?.filter(r => {
    if (!r.is_active) return false;
    const nextDate = new Date(r.next_invoice_date);
    return nextDate >= today && nextDate <= nextWeek;
  }).length || 0;

  return (
    <RecurringInvoicesManager
      initialRecurringInvoices={recurringInvoices || []}
      companies={companies || []}
      paymentMethods={paymentMethods || []}
      stats={{
        total: recurringInvoices?.length || 0,
        active: activeCount,
        inactive: inactiveCount,
        autoCharge: autoChargeCount,
        upcoming: upcomingCount,
      }}
    />
  );
}
