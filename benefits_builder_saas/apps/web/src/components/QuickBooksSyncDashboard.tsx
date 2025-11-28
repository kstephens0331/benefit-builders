"use client";

import { useState } from "react";
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
  lastSync: string | null;
  pendingSync: {
    customers: number;
    invoices: number;
  };
  syncHistory: SyncLog[];
};

export default function QuickBooksSyncDashboard({
  connected,
  lastSync,
  pendingSync,
  syncHistory,
}: Props) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/quickbooks/sync-bidirectional", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || "manual"}`,
        },
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Sync failed");
      }

      setSuccess(
        `Sync completed! Pushed: ${data.results.customers.pushed} customers, ${data.results.invoices.pushed} invoices. Pulled: ${data.results.payments.pulled} payments.`
      );
      router.refresh();
    } catch (err: any) {
      setError(err.message);
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
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-bold mb-4">QuickBooks Integration</h2>
        <p className="text-slate-600 mb-4">
          Connect to QuickBooks to automatically sync customers, invoices, and payments every 3 hours.
        </p>
        <a
          href="/api/accounting/quickbooks/auth"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block"
        >
          Connect QuickBooks
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">QuickBooks Sync Dashboard</h2>
          <p className="text-slate-600 text-sm">
            Automatic bidirectional sync every 3 hours
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSyncing ? "Syncing..." : "Sync Now"}
          </button>
          <button
            onClick={handleDisconnect}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Disconnect
          </button>
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

      {/* Status Cards */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-green-50 rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-green-900">Connected</h3>
            <svg
              className="w-8 h-8 text-green-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <p className="text-sm text-green-700">QuickBooks is connected</p>
          <p className="text-xs text-green-600 mt-2">
            Auto-sync active
          </p>
        </div>

        <div className="bg-blue-50 rounded-xl shadow p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-2">Last Sync</h3>
          <p className="text-2xl font-bold text-blue-900">
            {lastSync ? formatDate(lastSync) : "Never"}
          </p>
          <p className="text-xs text-blue-600 mt-2">
            Next sync in ~{lastSync ? Math.ceil((new Date(lastSync).getTime() + 3 * 60 * 60 * 1000 - Date.now()) / (60 * 1000)) : 180} minutes
          </p>
        </div>

        <div className="bg-yellow-50 rounded-xl shadow p-6">
          <h3 className="text-lg font-bold text-yellow-900 mb-2">
            Pending Sync
          </h3>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-sm text-yellow-700">Customers:</span>
              <span className="font-bold text-yellow-900">
                {pendingSync.customers}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-yellow-700">Invoices:</span>
              <span className="font-bold text-yellow-900">
                {pendingSync.invoices}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sync History */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-bold text-lg">Recent Sync History</h3>
          <p className="text-sm text-slate-600">Last 10 sync operations</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4">Timestamp</th>
                <th className="text-center py-3 px-4">Type</th>
                <th className="text-center py-3 px-4">Customers</th>
                <th className="text-center py-3 px-4">Invoices</th>
                <th className="text-center py-3 px-4">Payments</th>
                <th className="text-center py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {syncHistory.map((log) => {
                const hasErrors =
                  log.errors &&
                  (log.errors.customers?.length > 0 ||
                    log.errors.invoices?.length > 0 ||
                    log.errors.payments?.length > 0);

                return (
                  <tr
                    key={log.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="py-3 px-4">{formatDate(log.synced_at)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {log.sync_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="text-xs">
                        <span className="text-green-600">
                          ↑{log.customers_pushed}
                        </span>{" "}
                        <span className="text-blue-600">
                          ↓{log.customers_pulled}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="text-xs">
                        <span className="text-green-600">
                          ↑{log.invoices_pushed}
                        </span>{" "}
                        <span className="text-blue-600">
                          ↓{log.invoices_pulled}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="text-xs">
                        <span className="text-green-600">
                          ↑{log.payments_pushed}
                        </span>{" "}
                        <span className="text-blue-600">
                          ↓{log.payments_pulled}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {hasErrors ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Partial
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Success
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {syncHistory.length === 0 && (
          <div className="text-center py-12 text-slate-600">
            No sync history yet. Sync will run automatically every 3 hours.
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="bg-blue-50 rounded-xl p-6">
        <h3 className="font-bold text-lg text-blue-900 mb-3">
          How Automatic Sync Works
        </h3>
        <div className="space-y-2 text-sm text-blue-800">
          <div className="flex items-start gap-2">
            <span className="text-green-600 font-bold">→</span>
            <div>
              <strong>Push to QuickBooks:</strong> New customers and invoices
              created in Benefits Builder are automatically synced to QuickBooks
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">←</span>
            <div>
              <strong>Pull from QuickBooks:</strong> Payments recorded in
              QuickBooks are automatically imported into Benefits Builder
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-purple-600 font-bold">⟳</span>
            <div>
              <strong>Frequency:</strong> Sync runs every 3 hours automatically.
              You can also trigger manual syncs anytime.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
