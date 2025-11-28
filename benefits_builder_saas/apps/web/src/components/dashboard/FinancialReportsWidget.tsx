"use client";

/**
 * Financial Reports Dashboard Widget
 *
 * Displays key financial metrics from QuickBooks:
 * - Profit & Loss summary
 * - Cash flow status
 * - A/R and A/P aging
 */

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Skeleton } from "@/components/ui";

interface FinancialMetrics {
  profitLoss: {
    revenue: number;
    expenses: number;
    netIncome: number;
    period: string;
  } | null;
  arAging: {
    current: number;
    overdue30: number;
    overdue60: number;
    overdue90: number;
    total: number;
  } | null;
  apAging: {
    current: number;
    overdue30: number;
    overdue60: number;
    overdue90: number;
    total: number;
  } | null;
  lastSyncedAt: string | null;
}

export function FinancialReportsWidget() {
  const [metrics, setMetrics] = useState<FinancialMetrics>({
    profitLoss: null,
    arAging: null,
    apAging: null,
    lastSyncedAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFinancialMetrics = async () => {
    try {
      setRefreshing(true);
      setError(null);

      // Get date range for P&L (current month)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startDate = startOfMonth.toISOString().split("T")[0];
      const endDate = now.toISOString().split("T")[0];

      // Fetch reports in parallel
      const [plResponse, arResponse, apResponse] = await Promise.all([
        fetch(`/api/accounting/quickbooks/reports?type=profit-loss&start_date=${startDate}&end_date=${endDate}`),
        fetch(`/api/accounting/quickbooks/reports?type=ar-aging`),
        fetch(`/api/accounting/quickbooks/reports?type=ap-aging`),
      ]);

      if (!plResponse.ok || !arResponse.ok || !apResponse.ok) {
        throw new Error("Failed to fetch financial reports");
      }

      const plData = await plResponse.json();
      const arData = await arResponse.json();
      const apData = await apResponse.json();

      // Parse P&L report
      const plReport = plData.report;
      const profitLoss = parseProfitLoss(plReport);

      // Parse A/R aging
      const arAging = parseAgingReport(arData.report);

      // Parse A/P aging
      const apAging = parseAgingReport(apData.report);

      setMetrics({
        profitLoss,
        arAging,
        apAging,
        lastSyncedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("Error fetching financial metrics:", err);
      setError(err.message || "Failed to load financial data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFinancialMetrics();
  }, []);

  if (loading) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Financial Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Financial Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-error-600 dark:text-error-400 mb-4">{error}</p>
            <Button variant="secondary" onClick={fetchFinancialMetrics}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Financial Overview</CardTitle>
          <div className="flex items-center gap-2">
            {metrics.lastSyncedAt && (
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                Updated {new Date(metrics.lastSyncedAt).toLocaleTimeString()}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchFinancialMetrics}
              loading={refreshing}
            >
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Profit & Loss Summary */}
          {metrics.profitLoss && (
            <div className="border-b border-neutral-200 dark:border-neutral-700 pb-6">
              <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
                Profit & Loss (Current Month)
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                    Revenue
                  </div>
                  <div className="text-xl font-bold text-success-600 dark:text-success-400">
                    {formatCurrency(metrics.profitLoss.revenue)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                    Expenses
                  </div>
                  <div className="text-xl font-bold text-error-600 dark:text-error-400">
                    {formatCurrency(metrics.profitLoss.expenses)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                    Net Income
                  </div>
                  <div
                    className={`text-xl font-bold ${
                      metrics.profitLoss.netIncome >= 0
                        ? "text-success-600 dark:text-success-400"
                        : "text-error-600 dark:text-error-400"
                    }`}
                  >
                    {formatCurrency(metrics.profitLoss.netIncome)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* A/R Aging */}
          {metrics.arAging && (
            <div className="border-b border-neutral-200 dark:border-neutral-700 pb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  Accounts Receivable
                </h3>
                <Badge variant="info">{formatCurrency(metrics.arAging.total)}</Badge>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <AgingBucket label="Current" amount={metrics.arAging.current} variant="success" />
                <AgingBucket label="1-30" amount={metrics.arAging.overdue30} variant="warning" />
                <AgingBucket label="31-60" amount={metrics.arAging.overdue60} variant="warning" />
                <AgingBucket label="60+" amount={metrics.arAging.overdue90} variant="error" />
              </div>
            </div>
          )}

          {/* A/P Aging */}
          {metrics.apAging && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  Accounts Payable
                </h3>
                <Badge variant="primary">{formatCurrency(metrics.apAging.total)}</Badge>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <AgingBucket label="Current" amount={metrics.apAging.current} variant="success" />
                <AgingBucket label="1-30" amount={metrics.apAging.overdue30} variant="warning" />
                <AgingBucket label="31-60" amount={metrics.apAging.overdue60} variant="warning" />
                <AgingBucket label="60+" amount={metrics.apAging.overdue90} variant="error" />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper component for aging buckets
function AgingBucket({
  label,
  amount,
  variant,
}: {
  label: string;
  amount: number;
  variant: "success" | "warning" | "error";
}) {
  return (
    <div className="text-center">
      <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{label}</div>
      <Badge variant={variant} size="sm">
        {formatCurrency(amount)}
      </Badge>
    </div>
  );
}

// Parse P&L report from QuickBooks format
function parseProfitLoss(report: any) {
  // QB report format is complex, this is a simplified parser
  // Adjust based on actual QB API response structure
  try {
    const rows = report?.Rows?.Row || [];
    let revenue = 0;
    let expenses = 0;

    // Find Income and Expense sections
    rows.forEach((row: any) => {
      if (row.group === "Income" || row.Header?.ColData?.[0]?.value === "Income") {
        revenue = parseFloat(row.Summary?.ColData?.[1]?.value || "0");
      }
      if (row.group === "Expenses" || row.Header?.ColData?.[0]?.value === "Expenses") {
        expenses = parseFloat(row.Summary?.ColData?.[1]?.value || "0");
      }
    });

    return {
      revenue,
      expenses,
      netIncome: revenue - expenses,
      period: "Current Month",
    };
  } catch (err) {
    console.error("Error parsing P&L report:", err);
    return {
      revenue: 0,
      expenses: 0,
      netIncome: 0,
      period: "Current Month",
    };
  }
}

// Parse aging report from QuickBooks format
function parseAgingReport(report: any) {
  try {
    // Simplified parser - adjust based on actual QB API response
    const rows = report?.Rows?.Row || [];
    let current = 0;
    let overdue30 = 0;
    let overdue60 = 0;
    let overdue90 = 0;

    // Parse column data based on QB aging report structure
    // Typically: [Current, 1-30, 31-60, 61-90, 90+, Total]
    rows.forEach((row: any) => {
      if (row.ColData) {
        current += parseFloat(row.ColData[0]?.value || "0");
        overdue30 += parseFloat(row.ColData[1]?.value || "0");
        overdue60 += parseFloat(row.ColData[2]?.value || "0");
        overdue90 += parseFloat(row.ColData[3]?.value || "0");
      }
    });

    const total = current + overdue30 + overdue60 + overdue90;

    return {
      current,
      overdue30,
      overdue60,
      overdue90,
      total,
    };
  } catch (err) {
    console.error("Error parsing aging report:", err);
    return {
      current: 0,
      overdue30: 0,
      overdue60: 0,
      overdue90: 0,
      total: 0,
    };
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
