'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Closing {
  id: string;
  year: number;
  month: number;
  validation_report: any;
  can_close: boolean;
  critical_issues_count: number;
  warnings_count: number;
  status: string;
  closed_at?: string;
  closed_by?: string;
  transactions_locked: boolean;
  notes?: string;
}

interface MonthEndClosingManagerProps {
  closings: Closing[];
  currentYear: number;
  currentMonth: number;
}

export default function MonthEndClosingManager({
  closings: initialClosings,
  currentYear,
  currentMonth,
}: MonthEndClosingManagerProps) {
  const [closings, setClosings] = useState(initialClosings);
  const [selectedMonth, setSelectedMonth] = useState<{ year: number; month: number } | null>(null);
  const [validationReport, setValidationReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleRunValidation = async (year: number, month: number) => {
    setLoading(true);
    setSelectedMonth({ year, month });

    try {
      const response = await fetch('/api/accounting/month-end/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month }),
      });

      if (response.ok) {
        const { report } = await response.json();
        setValidationReport(report);
      } else {
        const error = await response.json();
        alert(`Validation failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Validation failed:', error);
      alert('Failed to run validation');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseMonth = async () => {
    if (!selectedMonth) return;

    const expectedText = `CLOSE ${monthNames[selectedMonth.month - 1].toUpperCase()} ${selectedMonth.year}`;
    if (confirmationText !== expectedText) {
      alert(`Please type exactly: ${expectedText}`);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/accounting/month-end/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: selectedMonth.year,
          month: selectedMonth.month,
          userId: 'current-user-id', // TODO: Get from auth
          confirmationText,
        }),
      });

      if (response.ok) {
        const { closing } = await response.json();
        setClosings([closing, ...closings.filter(c => !(c.year === selectedMonth.year && c.month === selectedMonth.month))]);
        setShowCloseModal(false);
        setValidationReport(null);
        setSelectedMonth(null);
        setConfirmationText('');
        alert(`Successfully closed ${monthNames[selectedMonth.month - 1]} ${selectedMonth.year}!`);
      } else {
        const error = await response.json();
        alert(`Failed to close month: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to close month:', error);
      alert('Failed to close month');
    } finally {
      setLoading(false);
    }
  };

  const getCheckIcon = (passed: boolean) => {
    return passed ? '✅' : '❌';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'important':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'recommended':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Calculate which month to suggest validation for
  const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  const isLastMonthClosed = closings.some(c => c.year === lastMonthYear && c.month === lastMonth && c.status === 'closed');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Month-End Closing</h1>
          <p className="mt-1 text-sm text-gray-500">
            Run validation checks and close accounting periods
          </p>
        </div>
        <Link
          href="/accounting"
          className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Current Month Status */}
      <div className={`border-2 rounded-lg p-6 ${isLastMonthClosed ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-300'}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <span className="text-3xl">{isLastMonthClosed ? '✅' : '⏰'}</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {monthNames[lastMonth - 1]} {lastMonthYear}
              </h3>
              <p className="text-sm text-gray-700 mt-1">
                {isLastMonthClosed ? (
                  <span className="text-green-700 font-medium">Month is closed and locked</span>
                ) : (
                  <span className="text-yellow-700 font-medium">Month needs to be closed</span>
                )}
              </p>
            </div>
          </div>
          {!isLastMonthClosed && (
            <button
              onClick={() => handleRunValidation(lastMonthYear, lastMonth)}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Running...' : 'Run Validation'}
            </button>
          )}
        </div>
      </div>

      {/* Validation Report */}
      {validationReport && selectedMonth && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Validation Report: {monthNames[selectedMonth.month - 1]} {selectedMonth.year}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {validationReport.checks.filter((c: any) => c.passed).length} of {validationReport.checks.length} checks passed
                </p>
              </div>
              {validationReport.canClose && (
                <button
                  onClick={() => setShowCloseModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                >
                  Close Month
                </button>
              )}
            </div>

            {/* Overall Status */}
            <div className={`p-4 rounded-md mb-6 ${validationReport.canClose ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center">
                <span className="text-2xl mr-3">{validationReport.canClose ? '✅' : '❌'}</span>
                <div>
                  <h4 className={`font-semibold ${validationReport.canClose ? 'text-green-900' : 'text-red-900'}`}>
                    {validationReport.canClose ? 'Ready to Close' : 'Cannot Close - Issues Found'}
                  </h4>
                  <p className={`text-sm mt-1 ${validationReport.canClose ? 'text-green-700' : 'text-red-700'}`}>
                    {validationReport.criticalIssues.length > 0 && (
                      <>{validationReport.criticalIssues.length} critical issue(s) must be resolved</>
                    )}
                    {validationReport.importantIssues.length > 0 && (
                      <>{validationReport.importantIssues.length} warning(s) should be addressed</>
                    )}
                    {validationReport.canClose && 'All critical checks passed!'}
                  </p>
                </div>
              </div>
            </div>

            {/* Critical Issues */}
            {validationReport.criticalIssues.length > 0 && (
              <div className="mb-6">
                <h4 className="text-md font-semibold text-red-900 mb-3">
                  ❌ Critical Issues ({validationReport.criticalIssues.length})
                </h4>
                <div className="space-y-2">
                  {validationReport.criticalIssues.map((issue: string, idx: number) => (
                    <div key={idx} className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
                      {issue}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Important Issues */}
            {validationReport.importantIssues.length > 0 && (
              <div className="mb-6">
                <h4 className="text-md font-semibold text-yellow-900 mb-3">
                  ⚠️ Important Issues ({validationReport.importantIssues.length})
                </h4>
                <div className="space-y-2">
                  {validationReport.importantIssues.map((warning: string, idx: number) => (
                    <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
                      {warning}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {validationReport.recommendations.length > 0 && (
              <div className="mb-6">
                <h4 className="text-md font-semibold text-blue-900 mb-3">
                  💡 Recommendations ({validationReport.recommendations.length})
                </h4>
                <div className="space-y-2">
                  {validationReport.recommendations.map((rec: string, idx: number) => (
                    <div key={idx} className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
                      {rec}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed Checks */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-3">
                Detailed Validation Checks
              </h4>
              <div className="space-y-3">
                {validationReport.checks.map((check: any, idx: number) => (
                  <div key={idx} className={`border rounded-lg p-4 ${getSeverityColor(check.severity)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <span className="text-xl">{getCheckIcon(check.passed)}</span>
                        <div>
                          <h5 className="font-medium">{check.name}</h5>
                          <p className="text-sm mt-1">{check.description}</p>
                          {check.details && (
                            <p className="text-sm mt-1 font-mono">{check.details}</p>
                          )}
                          {check.howToFix && !check.passed && (
                            <div className="mt-2 text-sm">
                              <strong>How to fix:</strong> {check.howToFix}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${getSeverityColor(check.severity)}`}>
                        {check.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Closing History */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
            Closing History
          </h3>
          {closings.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-6xl">📅</span>
              <p className="mt-4 text-lg text-gray-500">No closed months yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Issues
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Closed Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Locked
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {closings.map((closing) => (
                    <tr key={closing.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {monthNames[closing.month - 1]} {closing.year}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          closing.status === 'closed'
                            ? 'bg-green-100 text-green-800'
                            : closing.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {closing.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {closing.critical_issues_count > 0 && (
                          <span className="text-red-600 font-medium mr-2">
                            {closing.critical_issues_count} critical
                          </span>
                        )}
                        {closing.warnings_count > 0 && (
                          <span className="text-yellow-600">
                            {closing.warnings_count} warnings
                          </span>
                        )}
                        {closing.critical_issues_count === 0 && closing.warnings_count === 0 && (
                          <span className="text-green-600">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {closing.closed_at ? new Date(closing.closed_at).toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {closing.transactions_locked ? (
                          <span className="text-green-600">🔒 Locked</span>
                        ) : (
                          <span className="text-gray-400">Unlocked</span>
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

      {/* Close Month Confirmation Modal */}
      {showCloseModal && selectedMonth && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <div className="mb-4">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900 text-center">
                Close {monthNames[selectedMonth.month - 1]} {selectedMonth.year}?
              </h3>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>This action is PERMANENT and CANNOT be undone.</strong>
              </p>
              <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside space-y-1">
                <li>All transactions will be locked</li>
                <li>No edits can be made to this period</li>
                <li>Reports will be finalized</li>
                <li>QuickBooks will be updated</li>
              </ul>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type the following to confirm:
              </label>
              <p className="text-sm font-mono bg-gray-100 p-2 rounded mb-2">
                CLOSE {monthNames[selectedMonth.month - 1].toUpperCase()} {selectedMonth.year}
              </p>
              <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                placeholder="Type here..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowCloseModal(false);
                  setConfirmationText('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleCloseMonth}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                disabled={loading || !confirmationText}
              >
                {loading ? 'Closing...' : 'Close Month'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
