import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";
import { notFound } from "next/navigation";

export const metadata = {
  title: "Month-End Details",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function MonthEndDetailsPage({ params }: Props) {
  const { id } = await params;
  const db = createServiceClient();

  // Fetch closing record
  const { data: closing, error: closingError } = await db
    .from("month_end_closings")
    .select("*")
    .eq("id", id)
    .single();

  if (closingError || !closing) {
    notFound();
  }

  // Fetch company details
  const { data: companyDetails } = await db
    .from("month_end_company_details")
    .select("*")
    .eq("closing_id", id)
    .order("company_name");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount || 0);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/month-end"
            className="text-blue-600 hover:text-blue-700 text-sm mb-2 inline-block"
          >
            ← Back to Month-End Closings
          </Link>
          <h1 className="text-2xl font-bold">{closing.month_year} - Closing Details</h1>
          <p className="text-slate-600 text-sm">
            Closed on {formatDate(closing.closed_at || closing.created_at)}
          </p>
        </div>
        <a
          href={`/api/month-end/${id}/download`}
          target="_blank"
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Download CSV Report
        </a>
      </div>

      {/* Overall Summary */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-bold mb-4">Overall Summary</h2>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-slate-600">Companies</div>
            <div className="text-2xl font-bold">{closing.total_companies || 0}</div>
          </div>
          <div>
            <div className="text-sm text-slate-600">Employees</div>
            <div className="text-2xl font-bold">{closing.total_employees || 0}</div>
          </div>
          <div>
            <div className="text-sm text-slate-600">Pre-Tax Deductions</div>
            <div className="text-2xl font-bold">{formatCurrency(closing.total_pretax_deductions || 0)}</div>
          </div>
          <div>
            <div className="text-sm text-slate-600">BB Fees</div>
            <div className="text-2xl font-bold text-green-700">{formatCurrency(closing.total_bb_fees || 0)}</div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
          <div>
            <div className="text-sm text-slate-600">Employer FICA Savings</div>
            <div className="text-xl font-bold">{formatCurrency(closing.total_employer_savings || 0)}</div>
          </div>
          <div>
            <div className="text-sm text-slate-600">Employee Tax Savings</div>
            <div className="text-xl font-bold">{formatCurrency(closing.total_employee_savings || 0)}</div>
          </div>
          <div>
            <div className="text-sm text-slate-600">A/R Open</div>
            <div className="text-xl font-bold text-yellow-700">{formatCurrency(closing.total_ar_open || 0)}</div>
          </div>
          <div>
            <div className="text-sm text-slate-600">Emails Sent / Failed</div>
            <div className="text-xl font-bold">
              <span className="text-green-700">{closing.emails_sent || 0}</span>
              {(closing.emails_failed || 0) > 0 && (
                <span className="text-red-700"> / {closing.emails_failed}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Company Details Table */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Company Breakdown</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-3">Company</th>
                  <th className="text-right py-3 px-3">Employees</th>
                  <th className="text-right py-3 px-3">Enrolled</th>
                  <th className="text-right py-3 px-3">Rate %</th>
                  <th className="text-right py-3 px-3">Deductions</th>
                  <th className="text-right py-3 px-3">BB Fees</th>
                  <th className="text-right py-3 px-3">Employer Savings</th>
                  <th className="text-right py-3 px-3">Employee Savings</th>
                  <th className="text-right py-3 px-3">Net Savings</th>
                  <th className="text-center py-3 px-3">Email</th>
                </tr>
              </thead>
              <tbody>
                {companyDetails?.map((detail) => (
                  <tr key={detail.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-3 font-medium">{detail.company_name}</td>
                    <td className="py-3 px-3 text-right">{detail.employee_count}</td>
                    <td className="py-3 px-3 text-right">{detail.enrolled_count}</td>
                    <td className="py-3 px-3 text-right">{detail.enrollment_rate?.toFixed(1)}%</td>
                    <td className="py-3 px-3 text-right">{formatCurrency(detail.pretax_deductions || 0)}</td>
                    <td className="py-3 px-3 text-right font-bold text-green-700">{formatCurrency(detail.bb_fees || 0)}</td>
                    <td className="py-3 px-3 text-right">{formatCurrency(detail.employer_fica_savings || 0)}</td>
                    <td className="py-3 px-3 text-right">{formatCurrency(detail.employee_tax_savings || 0)}</td>
                    <td className="py-3 px-3 text-right font-bold">{formatCurrency(detail.net_savings || 0)}</td>
                    <td className="py-3 px-3 text-center">
                      {detail.email_sent ? (
                        <span className="text-green-700">✓</span>
                      ) : (
                        <span className="text-red-700">✗</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(!companyDetails || companyDetails.length === 0) && (
            <p className="text-slate-600 text-center py-8">No company details found.</p>
          )}
        </div>
      </div>
    </main>
  );
}
