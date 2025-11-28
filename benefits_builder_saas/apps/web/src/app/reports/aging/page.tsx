import { createServiceClient } from "@/lib/supabase";
import AgingReport from "@/components/AgingReport";
import {
  processARforAging,
  processAPforAging,
  calculateAgingSummary,
} from "@/lib/aging";
import Link from "next/link";

export const metadata = {
  title: "Aging Reports - A/R & A/P",
};

export default async function AgingReportPage() {
  const db = createServiceClient();

  // Fetch unpaid A/R with company info
  const { data: arData } = await db
    .from("accounts_receivable")
    .select(`
      id,
      company_id,
      invoice_number,
      due_date,
      amount_due,
      companies(name)
    `)
    .neq("status", "paid")
    .order("due_date", { ascending: true });

  // Fetch unpaid A/P
  const { data: apData } = await db
    .from("accounts_payable")
    .select("*")
    .neq("status", "paid")
    .order("due_date", { ascending: true });

  // Process data for aging
  const arItems = processARforAging(arData || []);
  const apItems = processAPforAging(apData || []);

  const arSummary = calculateAgingSummary(arItems);
  const apSummary = calculateAgingSummary(apItems);

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Aging Reports</h1>
          <p className="text-slate-600 text-sm">
            Track overdue invoices and bills with 30/60/90+ day aging analysis
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/accounting"
            className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
          >
            Back to Accounting
          </Link>
          <Link
            href="/invoices"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            View Invoices
          </Link>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-2">
            Accounts Receivable
          </h3>
          <div className="text-3xl font-bold text-blue-900 mb-4">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(arSummary.total)}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-blue-700">Overdue (30+)</div>
              <div className="font-bold text-blue-900">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(arSummary.days_30 + arSummary.days_60 + arSummary.days_90_plus)}
              </div>
            </div>
            <div>
              <div className="text-blue-700">Severely Overdue (90+)</div>
              <div className="font-bold text-red-600">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(arSummary.days_90_plus)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow p-6">
          <h3 className="text-lg font-bold text-purple-900 mb-2">
            Accounts Payable
          </h3>
          <div className="text-3xl font-bold text-purple-900 mb-4">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(apSummary.total)}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-purple-700">Overdue (30+)</div>
              <div className="font-bold text-purple-900">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(apSummary.days_30 + apSummary.days_60 + apSummary.days_90_plus)}
              </div>
            </div>
            <div>
              <div className="text-purple-700">Severely Overdue (90+)</div>
              <div className="font-bold text-red-600">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(apSummary.days_90_plus)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* A/R Aging Report */}
      <AgingReport items={arItems} summary={arSummary} type="ar" />

      {/* Divider */}
      <div className="border-t-2 border-slate-200 my-8" />

      {/* A/P Aging Report */}
      <AgingReport items={apItems} summary={apSummary} type="ap" />
    </main>
  );
}
