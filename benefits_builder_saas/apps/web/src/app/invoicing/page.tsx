/**
 * Invoice Management Page
 * Basic placeholder for invoice management functionality
 */

import { Card, CardContent } from "@/components/ui";

export const metadata = {
  title: "Invoice Management | Benefits Builder",
  description: "Manage invoices, payments, and billing",
};

export default function InvoicingPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
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

      <Card variant="elevated">
        <CardContent className="py-16 text-center">
          <p className="text-neutral-600 dark:text-neutral-400">
            Invoice management features coming soon
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
