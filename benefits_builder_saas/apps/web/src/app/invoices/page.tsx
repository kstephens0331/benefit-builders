import { createServiceClient } from "@/lib/supabase";
import InvoiceManager from "@/components/InvoiceManager";

export const metadata = {
  title: "Invoice Management",
};

export default async function InvoicesPage() {
  const db = createServiceClient();

  // Fetch all invoices with company details
  const { data: invoices } = await db
    .from("invoices")
    .select(`
      id,
      company_id,
      period,
      status,
      subtotal_cents,
      tax_cents,
      total_cents,
      issued_at,
      companies(name, contact_email)
    `)
    .order("issued_at", { ascending: false });

  // Get unique periods for filter dropdown
  const periods = Array.from(
    new Set(invoices?.map((inv) => inv.period) || [])
  ).sort().reverse();

  return <InvoiceManager invoices={invoices || []} periods={periods} />;
}
