import BillingPanel from "@/components/BillingPanel";

export const metadata = {
  title: "Billing Dashboard — Benefits Builder",
  description: "Generate invoices for all clients and export billing reports.",
};

export default async function BillingPage() {
  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Billing Dashboard</h1>
          <p className="text-slate-600">Generate invoices for all clients, preview totals, and export reports.</p>
        </div>
      </header>

      <section className="p-5 bg-white rounded-2xl shadow space-y-4">
        <h2 className="font-semibold">Invoice Generation & Reports</h2>
        <BillingPanel />
      </section>
    </main>
  );
}
