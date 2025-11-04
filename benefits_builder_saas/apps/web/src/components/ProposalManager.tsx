"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Proposal = {
  id: string;
  proposal_name: string;
  company_name: string;
  company_id: string | null;
  effective_date: string;
  model_percentage: string;
  pay_period: string;
  total_employees: number;
  qualified_employees: number;
  total_monthly_savings: number;
  total_annual_savings: number;
  status: string;
  created_at: string;
};

type Company = {
  id: string;
  name: string;
};

type Props = {
  initialProposals: Proposal[];
  companies: Company[];
};

export default function ProposalManager({ initialProposals, companies }: Props) {
  const router = useRouter();
  const [proposals, setProposals] = useState<Proposal[]>(initialProposals);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    companyId: "",
    companyName: "",
    companyAddress: "",
    companyCity: "",
    companyState: "",
    companyPhone: "",
    companyEmail: "",
    companyContact: "",
    effectiveDate: new Date().toISOString().split("T")[0],
    modelPercentage: "5/1",
    payPeriod: "Bi-Weekly",
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const companyId = e.target.value;
    setFormData({ ...formData, companyId });

    if (companyId) {
      const company = companies.find((c) => c.id === companyId);
      if (company) {
        setFormData((prev) => ({ ...prev, companyName: company.name }));
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setError(null);
    setSuccess(null);

    if (!selectedFile) {
      setError("Please select a census file");
      setIsUploading(false);
      return;
    }

    if (!formData.companyName || !formData.effectiveDate) {
      setError("Please fill in company name and effective date");
      setIsUploading(false);
      return;
    }

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", selectedFile);
      uploadFormData.append("companyName", formData.companyName);
      uploadFormData.append("companyAddress", formData.companyAddress);
      uploadFormData.append("companyCity", formData.companyCity);
      uploadFormData.append("companyState", formData.companyState);
      uploadFormData.append("companyPhone", formData.companyPhone);
      uploadFormData.append("companyEmail", formData.companyEmail);
      uploadFormData.append("companyContact", formData.companyContact);
      uploadFormData.append("effectiveDate", formData.effectiveDate);
      uploadFormData.append("modelPercentage", formData.modelPercentage);
      uploadFormData.append("payPeriod", formData.payPeriod);
      if (formData.companyId) {
        uploadFormData.append("companyId", formData.companyId);
      }

      const response = await fetch("/api/proposals/generate", {
        method: "POST",
        body: uploadFormData,
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || "Failed to generate proposal");
      }

      setSuccess(data.message);
      setShowUploadModal(false);
      setSelectedFile(null);
      setFormData({
        companyId: "",
        companyName: "",
        companyAddress: "",
        companyCity: "",
        companyState: "",
        companyPhone: "",
        companyEmail: "",
        companyContact: "",
        effectiveDate: new Date().toISOString().split("T")[0],
        modelPercentage: "5/1",
        payPeriod: "Bi-Weekly",
      });

      // Refresh proposals
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadPDF = (proposalId: string) => {
    window.open(`/api/proposals/${proposalId}/pdf`, "_blank");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-blue-100 text-blue-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Client Proposals</h1>
          <p className="text-slate-600 text-sm mt-1">
            Upload census files to generate benefit proposals
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Proposal
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Proposals List */}
      <div className="bg-white rounded-xl shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 font-semibold text-sm">
                  Proposal Name
                </th>
                <th className="text-left py-3 px-4 font-semibold text-sm">
                  Company
                </th>
                <th className="text-center py-3 px-4 font-semibold text-sm">
                  Employees
                </th>
                <th className="text-center py-3 px-4 font-semibold text-sm">
                  Qualified
                </th>
                <th className="text-right py-3 px-4 font-semibold text-sm">
                  Monthly Savings
                </th>
                <th className="text-right py-3 px-4 font-semibold text-sm">
                  Annual Savings
                </th>
                <th className="text-center py-3 px-4 font-semibold text-sm">
                  Status
                </th>
                <th className="text-center py-3 px-4 font-semibold text-sm">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((proposal) => (
                <tr
                  key={proposal.id}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium">{proposal.proposal_name}</div>
                      <div className="text-xs text-slate-500">
                        {formatDate(proposal.effective_date)}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm">{proposal.company_name}</td>
                  <td className="py-3 px-4 text-center text-sm">
                    {proposal.total_employees}
                  </td>
                  <td className="py-3 px-4 text-center text-sm">
                    {proposal.qualified_employees}
                  </td>
                  <td className="py-3 px-4 text-right text-sm font-medium text-green-700">
                    {formatCurrency(proposal.total_monthly_savings)}
                  </td>
                  <td className="py-3 px-4 text-right text-sm font-medium text-green-700">
                    {formatCurrency(proposal.total_annual_savings)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                        proposal.status
                      )}`}
                    >
                      {proposal.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleDownloadPDF(proposal.id)}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                    >
                      Download PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {proposals.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <svg
                className="w-12 h-12 mx-auto mb-4 text-slate-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p>No proposals yet</p>
              <p className="text-sm mt-1">
                Upload a census file to create your first proposal
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold">Generate New Proposal</h2>
              <p className="text-sm text-slate-600 mt-1">
                Upload an employee census file to generate a proposal
              </p>
            </div>

            <form onSubmit={handleUpload} className="p-6 space-y-4">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Census File (Excel) *
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  required
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {selectedFile && (
                  <p className="text-xs text-green-600 mt-1">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>

              {/* Existing Company */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Existing Company (Optional)
                </label>
                <select
                  value={formData.companyId}
                  onChange={handleCompanyChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="">-- New Company --</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Company Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) =>
                      setFormData({ ...formData, companyName: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    Company Address
                  </label>
                  <input
                    type="text"
                    value={formData.companyAddress}
                    onChange={(e) =>
                      setFormData({ ...formData, companyAddress: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">City</label>
                  <input
                    type="text"
                    value={formData.companyCity}
                    onChange={(e) =>
                      setFormData({ ...formData, companyCity: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">State</label>
                  <input
                    type="text"
                    value={formData.companyState}
                    onChange={(e) =>
                      setFormData({ ...formData, companyState: e.target.value })
                    }
                    maxLength={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.companyPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, companyPhone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.companyEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, companyEmail: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={formData.companyContact}
                    onChange={(e) =>
                      setFormData({ ...formData, companyContact: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Proposal Settings */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Effective Date *
                  </label>
                  <input
                    type="date"
                    value={formData.effectiveDate}
                    onChange={(e) =>
                      setFormData({ ...formData, effectiveDate: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Model Percentage
                  </label>
                  <input
                    type="text"
                    value={formData.modelPercentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        modelPercentage: e.target.value,
                      })
                    }
                    placeholder="5/1"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Pay Period
                  </label>
                  <select
                    value={formData.payPeriod}
                    onChange={(e) =>
                      setFormData({ ...formData, payPeriod: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Weekly">Weekly</option>
                    <option value="Bi-Weekly">Bi-Weekly</option>
                    <option value="Semi-Monthly">Semi-Monthly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setError(null);
                  }}
                  disabled={isUploading}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isUploading ? "Generating..." : "Generate Proposal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
