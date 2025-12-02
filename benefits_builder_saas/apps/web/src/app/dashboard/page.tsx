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

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Companies */}
          <a href="/companies">
            <Card
              variant="elevated"
              interactive
              className="group border-l-4 border-primary-500 dark:border-primary-400 animate-slide-in-up"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      Total Companies
                    </div>
                    <div className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mt-2">
                      {summary.total_companies}
                    </div>
                  </div>
                  <Badge variant="primary" size="sm">
                    All
                  </Badge>
                </div>
                <div className="text-sm text-primary-600 dark:text-primary-400 mt-4 font-medium group-hover:translate-x-1 transition-transform">
                  View all companies →
                </div>
              </CardContent>
            </Card>
          </a>

          {/* Active Companies */}
          <a href="/companies?status=active">
            <Card
              variant="elevated"
              interactive
              className="group border-l-4 border-success-500 dark:border-success-400 animate-slide-in-up"
              style={{ animationDelay: "0.1s" }}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      Active Companies
                    </div>
                    <div className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mt-2">
                      {summary.active_companies}
                    </div>
                  </div>
                  <Badge variant="success" size="sm" dot>
                    Active
                  </Badge>
                </div>
                <div className="text-sm text-success-600 dark:text-success-400 mt-4 font-medium group-hover:translate-x-1 transition-transform">
                  View active →
                </div>
              </CardContent>
            </Card>
          </a>

          {/* Total Employees */}
          <a href="/admin/employees">
            <Card
              variant="elevated"
              interactive
              className="group border-l-4 border-accent-500 dark:border-accent-400 animate-slide-in-up"
              style={{ animationDelay: "0.2s" }}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      Total Employees
                    </div>
                    <div className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mt-2">
                      {summary.total_employees}
                    </div>
                  </div>
                  <Badge variant="secondary" size="sm">
                    All
                  </Badge>
                </div>
                <div className="text-sm text-accent-600 dark:text-accent-400 mt-4 font-medium group-hover:translate-x-1 transition-transform">
                  View all employees →
                </div>
              </CardContent>
            </Card>
          </a>

          {/* Active Employees */}
          <a href="/admin/employees?active=true">
            <Card
              variant="elevated"
              interactive
              className="group border-l-4 border-blue-500 dark:border-blue-400 animate-slide-in-up"
              style={{ animationDelay: "0.3s" }}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      Active Employees
                    </div>
                    <div className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mt-2">
                      {summary.active_employees}
                    </div>
                  </div>
                  <Badge variant="info" size="sm" dot>
                    Active
                  </Badge>
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400 mt-4 font-medium group-hover:translate-x-1 transition-transform">
                  View active →
                </div>
              </CardContent>
            </Card>
          </a>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card variant="elevated" className="animate-scale-in">
            <CardContent className="p-6">
              <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                Avg Employees/Company
              </div>
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-2">
                {summary.avg_employees_per_company}
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated" className="animate-scale-in" style={{ animationDelay: "0.1s" }}>
            <CardContent className="p-6">
              <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                Avg Revenue/Company
              </div>
              <div className="text-2xl font-bold text-success-600 dark:text-success-400 mt-2">
                ${summary.avg_revenue_per_company}
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated" className="animate-scale-in" style={{ animationDelay: "0.2s" }}>
            <CardContent className="p-6">
              <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                Avg Revenue/Employee
              </div>
              <div className="text-2xl font-bold text-success-600 dark:text-success-400 mt-2">
                ${summary.avg_revenue_per_employee}
              </div>
            </CardContent>
          </Card>
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-in-up">
                <div className="space-y-4">
                  <Input
                    label="Target Companies"
                    type="number"
                    value={projectionInputs.target_companies}
                    onChange={(e) => setProjectionInputs({ ...projectionInputs, target_companies: parseInt(e.target.value) })}
                  />

                  <Input
                    label="Avg Employees per Company"
                    type="number"
                    value={projectionInputs.avg_employees_per_company}
                    onChange={(e) => setProjectionInputs({ ...projectionInputs, avg_employees_per_company: parseInt(e.target.value) })}
                  />

                  <Input
                    label="Avg Pretax per Employee (Monthly)"
                    type="number"
                    value={projectionInputs.avg_pretax_per_employee}
                    onChange={(e) => setProjectionInputs({ ...projectionInputs, avg_pretax_per_employee: parseInt(e.target.value) })}
                  />

                  <Input
                    label="Months to Achieve"
                    type="number"
                    value={projectionInputs.months_to_achieve}
                    onChange={(e) => setProjectionInputs({ ...projectionInputs, months_to_achieve: parseInt(e.target.value) })}
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
                  <div className="p-6 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-lg border border-primary-200 dark:border-primary-700 animate-scale-in">
                    <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4">
                      Projection Results
                    </div>
                    <div className="space-y-3">
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm text-neutral-600 dark:text-neutral-400">Monthly Revenue</div>
                          <div className="text-2xl font-bold text-success-600 dark:text-success-400">
                            ${projection.projections.projected_monthly_revenue.toLocaleString()}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm text-neutral-600 dark:text-neutral-400">Annual Revenue</div>
                          <div className="text-2xl font-bold text-success-600 dark:text-success-400">
                            ${projection.projections.projected_annual_revenue.toLocaleString()}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm text-neutral-600 dark:text-neutral-400">Companies Needed</div>
                          <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                            {projection.gap_analysis.companies_needed}
                          </div>
                          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                            Acquire {projection.gap_analysis.companies_per_month.toFixed(1)} per month
                          </div>
                        </CardContent>
                      </Card>
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
        <Card className="bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-700 dark:to-primary-800 text-white border-none animate-bounce-in">
          <CardContent className="p-6">
            <h2 className="text-3xl font-bold mb-6">Key Insights & Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 hover:bg-white/20 transition-all">
                <div className="text-white/80 text-sm mb-2 font-medium">Enrollment Opportunity</div>
                <div className="text-4xl font-bold mb-1">
                  {summary.total_employees - summary.enrolled_employees}
                </div>
                <div className="text-white/80 text-sm">employees not enrolled</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 hover:bg-white/20 transition-all">
                <div className="text-white/80 text-sm mb-2 font-medium">Potential Additional Revenue</div>
                <div className="text-4xl font-bold mb-1">
                  ${((summary.total_employees - summary.enrolled_employees) * summary.avg_revenue_per_employee).toFixed(0)}
                </div>
                <div className="text-white/80 text-sm">if 100% enrolled</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 hover:bg-white/20 transition-all">
                <div className="text-white/80 text-sm mb-2 font-medium">Target Action</div>
                <div className="text-4xl font-bold mb-1">
                  {summary.enrollment_rate < 80 ? "Increase" : "Maintain"}
                </div>
                <div className="text-white/80 text-sm">enrollment rate to 80%+</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
