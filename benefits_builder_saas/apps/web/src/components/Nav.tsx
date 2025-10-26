import Link from "next/link";
import type { Route } from "next";
import { getCurrentUser } from "@/lib/auth";
import UserMenu from "./UserMenu";

export default async function Nav() {
  const user = await getCurrentUser();
  const link =
    "px-3 py-2 rounded-lg text-sm transition text-slate-700 hover:bg-slate-100";

  return (
    <nav className="flex items-center gap-1">
      <Link className={link} href={"/" as Route}>Home</Link>
      <Link className={link} href={"/companies" as Route}>Companies</Link>
      <Link className={link} href={"/admin/billing" as Route}>Billing</Link>
      <Link className={link} href={"/reports" as Route}>Reports</Link>
      <Link className={link} href={"/dashboard" as Route}>Dashboard</Link>

      {user && (
        <div className="ml-2 pl-2 border-l border-slate-200">
          <UserMenu user={user} />
        </div>
      )}
    </nav>
  );
}
