"use client";

/**
 * Client-side Navigation Wrapper
 *
 * Wraps navigation items with client-side theme toggle
 */

import Link from "next/link";
import type { Route } from "next";
import { ThemeToggle } from "./ThemeToggle";

interface NavClientProps {
  userMenu?: React.ReactNode;
}

export function NavClient({ userMenu }: NavClientProps) {
  const link =
    "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-primary-600 dark:hover:text-primary-400 active:scale-95";

  return (
    <nav className="flex items-center gap-1">
      <Link className={link} href={"/dashboard" as Route}>
        Dashboard
      </Link>
      <Link className={link} href={"/companies" as Route}>
        Companies
      </Link>
      <Link className={link} href={"/proposals" as Route}>
        Proposals
      </Link>
      <Link className={link} href={"/admin/billing" as Route}>
        Billing
      </Link>
      <Link className={link} href={"/accounting" as Route}>
        Accounting
      </Link>
      <Link className={link} href={"/reports" as Route}>
        Reports
      </Link>

      {/* Theme Toggle */}
      <div className="ml-2 pl-2 border-l border-neutral-200 dark:border-neutral-700">
        <ThemeToggle />
      </div>

      {/* User Menu */}
      {userMenu && (
        <div className="ml-2 pl-2 border-l border-neutral-200 dark:border-neutral-700">
          {userMenu}
        </div>
      )}
    </nav>
  );
}
