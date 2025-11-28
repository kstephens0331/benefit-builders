"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Invoice = {
  id: string;
  company_id: string;
  period: string;
  status: string;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  issued_at: string;
  companies?: { name: string; contact_email?: string } | { name: string; contact_email?: string }[];
};

type Props = {
  invoices: Invoice[];
  periods: string[];
};

export default function InvoiceManager({ invoices: initialInvoices, periods }: Props) {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
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
      case "paid":
        return "bg-green-100 text-green-800";
      case "sent":
        return "bg-blue-100 text-blue-800";
      case "void":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (selectedPeriod !== "all" && inv.period !== selectedPeriod) return false;
    if (selectedStatus !== "all" && inv.status !== selectedStatus) return false;
    return true;
  });

  const toggleSelectInvoice = (id: string) => {
    const newSelected = new Set(selectedInvoices);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedInvoices(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedInvoices.size === filteredInvoices.length) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(filteredInvoices.map((inv) => inv.id)));
    }
  };

  const handleEmailInvoice = async (invoiceId: string) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/invoices/${invoiceId}/email`, {
        method: "POST",
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Failed to send invoice");
      }

      setSuccess(data.message);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchEmail = async () => {
    if (selectedInvoices.size === 0) {
      setError("Please select at least one invoice");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/invoices/email-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceIds: Array.from(selectedInvoices),
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Failed to send invoices");
      }

      setSuccess(data.message);
      setSelectedInvoices(new Set());
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAllForPeriod = async () => {
    if (selectedPeriod === "all") {
      setError("Please select a specific period");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/invoices/email-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: selectedPeriod,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Failed to send invoices");
      }

      setSuccess(data.message);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (invoiceId: string, newStatus: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: invoiceId,
          status: newStatus,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Failed to update invoice");
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const totalAmount = filteredInvoices.reduce((sum, inv) => sum + inv.total_cents, 0);
  const openCount = filteredInvoices.filter((inv) => inv.status === "open").length;
  const sentCount = filteredInvoices.filter((inv) => inv.status === "sent").length;
  const paidCount = filteredInvoices.filter((inv) => inv.status === "paid").length;

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Invoice Management</h1>
        <p className="text-slate-600 text-sm">
          View, send, and manage monthly invoices
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-sm text-slate-600">Total Value</div>
          <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
          <div className="text-xs text-slate-500">{filteredInvoices.length} invoices</div>
        </div>
        <div className="bg-yellow-50 rounded-xl shadow p-4">
          <div className="text-sm text-yellow-700">Open</div>
          <div className="text-2xl font-bold text-yellow-900">{openCount}</div>
        </div>
        <div className="bg-blue-50 rounded-xl shadow p-4">
          <div className="text-sm text-blue-700">Sent</div>
          <div className="text-2xl font-bold text-blue-900">{sentCount}</div>
        </div>
        <div className="bg-green-50 rounded-xl shadow p-4">
          <div className="text-sm text-green-700">Paid</div>
          <div className="text-2xl font-bold text-green-900">{paidCount}</div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Filters and Actions */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Period Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">Period</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="all">All Periods</option>
                {periods.map((period) => (
                  <option key={period} value={period}>
                    {period}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="void">Void</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-end gap-2">
            <button
              onClick={handleBatchEmail}
              disabled={isLoading || selectedInvoices.size === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Email Selected ({selectedInvoices.size})
            </button>
            <button
              onClick={handleEmailAllForPeriod}
              disabled={isLoading || selectedPeriod === "all"}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Email All for Period
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4">
                  <input
                    type="checkbox"
                    checked={
                      selectedInvoices.size === filteredInvoices.length &&
                      filteredInvoices.length > 0
                    }
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="text-left py-3 px-4">Period</th>
                <th className="text-left py-3 px-4">Company</th>
                <th className="text-left py-3 px-4">Issue Date</th>
                <th className="text-right py-3 px-4">Amount</th>
                <th className="text-center py-3 px-4">Status</th>
                <th className="text-center py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => {
                const company = Array.isArray(invoice.companies)
                  ? invoice.companies[0]
                  : invoice.companies;

                return (
                  <tr key={invoice.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedInvoices.has(invoice.id)}
                        onChange={() => toggleSelectInvoice(invoice.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="py-3 px-4 font-medium">{invoice.period}</td>
                    <td className="py-3 px-4">{company?.name || "N/A"}</td>
                    <td className="py-3 px-4">{formatDate(invoice.issued_at)}</td>
                    <td className="py-3 px-4 text-right font-bold">
                      {formatCurrency(invoice.total_cents)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          invoice.status
                        )}`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2 justify-center flex-wrap">
                        <a
                          href={`/api/invoices/${invoice.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-slate-600 text-white rounded hover:bg-slate-700 text-sm"
                        >
                          View PDF
                        </a>
                        <button
                          onClick={() => handleEmailInvoice(invoice.id)}
                          disabled={isLoading || !company?.contact_email}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:opacity-50"
                          title={!company?.contact_email ? "No email on file" : "Send invoice"}
                        >
                          Email
                        </button>
                        {invoice.status !== "paid" && (
                          <button
                            onClick={() => handleUpdateStatus(invoice.id, "paid")}
                            disabled={isLoading}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredInvoices.length === 0 && (
          <div className="text-center py-12 text-slate-600">
            No invoices found for the selected filters.
          </div>
        )}
      </div>
    </main>
  );
}
