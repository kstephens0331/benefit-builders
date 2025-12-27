// apps/web/src/app/admin/users/page.tsx
import { createServiceClient } from "@/lib/supabase";
import UsersManager from "@/components/UsersManager";

export const metadata = { title: "User Management" };

export default async function UsersPage() {
  const db = createServiceClient();

  // Fetch users with their assigned company info
  const { data: users, error: usersError } = await db
    .from("internal_users")
    .select("*, assigned_company:companies!assigned_company_id(id, name)")
    .order("username");

  // Fetch all companies for the client assignment dropdown
  const { data: companies, error: companiesError } = await db
    .from("companies")
    .select("id, name")
    .order("name");

  if (usersError) {
    return (
      <main className="max-w-6xl mx-auto p-6">
        <pre className="text-red-600">{usersError.message}</pre>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto p-6">
      <UsersManager
        initialUsers={users ?? []}
        companies={companies ?? []}
      />
    </main>
  );
}
