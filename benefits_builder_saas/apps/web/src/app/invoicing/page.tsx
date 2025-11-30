/**
 * Invoice Management Page
 *
 * Comprehensive invoice management system with:
 * - List all invoices with filtering
 * - Create/edit invoices
 * - PDF generation and preview
 * - Email/Mail delivery
 * - Payment processing (ACH, Card, Check)
 * - QuickBooks sync
 */

import { Suspense } from "react";
import { createServiceClient } from "@/lib/supabase";
import { InvoiceManagementClient } from "@/components/invoicing/InvoiceManagementClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";

export const metadata = {
  title: "Invoice Management | Benefits Builder",
  description: "Manage invoices, payments, and billing",
};

export default async function InvoicingPage() {
  const supabase = createServiceClient();

  // Fetch invoices with company data
  const { data: invoices, error } = await supabase
    .from("invoices")
    .select(`
      *,
      companies:company_id (
        id,
        name,
        contact_email,
        contact_phone
      )
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  // Fetch QuickBooks connection status
  const { data: qbConnection } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("integration_type", "quickbooks")
    .eq("status", "active")
    .single();

  // Get payment statistics
  const { data: stats } = await supabase
    .from("invoices")
    .select("payment_status, total_cents")
    .then((result) => {
      if (!result.data) return { data: null };

      const stats = {
        totalOutstanding: 0,
        totalPaid: 0,
        totalOverdue: 0,
        unpaidCount: 0,
        paidCount: 0,
        overdueCount: 0,
      };

      result.data.forEach((inv: any) => {
        const amount = (inv.total_cents || 0) / 100;

        if (inv.payment_status === "paid") {
          stats.totalPaid += amount;
          stats.paidCount++;
        } else if (inv.payment_status === "overdue") {
          stats.totalOverdue += amount;
          stats.overdueCount++;
        } else {
          stats.totalOutstanding += amount;
          stats.unpaidCount++;
        }
      });

      return { data: stats };
    });

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Card variant="elevated">
          <CardContent className="py-16 text-center">
            <p className="text-error-600 dark:text-error-400">
              Error loading invoices: {error.message}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            Invoice Management
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Manage invoices, payments, and billing for all companies
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card variant="elevated" className="border-l-4 border-warning-500">
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Outstanding
                  </p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                    ${stats.totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    {stats.unpaidCount} invoice{stats.unpaidCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="text-4xl">📊</div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated" className="border-l-4 border-success-500">
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Paid This Month
                  </p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                    ${stats.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    {stats.paidCount} invoice{stats.paidCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="text-4xl">✅</div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated" className="border-l-4 border-error-500">
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Overdue
                  </p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                    ${stats.totalOverdue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    {stats.overdueCount} invoice{stats.overdueCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="text-4xl">⚠️</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Invoice Management Component */}
      <Suspense fallback={<div>Loading invoices...</div>}>
        <InvoiceManagementClient
          initialInvoices={invoices || []}
          qbConnected={!!qbConnection}
        />
      </Suspense>
    </div>
  );
}
