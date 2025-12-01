import { createServiceClient } from "@/lib/supabase";
import ProposalManager from "@/components/ProposalManager";

export const metadata = {
  title: "Proposals - Benefits Builder",
};

export default async function ProposalsPage() {
  const db = createServiceClient();

  // Fetch proposals
  const { data: proposals } = await db
    .from("proposals")
    .select("*")
    .order("created_at", { ascending: false });

  // Fetch all companies for dropdown with all needed fields for auto-population
  const { data: companies } = await db
    .from("companies")
    .select("id, name, state, model, pay_frequency, employer_rate, employee_rate, tier, address, city, phone, email, contact_name")
    .order("name");

  return (
    <ProposalManager
      initialProposals={proposals || []}
      companies={companies || []}
    />
  );
}
