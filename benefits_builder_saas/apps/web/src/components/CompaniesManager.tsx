"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Company = {
  id: string;
  name: string;
  state: string;
  model: string;
  status: string;
  employer_rate?: number;
  employee_rate?: number;
  pay_frequency?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  zip?: string;
};

type Props = {
  initialCompanies: Company[];
};

export default function CompaniesManager({ initialCompanies }: Props) {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to parse model into rates
  // Model format: "employee/employer" (e.g., "5/3" = 5% employee, 3% employer)
  const parseModelRates = (model: string): { employee_rate: number; employer_rate: number } => {
    const parts = model.split('/');
    return {
      employee_rate: parseFloat(parts[0]),
      employer_rate: parseFloat(parts[1]),
    };
  };

  const [formData, setFormData] = useState({
    name: "",
    state: "",
    pay_frequency: "biweekly",
    model: "5/3",
    employer_rate: 3.0,
    employee_rate: 5.0,
    contact_email: "",
    contact_phone: "",
    address: "",
    city: "",
    zip: "",
    status: "active",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      state: "",
      pay_frequency: "biweekly",
      model: "5/3",
      employer_rate: 3.0,
      employee_rate: 5.0,
      contact_email: "",
      contact_phone: "",
      address: "",
      city: "",
      zip: "",
      status: "active",
    });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Failed to create company");
      }

      setCompanies([...companies, data.data]);
      setShowAddModal(false);
      resetForm();
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/companies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedCompany.id,
          ...formData,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Failed to update company");
      }

      setCompanies(
        companies.map((c) => (c.id === selectedCompany.id ? data.data : c))
      );
      setShowEditModal(false);
      setSelectedCompany(null);
      resetForm();
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm("Archive this company? It will be marked as inactive.")) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/companies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "inactive" }),
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Failed to archive company");
      }

      setCompanies(companies.map((c) => (c.id === id ? data.data : c)));
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        `DELETE "${name}" permanently? This cannot be undone. (Only works if company has no employees)`
      )
    )
      return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/companies?id=${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Failed to delete company");
      }

      setCompanies(companies.filter((c) => c.id !== id));
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (company: Company) => {
    setSelectedCompany(company);
    setFormData({
      name: company.name,
      state: company.state,
      pay_frequency: company.pay_frequency || "biweekly",
      model: company.model,
      employer_rate: company.employer_rate || 5.0,
      employee_rate: company.employee_rate || 3.0,
      contact_email: company.contact_email || "",
      contact_phone: company.contact_phone || "",
      address: company.address || "",
      city: company.city || "",
      zip: company.zip || "",
      status: company.status,
    });
    setShowEditModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">Companies</h1>
        <div className="flex gap-2">
          <Link
            href="/companies/archived"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium"
          >
            📁 View Archived
          </Link>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            + Add Company
          </button>
          <Link
            href="/companies/bulk-upload"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
          >
            + Bulk Upload
          </Link>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-4 underline text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Companies List */}
      <div className="grid gap-2">
        {companies.map((c) => (
          <div
            key={c.id}
            className="p-4 bg-white rounded-xl shadow hover:shadow-md transition"
          >
            <div className="flex items-start justify-between gap-4">
              <Link href={`/companies/${c.id}`} className="flex-1">
                <div className="font-medium text-lg">{c.name}</div>
                <div className="text-sm text-slate-600">
                  {c.state} · Model {c.model} · {c.pay_frequency}
                </div>
              </Link>

              <div className="flex items-center gap-2">
                <span
                  className={
                    "px-3 py-1 rounded-full text-sm " +
                    (c.status === "active"
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-200 text-slate-700")
                  }
                >
                  {c.status}
                </span>

                <button
                  onClick={() => openEditModal(c)}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium"
                  disabled={isLoading}
                >
                  Edit
                </button>

                {c.status === "active" && (
                  <button
                    onClick={() => handleArchive(c.id)}
                    className="px-3 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg text-sm font-medium"
                    disabled={isLoading}
                  >
                    Archive
                  </button>
                )}

                <button
                  onClick={() => handleDelete(c.id, c.name)}
                  className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-sm font-medium"
                  disabled={isLoading}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {companies.length === 0 && (
          <p className="text-slate-600 text-center py-8">No companies yet.</p>
        )}
      </div>

      {/* Add Company Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Add New Company</h2>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) =>
                        setFormData({ ...formData, state: e.target.value.toUpperCase() })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                      maxLength={2}
                      placeholder="TX"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Pay Frequency
                    </label>
                    <select
                      value={formData.pay_frequency}
                      onChange={(e) =>
                        setFormData({ ...formData, pay_frequency: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Biweekly</option>
                      <option value="semimonthly">Semi-monthly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Model (Employee % / Employer %)
                    </label>
                    <select
                      value={formData.model}
                      onChange={(e) => {
                        const rates = parseModelRates(e.target.value);
                        setFormData({
                          ...formData,
                          model: e.target.value,
                          ...rates,
                        });
                      }}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="5/3">5/3 (5% Employee / 3% Employer)</option>
                      <option value="4/3">4/3 (4% Employee / 3% Employer)</option>
                      <option value="5/1">5/1 (5% Employee / 1% Employer)</option>
                      <option value="4/4">4/4 (4% Employee / 4% Employer)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Employee Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.employee_rate}
                      disabled
                      className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                      title="Automatically set by model selection"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Employer Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.employer_rate}
                      disabled
                      className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                      title="Automatically set by model selection"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) =>
                        setFormData({ ...formData, contact_email: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.contact_phone}
                      onChange={(e) =>
                        setFormData({ ...formData, contact_phone: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      value={formData.zip}
                      onChange={(e) =>
                        setFormData({ ...formData, zip: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
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
                    {isLoading ? "Creating..." : "Create Company"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Company Modal */}
      {showEditModal && selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                Edit {selectedCompany.name}
              </h2>
              <form onSubmit={handleEdit} className="space-y-4">
                {/* Same form fields as Add Modal */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) =>
                        setFormData({ ...formData, state: e.target.value.toUpperCase() })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                      maxLength={2}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Pay Frequency
                    </label>
                    <select
                      value={formData.pay_frequency}
                      onChange={(e) =>
                        setFormData({ ...formData, pay_frequency: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Biweekly</option>
                      <option value="semimonthly">Semi-monthly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Model (Employee % / Employer %)
                    </label>
                    <select
                      value={formData.model}
                      onChange={(e) => {
                        const rates = parseModelRates(e.target.value);
                        setFormData({
                          ...formData,
                          model: e.target.value,
                          ...rates,
                        });
                      }}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="5/3">5/3 (5% Employee / 3% Employer)</option>
                      <option value="4/3">4/3 (4% Employee / 3% Employer)</option>
                      <option value="5/1">5/1 (5% Employee / 1% Employer)</option>
                      <option value="4/4">4/4 (4% Employee / 4% Employer)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Employee Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.employee_rate}
                      disabled
                      className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                      title="Automatically set by model selection"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Employer Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.employer_rate}
                      disabled
                      className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                      title="Automatically set by model selection"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) =>
                        setFormData({ ...formData, contact_email: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.contact_phone}
                      onChange={(e) =>
                        setFormData({ ...formData, contact_phone: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      value={formData.zip}
                      onChange={(e) =>
                        setFormData({ ...formData, zip: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedCompany(null);
                      resetForm();
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
    </div>
  );
}
