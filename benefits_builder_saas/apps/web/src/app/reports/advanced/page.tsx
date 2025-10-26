"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/Toast";

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  report_type: string;
  columns: any[];
  is_public: boolean;
}

interface ScheduledReport {
  id: string;
  name: string;
  schedule: string;
  active: boolean;
  next_run_at: string;
  template: {
    name: string;
    report_type: string;
  };
}

interface ReportHistoryItem {
  id: string;
  title: string;
  report_type: string;
  row_count: number;
  execution_time_ms: number;
  created_at: string;
  generated_by_user: {
    full_name: string;
  };
}

export default function AdvancedReportsPage() {
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState<"templates" | "scheduled" | "history">("templates");
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledReport[]>([]);
  const [history, setHistory] = useState<ReportHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === "templates") {
        const response = await fetch("/api/reports/templates");
        const data = await response.json();
        if (data.ok) {
          setTemplates(data.templates || []);
        }
      } else if (activeTab === "scheduled") {
        const response = await fetch("/api/reports/scheduled");
        const data = await response.json();
        if (data.ok) {
          setScheduled(data.scheduled || []);
        }
      } else if (activeTab === "history") {
        const response = await fetch("/api/reports/history?limit=50");
        const data = await response.json();
        if (data.ok) {
          setHistory(data.history || []);
        }
      }
    } catch (err) {
      error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReport = async (templateId: string, templateName: string) => {
    setIsGenerating(templateId);
    try {
      const response = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: templateId,
          filters: {},
          format: "json"
        })
      });

      const data = await response.json();

      if (data.ok) {
        success(`Report "${templateName}" generated successfully with ${data.report.row_count} rows`);
        if (activeTab === "history") {
          loadData(); // Refresh history
        }
      } else {
        error(data.error || "Failed to generate report");
      }
    } catch (err) {
      error("Failed to generate report");
    } finally {
      setIsGenerating(null);
    }
  };

  const reportTypeColors: Record<string, string> = {
    billing_summary: "bg-blue-100 text-blue-700",
    employee_enrollment: "bg-green-100 text-green-700",
    company_performance: "bg-purple-100 text-purple-700",
    tax_savings: "bg-yellow-100 text-yellow-700",
    profit_analysis: "bg-pink-100 text-pink-700"
  };

  const scheduleLabels: Record<string, string> = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    quarterly: "Quarterly"
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Advanced Reports</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("templates")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
              activeTab === "templates"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            Report Templates
          </button>
          <button
            onClick={() => setActiveTab("scheduled")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
              activeTab === "scheduled"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            Scheduled Reports
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
              activeTab === "history"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            Report History
          </button>
        </nav>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Report Templates Tab */}
      {!isLoading && activeTab === "templates" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div key={template.id} className="bg-white rounded-lg shadow p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{template.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{template.description}</p>
                </div>
              </div>

              <div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${reportTypeColors[template.report_type] || "bg-gray-100 text-gray-700"}`}>
                  {template.report_type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                </span>
              </div>

              <div className="pt-4 border-t">
                <button
                  onClick={() => handleGenerateReport(template.id, template.name)}
                  disabled={isGenerating === template.id}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating === template.id ? "Generating..." : "Generate Report"}
                </button>
              </div>

              <div className="text-xs text-slate-500">
                {template.columns.length} columns • {template.is_public ? "Public" : "Private"}
              </div>
            </div>
          ))}

          {templates.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500">
              No report templates found
            </div>
          )}
        </div>
      )}

      {/* Scheduled Reports Tab */}
      {!isLoading && activeTab === "scheduled" && (
        <div className="space-y-4">
          {scheduled.map((report) => (
            <div key={report.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{report.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Template: {report.template?.name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {report.active ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      Inactive
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Schedule:</span>{" "}
                  <span className="font-medium">{scheduleLabels[report.schedule]}</span>
                </div>
                <div>
                  <span className="text-slate-500">Next Run:</span>{" "}
                  <span className="font-medium">
                    {new Date(report.next_run_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {scheduled.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              No scheduled reports configured
            </div>
          )}
        </div>
      )}

      {/* Report History Tab */}
      {!isLoading && activeTab === "history" && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Report
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Generated By
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Rows
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Time (ms)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Generated At
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {history.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {item.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${reportTypeColors[item.report_type] || "bg-gray-100 text-gray-700"}`}>
                      {item.report_type.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {item.generated_by_user?.full_name || "System"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right">
                    {item.row_count.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right">
                    {item.execution_time_ms}ms
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {new Date(item.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}

              {history.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No reports generated yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
