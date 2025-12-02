// apps/web/src/app/reports/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  filing_status: string;
  dependents: number;
  gross_pay: number;
  pay_period: string;
  active: boolean;
  // Calculated fields
  section_125_per_pay: number;
  section_125_monthly: number;
  allowable_benefit: number;
  allowable_benefit_monthly: number;
  er_savings_monthly: number;
  er_savings_annual: number;
};

type Company = {
  id: string;
  name: string;
  state: string;
  model: string;
  tier: string;
  pay_frequency: string;
  employer_rate: number;
  employee_rate: number;
  employees: Employee[];
  // Aggregates
  total_employees: number;
  total_section_125_monthly: number;
  total_er_savings_monthly: number;
  total_er_savings_annual: number;
};

function formatMoney(n: number | null | undefined) {
  const v = typeof n === "number" ? n : 0;
  return `$${v.toFixed(2)}`;
}

function formatPayPeriod(p: string | null | undefined) {
  const map: Record<string, string> = {
    w: "Weekly",
    b: "Biweekly",
    s: "Semimonthly",
    m: "Monthly",
    weekly: "Weekly",
    biweekly: "Biweekly",
    semimonthly: "Semimonthly",
    monthly: "Monthly",
  };
  return map[(p ?? "").toLowerCase()] || p || "-";
}

export default function ReportsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/data");
      const json = await res.json();
      if (json.ok) {
        setCompanies(json.companies || []);
      }
    } catch (error) {
      console.error("Failed to load reports:", error);
    }
    setLoading(false);
  }

  function toggleCompany(companyId: string) {
    setExpandedCompanies(prev => {
      const next = new Set(prev);
      if (next.has(companyId)) {
        next.delete(companyId);
      } else {
        next.add(companyId);
      }
      return next;
    });
  }

  function expandAll() {
    setExpandedCompanies(new Set(companies.map(c => c.id)));
  }

  function collapseAll() {
    setExpandedCompanies(new Set());
  }

  async function saveEmployee(employee: Employee) {
    setSaving(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: employee.first_name,
          last_name: employee.last_name,
          filing_status: employee.filing_status,
          dependents: employee.dependents,
          gross_pay: employee.gross_pay,
          active: employee.active,
        }),
      });
      if (res.ok) {
        setEditingEmployee(null);
        fetchData(); // Refresh to get recalculated values
      }
    } catch (error) {
      console.error("Failed to save employee:", error);
    }
    setSaving(false);
  }

  // Calculate totals
  const totalEmployees = companies.reduce((sum, c) => sum + c.total_employees, 0);
  const totalSection125Monthly = companies.reduce((sum, c) => sum + c.total_section_125_monthly, 0);
  const totalErSavingsMonthly = companies.reduce((sum, c) => sum + c.total_er_savings_monthly, 0);
  const totalErSavingsAnnual = companies.reduce((sum, c) => sum + c.total_er_savings_annual, 0);

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-48"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Enrolled Employees Report</h1>
          <p className="text-sm text-slate-600 mt-1">
            Section 125 savings for enrolled employees — {period}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={expandAll}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-slate-50"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-slate-50"
          >
            Collapse All
          </button>
          <a
            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition flex items-center gap-2"
            href={`/api/reports/excel?period=${period}`}
            download
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Excel
          </a>
          <a
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition flex items-center gap-2"
            href={`/api/reports/pdf?period=${period}`}
            target="_blank"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            PDF
          </a>
        </div>
      </div>

      {/* Summary Cards - Colorful Gradients */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl shadow-lg p-6">
          <div className="text-sm opacity-90 mb-2">Companies</div>
          <div className="text-4xl font-bold">{companies.length}</div>
          <div className="text-xs opacity-75 mt-2">active companies</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl shadow-lg p-6">
          <div className="text-sm opacity-90 mb-2">Enrolled Employees</div>
          <div className="text-4xl font-bold">{totalEmployees}</div>
          <div className="text-xs opacity-75 mt-2">participating in Section 125</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl shadow-lg p-6">
          <div className="text-sm opacity-90 mb-2">ER Savings/Mo</div>
          <div className="text-4xl font-bold">{formatMoney(totalErSavingsMonthly)}</div>
          <div className="text-xs opacity-75 mt-2">employer net savings</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl shadow-lg p-6">
          <div className="text-sm opacity-90 mb-2">ER Savings/Yr</div>
          <div className="text-4xl font-bold">{formatMoney(totalErSavingsAnnual)}</div>
          <div className="text-xs opacity-75 mt-2">annual projection</div>
        </div>
      </div>

      {/* Companies with Accordion */}
      <div className="space-y-4">
        {companies.map((company) => {
          const isExpanded = expandedCompanies.has(company.id);
          return (
            <div key={company.id} className="bg-white rounded-xl shadow overflow-hidden">
              {/* Company Header - Clickable */}
              <button
                onClick={() => toggleCompany(company.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-4">
                  <svg
                    className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <div className="text-left">
                    <div className="font-semibold text-lg">{company.name}</div>
                    <div className="text-sm text-slate-500">
                      {company.state} • {company.model} • {formatPayPeriod(company.pay_frequency)} • {company.total_employees} employees
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-8 text-right">
                  <div>
                    <div className="text-sm text-slate-500">ER Savings/Mo</div>
                    <div className="font-semibold text-green-600">{formatMoney(company.total_er_savings_monthly)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">ER Savings/Yr</div>
                    <div className="font-semibold text-green-700">{formatMoney(company.total_er_savings_annual)}</div>
                  </div>
                </div>
              </button>

              {/* Employee Table - Expandable */}
              {isExpanded && (
                <div className="border-t">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-700">
                      <tr>
                        <th className="text-left p-3">Employee</th>
                        <th className="text-center p-3">Filing</th>
                        <th className="text-center p-3">Deps</th>
                        <th className="text-center p-3">Pay Freq</th>
                        <th className="text-right p-3">Gross/Pay</th>
                        <th className="text-right p-3">Allowable Benefit/Mo</th>
                        <th className="text-right p-3">ER Savings/Mo</th>
                        <th className="text-right p-3">ER Savings/Yr</th>
                        <th className="text-center p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {company.employees.map((emp) => (
                        <tr key={emp.id} className="border-t hover:bg-slate-50">
                          <td className="p-3">
                            <Link
                              href={`/companies/${company.id}/employees/${emp.id}`}
                              className="text-blue-600 hover:underline"
                            >
                              {emp.last_name}, {emp.first_name}
                            </Link>
                            {!emp.active && (
                              <span className="ml-2 text-xs text-red-500">(inactive)</span>
                            )}
                          </td>
                          <td className="p-3 text-center capitalize">{emp.filing_status}</td>
                          <td className="p-3 text-center">{emp.dependents}</td>
                          <td className="p-3 text-center">{formatPayPeriod(emp.pay_period)}</td>
                          <td className="p-3 text-right">{formatMoney(emp.gross_pay)}</td>
                          <td className="p-3 text-right text-blue-700 font-medium">{formatMoney(emp.allowable_benefit_monthly)}</td>
                          <td className="p-3 text-right text-green-600">{formatMoney(emp.er_savings_monthly)}</td>
                          <td className="p-3 text-right text-green-700">{formatMoney(emp.er_savings_annual)}</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => setEditingEmployee(emp)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                      {company.employees.length === 0 && (
                        <tr>
                          <td colSpan={9} className="p-4 text-center text-slate-500">
                            No active employees
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}

        {companies.length === 0 && (
          <div className="bg-white rounded-xl shadow p-8 text-center text-slate-500">
            No active companies found
          </div>
        )}
      </div>

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">
              Edit Employee: {editingEmployee.first_name} {editingEmployee.last_name}
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">First Name</label>
                  <input
                    type="text"
                    value={editingEmployee.first_name}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, first_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name</label>
                  <input
                    type="text"
                    value={editingEmployee.last_name}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, last_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Filing Status</label>
                  <select
                    value={editingEmployee.filing_status}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, filing_status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Dependents</label>
                  <input
                    type="number"
                    min="0"
                    value={editingEmployee.dependents}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, dependents: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Gross Pay per Period</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingEmployee.gross_pay}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, gross_pay: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={editingEmployee.active}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, active: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="active" className="text-sm">Active</label>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => setEditingEmployee(null)}
                className="px-4 py-2 border rounded-lg hover:bg-slate-50"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={() => saveEmployee(editingEmployee)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
