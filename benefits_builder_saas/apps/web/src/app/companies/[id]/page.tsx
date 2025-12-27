// apps/web/src/app/companies/[id]/page.tsx
import { createServiceClient } from "@/lib/supabase";
import { getCurrentUser, isAdmin, isClient } from "@/lib/auth";
import CompanyDetailManager from "@/components/CompanyDetailManager";

type Params = { params: Promise<{ id: string }> };

export default async function CompanyPage({ params }: Params) {
  const { id: companyId } = await params;
  const db = createServiceClient();
  const user = await getCurrentUser();
  const userIsAdmin = isAdmin(user);
  const userIsClient = isClient(user);

  const { data: company, error: cErr } = await db
    .from("companies")
    .select("id,name,state,model,status,tier,employer_rate,employee_rate,pay_frequency,contact_name,contact_phone,address,city,assigned_rep_id")
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

  // Fetch reps list for admin assignment dropdown
  let reps: { id: string; full_name: string }[] = [];
  if (userIsAdmin) {
    const { data: repData } = await db
      .from("internal_users")
      .select("id, full_name")
      .in("role", ["rep", "admin", "super_admin"])
      .eq("active", true)
      .order("full_name");
    reps = repData || [];
  }

  return (
    <CompanyDetailManager
      company={company}
      initialEmployees={employees || []}
      reps={reps}
      userIsAdmin={userIsAdmin}
      userIsClient={userIsClient}
    />
  );
}
