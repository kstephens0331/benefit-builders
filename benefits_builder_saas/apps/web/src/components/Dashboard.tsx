"use client";

import { useEffect, useState } from "react";

interface DashboardProps {}

interface DashboardData {
  analytics: {
    total_companies: number;
    active_companies: number;
    total_employees: number;
    active_employees: number;
    total_revenue_ytd: number;
    total_savings_ytd: number;
    avg_savings_per_employee: number;
    revenue_growth_mom: number;
    employee_growth_mom: number;
    churn_rate: number;
  };
  recent_invoices: Array<{
    id: string;
    company_name: string;
    amount: number;
    status: string;
    due_date: string;
  }>;
  overdue_invoices: Array<{
    id: string;
    company_name: string;
    amount: number;
    days_overdue: number;
  }>;
  recent_activities: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }>;
}

export default function Dashboard({}: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      if (res.ok && json.ok) {
        setData(json.data);
      } else {
        setError(json.error || "Failed to load dashboard");
      }
    } catch (err) {
      setError("Failed to load dashboard");
      console.error("Failed to load dashboard:", err);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center text-red-600">{error || "Failed to load"}</div>
          <button
            onClick={fetchDashboardData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { analytics, recent_invoices, overdue_invoices, recent_activities } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Executive Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time business metrics and performance analytics</p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Companies */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="text-sm font-medium text-gray-600">Total Companies</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{analytics.total_companies} companies</div>
            <div className="text-sm text-green-600 mt-1 flex items-center">
              <span className="mr-1">↑</span>
              {analytics.revenue_growth_mom}%
            </div>
          </div>

          {/* Total Employees */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <div className="text-sm font-medium text-gray-600">Total Employees</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{analytics.total_employees} employees</div>
            <div className="text-sm text-green-600 mt-1 flex items-center">
              <span className="mr-1">↑</span>
              {analytics.employee_growth_mom}%
            </div>
          </div>

          {/* YTD Revenue */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="text-sm font-medium text-gray-600">YTD Revenue</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">${analytics.total_revenue_ytd.toLocaleString()}</div>
          </div>

          {/* Total Savings */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-500">
            <div className="text-sm font-medium text-gray-600">Total Savings YTD</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">${analytics.total_savings_ytd.toLocaleString()}</div>
            <div className="text-sm text-gray-600 mt-1">
              Avg ${analytics.avg_savings_per_employee.toFixed(2)}/employee
            </div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Churn Rate</div>
            <div className="text-2xl font-bold text-gray-900 mt-2">{analytics.churn_rate}%</div>
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Recent Invoices</h2>
            <a href="/invoices" className="text-sm text-blue-600 hover:underline">
              View All Invoices
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recent_invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invoice.company_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${invoice.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          invoice.status === "paid"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {invoice.due_date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Overdue Invoices */}
        {overdue_invoices.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold text-red-900 mb-4">Overdue Invoices</h2>
            <div className="space-y-2">
              {overdue_invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex justify-between items-center bg-white rounded p-4"
                >
                  <div>
                    <div className="font-medium text-gray-900">{invoice.company_name}</div>
                    <div className="text-sm text-red-600">{invoice.days_overdue} days overdue</div>
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    ${invoice.amount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity Feed */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {recent_activities.map((activity) => {
              const time = new Date(activity.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <div key={activity.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded">
                  <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-500"></div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-900">{activity.description}</div>
                    <div className="text-xs text-gray-500 mt-1">{time}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="bg-white text-blue-600 px-4 py-3 rounded-lg font-medium hover:bg-blue-50">
              Create Invoice
            </button>
            <button className="bg-white text-blue-600 px-4 py-3 rounded-lg font-medium hover:bg-blue-50">
              Add Company
            </button>
            <button className="bg-white text-blue-600 px-4 py-3 rounded-lg font-medium hover:bg-blue-50">
              Sync QuickBooks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
