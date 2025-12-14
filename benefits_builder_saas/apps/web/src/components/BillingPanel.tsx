// apps/web/src/components/BillingPanel.tsx
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

type Company = {
  id: string;
  name: string;
};

type InvoiceRow = {
  company_id: string;
  company_name: string;
  model: string | null;
  rates: string; // "5.0% / 3.0%"
  total_pretax: number;
  total_employer_fica_saved: number;
  employer_fee: number;
  employer_net_savings: number;
  employee_fee_total: number;
  period: string;
};

type BillingResponse = {
  ok: boolean;
  period: string;
  invoices: InvoiceRow[];
};

function toPeriod(d: Date) {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  return `${y}-${m}`;
}

function usd(n: number | undefined | null) {
  return `$${(Number(n || 0)).toFixed(2)}`;
}

export default function BillingPanel() {
  const [now] = useState(() => new Date());
  const [period, setPeriod] = useState<string>(toPeriod(now));
  const [isPending, startTransition] = useTransition();
  const [isSinglePending, startSingleTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [loadingTable, setLoadingTable] = useState(false);
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");

  const jsonHref = useMemo(() => `/api/reports/billing/${period}`, [period]);
  const pdfHref = useMemo(() => `/api/reports/billing/${period}/pdf`, [period]);

  // Fetch companies on mount
  useEffect(() => {
    async function fetchCompanies() {
      try {
        const res = await fetch("/api/companies?status=active");
        const data = await res.json();
        if (data.ok && Array.isArray(data.data)) {
          setCompanies(data.data.sort((a: Company, b: Company) => a.name.localeCompare(b.name)));
        }
      } catch (e) {
        console.error("Failed to fetch companies:", e);
      }
    }
    fetchCompanies();
  }, []);

  async function fetchTable() {
    setLoadingTable(true);
    setLoadErr(null);
    try {
      const res = await fetch(jsonHref, { cache: "no-store" });
      const data: BillingResponse = await res.json();
      if (!res.ok || !data?.ok) throw new Error((data as any)?.error || `Fetch failed (${res.status})`);
      setRows(Array.isArray(data.invoices) ? data.invoices : []);
    } catch (e: any) {
      setLoadErr(e?.message || String(e));
      setRows([]);
    } finally {
      setLoadingTable(false);
    }
  }

  useEffect(() => { fetchTable(); /* eslint-disable-next-line */ }, [period]);

  async function runGenerateAll() {
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/billing/generate-invoices", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ period }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok) throw new Error(data?.error || `Failed (${res.status})`);
        const count = data?.results?.length || 0;
        setMessage(`Generated ${count} invoices for ${period}.`);
        await fetchTable();
      } catch (e: any) {
        setMessage(`Failed: ${e?.message || e}`);
      }
    });
  }

  async function runSingleInvoice(companyId?: string) {
    const targetCompanyId = companyId || selectedCompany;
    if (!targetCompanyId) {
      setMessage("Please select a company first.");
      return;
    }
    setMessage(null);
    startSingleTransition(async () => {
      try {
        const res = await fetch("/api/billing/generate-invoices", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ period, company_id: targetCompanyId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok) throw new Error(data?.error || `Failed (${res.status})`);
        const companyName = companies.find(c => c.id === targetCompanyId)?.name || "Company";
        setMessage(`Generated invoice for ${companyName} (${period}).`);
        await fetchTable();
      } catch (e: any) {
        setMessage(`Failed: ${e?.message || e}`);
      }
    });
  }

  const totals = rows.reduce(
    (acc, r) => {
      acc.pretax += r.total_pretax || 0;
      acc.erFica += r.total_employer_fica_saved || 0;
      acc.erFee += r.employer_fee || 0;
      acc.erNet += r.employer_net_savings || 0;
      acc.eeFee += r.employee_fee_total || 0;
      return acc;
    },
    { pretax: 0, erFica: 0, erFee: 0, erNet: 0, eeFee: 0 }
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Period Selection */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col">
          <label className="text-xs font-medium text-slate-600 mb-1">Period</label>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300"
          />
        </div>

        <button onClick={runGenerateAll} disabled={isPending} className="px-4 py-2 rounded-xl bg-green-600 text-white disabled:opacity-50 hover:bg-green-700">
          {isPending ? "Generating…" : "Generate All Invoices"}
        </button>

        <a href={jsonHref} target="_blank" className="px-4 py-2 rounded-xl border border-slate-300 text-slate-800 hover:bg-slate-50">
          View JSON
        </a>

        <a href={pdfHref} target="_blank" className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">
          Download Billing PDF
        </a>
      </div>

      {/* Single Company Invoice Generation */}
      <div className="flex flex-wrap items-end gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex flex-col">
          <label className="text-xs font-medium text-slate-600 mb-1">Generate Single Invoice</label>
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 min-w-[250px]"
          >
            <option value="">Select a company...</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => runSingleInvoice()}
          disabled={isSinglePending || !selectedCompany}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700"
        >
          {isSinglePending ? "Generating…" : "Generate Invoice"}
        </button>
      </div>

      {message && (
        <div className={`text-sm rounded-lg px-3 py-2 ${message.startsWith('Failed') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left text-slate-600">
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">Model (Rates)</th>
              <th className="px-3 py-2 text-right">Pretax Total</th>
              <th className="px-3 py-2 text-right">Employer FICA Saved</th>
              <th className="px-3 py-2 text-right">Employer Fee</th>
              <th className="px-3 py-2 text-right">Employer Net</th>
              <th className="px-3 py-2 text-right">Employee Fee Total</th>
              <th className="px-3 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loadingTable ? (
              <tr><td className="px-3 py-3 text-slate-600" colSpan={8}>Loading…</td></tr>
            ) : loadErr ? (
              <tr><td className="px-3 py-3 text-red-600" colSpan={8}>{loadErr}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="px-3 py-3 text-slate-600" colSpan={8}>No invoice data for {period}.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.company_id} className="bg-slate-50">
                  <td className="px-3 py-2 font-medium">{r.company_name}</td>
                  <td className="px-3 py-2 text-slate-700">{r.model ?? "-"} <span className="text-slate-500">({r.rates})</span></td>
                  <td className="px-3 py-2 text-right">{usd(r.total_pretax)}</td>
                  <td className="px-3 py-2 text-right">{usd(r.total_employer_fica_saved)}</td>
                  <td className="px-3 py-2 text-right">{usd(r.employer_fee)}</td>
                  <td className="px-3 py-2 text-right">{usd(r.employer_net_savings)}</td>
                  <td className="px-3 py-2 text-right">{usd(r.employee_fee_total)}</td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => runSingleInvoice(r.company_id)}
                      className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                    >
                      Regenerate
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t">
              <td className="px-3 py-2 font-semibold">Totals</td>
              <td className="px-3 py-2" />
              <td className="px-3 py-2 text-right font-semibold">{usd(totals.pretax)}</td>
              <td className="px-3 py-2 text-right font-semibold">{usd(totals.erFica)}</td>
              <td className="px-3 py-2 text-right font-semibold">{usd(totals.erFee)}</td>
              <td className="px-3 py-2 text-right font-semibold">{usd(totals.erNet)}</td>
              <td className="px-3 py-2 text-right font-semibold">{usd(totals.eeFee)}</td>
              <td className="px-3 py-2" />
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        "Generate All Invoices" creates/updates invoices for all active companies. "Generate Invoice" creates one for the selected company. Model fees (5/3, 3/4, 5/1, 4/4) are applied to monthly pre-tax totals.
      </p>
    </div>
  );
}
