import { createServiceClient } from "@/lib/supabase";
import CreditsManager from "@/components/CreditsManager";

export const metadata = {
  title: "Credits Management - Accounting",
};

export default async function CreditsPage() {
  const db = createServiceClient();

  // Fetch all credits with company and invoice info
  const { data: credits } = await db
    .from("company_credits")
    .select(`
      *,
      company:companies(id, name, contact_email),
      source_invoice:invoices!source_invoice_id(invoice_number, total_cents),
      applied_invoice:invoices!applied_to_invoice_id(invoice_number, total_cents)
    `)
    .order("created_at", { ascending: false });

  // Fetch companies for dropdown
  const { data: companies } = await db
    .from("companies")
    .select("id, name")
    .eq("status", "active")
    .order("name");

  // Calculate stats
  const stats = {
    totalAvailable: credits?.filter(c => c.status === 'available').reduce((sum, c) => sum + c.amount, 0) || 0,
    totalApplied: credits?.filter(c => c.status === 'applied').reduce((sum, c) => sum + c.amount, 0) || 0,
    totalExpired: credits?.filter(c => c.status === 'expired').reduce((sum, c) => sum + c.amount, 0) || 0,
    countAvailable: credits?.filter(c => c.status === 'available').length || 0,
    countApplied: credits?.filter(c => c.status === 'applied').length || 0,
    countExpired: credits?.filter(c => c.status === 'expired').length || 0,
  };

  // Group credits by company
  const creditsByCompany = credits?.reduce((acc: any, credit) => {
    const companyId = credit.company_id;
    if (!acc[companyId]) {
      acc[companyId] = {
        company: credit.company,
        totalAvailable: 0,
        credits: [],
      };
    }
    if (credit.status === 'available') {
      acc[companyId].totalAvailable += credit.amount;
    }
    acc[companyId].credits.push(credit);
    return acc;
  }, {});

  return (
    <CreditsManager
      credits={credits || []}
      companies={companies || []}
      stats={stats}
      creditsByCompany={creditsByCompany || {}}
    />
  );
}
