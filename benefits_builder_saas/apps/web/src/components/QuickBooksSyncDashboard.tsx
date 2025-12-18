"use client";

import { useState, Fragment } from "react";
import { useRouter } from "next/navigation";

type SyncLog = {
  id: string;
  sync_type: string;
  customers_pushed: number;
  customers_pulled: number;
  invoices_pushed: number;
  invoices_pulled: number;
  payments_pushed: number;
  payments_pulled: number;
  errors: any;
  synced_at: string;
  duration_ms?: number;
};

type Props = {
  connected: boolean;
  companyName?: string;
  lastSync: string | null;
  pendingSync: {
    customers: number;
    invoices: number;
  };
  syncHistory: SyncLog[];
};

export default function QuickBooksSyncDashboard({
  connected,
  companyName,
  lastSync,
  pendingSync,
  syncHistory,
}: Props) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);
  const [expandedErrors, setExpandedErrors] = useState<string | null>(null);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Calculate next sync time (returns "Now" if overdue)
  const getNextSyncText = () => {
    if (!lastSync) return "Run first sync";
    const lastSyncTime = new Date(lastSync).getTime();
    const nextSyncTime = lastSyncTime + 3 * 60 * 60 * 1000; // 3 hours
    const now = Date.now();
    const minutesRemaining = Math.ceil((nextSyncTime - now) / (60 * 1000));

    if (minutesRemaining <= 0) {
      return "Overdue - sync will run soon";
    } else if (minutesRemaining < 60) {
      return `~${minutesRemaining} minutes`;
    } else {
      const hours = Math.floor(minutesRemaining / 60);
      const mins = minutesRemaining % 60;
      return `~${hours}h ${mins}m`;
    }
  };

  // Parse errors from sync log (handles both string and object formats)
  const parseErrors = (errors: any): { customers: string[]; invoices: string[]; payments: string[] } => {
    const defaultErrors = { customers: [], invoices: [], payments: [] };
    if (!errors) return defaultErrors;

    // If already an object
    if (typeof errors === "object" && !Array.isArray(errors)) {
      return {
        customers: errors.customers || [],
        invoices: errors.invoices || [],
        payments: errors.payments || [],
      };
    }

    // If string, try to parse
    if (typeof errors === "string") {
      try {
        const parsed = JSON.parse(errors);
        return {
          customers: parsed.customers || [],
          invoices: parsed.invoices || [],
          payments: parsed.payments || [],
        };
      } catch {
        return defaultErrors;
      }
    }

    return defaultErrors;
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setError(null);
    setSuccess(null);
    setSyncProgress("Starting sync...");

    try {
      setSyncProgress("Syncing customers, invoices, and payments...");

      const res = await fetch("/api/quickbooks/sync-bidirectional", {
        method: "POST",
        // No authorization header needed - the API allows manual sync from dashboard
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Sync failed");
      }

      const results = data.results || {};
      const totalPushed = (results.customers?.pushed || 0) + (results.invoices?.pushed || 0);
      const totalPulled = (results.customers?.pulled || 0) + (results.invoices?.pulled || 0) + (results.payments?.pulled || 0);
      const hasErrors = (results.customers?.errors?.length > 0) ||
                       (results.invoices?.errors?.length > 0) ||
                       (results.payments?.errors?.length > 0);

      let successMsg = `Sync completed! Pushed ${totalPushed} items to QB, pulled ${totalPulled} items from QB.`;
      if (hasErrors) {
        const errorCount = (results.customers?.errors?.length || 0) +
                          (results.invoices?.errors?.length || 0) +
                          (results.payments?.errors?.length || 0);
        successMsg += ` (${errorCount} errors - check history for details)`;
      }

      setSuccess(successMsg);
      setSyncProgress(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setSyncProgress(null);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect QuickBooks? This will stop automatic syncing.")) {
      return;
    }

    try {
      const res = await fetch("/api/accounting/quickbooks/disconnect", {
        method: "POST",
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error);
      }

      router.push("/accounting");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!connected) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Connect to QuickBooks</h2>
          <p className="text-slate-600 mb-6 max-w-md mx-auto">
            Connect your QuickBooks Online account to automatically sync customers, invoices, and payments every 3 hours.
          </p>
          <a
            href="/api/accounting/quickbooks/auth"
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 inline-flex items-center gap-2 font-medium"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            Connect QuickBooks
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">QuickBooks Sync</h2>
          <p className="text-slate-600 text-sm">
            Connected to: <span className="font-medium">{companyName || "QuickBooks"}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSyncing ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Syncing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync Now
              </>
            )}
          </button>
          <button
            onClick={handleDisconnect}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
          >
            Disconnect
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3">
          <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-medium">Sync Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-start gap-3">
          <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-medium">Sync Complete</p>
            <p className="text-sm">{success}</p>
          </div>
        </div>
      )}

      {syncProgress && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg flex items-center gap-3">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>{syncProgress}</span>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-xl shadow p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-green-900">Status</h3>
            <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-green-800">Connected</p>
          <p className="text-xs text-green-600 mt-1">Auto-sync every 3 hours</p>
        </div>

        <div className="bg-blue-50 rounded-xl shadow p-5">
          <h3 className="font-bold text-blue-900 mb-2">Last Sync</h3>
          <p className="text-lg font-semibold text-blue-800">
            {lastSync ? formatDate(lastSync) : "Never"}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Next: {getNextSyncText()}
          </p>
        </div>

        <div className="bg-amber-50 rounded-xl shadow p-5">
          <h3 className="font-bold text-amber-900 mb-2">Pending Sync</h3>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-amber-700">Companies:</span>
              <span className="font-bold text-amber-900">{pendingSync.customers}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-amber-700">Invoices:</span>
              <span className="font-bold text-amber-900">{pendingSync.invoices}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sync History */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-bold text-lg">Sync History</h3>
          <p className="text-sm text-slate-600">Last 10 sync operations</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 font-medium">Timestamp</th>
                <th className="text-center py-3 px-4 font-medium">Customers</th>
                <th className="text-center py-3 px-4 font-medium">Invoices</th>
                <th className="text-center py-3 px-4 font-medium">Status</th>
                <th className="text-center py-3 px-4 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {syncHistory.map((log) => {
                const errors = parseErrors(log.errors);
                const hasErrors = errors.customers.length > 0 || errors.invoices.length > 0 || errors.payments.length > 0;
                const totalErrors = errors.customers.length + errors.invoices.length + errors.payments.length;
                const isExpanded = expandedErrors === log.id;

                return (
                  <Fragment key={log.id}>
                    <tr className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">{formatDate(log.synced_at)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-green-600 mr-1" title="Pushed to QB">+{log.customers_pushed}</span>
                        <span className="text-blue-600" title="Pulled from QB">-{log.customers_pulled}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-green-600 mr-1" title="Pushed to QB">+{log.invoices_pushed}</span>
                        <span className="text-blue-600" title="Pulled from QB">-{log.invoices_pulled}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {hasErrors ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            {totalErrors} error{totalErrors !== 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Success
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {hasErrors && (
                          <button
                            onClick={() => setExpandedErrors(isExpanded ? null : log.id)}
                            className="text-blue-600 hover:text-blue-800 text-xs"
                          >
                            {isExpanded ? "Hide" : "View"}
                          </button>
                        )}
                      </td>
                    </tr>
                    {isExpanded && hasErrors && (
                      <tr className="bg-red-50">
                        <td colSpan={5} className="px-4 py-3">
                          <div className="text-sm">
                            <p className="font-medium text-red-800 mb-2">Error Details:</p>
                            <ul className="list-disc list-inside space-y-1 text-red-700">
                              {errors.customers.map((err, i) => (
                                <li key={`c-${i}`}><span className="text-slate-600">Customer:</span> {err}</li>
                              ))}
                              {errors.invoices.map((err, i) => (
                                <li key={`i-${i}`}><span className="text-slate-600">Invoice:</span> {err}</li>
                              ))}
                              {errors.payments.map((err, i) => (
                                <li key={`p-${i}`}><span className="text-slate-600">Payment:</span> {err}</li>
                              ))}
                            </ul>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {syncHistory.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p>No sync history yet</p>
            <p className="text-sm mt-1">Click "Sync Now" to run your first sync</p>
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="bg-slate-50 rounded-xl p-6">
        <h3 className="font-bold text-lg text-slate-900 mb-4">How Sync Works</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <span className="text-green-600 font-bold">+</span>
            </div>
            <div>
              <p className="font-medium text-slate-800">Push to QuickBooks</p>
              <p className="text-slate-600">New companies and invoices created here are sent to QuickBooks</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 font-bold">-</span>
            </div>
            <div>
              <p className="font-medium text-slate-800">Pull from QuickBooks</p>
              <p className="text-slate-600">Invoices and payments from QuickBooks are imported here</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
