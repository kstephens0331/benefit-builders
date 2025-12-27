"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Input,
  SkeletonCard,
} from "@/components/ui";
import { cn } from "@/lib/utils";

interface DashboardData {
  summary: {
    total_companies: number;
    active_companies: number;
    total_employees: number;
    active_employees: number;
    enrolled_employees: number;
    non_enrolled_employees: number;
    enrollment_rate: number;
    monthly_revenue: number;
    annual_revenue_projected: number;
    total_employer_savings: number;
    profit_margin_percent: number;
    potential_monthly_revenue: number;
    potential_annual_revenue: number;
    potential_er_savings: number;
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
  new_companies: number;
  avg_employees_per_company: number;
  avg_pretax_per_employee: number;
  avg_model_rate: number;
  months_remaining: number;
}

interface ProjectionResult {
  current: {
    companies: number;
    employees: number;
    monthly_revenue: number;
  };
  new_business: {
    companies: number;
    employees: number;
    monthly_revenue: number;
  };
  combined: {
    total_companies: number;
    total_employees: number;
    monthly_revenue: number;
    partial_year_revenue: number;
    annual_revenue: number;
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectionInputs, setProjectionInputs] = useState<ProjectionInputs>({
    new_companies: 10,
    avg_employees_per_company: 15,
    avg_pretax_per_employee: 300,
    avg_model_rate: 0.06,
    months_remaining: 12
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
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header Skeleton */}
          <div className="mb-8 space-y-2">
            <div className="h-8 w-64 bg-neutral-200 dark:bg-neutral-700 rounded-lg animate-pulse" />
            <div className="h-4 w-96 bg-neutral-200 dark:bg-neutral-700 rounded-lg animate-pulse" />
          </div>

          {/* Key Metrics Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} showImage={false} lines={1} />
            ))}
          </div>

          {/* Charts Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonCard showImage={false} lines={6} />
            <SkeletonCard showImage={false} lines={6} />
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Card variant="elevated" className="text-center p-8 animate-scale-in">
            <div className="text-error-600 dark:text-error-400 text-lg font-semibold">
              Failed to load dashboard data
            </div>
            <p className="text-neutral-600 dark:text-neutral-400 mt-2">
              Please try refreshing the page
            </p>
            <Button
              variant="primary"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const { summary, trends, company_distribution, top_companies } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-950 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 animate-slide-in-down">
          <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
            Executive Dashboard
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-2 text-lg">
            Real-time business metrics and performance analytics
          </p>
        </div>

        {/* Key Metrics Grid - Colorful Gradient Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Companies - Blue */}
          <a href="/companies" className="block">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl shadow-lg p-6 hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer">
              <div className="text-sm opacity-90 mb-2">Companies</div>
              <div className="text-4xl font-bold">{summary.active_companies}</div>
              <div className="text-xs opacity-75 mt-2">{summary.total_companies} total</div>
              <div className="text-sm mt-4 opacity-90 hover:opacity-100">View all →</div>
            </div>
          </a>

          {/* Employees - Purple */}
          <a href="/admin/employees" className="block">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl shadow-lg p-6 hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer">
              <div className="text-sm opacity-90 mb-2">Employees</div>
              <div className="text-4xl font-bold">{summary.active_employees}</div>
              <div className="text-xs opacity-75 mt-2">{summary.enrolled_employees} enrolled</div>
              <div className="text-sm mt-4 opacity-90 hover:opacity-100">View all →</div>
            </div>
          </a>

          {/* ER Savings - Green (consistent with reports) */}
          <a href="/reports" className="block">
            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl shadow-lg p-6 hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer">
              <div className="text-sm opacity-90 mb-2">ER Savings/Mo</div>
              <div className="text-4xl font-bold">${summary.total_employer_savings.toFixed(0)}</div>
              <div className="text-xs opacity-75 mt-2">employer net savings</div>
              <div className="text-sm mt-4 opacity-90 hover:opacity-100">View reports →</div>
            </div>
          </a>

          {/* BB Revenue - Emerald */}
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl shadow-lg p-6">
            <div className="text-sm opacity-90 mb-2">BB Revenue/Mo</div>
            <div className="text-4xl font-bold">${summary.monthly_revenue.toFixed(0)}</div>
            <div className="text-xs opacity-75 mt-2">${summary.annual_revenue_projected.toFixed(0)}/year projected</div>
          </div>
        </div>

        {/* Secondary Metrics - Colorful Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-2xl shadow-lg p-6">
            <div className="text-sm opacity-90 mb-2">Avg Employees/Company</div>
            <div className="text-3xl font-bold">{summary.avg_employees_per_company}</div>
          </div>

          <div className="bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-2xl shadow-lg p-6">
            <div className="text-sm opacity-90 mb-2">Avg Revenue/Company</div>
            <div className="text-3xl font-bold">${summary.avg_revenue_per_company}</div>
          </div>

          <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white rounded-2xl shadow-lg p-6">
            <div className="text-sm opacity-90 mb-2">Avg Revenue/Employee</div>
            <div className="text-3xl font-bold">${summary.avg_revenue_per_employee}</div>
          </div>
        </div>

        {/* Revenue Trend Chart */}
        <Card variant="elevated" className="mb-8 animate-scale-in">
          <CardHeader>
            <CardTitle>Revenue Trend (Last 6 Months)</CardTitle>
            <CardDescription>Track monthly revenue and employer savings performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                <thead className="bg-neutral-50 dark:bg-neutral-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Month
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Employer Savings
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Margin %
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
                  {trends.map((trend, idx) => {
                    const margin = trend.employer_savings > 0
                      ? ((trend.revenue / trend.employer_savings) * 100).toFixed(1)
                      : "0.0";
                    return (
                      <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {trend.month_label}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-success-600 dark:text-success-400">
                          ${trend.revenue.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-neutral-600 dark:text-neutral-400">
                          ${trend.employer_savings.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-neutral-600 dark:text-neutral-400">
                          {margin}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Projection Calculator - Full Width */}
        <Card variant="elevated" className="mb-8 animate-scale-in">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Revenue Projections</CardTitle>
                <CardDescription>Calculate future revenue based on growth targets</CardDescription>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowProjectionCalculator(!showProjectionCalculator)}
              >
                {showProjectionCalculator ? "Hide Calculator" : "Open Calculator"}
              </Button>
            </div>
          </CardHeader>

          {showProjectionCalculator && (
            <CardContent>
              {/* Current Business Summary */}
              <div className="mb-6 p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                <div className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">Current Business</div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">Companies</div>
                    <div className="text-xl font-bold text-blue-600">{summary.active_companies}</div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">Employees</div>
                    <div className="text-xl font-bold text-purple-600">{summary.enrolled_employees}</div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">Monthly Revenue</div>
                    <div className="text-xl font-bold text-emerald-600">${summary.monthly_revenue.toFixed(0)}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-in-up">
                <div className="space-y-4">
                  <Input
                    label="New Companies to Add"
                    type="number"
                    value={projectionInputs.new_companies}
                    onChange={(e) => setProjectionInputs({ ...projectionInputs, new_companies: parseInt(e.target.value) || 0 })}
                  />

                  <Input
                    label="Avg Employees per New Company"
                    type="number"
                    value={projectionInputs.avg_employees_per_company}
                    onChange={(e) => setProjectionInputs({ ...projectionInputs, avg_employees_per_company: parseInt(e.target.value) || 0 })}
                  />

                  <Input
                    label="Avg Pretax per Employee (Monthly)"
                    type="number"
                    value={projectionInputs.avg_pretax_per_employee}
                    onChange={(e) => setProjectionInputs({ ...projectionInputs, avg_pretax_per_employee: parseInt(e.target.value) || 0 })}
                  />

                  <Input
                    label="Months Remaining in Year"
                    type="number"
                    min={1}
                    max={12}
                    value={projectionInputs.months_remaining}
                    onChange={(e) => setProjectionInputs({ ...projectionInputs, months_remaining: Math.min(12, Math.max(1, parseInt(e.target.value) || 12)) })}
                  />

                  <Button
                    variant="primary"
                    fullWidth
                    size="lg"
                    onClick={calculateProjection}
                  >
                    Calculate Projection
                  </Button>
                </div>

                {projection && (
                  <div className="space-y-4 animate-scale-in">
                    {/* New Business Impact */}
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-700">
                      <div className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-3">New Business Impact</div>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <div className="text-xs text-blue-600 dark:text-blue-400">Companies</div>
                          <div className="text-lg font-bold text-blue-700 dark:text-blue-300">+{projection.new_business.companies}</div>
                        </div>
                        <div>
                          <div className="text-xs text-blue-600 dark:text-blue-400">Employees</div>
                          <div className="text-lg font-bold text-blue-700 dark:text-blue-300">+{projection.new_business.employees}</div>
                        </div>
                        <div>
                          <div className="text-xs text-blue-600 dark:text-blue-400">Monthly Rev</div>
                          <div className="text-lg font-bold text-blue-700 dark:text-blue-300">+${projection.new_business.monthly_revenue.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>

                    {/* Combined Projections */}
                    <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-lg border border-emerald-200 dark:border-emerald-700">
                      <div className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 mb-3">Combined Projections</div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-emerald-700 dark:text-emerald-300">Total Companies</span>
                          <span className="text-lg font-bold text-emerald-800 dark:text-emerald-200">{projection.combined.total_companies}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-emerald-700 dark:text-emerald-300">Total Employees</span>
                          <span className="text-lg font-bold text-emerald-800 dark:text-emerald-200">{projection.combined.total_employees}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-emerald-200 dark:border-emerald-700 pt-2">
                          <span className="text-sm text-emerald-700 dark:text-emerald-300">Monthly Revenue</span>
                          <span className="text-xl font-bold text-emerald-800 dark:text-emerald-200">${projection.combined.monthly_revenue.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-emerald-700 dark:text-emerald-300">Partial Year ({projectionInputs.months_remaining} mo)</span>
                          <span className="text-xl font-bold text-emerald-800 dark:text-emerald-200">${projection.combined.partial_year_revenue.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-emerald-700 dark:text-emerald-300">Annual Revenue</span>
                          <span className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">${projection.combined.annual_revenue.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Company Distribution & Top Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Company Distribution by Size */}
          <Card variant="elevated" className="animate-slide-in-left">
            <CardHeader>
              <CardTitle>Company Distribution by Size</CardTitle>
              <CardDescription>Breakdown of companies by employee count</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {company_distribution.map((size, idx) => {
                  const total = company_distribution.reduce((sum, s) => sum + s.count, 0);
                  const percentage = total > 0 ? (size.count / total * 100).toFixed(0) : "0";
                  return (
                    <div key={idx} className="group">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-neutral-700 dark:text-neutral-300 font-medium">{size.label}</span>
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {size.count} ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-success-500 to-success-600 h-3 rounded-full transition-all duration-500 ease-out group-hover:from-success-400 group-hover:to-success-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Top Performing Companies */}
          <Card variant="elevated" className="animate-slide-in-right">
            <CardHeader>
              <CardTitle>Top 10 Companies by Revenue</CardTitle>
              <CardDescription>Highest revenue generating clients</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-y-auto max-h-80">
                <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                  <thead className="bg-neutral-50 dark:bg-neutral-800 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">
                        Company
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">
                        Emps
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
                    {top_companies.map((company, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors">
                        <td className="px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 font-medium">
                          {company.company_name}
                        </td>
                        <td className="px-3 py-2 text-sm text-right text-neutral-600 dark:text-neutral-400">
                          {company.employees}
                        </td>
                        <td className="px-3 py-2 text-sm text-right font-semibold text-success-600 dark:text-success-400">
                          ${company.bb_profit.toFixed(0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Items */}
        <Card className="bg-gradient-to-r from-neutral-100 to-neutral-200 border border-neutral-300 animate-bounce-in">
          <CardContent className="p-6">
            <h2 className="text-3xl font-bold mb-6 text-neutral-900">Key Insights & Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg p-4 shadow-sm border border-neutral-200 hover:shadow-md transition-all">
                <div className="text-neutral-600 text-sm mb-2 font-medium">Enrollment Opportunity</div>
                <div className="text-4xl font-bold mb-1 text-neutral-900">
                  {summary.non_enrolled_employees}
                </div>
                <div className="text-neutral-600 text-sm">employees not enrolled</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border border-neutral-200 hover:shadow-md transition-all">
                <div className="text-neutral-600 text-sm mb-2 font-medium">Potential Additional Revenue</div>
                <div className="text-4xl font-bold mb-1 text-neutral-900">
                  ${summary.potential_monthly_revenue.toFixed(0)}/mo
                </div>
                <div className="text-neutral-600 text-sm">${summary.potential_annual_revenue.toFixed(0)}/year if 100% enrolled</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border border-neutral-200 hover:shadow-md transition-all">
                <div className="text-neutral-600 text-sm mb-2 font-medium">Potential ER Savings</div>
                <div className="text-4xl font-bold mb-1 text-neutral-900">
                  ${summary.potential_er_savings.toFixed(0)}/mo
                </div>
                <div className="text-neutral-600 text-sm">additional employer savings</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
