"use client";

import { useEffect, useState } from "react";

interface DashboardData {
  summary: {
    total_companies: number;
    active_companies: number;
    total_employees: number;
    enrolled_employees: number;
    enrollment_rate: number;
    monthly_revenue: number;
    annual_revenue_projected: number;
    total_employer_savings: number;
    profit_margin_percent: number;
    avg_employees_per_company: number;
    avg_revenue_per_company: number;
    avg_revenue_per_employee: number;
  };
  trends: Array<{
    period: string;
    month_label: string;
    revenue: number;
    employer_savings: number;
  }>;
  company_distribution: Array<{
    label: string;
    count: number;
  }>;
  top_companies: Array<{
    company_name: string;
    employees: number;
    enrolled: number;
    bb_profit: number;
    employer_savings: number;
  }>;
}

interface ProjectionInputs {
  target_companies: number;
  avg_employees_per_company: number;
  avg_pretax_per_employee: number;
  avg_model_rate: number;
  months_to_achieve: number;
}

interface ProjectionResult {
  projections: {
    projected_monthly_revenue: number;
    projected_annual_revenue: number;
  };
  gap_analysis: {
    companies_needed: number;
    companies_per_month: number;
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectionInputs, setProjectionInputs] = useState<ProjectionInputs>({
    target_companies: 50,
    avg_employees_per_company: 15,
    avg_pretax_per_employee: 300,
    avg_model_rate: 0.06,
    months_to_achieve: 12
  });
  const [projection, setProjection] = useState<ProjectionResult | null>(null);
  const [showProjectionCalculator, setShowProjectionCalculator] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/analytics?months=6");
      const json = await res.json();
      if (json.ok) {
        setData(json);
      }
    } catch (error) {
      console.error("Failed to load dashboard:", error);
    }
    setLoading(false);
  }

  async function calculateProjection() {
    try {
      const res = await fetch("/api/dashboard/projections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectionInputs)
      });
      const json = await res.json();
      if (json.ok) {
        setProjection(json);
      }
    } catch (error) {
      console.error("Failed to calculate projection:", error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center text-red-600">Failed to load dashboard data</div>
        </div>
      </div>
    );
  }

  const { summary, trends, company_distribution, top_companies } = data;

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
          {/* Monthly Revenue */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="text-sm font-medium text-gray-600">Monthly Revenue</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">
              ${summary.monthly_revenue.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              ${summary.annual_revenue_projected.toLocaleString()} annual
            </div>
          </div>

          {/* Total Companies */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="text-sm font-medium text-gray-600">Active Companies</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">
              {summary.active_companies}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {summary.total_companies} total
            </div>
          </div>

          {/* Total Employees */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <div className="text-sm font-medium text-gray-600">Total Employees</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">
              {summary.total_employees}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {summary.enrollment_rate}% enrolled
            </div>
          </div>

          {/* Profit Margin */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
            <div className="text-sm font-medium text-gray-600">Profit Margin</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">
              {summary.profit_margin_percent}%
            </div>
            <div className="text-sm text-gray-500 mt-1">
              vs employer savings
            </div>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Avg Employees/Company</div>
            <div className="text-2xl font-bold text-gray-900 mt-2">
              {summary.avg_employees_per_company}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Avg Revenue/Company</div>
            <div className="text-2xl font-bold text-gray-900 mt-2">
              ${summary.avg_revenue_per_company}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Avg Revenue/Employee</div>
            <div className="text-2xl font-bold text-gray-900 mt-2">
              ${summary.avg_revenue_per_employee}
            </div>
          </div>
        </div>

        {/* Revenue Trend Chart */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Revenue Trend (Last 6 Months)</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Employer Savings</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Margin %</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trends.map((trend, idx) => {
                  const margin = trend.employer_savings > 0
                    ? ((trend.revenue / trend.employer_savings) * 100).toFixed(1)
                    : "0.0";
                  return (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {trend.month_label}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        ${trend.revenue.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                        ${trend.employer_savings.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                        {margin}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Revenue Projection Calculator - Full Width */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Revenue Projections</h2>
              <button
                onClick={() => setShowProjectionCalculator(!showProjectionCalculator)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {showProjectionCalculator ? "Hide" : "Calculate"}
              </button>
            </div>

            {showProjectionCalculator && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Target Companies</label>
                  <input
                    type="number"
                    value={projectionInputs.target_companies}
                    onChange={(e) => setProjectionInputs({ ...projectionInputs, target_companies: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Avg Employees per Company</label>
                  <input
                    type="number"
                    value={projectionInputs.avg_employees_per_company}
                    onChange={(e) => setProjectionInputs({ ...projectionInputs, avg_employees_per_company: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Avg Pretax per Employee (Monthly)</label>
                  <input
                    type="number"
                    value={projectionInputs.avg_pretax_per_employee}
                    onChange={(e) => setProjectionInputs({ ...projectionInputs, avg_pretax_per_employee: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Months to Achieve</label>
                  <input
                    type="number"
                    value={projectionInputs.months_to_achieve}
                    onChange={(e) => setProjectionInputs({ ...projectionInputs, months_to_achieve: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                  />
                </div>

                <button
                  onClick={calculateProjection}
                  className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 font-medium"
                >
                  Calculate Projection
                </button>

                </div>

                {projection && (
                  <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                    <div className="text-lg font-bold text-gray-900 mb-4">Projection Results</div>
                    <div className="space-y-3">
                      <div className="bg-white p-4 rounded-lg">
                        <div className="text-sm text-gray-600">Monthly Revenue</div>
                        <div className="text-2xl font-bold text-green-600">
                          ${projection.projections.projected_monthly_revenue.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-lg">
                        <div className="text-sm text-gray-600">Annual Revenue</div>
                        <div className="text-2xl font-bold text-green-600">
                          ${projection.projections.projected_annual_revenue.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-lg">
                        <div className="text-sm text-gray-600">Companies Needed</div>
                        <div className="text-2xl font-bold text-blue-600">
                          {projection.gap_analysis.companies_needed}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Acquire {projection.gap_analysis.companies_per_month.toFixed(1)} per month
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
        </div>

        {/* Company Distribution & Top Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Company Distribution by Size */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Company Distribution by Size</h2>
            <div className="space-y-3">
              {company_distribution.map((size, idx) => {
                const total = company_distribution.reduce((sum, s) => sum + s.count, 0);
                const percentage = total > 0 ? (size.count / total * 100).toFixed(0) : "0";
                return (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{size.label}</span>
                      <span className="font-medium text-gray-900">{size.count} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Performing Companies */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Top 10 Companies by Revenue</h2>
            <div className="overflow-y-auto max-h-80">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Company</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Emps</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Revenue</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {top_companies.map((company, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 text-sm text-gray-900">{company.company_name}</td>
                      <td className="px-3 py-2 text-sm text-right text-gray-600">{company.employees}</td>
                      <td className="px-3 py-2 text-sm text-right font-medium text-gray-900">
                        ${company.bb_profit.toFixed(0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Action Items */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <h2 className="text-2xl font-bold mb-4">Key Insights & Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-blue-100 text-sm mb-1">Enrollment Opportunity</div>
              <div className="text-2xl font-bold">
                {summary.total_employees - summary.enrolled_employees}
              </div>
              <div className="text-blue-100 text-sm">employees not enrolled</div>
            </div>
            <div>
              <div className="text-blue-100 text-sm mb-1">Potential Additional Revenue</div>
              <div className="text-2xl font-bold">
                ${((summary.total_employees - summary.enrolled_employees) * summary.avg_revenue_per_employee).toFixed(0)}
              </div>
              <div className="text-blue-100 text-sm">if 100% enrolled</div>
            </div>
            <div>
              <div className="text-blue-100 text-sm mb-1">Target</div>
              <div className="text-2xl font-bold">{summary.enrollment_rate < 80 ? "Increase" : "Maintain"}</div>
              <div className="text-blue-100 text-sm">enrollment rate to 80%+</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
