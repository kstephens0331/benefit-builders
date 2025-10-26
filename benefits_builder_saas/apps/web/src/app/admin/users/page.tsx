// apps/web/src/app/admin/users/page.tsx
import { createServiceClient } from "@/lib/supabase";
import UsersManager from "@/components/UsersManager";

export const metadata = { title: "User Management" };

export default async function UsersPage() {
  const db = createServiceClient();
  const { data, error } = await db
    .from("internal_users")
    .select("*")
    .order("username");

  if (error) {
    return (
      <main className="max-w-6xl mx-auto p-6">
        <pre className="text-red-600">{error.message}</pre>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto p-6">
      <UsersManager initialUsers={data ?? []} />
    </main>
  );
}
