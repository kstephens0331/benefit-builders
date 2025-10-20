import BillingPanel from "@/components/BillingPanel";

export const metadata = {
  title: "Billing Dashboard — Benefits Builder",
  description: "Run monthly close and export billing reports.",
};

export default async function BillingPage() {
  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Billing Dashboard</h1>
          <p className="text-slate-600">Select a month, run close, preview totals, and export JSON/PDF.</p>
        </div>
      </header>

      <section className="p-5 bg-white rounded-2xl shadow space-y-4">
        <h2 className="font-semibold">Monthly Close & Reports</h2>
        <BillingPanel />
      </section>
    </main>
  );
}
