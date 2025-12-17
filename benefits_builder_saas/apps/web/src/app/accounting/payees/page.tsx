'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Payee {
  qb_id: string;
  display_name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  balance: number;
  active: boolean;
  is_linked: boolean;
  linked_company: {
    id: string;
    name: string;
    synced_at: string;
  } | null;
  ar_summary: {
    total_invoiced: number;
    total_paid: number;
    amount_due: number;
    invoice_count: number;
  } | null;
}

interface PayeesData {
  ok: boolean;
  qb_connected: boolean;
  payees: Payee[];
  summary: {
    total: number;
    linked: number;
    unlinked: number;
  };
  error?: string;
}

export default function PayeesPage() {
  const [data, setData] = useState<PayeesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'linked' | 'unlinked'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchPayees();
  }, []);

  const fetchPayees = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/accounting/payees');
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching payees:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const filteredPayees = data?.payees?.filter((payee) => {
    // Filter by link status
    if (filter === 'linked' && !payee.is_linked) return false;
    if (filter === 'unlinked' && payee.is_linked) return false;

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        payee.display_name.toLowerCase().includes(searchLower) ||
        payee.company_name?.toLowerCase().includes(searchLower) ||
        payee.email?.toLowerCase().includes(searchLower)
      );
    }

    return true;
  }) || [];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">QuickBooks Payees</h1>
          <Link
            href="/accounting"
            className="px-4 py-2 bg-slate-200 rounded-lg hover:bg-slate-300"
          >
            ← Back to Accounting
          </Link>
        </div>
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading payees from QuickBooks...</p>
        </div>
      </div>
    );
  }

  if (!data?.ok || !data?.qb_connected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">QuickBooks Payees</h1>
          <Link
            href="/accounting"
            className="px-4 py-2 bg-slate-200 rounded-lg hover:bg-slate-300"
          >
            ← Back to Accounting
          </Link>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start">
            <span className="text-2xl mr-3">⚠️</span>
            <div>
              <h3 className="font-semibold text-yellow-900">QuickBooks Not Connected</h3>
              <p className="text-sm text-yellow-700 mt-1">
                {data?.error || 'Connect QuickBooks to view and manage payees.'}
              </p>
              <a
                href="/api/quickbooks/auth"
                className="inline-block mt-3 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
              >
                Connect QuickBooks
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">QuickBooks Payees</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage customer records from QuickBooks and their links to companies
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchPayees}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh
          </button>
          <Link
            href="/accounting"
            className="px-4 py-2 bg-slate-200 rounded-lg hover:bg-slate-300"
          >
            ← Back
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-2xl mr-3">👥</span>
            <div>
              <div className="text-2xl font-bold text-gray-900">{data.summary.total}</div>
              <div className="text-sm text-gray-500">Total Payees</div>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-2xl mr-3">🔗</span>
            <div>
              <div className="text-2xl font-bold text-green-600">{data.summary.linked}</div>
              <div className="text-sm text-gray-500">Linked to Companies</div>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-2xl mr-3">❓</span>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{data.summary.unlinked}</div>
              <div className="text-sm text-gray-500">Unlinked</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search payees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({data.summary.total})
            </button>
            <button
              onClick={() => setFilter('linked')}
              className={`px-4 py-2 rounded-lg ${
                filter === 'linked'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Linked ({data.summary.linked})
            </button>
            <button
              onClick={() => setFilter('unlinked')}
              className={`px-4 py-2 rounded-lg ${
                filter === 'unlinked'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Unlinked ({data.summary.unlinked})
            </button>
          </div>
        </div>
      </div>

      {/* Payees Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  QB Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Link Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  A/R Summary
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    {search || filter !== 'all'
                      ? 'No payees match your filters'
                      : 'No payees found in QuickBooks'}
                  </td>
                </tr>
              ) : (
                filteredPayees.map((payee) => (
                  <tr key={payee.qb_id} className={!payee.active ? 'bg-gray-50 opacity-60' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                          payee.is_linked ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <span className="text-lg">{payee.is_linked ? '🏢' : '👤'}</span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {payee.display_name}
                          </div>
                          {payee.company_name && payee.company_name !== payee.display_name && (
                            <div className="text-sm text-gray-500">{payee.company_name}</div>
                          )}
                          {!payee.active && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{payee.email || '-'}</div>
                      <div className="text-sm text-gray-500">{payee.phone || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${
                        payee.balance > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {formatCurrency(payee.balance)}
                      </div>
                      <div className="text-xs text-gray-500">QuickBooks balance</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {payee.is_linked && payee.linked_company ? (
                        <div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Linked
                          </span>
                          <div className="mt-1">
                            <Link
                              href={`/companies/${payee.linked_company.id}`}
                              className="text-sm text-blue-600 hover:underline"
                            >
                              {payee.linked_company.name}
                            </Link>
                          </div>
                          <div className="text-xs text-gray-500">
                            Synced {new Date(payee.linked_company.synced_at).toLocaleDateString()}
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Not Linked
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {payee.ar_summary ? (
                        <div className="text-sm">
                          <div className="text-gray-900">
                            {payee.ar_summary.invoice_count} invoice{payee.ar_summary.invoice_count !== 1 ? 's' : ''}
                          </div>
                          <div className="text-gray-500">
                            Due: {formatCurrency(payee.ar_summary.amount_due)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <span className="text-xl mr-3">ℹ️</span>
          <div className="text-sm text-blue-800">
            <p className="font-medium">About Payees vs Companies</p>
            <p className="mt-1">
              <strong>Payees</strong> are customers in QuickBooks who receive invoices. They may or may not be enrolled companies in this system.
            </p>
            <p className="mt-1">
              <strong>Linked</strong> payees are matched to companies in the Benefits Builder system. When you sync, invoices will automatically associate with the correct company.
            </p>
            <p className="mt-1">
              <strong>Unlinked</strong> payees exist only in QuickBooks and don't correspond to an enrolled employer in this system.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
