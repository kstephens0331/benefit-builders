import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";

export const metadata = {
  title: "Proposal Details - Benefits Builder",
};

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = createServiceClient();

  // Fetch proposal
  const { data: proposal, error: proposalError } = await db
    .from("proposals")
    .select("*")
    .eq("id", id)
    .single();

  if (proposalError || !proposal) {
    return (
      <main className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          Proposal not found
        </div>
        <Link href="/proposals" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to Proposals
        </Link>
      </main>
    );
  }

  // Fetch employees for this proposal
  const { data: employees } = await db
    .from("proposal_employees")
    .select("*")
    .eq("proposal_id", id)
    .order("employee_name");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount || 0);
  };

  const formatDate = (date: string) => {
    if (!date) return "-";
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
      case "approved":
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
          <h1 className="text-2xl font-bold">{proposal.proposal_name}</h1>
          <p className="text-slate-600 text-sm mt-1">
            {proposal.company_name} &middot; Effective {formatDate(proposal.effective_date)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
              proposal.status
            )}`}
          >
            {proposal.status}
          </span>
          <a
            href={`/api/proposals/${id}/pdf`}
            target="_blank"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Download PDF
          </a>
          <Link
            href="/proposals"
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
          >
            Back to Proposals
          </Link>
        </div>
      </div>

      {/* Company Info */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Company Information</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-slate-500">Company Name</div>
            <div className="font-medium">{proposal.company_name || "-"}</div>
          </div>
          <div>
            <div className="text-slate-500">Address</div>
            <div className="font-medium">{proposal.company_address || "-"}</div>
          </div>
          <div>
            <div className="text-slate-500">City, State</div>
            <div className="font-medium">
              {proposal.company_city ? `${proposal.company_city}, ${proposal.company_state || ""}` : "-"}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Phone</div>
            <div className="font-medium">{proposal.company_phone || "-"}</div>
          </div>
          <div>
            <div className="text-slate-500">Email</div>
            <div className="font-medium">{proposal.company_email || "-"}</div>
          </div>
          <div>
            <div className="text-slate-500">Point of Contact</div>
            <div className="font-medium">{proposal.company_contact || "-"}</div>
          </div>
        </div>
      </div>

      {/* Proposal Settings */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Proposal Settings</h2>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-slate-500">Effective Date</div>
            <div className="font-medium">{formatDate(proposal.effective_date)}</div>
          </div>
          <div>
            <div className="text-slate-500">Model</div>
            <div className="font-medium">{proposal.model_percentage || "-"}</div>
          </div>
          <div>
            <div className="text-slate-500">Pay Period</div>
            <div className="font-medium">{proposal.pay_period || "-"}</div>
          </div>
          <div>
            <div className="text-slate-500">Status</div>
            <div className="font-medium capitalize">{proposal.status}</div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-6 text-center">
          <div className="text-3xl font-bold text-blue-600">{proposal.total_employees || 0}</div>
          <div className="text-sm text-slate-500">Total Employees</div>
        </div>
        <div className="bg-white rounded-xl shadow p-6 text-center">
          <div className="text-3xl font-bold text-green-600">{proposal.qualified_employees || 0}</div>
          <div className="text-sm text-slate-500">Qualified</div>
        </div>
        <div className="bg-white rounded-xl shadow p-6 text-center">
          <div className="text-3xl font-bold text-green-700">{formatCurrency(proposal.total_monthly_savings)}</div>
          <div className="text-sm text-slate-500">Monthly Employer Savings</div>
        </div>
        <div className="bg-white rounded-xl shadow p-6 text-center">
          <div className="text-3xl font-bold text-green-700">{formatCurrency(proposal.total_annual_savings)}</div>
          <div className="text-sm text-slate-500">Annual Employer Savings</div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold">Employees ({employees?.length || 0})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 font-semibold">Employee Name</th>
                <th className="text-center py-3 px-4 font-semibold">State</th>
                <th className="text-center py-3 px-4 font-semibold">Pay Freq</th>
                <th className="text-right py-3 px-4 font-semibold">Gross/Pay</th>
                <th className="text-center py-3 px-4 font-semibold">Status</th>
                <th className="text-center py-3 px-4 font-semibold">Deps</th>
                <th className="text-right py-3 px-4 font-semibold">Allowable Benefit</th>
                <th className="text-right py-3 px-4 font-semibold">ER Savings/mo</th>
                <th className="text-right py-3 px-4 font-semibold">ER Savings/yr</th>
                <th className="text-center py-3 px-4 font-semibold">Qualifies</th>
              </tr>
            </thead>
            <tbody>
              {employees?.map((emp, idx) => (
                <tr key={emp.id || idx} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium">
                    {emp.employee_name}
                    {!emp.qualifies && <span className="text-red-500">*</span>}
                  </td>
                  <td className="py-3 px-4 text-center">{emp.state || "-"}</td>
                  <td className="py-3 px-4 text-center">{emp.pay_frequency || "-"}</td>
                  <td className="py-3 px-4 text-right">{formatCurrency(emp.paycheck_gross)}</td>
                  <td className="py-3 px-4 text-center">{emp.marital_status || "-"}</td>
                  <td className="py-3 px-4 text-center">{emp.dependents || 0}</td>
                  <td className="py-3 px-4 text-right text-blue-600">{formatCurrency(emp.employee_net_increase_monthly)}</td>
                  <td className="py-3 px-4 text-right text-green-600">{formatCurrency(emp.net_monthly_employer_savings)}</td>
                  <td className="py-3 px-4 text-right text-green-600">{formatCurrency(emp.net_annual_employer_savings)}</td>
                  <td className="py-3 px-4 text-center">
                    {emp.qualifies ? (
                      <span className="text-green-600">Yes</span>
                    ) : (
                      <span className="text-red-600" title={emp.disqualification_reason || ""}>No</span>
                    )}
                  </td>
                </tr>
              ))}
              {(!employees || employees.length === 0) && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    No employees found for this proposal
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {employees && employees.some(e => !e.qualifies) && (
          <div className="p-4 border-t border-slate-200 text-sm text-slate-500">
            * Employees marked with an asterisk do not qualify for the Section 125 plan
          </div>
        )}
      </div>
    </main>
  );
}
