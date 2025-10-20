import Link from "next/link";
import type { Route } from "next";

export default function Nav() {
  const link =
    "px-3 py-2 rounded-lg text-sm transition text-slate-700 hover:bg-slate-100";

  return (
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href={"/" as Route} className="font-semibold tracking-tight">
          Benefits Builder
        </Link>
        <nav className="flex items-center gap-1">
          <Link className={link} href={"/" as Route}>Home</Link>
          <Link className={link} href={"/companies" as Route}>Companies</Link>
          <Link className={link} href={"/admin/billing" as Route}>Billing</Link>
          <Link className={link} href={"/admin/catalog" as Route}>Catalog</Link>
          <Link className={link} href={"/admin/tax" as Route}>Tax</Link>
          <Link className={link} href={"/reports" as Route}>Reports</Link>
        </nav>
      </div>
    </header>
  );
}
