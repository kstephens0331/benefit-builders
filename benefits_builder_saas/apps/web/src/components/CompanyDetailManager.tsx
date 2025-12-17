"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  filing_status: string;
  dependents: number;
  gross_pay: number;
  consent_status: string;
  active: boolean;
  terminated?: boolean;
  dob?: string;
};

type Company = {
  id: string;
  name: string;
  state: string;
  model: string;
  status: string;
  tier?: string;
  employer_rate?: number;
  employee_rate?: number;
  pay_frequency?: string;
  contact_name?: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  // Custom Section 125 amounts for 3/4 model (monthly)
  sec125_single_0?: number;
  sec125_married_0?: number;
  sec125_single_deps?: number;
  sec125_married_deps?: number;
};

type Props = {
  company: Company;
  initialEmployees: Employee[];
};

// Helper to convert pay frequency to abbreviation
function getPayFrequencyAbbr(frequency?: string): string {
  switch (frequency?.toLowerCase()) {
    case 'weekly':
      return 'W';
    case 'biweekly':
    case 'bi-weekly':
      return 'B';
    case 'semimonthly':
    case 'semi-monthly':
      return 'SM';
    case 'monthly':
      return 'M';
    default:
      return 'B'; // Default to biweekly
  }
}

export default function CompanyDetailManager({ company, initialEmployees }: Props) {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    dob: "",
    filing_status: "single",
    dependents: 0,
    gross_pay: 0,
    active: true,
    consent_status: "pending" as "elect" | "dont" | "pending",
  });

  // Company edit state
  const [showCompanyEditModal, setShowCompanyEditModal] = useState(false);
  const [companyFormData, setCompanyFormData] = useState({
    name: company.name,
    state: company.state,
    model: company.model,
    tier: company.tier || "2025",
    status: company.status,
    pay_frequency: company.pay_frequency || "biweekly",
    contact_name: company.contact_name || "",
    contact_phone: company.contact_phone || "",
    address: company.address || "",
    city: company.city || "",
    // Custom Section 125 amounts for 3/4 model (monthly)
    sec125_single_0: company.sec125_single_0 || 800,
    sec125_married_0: company.sec125_married_0 || 1200,
    sec125_single_deps: company.sec125_single_deps || 1200,
    sec125_married_deps: company.sec125_married_deps || 1700,
  });

  // US States list for dropdown
  const US_STATES = [
    { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
    { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
    { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'DC', name: 'District of Columbia' },
    { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' },
    { code: 'ID', name: 'Idaho' }, { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' },
    { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' },
    { code: 'LA', name: 'Louisiana' }, { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' },
    { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' },
    { code: 'MS', name: 'Mississippi' }, { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' },
    { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' },
    { code: 'NJ', name: 'New Jersey' }, { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' },
    { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' },
    { code: 'OK', name: 'Oklahoma' }, { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' },
    { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' },
    { code: 'TN', name: 'Tennessee' }, { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' },
    { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' },
    { code: 'WV', name: 'West Virginia' }, { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
  ];

  // Generate proposal state
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);

  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const handleToggleActive = async (empId: string, currentActive: boolean) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: empId, active: !currentActive }),
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Failed to update employee status");
      }

      setEmployees(employees.map((e) => (e.id === empId ? data.data : e)));
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleTerminated = async (empId: string, empName: string, currentTerminated: boolean) => {
    const action = currentTerminated ? "reinstate" : "terminate";
    if (!confirm(`Are you sure you want to ${action} ${empName}?`)) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: empId, terminated: !currentTerminated }),
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Failed to update employee termination status");
      }

      setEmployees(employees.map((e) => (e.id === empId ? data.data : e)));
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (emp: Employee) => {
    setSelectedEmployee(emp);
    setFormData({
      first_name: emp.first_name,
      last_name: emp.last_name,
      dob: emp.dob || "",
      filing_status: emp.filing_status,
      dependents: emp.dependents,
      gross_pay: emp.gross_pay,
      active: emp.active,
      consent_status: emp.consent_status as "elect" | "dont" | "pending",
    });
    setShowEditModal(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedEmployee.id,
          ...formData,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Failed to update employee");
      }

      setEmployees(employees.map((e) => (e.id === selectedEmployee.id ? data.data : e)));
      setShowEditModal(false);
      setSelectedEmployee(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (empId: string, name: string) => {
    if (!confirm(`DELETE "${name}" permanently? This cannot be undone.`)) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/employees?id=${empId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Failed to delete employee");
      }

      setEmployees(employees.filter((e) => e.id !== empId));
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompanyEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/companies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: company.id,
          ...companyFormData,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Failed to update company");
      }

      setShowCompanyEditModal(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateProposal = async () => {
    if (!confirm(`Generate proposal for ${company.name} from current employees?`)) {
      return;
    }

    setIsGeneratingProposal(true);
    setError(null);

    try {
      const res = await fetch("/api/proposals/from-employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: company.id,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Failed to generate proposal");
      }

      // Redirect to the proposal PDF
      if (data.proposalId) {
        window.open(`/api/proposals/${data.proposalId}/pdf`, "_blank");
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGeneratingProposal(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold">{company.name}</h1>
            <button
              onClick={() => setShowCompanyEditModal(true)}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium text-center whitespace-nowrap self-start"
            >
              Edit Company
            </button>
          </div>
          <p className="text-slate-600 text-sm">
            {company.state} · Model {company.model} · {company.status} · Tier: {company.tier || "2025"}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Link
            href={`/companies/${company.id}/deductions`}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-semibold text-center whitespace-nowrap"
          >
            View Deductions
          </Link>
          <Link
            href={`/companies/${company.id}/add-employee`}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-center whitespace-nowrap"
          >
            Add Employee
          </Link>
          <a
            href={`/companies/${company.id}/billing/pdf?period=${period}`}
            target="_blank"
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-center whitespace-nowrap"
          >
            Download Invoice PDF
          </a>
          <a
            href={`/companies/${company.id}/roster/pdf`}
            target="_blank"
            className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-center whitespace-nowrap"
          >
            Download Roster PDF
          </a>
          <button
            onClick={handleGenerateProposal}
            disabled={isGeneratingProposal || employees.length === 0}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-center whitespace-nowrap"
          >
            {isGeneratingProposal ? "Generating..." : "Generate Proposal"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="ml-4 underline text-sm">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid gap-2">
        {employees.map((emp) => (
          <div
            key={emp.id}
            className="p-4 bg-white rounded-xl shadow hover:shadow-md transition"
          >
            <div className="flex items-center justify-between gap-4">
              <Link
                href={`/companies/${company.id}/employees/${emp.id}`}
                className="flex-1"
              >
                <div className="font-medium">
                  {emp.last_name}, {emp.first_name}
                </div>
                <div className="text-sm text-slate-600">
                  Status: {emp.consent_status} · Filing: {emp.filing_status} ·
                  Dependents: {emp.dependents} · Gross: $
                  {typeof emp.gross_pay === "number"
                    ? emp.gross_pay.toFixed(2)
                    : "0.00"}{" "}
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {getPayFrequencyAbbr(company.pay_frequency)}
                  </span>
                </div>
              </Link>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  onClick={() => handleToggleActive(emp.id, emp.active)}
                  disabled={isLoading}
                  className={
                    "px-3 py-1 rounded-full text-sm font-medium text-center whitespace-nowrap " +
                    (emp.active
                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                      : "bg-slate-200 text-slate-700 hover:bg-slate-300")
                  }
                >
                  {emp.active ? "active" : "inactive"}
                </button>

                <button
                  onClick={() => handleToggleTerminated(emp.id, `${emp.first_name} ${emp.last_name}`, emp.terminated || false)}
                  disabled={isLoading}
                  className={
                    "px-3 py-1 rounded-full text-sm font-medium text-center whitespace-nowrap " +
                    (emp.terminated
                      ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200")
                  }
                >
                  {emp.terminated ? "terminated" : "not terminated"}
                </button>

                <button
                  onClick={() => openEditModal(emp)}
                  disabled={isLoading}
                  className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg text-sm font-medium text-center whitespace-nowrap"
                >
                  Edit
                </button>

                <button
                  onClick={() =>
                    handleDelete(emp.id, `${emp.first_name} ${emp.last_name}`)
                  }
                  disabled={isLoading}
                  className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-sm font-medium text-center whitespace-nowrap"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {employees.length === 0 && (
          <p className="text-slate-600 text-center py-8">No employees yet.</p>
        )}
      </div>

      {/* Company Edit Modal */}
      {showCompanyEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Edit Company Settings</h2>
              <form onSubmit={handleCompanyEdit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={companyFormData.name}
                      onChange={(e) =>
                        setCompanyFormData({ ...companyFormData, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      State *
                    </label>
                    <select
                      value={companyFormData.state}
                      onChange={(e) =>
                        setCompanyFormData({ ...companyFormData, state: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    >
                      {US_STATES.map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.code} - {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Model (Employee % / Employer %) *
                    </label>
                    <select
                      value={companyFormData.model}
                      onChange={(e) =>
                        setCompanyFormData({ ...companyFormData, model: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="5/3">5/3 (5% Employee / 3% Employer)</option>
                      <option value="5/1">5/1 (5% Employee / 1% Employer)</option>
                      <option value="3/4">3/4 (3% Employee / 4% Employer)</option>
                      <option value="4/4">4/4 (4% Employee / 4% Employer)</option>
                      <option value="6/0">6/0 (6% Employee / 0% Employer)</option>
                      <option value="1/5">1/5 (1% Employee / 5% Employer)</option>
                    </select>
                  </div>

                  {/* Custom Section 125 amounts for 3/4 model */}
                  {companyFormData.model === "3/4" && (
                    <div className="col-span-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-800 mb-3">
                        Custom Section 125 Monthly Amounts (3/4 Model)
                      </h4>
                      <p className="text-sm text-blue-600 mb-3">
                        Enter the monthly Section 125 amounts for each filing status category ($800-$1700).
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Single, No Dependents
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-gray-500">$</span>
                            <input
                              type="number"
                              min="800"
                              max="1700"
                              step="50"
                              value={companyFormData.sec125_single_0}
                              onChange={(e) =>
                                setCompanyFormData({ ...companyFormData, sec125_single_0: Number(e.target.value) })
                              }
                              className="w-full pl-7 pr-3 py-2 border rounded-lg"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Married, No Dependents
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-gray-500">$</span>
                            <input
                              type="number"
                              min="800"
                              max="1700"
                              step="50"
                              value={companyFormData.sec125_married_0}
                              onChange={(e) =>
                                setCompanyFormData({ ...companyFormData, sec125_married_0: Number(e.target.value) })
                              }
                              className="w-full pl-7 pr-3 py-2 border rounded-lg"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Single with Dependents
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-gray-500">$</span>
                            <input
                              type="number"
                              min="800"
                              max="1700"
                              step="50"
                              value={companyFormData.sec125_single_deps}
                              onChange={(e) =>
                                setCompanyFormData({ ...companyFormData, sec125_single_deps: Number(e.target.value) })
                              }
                              className="w-full pl-7 pr-3 py-2 border rounded-lg"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Married with Dependents
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-gray-500">$</span>
                            <input
                              type="number"
                              min="800"
                              max="1700"
                              step="50"
                              value={companyFormData.sec125_married_deps}
                              onChange={(e) =>
                                setCompanyFormData({ ...companyFormData, sec125_married_deps: Number(e.target.value) })
                              }
                              className="w-full pl-7 pr-3 py-2 border rounded-lg"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Pay Frequency *
                    </label>
                    <select
                      value={companyFormData.pay_frequency}
                      onChange={(e) =>
                        setCompanyFormData({ ...companyFormData, pay_frequency: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="weekly">Weekly (52 pay periods)</option>
                      <option value="biweekly">Biweekly (26 pay periods)</option>
                      <option value="semimonthly">Semimonthly (24 pay periods)</option>
                      <option value="monthly">Monthly (12 pay periods)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Pricing Tier *
                    </label>
                    <select
                      value={companyFormData.tier}
                      onChange={(e) =>
                        setCompanyFormData({ ...companyFormData, tier: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="state_school">State School (All $1,300/mo, 6% EE / 0% ER)</option>
                      <option value="2025">2025 Standard (S/0=$1,300, others=$1,700)</option>
                      <option value="pre_2025">Pre-2025 Legacy (S/0=$800, S/1+=$1,200, M/0=$1,200, M/1+=$1,600)</option>
                      <option value="original_6pct">Original 6% (S/0=$700, S/1+=$1,100, M/0+=$1,500, 1% EE / 5% ER)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Status *
                    </label>
                    <select
                      value={companyFormData.status}
                      onChange={(e) =>
                        setCompanyFormData({ ...companyFormData, status: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                </div>

                {/* Contact & Address Information */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-medium mb-3">Contact & Address</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Point of Contact
                      </label>
                      <input
                        type="text"
                        value={companyFormData.contact_name}
                        onChange={(e) =>
                          setCompanyFormData({ ...companyFormData, contact_name: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="Contact Name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Contact Phone
                      </label>
                      <input
                        type="tel"
                        value={companyFormData.contact_phone}
                        onChange={(e) =>
                          setCompanyFormData({ ...companyFormData, contact_phone: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="(555) 123-4567"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium mb-1">
                        Address
                      </label>
                      <input
                        type="text"
                        value={companyFormData.address}
                        onChange={(e) =>
                          setCompanyFormData({ ...companyFormData, address: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="Street Address"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={companyFormData.city}
                        onChange={(e) =>
                          setCompanyFormData({ ...companyFormData, city: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="City"
                      />
                    </div>

                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCompanyEditModal(false)}
                    className="px-4 py-2 border rounded-lg hover:bg-slate-50"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    disabled={isLoading}
                  >
                    {isLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                Edit {selectedEmployee.first_name} {selectedEmployee.last_name}
              </h2>
              <form onSubmit={handleEdit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) =>
                        setFormData({ ...formData, first_name: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) =>
                        setFormData({ ...formData, last_name: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) =>
                        setFormData({ ...formData, dob: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Filing Status
                    </label>
                    <select
                      value={formData.filing_status}
                      onChange={(e) =>
                        setFormData({ ...formData, filing_status: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="single">Single</option>
                      <option value="married">Married</option>
                      <option value="head">Head of Household</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Dependents
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.dependents}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dependents: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Gross Pay per Paycheck *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.gross_pay}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          gross_pay: parseFloat(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Consent Status
                    </label>
                    <select
                      value={formData.consent_status}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          consent_status: e.target.value as "elect" | "dont" | "pending",
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="pending">Pending</option>
                      <option value="elect">Elect (Enrolled)</option>
                      <option value="dont">Don't Want Benefits</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select
                      value={formData.active ? "active" : "inactive"}
                      onChange={(e) =>
                        setFormData({ ...formData, active: e.target.value === "active" })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedEmployee(null);
                    }}
                    className="px-4 py-2 border rounded-lg hover:bg-slate-50"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    disabled={isLoading}
                  >
                    {isLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
