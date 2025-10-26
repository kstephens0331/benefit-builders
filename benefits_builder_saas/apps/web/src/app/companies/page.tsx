// src/app/companies/page.tsx
import { createServiceClient } from "@/lib/supabase";
import CompaniesManager from "@/components/CompaniesManager";

export const metadata = { title: "Companies" };

export default async function CompaniesPage() {
  const db = createServiceClient();
  const { data, error } = await db
    .from("companies")
    .select("*")
    .order("name");

  if (error) {
    return (
      <main className="max-w-6xl mx-auto p-6">
        <pre className="text-red-600">{error.message}</pre>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto p-6">
      <CompaniesManager initialCompanies={data ?? []} />
    </main>
  );
}
