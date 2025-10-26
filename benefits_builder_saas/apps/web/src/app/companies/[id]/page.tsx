// apps/web/src/app/companies/[id]/page.tsx
import { createServiceClient } from "@/lib/supabase";
import CompanyDetailManager from "@/components/CompanyDetailManager";

type Params = { params: Promise<{ id: string }> };

export default async function CompanyPage({ params }: Params) {
  const { id: companyId } = await params;
  const db = createServiceClient();

  const { data: company, error: cErr } = await db
    .from("companies")
    .select("id,name,state,model,status")
    .eq("id", companyId)
    .single();

  if (cErr || !company) {
    return (
      <main className="max-w-7xl mx-auto p-6">
        <pre className="text-red-600">{cErr?.message ?? "Company not found"}</pre>
      </main>
    );
  }

  const { data: employees, error: eErr } = await db
    .from("employees")
    .select(
      "id,first_name,last_name,filing_status,dependents,gross_pay,consent_status,active,dob"
    )
    .eq("company_id", companyId)
    .order("last_name");

  if (eErr) {
    return (
      <main className="max-w-7xl mx-auto p-6">
        <pre className="text-red-600">{eErr.message}</pre>
      </main>
    );
  }

  return <CompanyDetailManager company={company} initialEmployees={employees || []} />;
}
