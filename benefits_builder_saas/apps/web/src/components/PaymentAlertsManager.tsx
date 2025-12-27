'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  message: string;
  action_required: string;
  status: string;
  created_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  company?: { id: string; name: string; contact_email: string };
  invoice?: {
    id: string;
    invoice_number: string;
    total_cents: number;
    amount_paid_cents: number;
    due_date: string;
    payment_status: string;
  };
}

interface Reminder {
  id: string;
  reminder_type: string;
  sent_at: string;
  sent_to: string;
  opened_at?: string;
  clicked_at?: string;
  invoice?: { invoice_number: string; company: { name: string } };
}

interface PaymentAlertsManagerProps {
  alerts: Alert[];
  reminders: Reminder[];
  stats: {
    total: number;
    active: number;
    acknowledged: number;
    resolved: number;
    critical: number;
    warning: number;
    info: number;
  };
  userId: string | null;
}

export default function PaymentAlertsManager({
  alerts: initialAlerts,
  reminders,
  stats: initialStats,
  userId,
}: PaymentAlertsManagerProps) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [stats, setStats] = useState(initialStats);
  const [filter, setFilter] = useState<string>('active');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderType, setReminderType] = useState<'gentle' | 'firm' | 'final'>('gentle');
  const [loading, setLoading] = useState(false);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'late':
        return '⏰';
      case 'underpaid':
        return '💸';
      case 'overpaid':
        return '💰';
      case 'failed':
        return '❌';
      default:
        return '📋';
    }
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (filter !== 'all' && alert.status !== filter) return false;
    if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
    return true;
  });

  const handleAcknowledge = async (alertId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/accounting/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'acknowledged',
          userId: userId,
        }),
      });

      if (response.ok) {
        const { alert: updatedAlert } = await response.json();
        setAlerts(alerts.map(a => a.id === alertId ? updatedAlert : a));
        // Update stats
        setStats({
          ...stats,
          active: stats.active - 1,
          acknowledged: stats.acknowledged + 1,
        });
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      alert('Failed to acknowledge alert');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (alertId: string, notes?: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/accounting/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'resolved',
          resolutionNotes: notes || 'Resolved',
          userId: userId,
        }),
      });

      if (response.ok) {
        const { alert: updatedAlert } = await response.json();
        const originalAlert = alerts.find(a => a.id === alertId);
        setAlerts(alerts.map(a => a.id === alertId ? updatedAlert : a));
        setStats({
          ...stats,
          [originalAlert?.status === 'active' ? 'active' : 'acknowledged']: stats[originalAlert?.status === 'active' ? 'active' : 'acknowledged'] - 1,
          resolved: stats.resolved + 1,
        });
        setSelectedAlert(null);
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      alert('Failed to resolve alert');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async () => {
    if (!selectedAlert?.invoice?.id) return;

    setLoading(true);
    try {
      const response = await fetch('/api/accounting/alerts/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: selectedAlert.invoice.id,
          reminderType,
        }),
      });

      if (response.ok) {
        alert(`${reminderType.charAt(0).toUpperCase() + reminderType.slice(1)} reminder sent successfully!`);
        setShowReminderModal(false);
        setSelectedAlert(null);
      } else {
        const error = await response.json();
        alert(`Failed to send reminder: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to send reminder:', error);
      alert('Failed to send reminder');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Payment Alerts</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and manage late payments, underpayments, and payment issues
          </p>
        </div>
        <Link
          href="/accounting"
          className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 text-center whitespace-nowrap"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
        <div className="bg-white overflow-hidden shadow rounded-lg p-4">
          <dt className="text-sm font-medium text-gray-500 truncate">Total</dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.total}</dd>
        </div>
        <div className="bg-green-50 overflow-hidden shadow rounded-lg p-4 border border-green-200">
          <dt className="text-sm font-medium text-green-800 truncate">Active</dt>
          <dd className="mt-1 text-3xl font-semibold text-green-900">{stats.active}</dd>
        </div>
        <div className="bg-yellow-50 overflow-hidden shadow rounded-lg p-4 border border-yellow-200">
          <dt className="text-sm font-medium text-yellow-800 truncate">Acknowledged</dt>
          <dd className="mt-1 text-3xl font-semibold text-yellow-900">{stats.acknowledged}</dd>
        </div>
        <div className="bg-blue-50 overflow-hidden shadow rounded-lg p-4 border border-blue-200">
          <dt className="text-sm font-medium text-blue-800 truncate">Resolved</dt>
          <dd className="mt-1 text-3xl font-semibold text-blue-900">{stats.resolved}</dd>
        </div>
        <div className="bg-red-50 overflow-hidden shadow rounded-lg p-4 border border-red-200">
          <dt className="text-sm font-medium text-red-800 truncate">Critical</dt>
          <dd className="mt-1 text-3xl font-semibold text-red-900">{stats.critical}</dd>
        </div>
        <div className="bg-yellow-50 overflow-hidden shadow rounded-lg p-4 border border-yellow-200">
          <dt className="text-sm font-medium text-yellow-800 truncate">Warnings</dt>
          <dd className="mt-1 text-3xl font-semibold text-yellow-900">{stats.warning}</dd>
        </div>
        <div className="bg-blue-50 overflow-hidden shadow rounded-lg p-4 border border-blue-200">
          <dt className="text-sm font-medium text-blue-800 truncate">Info</dt>
          <dd className="mt-1 text-3xl font-semibold text-blue-900">{stats.info}</dd>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
              <option value="ignored">Ignored</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="all">All Severity</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
            Alerts ({filteredAlerts.length})
          </h3>
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-6xl">✓</span>
              <p className="mt-4 text-lg text-gray-500">No alerts found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border-2 ${getSeverityColor(alert.severity)}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <span className="text-2xl flex-shrink-0">{getAlertTypeIcon(alert.alert_type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-semibold">
                            {alert.company?.name}
                          </h4>
                          {alert.invoice && (
                            <span className="text-sm text-gray-600">
                              • Invoice {alert.invoice.invoice_number}
                            </span>
                          )}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium self-start ${getSeverityColor(alert.severity)}`}>
                            {alert.severity}
                          </span>
                        </div>
                        <p className="text-sm mt-2">{alert.message}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          <strong>Action:</strong> {alert.action_required}
                        </p>
                        {alert.invoice && (
                          <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                            <span>
                              Total: ${(alert.invoice.total_cents / 100).toFixed(2)}
                            </span>
                            <span>
                              Paid: ${(alert.invoice.amount_paid_cents / 100).toFixed(2)}
                            </span>
                            <span>
                              Due: ${((alert.invoice.total_cents - alert.invoice.amount_paid_cents) / 100).toFixed(2)}
                            </span>
                            {alert.invoice.due_date && (
                              <span>
                                Due Date: {new Date(alert.invoice.due_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="mt-2 text-xs text-gray-500">
                          Created: {new Date(alert.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex sm:flex-col flex-wrap gap-2 sm:ml-4 sm:flex-shrink-0">
                      {alert.status === 'active' && alert.alert_type === 'late' && alert.invoice && (
                        <button
                          onClick={() => {
                            setSelectedAlert(alert);
                            setShowReminderModal(true);
                          }}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 whitespace-nowrap"
                        >
                          Send Reminder
                        </button>
                      )}
                      {alert.status === 'active' && (
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          disabled={loading}
                          className="px-3 py-1 bg-yellow-600 text-white rounded text-xs font-medium hover:bg-yellow-700 disabled:opacity-50 whitespace-nowrap"
                        >
                          Acknowledge
                        </button>
                      )}
                      {(alert.status === 'active' || alert.status === 'acknowledged') && (
                        <button
                          onClick={() => handleResolve(alert.id)}
                          disabled={loading}
                          className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50 whitespace-nowrap"
                        >
                          Resolve
                        </button>
                      )}
                      {alert.invoice && (
                        <Link
                          href={`/invoices/${alert.invoice.id}` as any}
                          className="px-3 py-1 bg-gray-600 text-white rounded text-xs font-medium hover:bg-gray-700 text-center whitespace-nowrap"
                        >
                          View Invoice
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reminder Modal */}
      {showReminderModal && selectedAlert && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Send Payment Reminder
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">
                  <strong>Company:</strong> {selectedAlert.company?.name}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Invoice:</strong> {selectedAlert.invoice?.invoice_number}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Email:</strong> {selectedAlert.company?.contact_email}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reminder Type
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="gentle"
                      checked={reminderType === 'gentle'}
                      onChange={(e) => setReminderType(e.target.value as any)}
                      className="mr-2"
                    />
                    <span className="text-sm">
                      <strong>Gentle</strong> - "Just a friendly reminder..."
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="firm"
                      checked={reminderType === 'firm'}
                      onChange={(e) => setReminderType(e.target.value as any)}
                      className="mr-2"
                    />
                    <span className="text-sm">
                      <strong>Firm</strong> - "Payment is now overdue..."
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="final"
                      checked={reminderType === 'final'}
                      onChange={(e) => setReminderType(e.target.value as any)}
                      className="mr-2"
                    />
                    <span className="text-sm text-red-600">
                      <strong>Final Notice</strong> - "FINAL NOTICE - Pay immediately..."
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowReminderModal(false);
                    setSelectedAlert(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendReminder}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send Reminder'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Reminders */}
      {reminders.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              Recent Reminders Sent
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sent To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sent At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reminders.map((reminder) => (
                    <tr key={reminder.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {reminder.invoice?.company?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {reminder.invoice?.invoice_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          reminder.reminder_type === 'final' ? 'bg-red-100 text-red-800' :
                          reminder.reminder_type === 'firm' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {reminder.reminder_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {reminder.sent_to}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(reminder.sent_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {reminder.opened_at ? (
                          <span className="text-green-600">✓ Opened</span>
                        ) : (
                          <span className="text-gray-400">Sent</span>
                        )}
                        {reminder.clicked_at && (
                          <span className="text-green-600 ml-2">✓ Clicked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
