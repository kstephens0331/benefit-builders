'use client';

import { useState } from 'react';
import Link from 'next/link';

interface RecurringInvoice {
  id: string;
  company: { id: string; name: string; contact_email: string };
  frequency: string;
  start_date: string;
  end_date?: string;
  next_invoice_date: string;
  invoice_template: any;
  delivery_method: string;
  auto_send: boolean;
  auto_charge: boolean;
  is_active: boolean;
  last_generated_at?: string;
  payment_method?: {
    id: string;
    payment_type: string;
    card_last_four?: string;
    account_last_four?: string;
    bank_name?: string;
  };
}

interface Company {
  id: string;
  name: string;
}

interface PaymentMethod {
  id: string;
  company_id: string;
  payment_type: string;
  card_last_four?: string;
  account_last_four?: string;
  bank_name?: string;
  is_verified: boolean;
  is_active: boolean;
}

interface RecurringInvoicesManagerProps {
  initialRecurringInvoices: RecurringInvoice[];
  companies: Company[];
  paymentMethods: PaymentMethod[];
  stats: {
    total: number;
    active: number;
    inactive: number;
    autoCharge: number;
    upcoming: number;
  };
}

export default function RecurringInvoicesManager({
  initialRecurringInvoices,
  companies,
  paymentMethods,
  stats: initialStats,
}: RecurringInvoicesManagerProps) {
  const [recurringInvoices, setRecurringInvoices] = useState(initialRecurringInvoices);
  const [stats, setStats] = useState(initialStats);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRecurring, setSelectedRecurring] = useState<RecurringInvoice | null>(null);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  // Filter recurring invoices
  const filteredRecurring = recurringInvoices.filter(r => {
    if (filter === 'active') return r.is_active;
    if (filter === 'inactive') return !r.is_active;
    return true;
  });

  // Create form state
  const [newRecurring, setNewRecurring] = useState({
    companyId: '',
    frequency: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    invoiceTemplate: {
      line_items: [],
      total_cents: 0,
      notes: '',
    },
    deliveryMethod: 'email',
    autoSend: true,
    autoCharge: false,
    paymentMethodId: '',
  });

  const handleCreateRecurring = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/recurring-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecurring),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to create recurring invoice: ${error.error}`);
        return;
      }

      const { recurring } = await response.json();
      setRecurringInvoices([recurring, ...recurringInvoices]);
      setStats({
        ...stats,
        total: stats.total + 1,
        active: stats.active + 1,
        autoCharge: recurring.auto_charge ? stats.autoCharge + 1 : stats.autoCharge,
      });
      setShowCreateModal(false);
      alert('Recurring invoice created successfully!');

      // Reset form
      setNewRecurring({
        companyId: '',
        frequency: 'monthly',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        invoiceTemplate: {
          line_items: [],
          total_cents: 0,
          notes: '',
        },
        deliveryMethod: 'email',
        autoSend: true,
        autoCharge: false,
        paymentMethodId: '',
      });
    } catch (error) {
      console.error('Failed to create recurring invoice:', error);
      alert('Failed to create recurring invoice');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/recurring-invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      const { recurring } = await response.json();

      setRecurringInvoices(
        recurringInvoices.map(r => (r.id === id ? recurring : r))
      );

      setStats({
        ...stats,
        active: currentStatus ? stats.active - 1 : stats.active + 1,
        inactive: currentStatus ? stats.inactive + 1 : stats.inactive - 1,
      });
    } catch (error) {
      console.error('Failed to toggle status:', error);
      alert('Failed to update status');
    }
  };

  const handleGenerateInvoice = async (id: string) => {
    setIsGenerating(id);

    try {
      const response = await fetch(`/api/recurring-invoices/${id}/generate`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to generate invoice: ${error.error}`);
        return;
      }

      const { invoice, nextInvoiceDate } = await response.json();

      // Update the recurring invoice with new next_invoice_date
      setRecurringInvoices(
        recurringInvoices.map(r =>
          r.id === id
            ? {
                ...r,
                next_invoice_date: nextInvoiceDate,
                last_generated_at: new Date().toISOString(),
              }
            : r
        )
      );

      alert(`Invoice ${invoice.invoice_number} generated successfully!`);
    } catch (error) {
      console.error('Failed to generate invoice:', error);
      alert('Failed to generate invoice');
    } finally {
      setIsGenerating(null);
    }
  };

  const handleDeleteRecurring = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recurring invoice?')) {
      return;
    }

    try {
      const response = await fetch(`/api/recurring-invoices/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete');
      }

      const updatedRecurring = recurringInvoices.filter(r => r.id !== id);
      setRecurringInvoices(updatedRecurring);

      const deletedRecurring = recurringInvoices.find(r => r.id === id);
      setStats({
        ...stats,
        total: stats.total - 1,
        active: deletedRecurring?.is_active ? stats.active - 1 : stats.active,
        inactive: !deletedRecurring?.is_active ? stats.inactive - 1 : stats.inactive,
      });

      alert('Recurring invoice deactivated');
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete recurring invoice');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getFrequencyBadgeColor = (frequency: string) => {
    switch (frequency) {
      case 'weekly':
        return 'bg-purple-100 text-purple-800';
      case 'biweekly':
        return 'bg-indigo-100 text-indigo-800';
      case 'monthly':
        return 'bg-blue-100 text-blue-800';
      case 'quarterly':
        return 'bg-green-100 text-green-800';
      case 'annually':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get payment methods for selected company
  const getPaymentMethodsForCompany = (companyId: string) => {
    return paymentMethods.filter(pm => pm.company_id === companyId && pm.is_verified);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Recurring Invoices</h1>
          <p className="mt-1 text-sm text-gray-500">
            Automate monthly billing with recurring invoice templates
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 text-center whitespace-nowrap"
        >
          + Create Recurring Invoice
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">📋</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Templates</dt>
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Active</dt>
                  <dd className="text-lg font-semibold text-green-600">{stats.active}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">⏸</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Inactive</dt>
                  <dd className="text-lg font-semibold text-gray-600">{stats.inactive}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">💳</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Auto-Charge</dt>
                  <dd className="text-lg font-semibold text-blue-600">{stats.autoCharge}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">⏰</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Due This Week</dt>
                  <dd className="text-lg font-semibold text-orange-600">{stats.upcoming}</dd>
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
              onClick={() => setFilter('active')}
              className={`${
                filter === 'active'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Active ({stats.active})
            </button>
            <button
              onClick={() => setFilter('inactive')}
              className={`${
                filter === 'inactive'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Inactive ({stats.inactive})
            </button>
          </nav>
        </div>

        {/* Recurring Invoices Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Frequency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Next Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Settings
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
              {filteredRecurring.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                    No recurring invoices found. Create one to get started.
                  </td>
                </tr>
              ) : (
                filteredRecurring.map((recurring) => (
                  <tr key={recurring.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {recurring.company.name}
                      </div>
                      <div className="text-sm text-gray-500">{recurring.company.contact_email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getFrequencyBadgeColor(
                          recurring.frequency
                        )}`}
                      >
                        {recurring.frequency}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(recurring.next_invoice_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${(recurring.invoice_template.total_cents / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="space-y-1">
                        {recurring.auto_send && (
                          <div className="text-green-600 text-xs">✓ Auto-send</div>
                        )}
                        {recurring.auto_charge && (
                          <div className="text-blue-600 text-xs">💳 Auto-charge</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          recurring.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {recurring.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleGenerateInvoice(recurring.id)}
                        disabled={!recurring.is_active || isGenerating === recurring.id}
                        className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGenerating === recurring.id ? 'Generating...' : 'Generate'}
                      </button>
                      <button
                        onClick={() => handleToggleActive(recurring.id, recurring.is_active)}
                        className="text-yellow-600 hover:text-yellow-900"
                      >
                        {recurring.is_active ? 'Pause' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteRecurring(recurring.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
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
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Create Recurring Invoice
              </h3>
              <form onSubmit={handleCreateRecurring} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Company</label>
                  <select
                    value={newRecurring.companyId}
                    onChange={(e) =>
                      setNewRecurring({ ...newRecurring, companyId: e.target.value })
                    }
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  >
                    <option value="">Select a company</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Frequency</label>
                    <select
                      value={newRecurring.frequency}
                      onChange={(e) =>
                        setNewRecurring({ ...newRecurring, frequency: e.target.value })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Biweekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annually">Annually</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Date</label>
                    <input
                      type="date"
                      value={newRecurring.startDate}
                      onChange={(e) =>
                        setNewRecurring({ ...newRecurring, startDate: e.target.value })
                      }
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={newRecurring.endDate}
                    onChange={(e) =>
                      setNewRecurring({ ...newRecurring, endDate: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Amount (Total in dollars)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    onChange={(e) =>
                      setNewRecurring({
                        ...newRecurring,
                        invoiceTemplate: {
                          ...newRecurring.invoiceTemplate,
                          total_cents: Math.round(parseFloat(e.target.value) * 100),
                        },
                      })
                    }
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={newRecurring.invoiceTemplate.notes}
                    onChange={(e) =>
                      setNewRecurring({
                        ...newRecurring,
                        invoiceTemplate: {
                          ...newRecurring.invoiceTemplate,
                          notes: e.target.value,
                        },
                      })
                    }
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    placeholder="Notes that will appear on each invoice..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newRecurring.autoSend}
                      onChange={(e) =>
                        setNewRecurring({ ...newRecurring, autoSend: e.target.checked })
                      }
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Automatically send invoice to customer
                    </span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newRecurring.autoCharge}
                      onChange={(e) =>
                        setNewRecurring({ ...newRecurring, autoCharge: e.target.checked })
                      }
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Automatically charge saved payment method
                    </span>
                  </label>
                </div>

                {newRecurring.autoCharge && newRecurring.companyId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Payment Method
                    </label>
                    <select
                      value={newRecurring.paymentMethodId}
                      onChange={(e) =>
                        setNewRecurring({ ...newRecurring, paymentMethodId: e.target.value })
                      }
                      required={newRecurring.autoCharge}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    >
                      <option value="">Select payment method</option>
                      {getPaymentMethodsForCompany(newRecurring.companyId).map((pm) => (
                        <option key={pm.id} value={pm.id}>
                          {pm.payment_type === 'card'
                            ? `Card ending in ${pm.card_last_four}`
                            : `${pm.bank_name} ending in ${pm.account_last_four}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

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
                    Create Recurring Invoice
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
