'use client';

import { useState } from 'react';

interface BankReconciliation {
  id: string;
  year: number;
  month: number;
  bank_account_name: string;
  bank_account_last_four?: string;
  beginning_book_balance: number;
  ending_book_balance: number;
  ending_bank_balance: number;
  total_deposits: number;
  total_withdrawals: number;
  outstanding_checks: number;
  outstanding_deposits: number;
  adjustments: number;
  reconciled: boolean;
  difference: number;
  reconciled_by?: string;
  reconciled_at?: string;
  notes?: string;
  created_at: string;
}

interface BankReconciliationManagerProps {
  initialReconciliations: BankReconciliation[];
  stats: {
    total: number;
    reconciled: number;
    pending: number;
    thisYear: number;
    hasDiscrepancies: number;
  };
  currentMonth: {
    year: number;
    month: number;
    exists: boolean;
    reconciled: boolean;
  };
}

export default function BankReconciliationManager({
  initialReconciliations,
  stats: initialStats,
  currentMonth,
}: BankReconciliationManagerProps) {
  const [reconciliations, setReconciliations] = useState(initialReconciliations);
  const [stats, setStats] = useState(initialStats);
  const [filter, setFilter] = useState<'all' | 'reconciled' | 'pending'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReconciliation, setSelectedReconciliation] = useState<BankReconciliation | null>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Filter reconciliations
  const filteredReconciliations = reconciliations.filter(r => {
    if (filter === 'reconciled') return r.reconciled;
    if (filter === 'pending') return !r.reconciled;
    return true;
  });

  // Create form state
  const [newReconciliation, setNewReconciliation] = useState({
    year: currentMonth.year,
    month: currentMonth.month,
    bankAccountName: 'Operating Account',
    bankAccountLastFour: '',
    beginningBookBalance: '0.00',
    endingBookBalance: '0.00',
    endingBankBalance: '0.00',
    totalDeposits: '0.00',
    totalWithdrawals: '0.00',
    outstandingChecks: '0.00',
    outstandingDeposits: '0.00',
    adjustments: '0.00',
    notes: '',
  });

  const handleCreateReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/bank-reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: newReconciliation.year,
          month: newReconciliation.month,
          bankAccountName: newReconciliation.bankAccountName,
          bankAccountLastFour: newReconciliation.bankAccountLastFour || null,
          beginningBookBalance: parseFloat(newReconciliation.beginningBookBalance),
          endingBookBalance: parseFloat(newReconciliation.endingBookBalance),
          endingBankBalance: parseFloat(newReconciliation.endingBankBalance),
          totalDeposits: parseFloat(newReconciliation.totalDeposits),
          totalWithdrawals: parseFloat(newReconciliation.totalWithdrawals),
          outstandingChecks: parseFloat(newReconciliation.outstandingChecks),
          outstandingDeposits: parseFloat(newReconciliation.outstandingDeposits),
          adjustments: parseFloat(newReconciliation.adjustments),
          notes: newReconciliation.notes,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to create reconciliation: ${error.error}`);
        return;
      }

      const { reconciliation } = await response.json();
      setReconciliations([reconciliation, ...reconciliations]);
      setStats({
        ...stats,
        total: stats.total + 1,
        pending: stats.pending + 1,
        thisYear: reconciliation.year === currentMonth.year ? stats.thisYear + 1 : stats.thisYear,
      });
      setShowCreateModal(false);
      alert('Bank reconciliation created successfully!');

      // Reset form
      setNewReconciliation({
        year: currentMonth.year,
        month: currentMonth.month,
        bankAccountName: 'Operating Account',
        bankAccountLastFour: '',
        beginningBookBalance: '0.00',
        endingBookBalance: '0.00',
        endingBankBalance: '0.00',
        totalDeposits: '0.00',
        totalWithdrawals: '0.00',
        outstandingChecks: '0.00',
        outstandingDeposits: '0.00',
        adjustments: '0.00',
        notes: '',
      });
    } catch (error) {
      console.error('Failed to create reconciliation:', error);
      alert('Failed to create reconciliation');
    }
  };

  const handleMarkAsReconciled = async (id: string) => {
    if (!confirm('Are you sure you want to mark this reconciliation as complete? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/bank-reconciliation/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reconciled: true,
          userId: 'current-user-id', // TODO: Get from auth
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to mark as reconciled: ${error.error}`);
        return;
      }

      const { reconciliation } = await response.json();

      setReconciliations(
        reconciliations.map(r => (r.id === id ? reconciliation : r))
      );

      setStats({
        ...stats,
        reconciled: stats.reconciled + 1,
        pending: stats.pending - 1,
      });

      alert('Reconciliation marked as complete!');
    } catch (error) {
      console.error('Failed to mark as reconciled:', error);
      alert('Failed to mark as reconciled');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reconciliation?')) {
      return;
    }

    try {
      const response = await fetch(`/api/bank-reconciliation/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to delete: ${error.error}`);
        return;
      }

      const deletedRec = reconciliations.find(r => r.id === id);
      setReconciliations(reconciliations.filter(r => r.id !== id));

      setStats({
        ...stats,
        total: stats.total - 1,
        pending: deletedRec && !deletedRec.reconciled ? stats.pending - 1 : stats.pending,
        thisYear: deletedRec && deletedRec.year === currentMonth.year ? stats.thisYear - 1 : stats.thisYear,
      });

      alert('Reconciliation deleted');
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete reconciliation');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDifferenceColor = (difference: number) => {
    const diff = Math.abs(difference);
    if (diff < 0.01) return 'text-green-600';
    if (diff < 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Bank Reconciliation</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monthly bank statement reconciliation and verification
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 text-center whitespace-nowrap"
        >
          + New Reconciliation
        </button>
      </div>

      {/* Current Month Alert */}
      {!currentMonth.exists && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-2xl">⚠️</span>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800">
                {monthNames[currentMonth.month - 1]} {currentMonth.year} Not Reconciled
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                You haven't created a bank reconciliation for the current month yet.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-2 text-sm font-medium text-yellow-800 hover:text-yellow-900"
              >
                Create now →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">🏦</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Reconciliations</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stats.total}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Reconciled</dt>
                  <dd className="text-lg font-semibold text-green-600">{stats.reconciled}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">⏳</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                  <dd className="text-lg font-semibold text-yellow-600">{stats.pending}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">📅</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">This Year</dt>
                  <dd className="text-lg font-semibold text-blue-600">{stats.thisYear}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Discrepancies</dt>
                  <dd className="text-lg font-semibold text-red-600">{stats.hasDiscrepancies}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex flex-wrap space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setFilter('all')}
              className={`${
                filter === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`${
                filter === 'pending'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Pending ({stats.pending})
            </button>
            <button
              onClick={() => setFilter('reconciled')}
              className={`${
                filter === 'reconciled'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Reconciled ({stats.reconciled})
            </button>
          </nav>
        </div>

        {/* Reconciliations Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Book Balance
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bank Balance
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Difference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReconciliations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                    No bank reconciliations found. Create one to get started.
                  </td>
                </tr>
              ) : (
                filteredReconciliations.map((rec) => (
                  <tr key={rec.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {monthNames[rec.month - 1]} {rec.year}
                      </div>
                      <div className="text-sm text-gray-500">
                        Created {formatDate(rec.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{rec.bank_account_name}</div>
                      {rec.bank_account_last_four && (
                        <div className="text-sm text-gray-500">****{rec.bank_account_last_four}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatCurrency(rec.ending_book_balance)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatCurrency(rec.ending_bank_balance)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${getDifferenceColor(rec.difference)}`}>
                      {formatCurrency(Math.abs(rec.difference))}
                      {Math.abs(rec.difference) > 0.01 && (
                        <div className="text-xs text-gray-500">
                          {rec.difference > 0 ? 'Over' : 'Under'}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {rec.reconciled ? (
                        <div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Reconciled
                          </span>
                          {rec.reconciled_at && (
                            <div className="text-xs text-gray-500 mt-1">
                              {formatDate(rec.reconciled_at)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => {
                          setSelectedReconciliation(rec);
                          setShowDetailModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </button>
                      {!rec.reconciled && (
                        <>
                          <button
                            onClick={() => handleMarkAsReconciled(rec.id)}
                            disabled={Math.abs(rec.difference) > 0.01}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={Math.abs(rec.difference) > 0.01 ? 'Resolve discrepancy first' : ''}
                          >
                            Mark Reconciled
                          </button>
                          <button
                            onClick={() => handleDelete(rec.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Create Bank Reconciliation
              </h3>
              <form onSubmit={handleCreateReconciliation} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Year</label>
                    <input
                      type="number"
                      min="2020"
                      max="2099"
                      value={newReconciliation.year}
                      onChange={(e) =>
                        setNewReconciliation({ ...newReconciliation, year: parseInt(e.target.value) })
                      }
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Month</label>
                    <select
                      value={newReconciliation.month}
                      onChange={(e) =>
                        setNewReconciliation({ ...newReconciliation, month: parseInt(e.target.value) })
                      }
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    >
                      {monthNames.map((name, index) => (
                        <option key={index} value={index + 1}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Bank Account Name</label>
                    <input
                      type="text"
                      value={newReconciliation.bankAccountName}
                      onChange={(e) =>
                        setNewReconciliation({ ...newReconciliation, bankAccountName: e.target.value })
                      }
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Last 4 Digits (Optional)
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={newReconciliation.bankAccountLastFour}
                      onChange={(e) =>
                        setNewReconciliation({ ...newReconciliation, bankAccountLastFour: e.target.value })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      placeholder="1234"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Beginning Book Balance
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newReconciliation.beginningBookBalance}
                      onChange={(e) =>
                        setNewReconciliation({ ...newReconciliation, beginningBookBalance: e.target.value })
                      }
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Ending Book Balance
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newReconciliation.endingBookBalance}
                      onChange={(e) =>
                        setNewReconciliation({ ...newReconciliation, endingBookBalance: e.target.value })
                      }
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Ending Bank Balance
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newReconciliation.endingBankBalance}
                      onChange={(e) =>
                        setNewReconciliation({ ...newReconciliation, endingBankBalance: e.target.value })
                      }
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total Deposits</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newReconciliation.totalDeposits}
                      onChange={(e) =>
                        setNewReconciliation({ ...newReconciliation, totalDeposits: e.target.value })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total Withdrawals</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newReconciliation.totalWithdrawals}
                      onChange={(e) =>
                        setNewReconciliation({ ...newReconciliation, totalWithdrawals: e.target.value })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Outstanding Checks
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newReconciliation.outstandingChecks}
                      onChange={(e) =>
                        setNewReconciliation({ ...newReconciliation, outstandingChecks: e.target.value })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Outstanding Deposits
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newReconciliation.outstandingDeposits}
                      onChange={(e) =>
                        setNewReconciliation({ ...newReconciliation, outstandingDeposits: e.target.value })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Adjustments (+ or -)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newReconciliation.adjustments}
                    onChange={(e) =>
                      setNewReconciliation({ ...newReconciliation, adjustments: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                  <textarea
                    value={newReconciliation.notes}
                    onChange={(e) =>
                      setNewReconciliation({ ...newReconciliation, notes: e.target.value })
                    }
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    placeholder="Any notes about this reconciliation..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    Create Reconciliation
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedReconciliation && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Reconciliation Details
                </h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Period</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {monthNames[selectedReconciliation.month - 1]} {selectedReconciliation.year}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Account</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedReconciliation.bank_account_name}
                      {selectedReconciliation.bank_account_last_four && ` (****${selectedReconciliation.bank_account_last_four})`}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-3">Balances</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Beginning Book</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {formatCurrency(selectedReconciliation.beginning_book_balance)}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Ending Book</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {formatCurrency(selectedReconciliation.ending_book_balance)}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Ending Bank</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {formatCurrency(selectedReconciliation.ending_bank_balance)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-3">Transactions</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Total Deposits</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {formatCurrency(selectedReconciliation.total_deposits)}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Total Withdrawals</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {formatCurrency(selectedReconciliation.total_withdrawals)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-3">Outstanding Items</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Outstanding Checks</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {formatCurrency(selectedReconciliation.outstanding_checks)}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Outstanding Deposits</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {formatCurrency(selectedReconciliation.outstanding_deposits)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-500">Adjustments</label>
                    <p className="text-sm text-gray-900">
                      {formatCurrency(selectedReconciliation.adjustments)}
                    </p>
                  </div>

                  <div className="flex justify-between items-center mt-3 pt-3 border-t">
                    <label className="text-base font-medium text-gray-900">Difference</label>
                    <p className={`text-base font-semibold ${getDifferenceColor(selectedReconciliation.difference)}`}>
                      {formatCurrency(Math.abs(selectedReconciliation.difference))}
                      {Math.abs(selectedReconciliation.difference) < 0.01 && ' ✓'}
                    </p>
                  </div>
                </div>

                {selectedReconciliation.notes && (
                  <div className="border-t pt-4">
                    <label className="text-sm font-medium text-gray-500">Notes</label>
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                      {selectedReconciliation.notes}
                    </p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className="mt-1">
                    {selectedReconciliation.reconciled ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Reconciled {selectedReconciliation.reconciled_at && `on ${formatDate(selectedReconciliation.reconciled_at)}`}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 mt-4 border-t">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
