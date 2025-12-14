'use client';

import { useState } from 'react';
import Link from 'next/link';
import AccountingManager from './AccountingManager';

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  message: string;
  company?: { name: string };
  invoice?: { invoice_number: string; total_cents: number };
}

interface QBConnection {
  id: string;
  realm_id: string;
  company_name?: string;
  status: string;
  last_sync_at?: string;
}

interface QBSyncLog {
  id: string;
  sync_type: string;
  status?: string;
  synced_at: string;
  items_synced?: number;
  error_message?: string;
  errors?: string; // JSON string of errors from sync
}

interface AccountingDashboardProps {
  initialAR: any[];
  initialAP: any[];
  initialPayments: any[];
  companies: any[];
  qbConnected: boolean;
  qbConnection?: QBConnection | null;
  qbSyncLogs?: QBSyncLog[];
  lastSuccessfulSync?: QBSyncLog;
  arSummary: { total: number; overdue: number; count: number };
  apSummary: { total: number; overdue: number; count: number };
  alerts: Alert[];
  alertsSummary: { critical: number; warning: number; info: number; total: number };
  totalCredits: number;
  monthEndStatus: any;
  currentMonth: number;
  currentYear: number;
}

export default function AccountingDashboard({
  initialAR,
  initialAP,
  initialPayments,
  companies,
  qbConnected,
  qbConnection,
  qbSyncLogs = [],
  lastSuccessfulSync,
  arSummary,
  apSummary,
  alerts,
  alertsSummary,
  totalCredits,
  monthEndStatus,
  currentMonth,
  currentYear,
}: AccountingDashboardProps) {
  const [showManager, setShowManager] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/quickbooks/sync-bidirectional', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.ok) {
        setSyncMessage(`Sync complete! Pushed: ${data.results?.customers?.pushed || 0} customers, ${data.results?.invoices?.pushed || 0} invoices. Pulled: ${data.results?.payments?.pulled || 0} payments.`);
        // Refresh page after 2 seconds to show updated data
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setSyncMessage(`Sync failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      setSyncMessage(`Sync error: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  // Determine severity badge color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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

  if (showManager) {
    return (
      <div>
        <button
          onClick={() => setShowManager(false)}
          className="mb-4 text-blue-600 hover:text-blue-800"
        >
          ← Back to Dashboard
        </button>
        <AccountingManager
          initialAR={initialAR}
          initialAP={initialAP}
          initialPayments={initialPayments}
          companies={companies}
          qbConnected={qbConnected}
          arSummary={arSummary}
          apSummary={apSummary}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Accounting Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Overview of your financial health and accounting tasks
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => setShowManager(true)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 whitespace-nowrap"
          >
            A/R & A/P Manager
          </button>
          <Link
            href="/accounting/alerts"
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 text-center whitespace-nowrap"
          >
            View All Alerts
          </Link>
        </div>
      </div>

      {/* Alert Summary Cards */}
      {alertsSummary.total > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-2xl">🚨</span>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">
                {alertsSummary.total} Active Payment Alert{alertsSummary.total !== 1 ? 's' : ''}
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <span className="font-semibold">{alertsSummary.critical}</span> critical,{' '}
                <span className="font-semibold">{alertsSummary.warning}</span> warnings,{' '}
                <span className="font-semibold">{alertsSummary.info}</span> info
              </div>
            </div>
            <Link
              href="/accounting/alerts"
              className="text-sm font-medium text-red-800 hover:text-red-900 whitespace-nowrap"
            >
              View all →
            </Link>
          </div>
        </div>
      )}

      {/* Financial Summary */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* A/R Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-3xl">💵</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Accounts Receivable
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      ${arSummary.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </dd>
                  <dd className="mt-1 text-sm text-gray-600">
                    {arSummary.count} unpaid invoices
                  </dd>
                  {arSummary.overdue > 0 && (
                    <dd className="mt-1 text-sm text-red-600 font-medium">
                      ${arSummary.overdue.toFixed(2)} overdue
                    </dd>
                  )}
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* A/P Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-3xl">💳</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Accounts Payable
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      ${apSummary.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </dd>
                  <dd className="mt-1 text-sm text-gray-600">
                    {apSummary.count} unpaid bills
                  </dd>
                  {apSummary.overdue > 0 && (
                    <dd className="mt-1 text-sm text-red-600 font-medium">
                      ${apSummary.overdue.toFixed(2)} overdue
                    </dd>
                  )}
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Credits Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-3xl">🎁</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Available Credits
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-green-600">
                      ${totalCredits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </dd>
                  <dd className="mt-1 text-sm text-gray-600">
                    Auto-applies to invoices
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <Link href="/accounting/credits" className="text-sm font-medium text-blue-600 hover:text-blue-800">
              Manage credits →
            </Link>
          </div>
        </div>

        {/* Month-End Status Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-3xl">📅</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Month-End Status
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-lg font-semibold text-gray-900">
                      {monthNames[lastMonth - 1]} {lastMonthYear}
                    </div>
                  </dd>
                  <dd className="mt-1 text-sm">
                    {monthEndStatus?.status === 'closed' ? (
                      <span className="text-green-600 font-medium">✓ Closed</span>
                    ) : (
                      <span className="text-yellow-600 font-medium">⚠ Not closed</span>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <Link href="/accounting/month-end" className="text-sm font-medium text-blue-600 hover:text-blue-800">
              Month-end close →
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              Recent Payment Alerts
            </h3>
            <div className="space-y-3">
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-md border ${getSeverityColor(alert.severity)}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <span className="text-xl flex-shrink-0">{getAlertTypeIcon(alert.alert_type)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {alert.company?.name} - {alert.invoice?.invoice_number}
                        </p>
                        <p className="text-sm mt-1">{alert.message}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium self-start ${getSeverityColor(alert.severity)}`}>
                      {alert.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {alerts.length > 5 && (
              <div className="mt-4 text-center">
                <Link
                  href="/accounting/alerts"
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  View all {alerts.length} alerts →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Link
              href="/invoices"
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
            >
              <div className="text-2xl mb-2">📄</div>
              <div className="text-sm font-medium text-gray-900">Invoices</div>
              <div className="text-xs text-gray-500 mt-1">Manage billing</div>
            </Link>
            <Link
              href="/accounting/alerts"
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
            >
              <div className="text-2xl mb-2">🔔</div>
              <div className="text-sm font-medium text-gray-900">Alerts</div>
              <div className="text-xs text-gray-500 mt-1">Payment issues</div>
            </Link>
            <Link
              href="/accounting/credits"
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
            >
              <div className="text-2xl mb-2">💳</div>
              <div className="text-sm font-medium text-gray-900">Credits</div>
              <div className="text-xs text-gray-500 mt-1">Overpayments</div>
            </Link>
            <Link
              href="/accounting/month-end"
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
            >
              <div className="text-2xl mb-2">📊</div>
              <div className="text-sm font-medium text-gray-900">Month-End</div>
              <div className="text-xs text-gray-500 mt-1">Close books</div>
            </Link>
          </div>
        </div>
      </div>

      {/* QuickBooks Status */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">📗</span>
              <div>
                <h3 className="text-sm font-medium text-gray-900">QuickBooks Online</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {qbConnected ? (
                    <span className="text-green-600 font-medium">✓ Connected</span>
                  ) : (
                    <span className="text-red-600 font-medium">✗ Not connected</span>
                  )}
                </p>
              </div>
            </div>
            {!qbConnected && (
              <a
                href="/api/quickbooks/auth"
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
              >
                Connect QuickBooks
              </a>
            )}
          </div>

          {/* Sync Status Details */}
          {qbConnected && qbConnection && (
            <div className="border-t pt-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Company:</span>
                  <span className="ml-2 text-gray-900 font-medium">
                    {qbConnection.company_name || 'QuickBooks Company'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Realm ID:</span>
                  <span className="ml-2 text-gray-900 font-mono text-xs break-all">
                    {qbConnection.realm_id}
                  </span>
                </div>
              </div>

              {lastSuccessfulSync && (
                <div>
                  <span className="text-gray-500 text-sm">Last Sync:</span>
                  <span className="ml-2 text-gray-900 text-sm" suppressHydrationWarning>
                    {new Date(lastSuccessfulSync.synced_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {lastSuccessfulSync.items_synced && (
                    <span className="ml-2 text-gray-500 text-sm">
                      ({lastSuccessfulSync.items_synced} items)
                    </span>
                  )}
                </div>
              )}

              {qbSyncLogs.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Recent Syncs</h4>
                  <div className="space-y-1">
                    {qbSyncLogs.slice(0, 3).map((log) => {
                      // Determine success by checking if errors field is empty or has no actual errors
                      let isSuccess = false;
                      try {
                        if (log.errors) {
                          const errorsObj = typeof log.errors === 'string' ? JSON.parse(log.errors) : log.errors;
                          // Success if all error arrays are empty
                          const hasErrors = Object.values(errorsObj).some((arr: any) => Array.isArray(arr) && arr.length > 0);
                          isSuccess = !hasErrors;
                        } else {
                          // No errors field means success
                          isSuccess = true;
                        }
                      } catch {
                        isSuccess = false;
                      }

                      return (
                      <div key={log.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <span className={isSuccess ? 'text-green-600' : 'text-red-600'}>
                            {isSuccess ? '✓' : '✗'}
                          </span>
                          <span className="text-gray-700">{log.sync_type}</span>
                          {log.items_synced && (
                            <span className="text-gray-500">({log.items_synced})</span>
                          )}
                        </div>
                        <span className="text-gray-500" suppressHydrationWarning>
                          {new Date(log.synced_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-2 space-y-2">
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </button>
                {syncMessage && (
                  <p className={`text-xs ${syncMessage.includes('failed') || syncMessage.includes('error') ? 'text-red-600' : 'text-green-600'}`}>
                    {syncMessage}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
