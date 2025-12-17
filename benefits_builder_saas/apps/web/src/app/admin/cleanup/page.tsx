'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CleanupCandidate {
  count: number;
  items?: any[];
  description: string;
}

interface CleanupData {
  ok: boolean;
  cleanup_candidates: {
    large_amounts: CleanupCandidate;
    negative_due: CleanupCandidate;
    unlinked_companies: CleanupCandidate;
    orphaned_ar: CleanupCandidate;
  };
}

export default function CleanupPage() {
  const [data, setData] = useState<CleanupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetchCleanupCandidates();
  }, []);

  const fetchCleanupCandidates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/accounting/cleanup');
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching cleanup candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeCleanup = async (action: string, ids?: string[]) => {
    if (!confirm(`Are you sure you want to execute "${action}"? This cannot be undone.`)) {
      return;
    }

    setExecuting(action);
    setResult(null);

    try {
      const res = await fetch('/api/accounting/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids }),
      });
      const result = await res.json();
      setResult(result);

      // Refresh data after cleanup
      if (result.ok) {
        fetchCleanupCandidates();
      }
    } catch (error: any) {
      setResult({ ok: false, error: error.message });
    } finally {
      setExecuting(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Data Cleanup</h1>
          <Link href="/admin" className="px-4 py-2 bg-slate-200 rounded-lg hover:bg-slate-300">
            ← Back to Admin
          </Link>
        </div>
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Analyzing data for cleanup candidates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Data Cleanup</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review and clean up bad data from failed syncs
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchCleanupCandidates}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh
          </button>
          <Link href="/admin" className="px-4 py-2 bg-slate-200 rounded-lg hover:bg-slate-300">
            ← Back
          </Link>
        </div>
      </div>

      {/* Result Message */}
      {result && (
        <div className={`p-4 rounded-lg ${result.ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-start">
            <span className="text-xl mr-2">{result.ok ? '✓' : '✗'}</span>
            <div>
              <p className={`font-medium ${result.ok ? 'text-green-800' : 'text-red-800'}`}>
                {result.ok ? 'Cleanup Successful' : 'Cleanup Failed'}
              </p>
              {result.results && (
                <p className="text-sm mt-1">
                  {result.results.success} items processed
                  {result.results.note && <span className="ml-2 text-gray-600">({result.results.note})</span>}
                </p>
              )}
              {result.error && (
                <p className="text-sm text-red-600 mt-1">{result.error}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cleanup Sections */}
      <div className="space-y-6">
        {/* Large Amounts (x100 bug) */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b bg-orange-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-orange-900">Suspiciously Large Amounts</h3>
                <p className="text-sm text-orange-700">{data?.cleanup_candidates.large_amounts.description}</p>
              </div>
              <span className="text-2xl font-bold text-orange-600">
                {data?.cleanup_candidates.large_amounts.count || 0}
              </span>
            </div>
          </div>
          {(data?.cleanup_candidates.large_amounts.items?.length || 0) > 0 && (
            <div className="p-4">
              <div className="max-h-60 overflow-y-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="px-2 py-1">Invoice #</th>
                      <th className="px-2 py-1">Company</th>
                      <th className="px-2 py-1 text-right">Amount</th>
                      <th className="px-2 py-1 text-right">Paid</th>
                      <th className="px-2 py-1 text-right">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.cleanup_candidates.large_amounts.items?.map((item: any) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-2 py-1">{item.invoice_number}</td>
                        <td className="px-2 py-1">{item.companies?.name || '-'}</td>
                        <td className="px-2 py-1 text-right text-red-600">{formatCurrency(item.amount)}</td>
                        <td className="px-2 py-1 text-right">{formatCurrency(item.amount_paid)}</td>
                        <td className="px-2 py-1 text-right">{formatCurrency(item.amount_due)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={() => executeCleanup('delete_large_amounts')}
                disabled={executing !== null}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {executing === 'delete_large_amounts' ? 'Deleting...' : 'Delete All Large Amounts'}
              </button>
            </div>
          )}
        </div>

        {/* Negative Amount Due (double counting) */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b bg-yellow-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-yellow-900">Negative Amount Due (Double Counting)</h3>
                <p className="text-sm text-yellow-700">{data?.cleanup_candidates.negative_due.description}</p>
              </div>
              <span className="text-2xl font-bold text-yellow-600">
                {data?.cleanup_candidates.negative_due.count || 0}
              </span>
            </div>
          </div>
          {(data?.cleanup_candidates.negative_due.items?.length || 0) > 0 && (
            <div className="p-4">
              <div className="max-h-60 overflow-y-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="px-2 py-1">Invoice #</th>
                      <th className="px-2 py-1">Company</th>
                      <th className="px-2 py-1 text-right">Amount</th>
                      <th className="px-2 py-1 text-right">Paid</th>
                      <th className="px-2 py-1 text-right">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.cleanup_candidates.negative_due.items?.map((item: any) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-2 py-1">{item.invoice_number}</td>
                        <td className="px-2 py-1">{item.companies?.name || '-'}</td>
                        <td className="px-2 py-1 text-right">{formatCurrency(item.amount)}</td>
                        <td className="px-2 py-1 text-right text-red-600">{formatCurrency(item.amount_paid)}</td>
                        <td className="px-2 py-1 text-right text-red-600">{formatCurrency(item.amount_due)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={() => executeCleanup('delete_negative_due')}
                disabled={executing !== null}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {executing === 'delete_negative_due' ? 'Deleting...' : 'Delete Negative Due Entries'}
              </button>
            </div>
          )}
        </div>

        {/* Orphaned A/R */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Orphaned A/R Entries</h3>
                <p className="text-sm text-gray-600">{data?.cleanup_candidates.orphaned_ar.description}</p>
              </div>
              <span className="text-2xl font-bold text-gray-600">
                {data?.cleanup_candidates.orphaned_ar.count || 0}
              </span>
            </div>
          </div>
          {(data?.cleanup_candidates.orphaned_ar.count || 0) > 0 && (
            <div className="p-4">
              <button
                onClick={() => executeCleanup('delete_orphaned_ar')}
                disabled={executing !== null}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {executing === 'delete_orphaned_ar' ? 'Deleting...' : 'Delete Orphaned Entries'}
              </button>
            </div>
          )}
        </div>

        {/* Nuclear Option */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b bg-red-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-red-900">Clear All QuickBooks A/R Data</h3>
                <p className="text-sm text-red-700">
                  Delete ALL A/R entries imported from QuickBooks and start fresh. Run sync to reimport correctly.
                </p>
              </div>
              <span className="text-2xl">☢️</span>
            </div>
          </div>
          <div className="p-4">
            <button
              onClick={() => executeCleanup('clear_all_qb_ar')}
              disabled={executing !== null}
              className="px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 disabled:opacity-50"
            >
              {executing === 'clear_all_qb_ar' ? 'Clearing...' : 'Clear All QB A/R (Nuclear Option)'}
            </button>
            <p className="mt-2 text-xs text-gray-500">
              Use this if you want to completely reset QuickBooks A/R data and reimport from scratch.
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-xl mr-3">ℹ️</span>
            <div className="text-sm text-blue-800">
              <p className="font-medium">About Data Cleanup</p>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li><strong>Large Amounts:</strong> Entries with $100k+ amounts likely resulted from a x100 bug during sync</li>
                <li><strong>Negative Due:</strong> When amount_paid exceeds amount, it indicates payments were double-counted</li>
                <li><strong>Orphaned:</strong> A/R entries without a valid company link are orphans</li>
                <li>After cleanup, run QuickBooks Sync to reimport correct data</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
