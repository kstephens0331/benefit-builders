import { createServiceClient } from "@/lib/supabase";
import ProposalManager from "@/components/ProposalManager";

// Force dynamic rendering to always fetch fresh data
export const dynamic = "force-dynamic";

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

  // Fetch all companies - use * to get all fields, let the component filter what it needs
  const { data: companies, error: companiesError } = await db
    .from("companies")
    .select("*")
    .order("name");

  // Log error if any for debugging
  if (companiesError) {
    console.error("Error fetching companies:", companiesError);
  }

  return (
    <ProposalManager
      initialProposals={proposals || []}
      companies={companies || []}
    />
  );
}
