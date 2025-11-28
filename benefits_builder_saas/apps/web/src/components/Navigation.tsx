"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  unread_notifications?: number;
  quickbooks_enabled?: boolean;
}

interface NavigationProps {
  user: User | null;
}

export default function Navigation({ user }: NavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAccountingOpen, setIsAccountingOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isActive = (path: string) => pathname === path;

  const handleLogout = () => {
    // Logout logic here
    router.push("/login");
  };

  if (!user) {
    return (
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4">
          <div data-testid="navigation-skeleton" className="h-16 flex items-center">
            <div className="animate-pulse bg-gray-200 h-8 w-48 rounded"></div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav role="navigation" className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          {/* Left side - Menu items */}
          <div className="flex items-center gap-1">
            {/* Mobile menu button */}
            <button
              aria-label="Toggle menu"
              className="md:hidden p-2 rounded hover:bg-gray-100"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Desktop menu */}
            <div className="hidden md:flex items-center gap-1">
              <a
                href="/dashboard"
                className={`px-3 py-2 rounded text-sm ${
                  isActive("/dashboard") ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Dashboard
              </a>
              <a
                href="/companies"
                className={`px-3 py-2 rounded text-sm ${
                  isActive("/companies") ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Companies
              </a>
              <a
                href="/invoices"
                className={`px-3 py-2 rounded text-sm ${
                  isActive("/invoices") ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Invoices
              </a>

              {/* Accounting Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsAccountingOpen(!isAccountingOpen)}
                  className="px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-100"
                >
                  Accounting
                </button>
                {isAccountingOpen && (
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-50">
                    <a href="/accounting/ar" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      A/R
                    </a>
                    <a href="/accounting/ap" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      A/P
                    </a>
                    <a href="/accounting/payments" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      Payments
                    </a>
                  </div>
                )}
              </div>

              {/* Reports Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsReportsOpen(!isReportsOpen)}
                  className="px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-100"
                >
                  Reports
                </button>
                {isReportsOpen && (
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-50">
                    <a href="/reports/aging" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      Aging Reports
                    </a>
                    <a href="/reports/billing" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      Billing Reports
                    </a>
                    <a href="/reports/summary" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      Summary
                    </a>
                  </div>
                )}
              </div>

              {user.role === "admin" && (
                <a
                  href="/settings"
                  className={`px-3 py-2 rounded text-sm ${
                    isActive("/settings") ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Settings
                </a>
              )}

              {user.quickbooks_enabled && (
                <a
                  href="/quickbooks"
                  className={`px-3 py-2 rounded text-sm ${
                    isActive("/quickbooks") ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  QuickBooks
                </a>
              )}
            </div>
          </div>

          {/* Right side - Search, Quick Actions, Notifications, User Menu */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setSearchQuery("");
                  }
                }}
                className="px-3 py-1 border border-gray-300 rounded text-sm w-48"
              />
            </div>

            {/* Quick Actions */}
            <div className="relative">
              <button
                aria-label="Quick actions"
                onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
                className="p-2 rounded hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              {isQuickActionsOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-50">
                  <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    Create Invoice
                  </button>
                  <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    Add Company
                  </button>
                  <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    Add Employee
                  </button>
                </div>
              )}
            </div>

            {/* Notifications */}
            {user.unread_notifications && user.unread_notifications > 0 && (
              <div className="relative">
                <button
                  aria-label="Notifications"
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="p-2 rounded hover:bg-gray-100 relative"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                    {user.unread_notifications}
                  </span>
                </button>
                {isNotificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
                    <div className="p-4">
                      <h3 className="font-semibold mb-2">Notifications</h3>
                      <p className="text-sm text-gray-600">No new notifications</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-2 rounded hover:bg-gray-100"
              >
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  <div className="text-xs text-gray-500">{user.email}</div>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-xs">
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
              </button>
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border z-50">
                  <div className="p-4 border-b">
                    <div className="font-semibold text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                  <div className="py-1">
                    <a href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      Profile
                    </a>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t py-2">
            <a
              href="/dashboard"
              className="block px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-100"
            >
              Dashboard
            </a>
            <a
              href="/companies"
              className="block px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-100"
            >
              Companies
            </a>
            <a
              href="/invoices"
              className="block px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-100"
            >
              Invoices
            </a>
            {user.role === "admin" && (
              <a
                href="/settings"
                className="block px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-100"
              >
                Settings
              </a>
            )}
          </div>
        )}
      </div>

      {/* Live region for accessibility */}
      <div role="status" aria-live="polite" className="sr-only"></div>
    </nav>
  );
}
