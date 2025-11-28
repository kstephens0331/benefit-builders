"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type MonthEndClosing = {
  id: string;
  closing_date: string;
  month_year: string;
  status: string;
  total_companies: number;
  total_employees: number;
  total_pretax_deductions: number;
  total_bb_fees: number;
  total_employer_savings: number;
  total_employee_savings: number;
  total_ar_open: number;
  total_ar_overdue: number;
  emails_sent: number;
  emails_failed: number;
  closed_at: string;
  created_at: string;
};

type Props = {
  initialClosings: MonthEndClosing[];
};

export default function MonthEndManager({ initialClosings }: Props) {
  const router = useRouter();
  const [closings, setClosings] = useState<MonthEndClosing[]>(initialClosings);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newClosingDate, setNewClosingDate] = useState("");
  const [sendEmails, setSendEmails] = useState(true);

  const handleCreateClosing = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/month-end/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          closingDate: newClosingDate,
          sendEmails,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Failed to create month-end closing");
      }

      setShowNewModal(false);
      setNewClosingDate("");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (closingId: string) => {
    window.open(`/api/month-end/${closingId}/download`, "_blank");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount || 0);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "closed":
        return "bg-green-100 text-green-800";
      case "closing":
        return "bg-yellow-100 text-yellow-800";
      case "error":
        return "bg-red-100 text-red-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  // Get suggested closing date (last day of previous month)
  const getSuggestedClosingDate = () => {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    return lastMonth.toISOString().split("T")[0];
  };

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Month-End Closing</h1>
          <p className="text-slate-600 text-sm">
            Run month-end reports and send automated emails to companies
          </p>
        </div>
        <button
          onClick={() => {
            setNewClosingDate(getSuggestedClosingDate());
            setShowNewModal(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center whitespace-nowrap"
        >
          + New Month-End Close
        </button>
      </div>

      {/* Summary Cards */}
      {closings.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-sm text-slate-600 mb-1">Most Recent</div>
            <div className="text-2xl font-bold">{closings[0].month_year}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-sm text-slate-600 mb-1">Total Companies</div>
            <div className="text-2xl font-bold">{closings[0].total_companies || 0}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-sm text-slate-600 mb-1">Total Employees</div>
            <div className="text-2xl font-bold">{closings[0].total_employees || 0}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-sm text-slate-600 mb-1">Total BB Fees</div>
            <div className="text-2xl font-bold">{formatCurrency(closings[0].total_bb_fees || 0)}</div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Closings Table */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Closing History</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4">Period</th>
                  <th className="text-left py-3 px-4">Closing Date</th>
                  <th className="text-center py-3 px-4">Status</th>
                  <th className="text-right py-3 px-4">Companies</th>
                  <th className="text-right py-3 px-4">Employees</th>
                  <th className="text-right py-3 px-4">Total Deductions</th>
                  <th className="text-right py-3 px-4">BB Fees</th>
                  <th className="text-center py-3 px-4">Emails</th>
                  <th className="text-center py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {closings.map((closing) => (
                  <tr key={closing.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium">{closing.month_year}</td>
                    <td className="py-3 px-4">{formatDate(closing.closing_date)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(closing.status)}`}>
                        {closing.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">{closing.total_companies || 0}</td>
                    <td className="py-3 px-4 text-right">{closing.total_employees || 0}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(closing.total_pretax_deductions || 0)}</td>
                    <td className="py-3 px-4 text-right font-bold">{formatCurrency(closing.total_bb_fees || 0)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-green-700">{closing.emails_sent || 0}</span>
                      {(closing.emails_failed || 0) > 0 && (
                        <span className="text-red-700"> / {closing.emails_failed}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col sm:flex-row gap-2 justify-center">
                        <button
                          onClick={() => router.push(`/month-end/${closing.id}`)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm text-center whitespace-nowrap"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleDownload(closing.id)}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm text-center whitespace-nowrap"
                        >
                          Download CSV
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {closings.length === 0 && (
            <p className="text-slate-600 text-center py-8">
              No month-end closings yet. Click &quot;New Month-End Close&quot; to create one.
            </p>
          )}
        </div>
      </div>

      {/* New Closing Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Run Month-End Closing</h2>
              <form onSubmit={handleCreateClosing} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Closing Date (Last Day of Month) *
                  </label>
                  <input
                    type="date"
                    value={newClosingDate}
                    onChange={(e) => setNewClosingDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                  <p className="text-xs text-slate-600 mt-1">
                    Select the last day of the month you want to close
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="sendEmails"
                    checked={sendEmails}
                    onChange={(e) => setSendEmails(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="sendEmails" className="text-sm">
                    Send email reports to all companies
                  </label>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>⚠️ Important:</strong> This will process all active companies and their employees
                    for the selected month. {sendEmails && "Emails will be sent automatically."}
                  </p>
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewModal(false);
                      setError(null);
                    }}
                    className="px-4 py-2 border rounded-lg hover:bg-slate-50"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    disabled={isLoading}
                  >
                    {isLoading ? "Processing..." : "Run Month-End Close"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
