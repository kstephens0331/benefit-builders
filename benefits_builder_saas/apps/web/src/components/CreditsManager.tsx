'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Credit {
  id: string;
  company_id: string;
  amount: number;
  source: string;
  status: string;
  created_at: string;
  expires_at?: string;
  applied_at?: string;
  notes?: string;
  company?: { id: string; name: string; contact_email: string };
  source_invoice?: { invoice_number: string; total_cents: number };
  applied_invoice?: { invoice_number: string; total_cents: number };
}

interface Company {
  id: string;
  name: string;
}

interface CreditsManagerProps {
  credits: Credit[];
  companies: Company[];
  stats: {
    totalAvailable: number;
    totalApplied: number;
    totalExpired: number;
    countAvailable: number;
    countApplied: number;
    countExpired: number;
  };
  creditsByCompany: Record<string, any>;
}

export default function CreditsManager({
  credits: initialCredits,
  companies,
  stats: initialStats,
  creditsByCompany,
}: CreditsManagerProps) {
  const [credits, setCredits] = useState(initialCredits);
  const [stats, setStats] = useState(initialStats);
  const [filter, setFilter] = useState<string>('available');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Create credit form state
  const [newCredit, setNewCredit] = useState({
    companyId: '',
    amount: '',
    source: 'overpayment',
    notes: '',
    expiresInDays: '365',
  });

  const filteredCredits = credits.filter((credit) => {
    if (filter === 'all') return true;
    return credit.status === filter;
  });

  const handleCreateCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/accounting/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: newCredit.companyId,
          amount: parseFloat(newCredit.amount),
          source: newCredit.source,
          notes: newCredit.notes,
          expiresInDays: parseInt(newCredit.expiresInDays),
        }),
      });

      if (response.ok) {
        const { credit } = await response.json();
        setCredits([credit, ...credits]);
        setStats({
          ...stats,
          totalAvailable: stats.totalAvailable + credit.amount,
          countAvailable: stats.countAvailable + 1,
        });
        setShowCreateModal(false);
        setNewCredit({
          companyId: '',
          amount: '',
          source: 'overpayment',
          notes: '',
          expiresInDays: '365',
        });
        alert('Credit created successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to create credit: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to create credit:', error);
      alert('Failed to create credit');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCredit = async (creditId: string) => {
    if (!confirm('Are you sure you want to delete this credit? This cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/accounting/credits/${creditId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const deletedCredit = credits.find(c => c.id === creditId);
        setCredits(credits.filter(c => c.id !== creditId));
        if (deletedCredit) {
          setStats({
            ...stats,
            totalAvailable: stats.totalAvailable - deletedCredit.amount,
            countAvailable: stats.countAvailable - 1,
          });
        }
        alert('Credit deleted successfully');
      } else {
        const error = await response.json();
        alert(`Failed to delete credit: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to delete credit:', error);
      alert('Failed to delete credit');
    } finally {
      setLoading(false);
    }
  };

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'overpayment':
        return 'bg-blue-100 text-blue-800';
      case 'refund':
        return 'bg-purple-100 text-purple-800';
      case 'adjustment':
        return 'bg-yellow-100 text-yellow-800';
      case 'goodwill':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'applied':
        return 'bg-blue-100 text-blue-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Credits Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage customer credits from overpayments and refunds
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            href="/accounting"
            className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 text-center whitespace-nowrap"
          >
            ← Back to Dashboard
          </Link>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 whitespace-nowrap"
          >
            + Create Credit
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-6">
        <div className="bg-green-50 overflow-hidden shadow rounded-lg border border-green-200 p-5">
          <dt className="text-sm font-medium text-green-800 truncate">Available</dt>
          <dd className="mt-1 text-3xl font-semibold text-green-900">
            ${(stats.totalAvailable / 100).toFixed(2)}
          </dd>
          <dd className="mt-1 text-sm text-green-700">{stats.countAvailable} credits</dd>
        </div>
        <div className="bg-blue-50 overflow-hidden shadow rounded-lg border border-blue-200 p-5">
          <dt className="text-sm font-medium text-blue-800 truncate">Applied</dt>
          <dd className="mt-1 text-3xl font-semibold text-blue-900">
            ${(stats.totalApplied / 100).toFixed(2)}
          </dd>
          <dd className="mt-1 text-sm text-blue-700">{stats.countApplied} credits</dd>
        </div>
        <div className="bg-red-50 overflow-hidden shadow rounded-lg border border-red-200 p-5">
          <dt className="text-sm font-medium text-red-800 truncate">Expired</dt>
          <dd className="mt-1 text-3xl font-semibold text-red-900">
            ${(stats.totalExpired / 100).toFixed(2)}
          </dd>
          <dd className="mt-1 text-sm text-red-700">{stats.countExpired} credits</dd>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('available')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'available'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Available ({stats.countAvailable})
          </button>
          <button
            onClick={() => setFilter('applied')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'applied'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Applied ({stats.countApplied})
          </button>
          <button
            onClick={() => setFilter('expired')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'expired'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Expired ({stats.countExpired})
          </button>
        </div>
      </div>

      {/* Credits by Company */}
      {filter === 'available' && Object.keys(creditsByCompany).length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              Available Credits by Company
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.values(creditsByCompany).map((item: any) => (
                item.totalAvailable > 0 && (
                  <div key={item.company.id} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900">{item.company.name}</h4>
                    <p className="text-2xl font-bold text-green-600 mt-2">
                      ${(item.totalAvailable / 100).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {item.credits.filter((c: Credit) => c.status === 'available').length} available credit(s)
                    </p>
                  </div>
                )
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Credits List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
            Credits ({filteredCredits.length})
          </h3>
          {filteredCredits.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-6xl">💳</span>
              <p className="mt-4 text-lg text-gray-500">No credits found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expires
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCredits.map((credit) => (
                    <tr key={credit.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {credit.company?.name || 'Unknown'}
                        </div>
                        {credit.source_invoice && (
                          <div className="text-sm text-gray-500">
                            From: {credit.source_invoice.invoice_number}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          ${(credit.amount / 100).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getSourceBadgeColor(credit.source)}`}>
                          {credit.source}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(credit.status)}`}>
                          {credit.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(credit.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {credit.expires_at ? new Date(credit.expires_at).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {credit.status === 'available' && (
                          <button
                            onClick={() => handleDeleteCredit(credit.id)}
                            disabled={loading}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        )}
                        {credit.applied_invoice && (
                          <span className="text-gray-500">
                            Applied to {credit.applied_invoice.invoice_number}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Credit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Create New Credit
            </h3>
            <form onSubmit={handleCreateCredit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Company *
                </label>
                <select
                  required
                  value={newCredit.companyId}
                  onChange={(e) => setNewCredit({ ...newCredit, companyId: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Select a company...</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Amount (USD) *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0.01"
                  value={newCredit.amount}
                  onChange={(e) => setNewCredit({ ...newCredit, amount: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Source *
                </label>
                <select
                  required
                  value={newCredit.source}
                  onChange={(e) => setNewCredit({ ...newCredit, source: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="overpayment">Overpayment</option>
                  <option value="refund">Refund</option>
                  <option value="adjustment">Adjustment</option>
                  <option value="goodwill">Goodwill</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Expires In (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  value={newCredit.expiresInDays}
                  onChange={(e) => setNewCredit({ ...newCredit, expiresInDays: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">Default: 365 days (1 year)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={newCredit.notes}
                  onChange={(e) => setNewCredit({ ...newCredit, notes: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Optional note about this credit..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Credit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
