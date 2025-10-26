// apps/web/src/app/admin/page.tsx
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";

export const metadata = { title: "Admin Dashboard" };

export default async function AdminPage() {
  const db = createServiceClient();

  // Get counts for overview
  const [companies, employees, users, invoices, taxRates] = await Promise.all([
    db.from("companies").select("*", { count: "exact", head: true }),
    db.from("employees").select("*", { count: "exact", head: true }),
    db.from("internal_users").select("*", { count: "exact", head: true }),
    db.from("invoices").select("*", { count: "exact", head: true }),
    db.from("tax_state_rates").select("*", { count: "exact", head: true }),
  ]);

  const adminCards = [
    {
      title: "Companies",
      description: "Manage company accounts, billing models, and settings",
      count: companies.count || 0,
      href: "/companies",
      color: "bg-blue-500",
      actions: ["Add", "Edit", "Archive", "Delete"],
    },
    {
      title: "Employees",
      description: "Manage employee records, payroll info, and tax details",
      count: employees.count || 0,
      href: "/admin/employees",
      color: "bg-green-500",
      actions: ["Add", "Edit", "Delete"],
    },
    {
      title: "Benefits",
      description: "Manage employee benefit elections and deductions",
      count: "Per Employee",
      href: "/admin/employees",
      color: "bg-purple-500",
      actions: ["Add", "Edit", "Delete"],
    },
    {
      title: "Invoices",
      description: "View and manage billing invoices",
      count: invoices.count || 0,
      href: "/admin/invoices",
      color: "bg-orange-500",
      actions: ["Edit", "Delete"],
    },
    {
      title: "Users",
      description: "Manage internal system users and permissions",
      count: users.count || 0,
      href: "/admin/users",
      color: "bg-red-500",
      actions: ["Add", "Edit", "Delete"],
    },
    {
      title: "Tax Rates",
      description: "Manage state and federal tax rates",
      count: taxRates.count || 0,
      href: "/admin/tax-rates",
      color: "bg-indigo-500",
      actions: ["Edit", "Import"],
    },
  ];

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-slate-600 mt-1">
          Complete control over all system data and settings
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminCards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="block p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center text-white font-bold text-xl`}>
                {typeof card.count === "number" ? card.count : "∞"}
              </div>
              <svg
                className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>

            <h2 className="text-xl font-bold mb-2">{card.title}</h2>
            <p className="text-sm text-slate-600 mb-4">{card.description}</p>

            <div className="flex flex-wrap gap-2">
              {card.actions.map((action) => (
                <span
                  key={action}
                  className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium"
                >
                  {action}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-2">📋 Quick Actions</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• <strong>Companies</strong>: Add new companies, edit rates, archive inactive accounts</li>
          <li>• <strong>Employees</strong>: Add employees manually or via bulk upload</li>
          <li>• <strong>Benefits</strong>: Manage employee benefit elections and deductions</li>
          <li>• <strong>Invoices</strong>: Edit billing amounts or delete incorrect invoices</li>
          <li>• <strong>Users</strong>: Add team members and set their permissions</li>
          <li>• <strong>Tax Rates</strong>: Update state tax brackets and rates annually</li>
        </ul>
      </div>
    </main>
  );
}
