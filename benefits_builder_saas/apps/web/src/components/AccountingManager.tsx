"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type AR = {
  id: string;
  company_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  status: string;
  description?: string;
  notes?: string;
  synced_to_qb: boolean;
  companies?: { name: string } | { name: string }[];
};

type AP = {
  id: string;
  vendor_name: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  status: string;
  description?: string;
  notes?: string;
  synced_to_qb: boolean;
};

type Payment = {
  id: string;
  transaction_type: string;
  ar_id?: string;
  ap_id?: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  check_number?: string;
  reference_number?: string;
  notes?: string;
};

type Props = {
  initialAR: AR[];
  initialAP: AP[];
  initialPayments: Payment[];
  companies: Array<{ id: string; name: string }>;
  qbConnected: boolean;
  arSummary: { total: number; overdue: number; count: number };
  apSummary: { total: number; overdue: number; count: number };
};

export default function AccountingManager({
  initialAR,
  initialAP,
  initialPayments,
  companies,
  qbConnected,
  arSummary,
  apSummary,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"ar" | "ap" | "payments">("ar");
  const [arData, setArData] = useState<AR[]>(initialAR);
  const [apData, setApData] = useState<AP[]>(initialAP);
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AR Modal State
  const [showARModal, setShowARModal] = useState(false);
  const [editingAR, setEditingAR] = useState<string | null>(null);
  const [arFormData, setArFormData] = useState({
    company_id: "",
    invoice_number: "",
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    amount: "",
    description: "",
    notes: "",
  });

  // AP Modal State
  const [showAPModal, setShowAPModal] = useState(false);
  const [editingAP, setEditingAP] = useState<string | null>(null);
  const [apFormData, setApFormData] = useState({
    vendor_name: "",
    bill_number: "",
    bill_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    amount: "",
    description: "",
    notes: "",
  });

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<string | null>(null);
  const [paymentFormData, setPaymentFormData] = useState({
    transaction_type: "ar_payment" as "ar_payment" | "ap_payment",
    ar_id: "",
    ap_id: "",
    payment_date: new Date().toISOString().split("T")[0],
    amount: "",
    payment_method: "check" as "check" | "cash" | "ach" | "wire" | "credit_card" | "other",
    check_number: "",
    reference_number: "",
    notes: "",
  });

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'ar' | 'ap' | 'payment', id: string } | null>(null);

  const handleCreateAR = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const url = editingAR ? `/api/accounting/ar/${editingAR}` : "/api/accounting/ar";
      const method = editingAR ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...arFormData,
          amount: parseFloat(arFormData.amount),
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || `Failed to ${editingAR ? 'update' : 'create'} A/R`);
      }

      setShowARModal(false);
      setEditingAR(null);
      setArFormData({
        company_id: "",
        invoice_number: "",
        invoice_date: new Date().toISOString().split("T")[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        amount: "",
        description: "",
        notes: "",
      });
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const url = editingAP ? `/api/accounting/ap/${editingAP}` : "/api/accounting/ap";
      const method = editingAP ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...apFormData,
          amount: parseFloat(apFormData.amount),
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || `Failed to ${editingAP ? 'update' : 'create'} A/P`);
      }

      setShowAPModal(false);
      setEditingAP(null);
      setApFormData({
        vendor_name: "",
        bill_number: "",
        bill_date: new Date().toISOString().split("T")[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        amount: "",
        description: "",
        notes: "",
      });
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const url = editingPayment ? `/api/accounting/payments/${editingPayment}` : "/api/accounting/payments";
      const method = editingPayment ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...paymentFormData,
          amount: parseFloat(paymentFormData.amount),
          ar_id: paymentFormData.transaction_type === "ar_payment" ? paymentFormData.ar_id : null,
          ap_id: paymentFormData.transaction_type === "ap_payment" ? paymentFormData.ap_id : null,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || `Failed to ${editingPayment ? 'update' : 'record'} payment`);
      }

      setShowPaymentModal(false);
      setEditingPayment(null);
      setPaymentFormData({
        transaction_type: "ar_payment",
        ar_id: "",
        ap_id: "",
        payment_date: new Date().toISOString().split("T")[0],
        amount: "",
        payment_method: "check",
        check_number: "",
        reference_number: "",
        notes: "",
      });
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncToQB = async (id: string, type: "ar" | "ap") => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/accounting/quickbooks/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, type }),
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Failed to sync to QuickBooks");
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditAR = (ar: AR) => {
    setEditingAR(ar.id);
    setArFormData({
      company_id: ar.company_id,
      invoice_number: ar.invoice_number,
      invoice_date: ar.invoice_date,
      due_date: ar.due_date,
      amount: ar.amount.toString(),
      description: ar.description || "",
      notes: ar.notes || "",
    });
    setShowARModal(true);
  };

  const handleEditAP = (ap: AP) => {
    setEditingAP(ap.id);
    setApFormData({
      vendor_name: ap.vendor_name,
      bill_number: ap.bill_number,
      bill_date: ap.bill_date,
      due_date: ap.due_date,
      amount: ap.amount.toString(),
      description: ap.description || "",
      notes: ap.notes || "",
    });
    setShowAPModal(true);
  };

  const handleEditPayment = (payment: Payment) => {
    setEditingPayment(payment.id);
    setPaymentFormData({
      transaction_type: payment.transaction_type as "ar_payment" | "ap_payment",
      ar_id: payment.ar_id || "",
      ap_id: payment.ap_id || "",
      payment_date: payment.payment_date,
      amount: payment.amount.toString(),
      payment_method: payment.payment_method as any,
      check_number: payment.check_number || "",
      reference_number: payment.reference_number || "",
      notes: payment.notes || "",
    });
    setShowPaymentModal(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    setIsLoading(true);
    setError(null);

    try {
      let url = "";
      if (deleteConfirm.type === "ar") {
        url = `/api/accounting/ar/${deleteConfirm.id}`;
      } else if (deleteConfirm.type === "ap") {
        url = `/api/accounting/ap/${deleteConfirm.id}`;
      } else if (deleteConfirm.type === "payment") {
        url = `/api/accounting/payments/${deleteConfirm.id}`;
      }

      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Failed to delete");
      }

      setDeleteConfirm(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
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
      case "overdue":
        return "bg-red-100 text-red-800";
      case "partial":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header with QuickBooks Status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Accounting - A/R & A/P</h1>
          <p className="text-slate-600 text-sm">
            Accounts Receivable, Accounts Payable, and Payment Tracking
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/month-end"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Month-End Closing
          </Link>
          {qbConnected ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-green-800">QuickBooks Connected</span>
            </div>
          ) : (
            <a
              href="/api/accounting/quickbooks/auth"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block"
            >
              Connect QuickBooks
            </a>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Accounts Receivable</h3>
            <span className="text-2xl">💰</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-600">Total Outstanding:</span>
              <span className="font-bold text-lg">{formatCurrency(arSummary.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Overdue:</span>
              <span className="font-bold text-red-600">{formatCurrency(arSummary.overdue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Open Invoices:</span>
              <span className="font-bold">{arSummary.count}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Accounts Payable</h3>
            <span className="text-2xl">📋</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-600">Total Outstanding:</span>
              <span className="font-bold text-lg">{formatCurrency(apSummary.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Overdue:</span>
              <span className="font-bold text-red-600">{formatCurrency(apSummary.overdue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Open Bills:</span>
              <span className="font-bold">{apSummary.count}</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow">
        <div className="border-b border-slate-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab("ar")}
              className={`px-6 py-3 font-medium ${
                activeTab === "ar"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Accounts Receivable ({arData.length})
            </button>
            <button
              onClick={() => setActiveTab("ap")}
              className={`px-6 py-3 font-medium ${
                activeTab === "ap"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Accounts Payable ({apData.length})
            </button>
            <button
              onClick={() => setActiveTab("payments")}
              className={`px-6 py-3 font-medium ${
                activeTab === "payments"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Payment History ({payments.length})
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Accounts Receivable Tab */}
          {activeTab === "ar" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Invoices & Receivables</h2>
                <button
                  onClick={() => setShowARModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  + New Invoice
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4">Invoice #</th>
                      <th className="text-left py-3 px-4">Company</th>
                      <th className="text-left py-3 px-4">Invoice Date</th>
                      <th className="text-left py-3 px-4">Due Date</th>
                      <th className="text-right py-3 px-4">Amount</th>
                      <th className="text-right py-3 px-4">Paid</th>
                      <th className="text-right py-3 px-4">Due</th>
                      <th className="text-center py-3 px-4">Status</th>
                      <th className="text-center py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {arData.map((ar) => (
                      <tr key={ar.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 font-medium">{ar.invoice_number}</td>
                        <td className="py-3 px-4">
                          {Array.isArray(ar.companies)
                            ? ar.companies[0]?.name || "N/A"
                            : ar.companies?.name || "N/A"}
                        </td>
                        <td className="py-3 px-4">{formatDate(ar.invoice_date)}</td>
                        <td className="py-3 px-4">{formatDate(ar.due_date)}</td>
                        <td className="py-3 px-4 text-right">{formatCurrency(ar.amount)}</td>
                        <td className="py-3 px-4 text-right">{formatCurrency(ar.amount_paid)}</td>
                        <td className="py-3 px-4 text-right font-bold">{formatCurrency(ar.amount_due)}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ar.status)}`}>
                            {ar.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex gap-2 justify-center flex-wrap">
                            <button
                              onClick={() => handleEditAR(ar)}
                              className="px-3 py-1 bg-slate-600 text-white rounded hover:bg-slate-700 text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ type: 'ar', id: ar.id })}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => {
                                setPaymentFormData({
                                  ...paymentFormData,
                                  transaction_type: "ar_payment",
                                  ar_id: ar.id,
                                  amount: ar.amount_due.toString(),
                                });
                                setShowPaymentModal(true);
                              }}
                              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                            >
                              Record Payment
                            </button>
                            {qbConnected && !ar.synced_to_qb && (
                              <button
                                onClick={() => handleSyncToQB(ar.id, "ar")}
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                                disabled={isLoading}
                              >
                                Sync to QB
                              </button>
                            )}
                            {ar.synced_to_qb && (
                              <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs">
                                ✓ Synced
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {arData.length === 0 && (
                <p className="text-slate-600 text-center py-8">No invoices yet.</p>
              )}
            </div>
          )}

          {/* Accounts Payable Tab */}
          {activeTab === "ap" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Bills & Payables</h2>
                <button
                  onClick={() => setShowAPModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  + New Bill
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4">Bill #</th>
                      <th className="text-left py-3 px-4">Vendor</th>
                      <th className="text-left py-3 px-4">Bill Date</th>
                      <th className="text-left py-3 px-4">Due Date</th>
                      <th className="text-right py-3 px-4">Amount</th>
                      <th className="text-right py-3 px-4">Paid</th>
                      <th className="text-right py-3 px-4">Due</th>
                      <th className="text-center py-3 px-4">Status</th>
                      <th className="text-center py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apData.map((ap) => (
                      <tr key={ap.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 font-medium">{ap.bill_number}</td>
                        <td className="py-3 px-4">{ap.vendor_name}</td>
                        <td className="py-3 px-4">{formatDate(ap.bill_date)}</td>
                        <td className="py-3 px-4">{formatDate(ap.due_date)}</td>
                        <td className="py-3 px-4 text-right">{formatCurrency(ap.amount)}</td>
                        <td className="py-3 px-4 text-right">{formatCurrency(ap.amount_paid)}</td>
                        <td className="py-3 px-4 text-right font-bold">{formatCurrency(ap.amount_due)}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ap.status)}`}>
                            {ap.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex gap-2 justify-center flex-wrap">
                            <button
                              onClick={() => handleEditAP(ap)}
                              className="px-3 py-1 bg-slate-600 text-white rounded hover:bg-slate-700 text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ type: 'ap', id: ap.id })}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => {
                                setPaymentFormData({
                                  ...paymentFormData,
                                  transaction_type: "ap_payment",
                                  ap_id: ap.id,
                                  amount: ap.amount_due.toString(),
                                });
                                setShowPaymentModal(true);
                              }}
                              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                            >
                              Pay Bill
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {apData.length === 0 && (
                <p className="text-slate-600 text-center py-8">No bills yet.</p>
              )}
            </div>
          )}

          {/* Payment History Tab */}
          {activeTab === "payments" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Payment History</h2>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  + Record Payment
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4">Date</th>
                      <th className="text-left py-3 px-4">Type</th>
                      <th className="text-left py-3 px-4">Method</th>
                      <th className="text-left py-3 px-4">Check/Ref #</th>
                      <th className="text-right py-3 px-4">Amount</th>
                      <th className="text-left py-3 px-4">Notes</th>
                      <th className="text-center py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4">{formatDate(payment.payment_date)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            payment.transaction_type === "ar_payment"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}>
                            {payment.transaction_type === "ar_payment" ? "A/R Payment" : "A/P Payment"}
                          </span>
                        </td>
                        <td className="py-3 px-4 capitalize">{payment.payment_method}</td>
                        <td className="py-3 px-4">{payment.check_number || payment.reference_number || "-"}</td>
                        <td className="py-3 px-4 text-right font-bold">{formatCurrency(payment.amount)}</td>
                        <td className="py-3 px-4">{payment.notes || "-"}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleEditPayment(payment)}
                              className="px-3 py-1 bg-slate-600 text-white rounded hover:bg-slate-700 text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ type: 'payment', id: payment.id })}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {payments.length === 0 && (
                <p className="text-slate-600 text-center py-8">No payment history yet.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create AR Modal */}
      {showARModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">{editingAR ? 'Edit Invoice' : 'Create New Invoice'}</h2>
              <form onSubmit={handleCreateAR} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Invoice Number *</label>
                    <input
                      type="text"
                      value={arFormData.invoice_number}
                      onChange={(e) => setArFormData({ ...arFormData, invoice_number: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Company *</label>
                    <select
                      value={arFormData.company_id}
                      onChange={(e) => setArFormData({ ...arFormData, company_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    >
                      <option value="">Select Company...</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Invoice Date *</label>
                    <input
                      type="date"
                      value={arFormData.invoice_date}
                      onChange={(e) => setArFormData({ ...arFormData, invoice_date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Due Date *</label>
                    <input
                      type="date"
                      value={arFormData.due_date}
                      onChange={(e) => setArFormData({ ...arFormData, due_date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Amount *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={arFormData.amount}
                      onChange={(e) => setArFormData({ ...arFormData, amount: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <input
                      type="text"
                      value={arFormData.description}
                      onChange={(e) => setArFormData({ ...arFormData, description: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    value={arFormData.notes}
                    onChange={(e) => setArFormData({ ...arFormData, notes: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setShowARModal(false)}
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
                    {isLoading ? (editingAR ? "Updating..." : "Creating...") : (editingAR ? "Update Invoice" : "Create Invoice")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create AP Modal */}
      {showAPModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">{editingAP ? 'Edit Bill' : 'Create New Bill'}</h2>
              <form onSubmit={handleCreateAP} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Bill Number *</label>
                    <input
                      type="text"
                      value={apFormData.bill_number}
                      onChange={(e) => setApFormData({ ...apFormData, bill_number: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Vendor Name *</label>
                    <input
                      type="text"
                      value={apFormData.vendor_name}
                      onChange={(e) => setApFormData({ ...apFormData, vendor_name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Bill Date *</label>
                    <input
                      type="date"
                      value={apFormData.bill_date}
                      onChange={(e) => setApFormData({ ...apFormData, bill_date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Due Date *</label>
                    <input
                      type="date"
                      value={apFormData.due_date}
                      onChange={(e) => setApFormData({ ...apFormData, due_date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Amount *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={apFormData.amount}
                      onChange={(e) => setApFormData({ ...apFormData, amount: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <input
                      type="text"
                      value={apFormData.description}
                      onChange={(e) => setApFormData({ ...apFormData, description: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    value={apFormData.notes}
                    onChange={(e) => setApFormData({ ...apFormData, notes: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAPModal(false)}
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
                    {isLoading ? (editingAP ? "Updating..." : "Creating...") : (editingAP ? "Update Bill" : "Create Bill")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">{editingPayment ? 'Edit Payment' : 'Record Payment'}</h2>
              <form onSubmit={handleRecordPayment} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Payment Type *</label>
                    <select
                      value={paymentFormData.transaction_type}
                      onChange={(e) => setPaymentFormData({
                        ...paymentFormData,
                        transaction_type: e.target.value as "ar_payment" | "ap_payment"
                      })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="ar_payment">A/R Payment (Received)</option>
                      <option value="ap_payment">A/P Payment (Made)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Payment Date *</label>
                    <input
                      type="date"
                      value={paymentFormData.payment_date}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>

                  {paymentFormData.transaction_type === "ar_payment" && (
                    <div>
                      <label className="block text-sm font-medium mb-1">A/R Invoice ID *</label>
                      <input
                        type="text"
                        value={paymentFormData.ar_id}
                        onChange={(e) => setPaymentFormData({ ...paymentFormData, ar_id: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                        placeholder="UUID"
                      />
                    </div>
                  )}

                  {paymentFormData.transaction_type === "ap_payment" && (
                    <div>
                      <label className="block text-sm font-medium mb-1">A/P Bill ID *</label>
                      <input
                        type="text"
                        value={paymentFormData.ap_id}
                        onChange={(e) => setPaymentFormData({ ...paymentFormData, ap_id: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                        placeholder="UUID"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-1">Amount *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={paymentFormData.amount}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Payment Method *</label>
                    <select
                      value={paymentFormData.payment_method}
                      onChange={(e) => setPaymentFormData({
                        ...paymentFormData,
                        payment_method: e.target.value as any
                      })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="check">Check</option>
                      <option value="cash">Cash</option>
                      <option value="ach">ACH</option>
                      <option value="wire">Wire Transfer</option>
                      <option value="credit_card">Credit Card</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Check Number</label>
                    <input
                      type="text"
                      value={paymentFormData.check_number}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, check_number: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Reference Number</label>
                    <input
                      type="text"
                      value={paymentFormData.reference_number}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, reference_number: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    value={paymentFormData.notes}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
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
                    {isLoading ? (editingPayment ? "Updating..." : "Recording...") : (editingPayment ? "Update Payment" : "Record Payment")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4 text-red-600">Confirm Delete</h2>
              <p className="text-slate-700 mb-6">
                Are you sure you want to delete this {deleteConfirm.type === 'ar' ? 'invoice' : deleteConfirm.type === 'ap' ? 'bill' : 'payment'}?
                This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 border rounded-lg hover:bg-slate-50"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  disabled={isLoading}
                >
                  {isLoading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
