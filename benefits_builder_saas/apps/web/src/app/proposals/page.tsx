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

  // Fetch companies for dropdown
  const { data: companies } = await db
    .from("companies")
    .select("id, name")
    .eq("status", "active")
    .order("name");

  return (
    <ProposalManager
      initialProposals={proposals || []}
      companies={companies || []}
    />
  );
}
