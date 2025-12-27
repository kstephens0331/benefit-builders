"use client";

/**
 * Client-side Navigation Wrapper
 *
 * Wraps navigation items with client-side interactions
 * Shows different nav items based on user role:
 * - Admins: All pages
 * - Reps: Companies, Proposals only
 * - Clients: Companies only (their single company)
 */

import Link from "next/link";
import type { Route } from "next";

interface NavClientProps {
  userMenu?: React.ReactNode;
  isAdmin?: boolean;
  canAccessProposals?: boolean;
}

export function NavClient({ userMenu, isAdmin = false, canAccessProposals = false }: NavClientProps) {
  const link =
    "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-neutral-700 hover:bg-neutral-100 hover:text-primary-600 active:scale-95";

  return (
    <nav className="flex items-center gap-1">
      {/* Admin-only pages */}
      {isAdmin && (
        <Link className={link} href={"/dashboard" as Route}>
          Dashboard
        </Link>
      )}

      {/* Companies - visible to all authenticated users */}
      <Link className={link} href={"/companies" as Route}>
        Companies
      </Link>

      {/* Proposals - visible to admins and reps only */}
      {canAccessProposals && (
        <Link className={link} href={"/proposals" as Route}>
          Proposals
        </Link>
      )}

      {/* Admin-only pages */}
      {isAdmin && (
        <>
          <Link className={link} href={"/admin/billing" as Route}>
            Billing
          </Link>
          <Link className={link} href={"/accounting" as Route}>
            Accounting
          </Link>
          <Link className={link} href={"/reports" as Route}>
            Reports
          </Link>
          <Link className={link} href={"/admin/users" as Route}>
            Users
          </Link>
        </>
      )}

      {/* User Menu */}
      {userMenu && (
        <div className="ml-2 pl-2 border-l border-neutral-200">
          {userMenu}
        </div>
      )}
    </nav>
  );
}
