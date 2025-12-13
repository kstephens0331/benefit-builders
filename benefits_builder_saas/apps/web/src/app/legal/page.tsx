import Link from "next/link";

export const metadata = {
  title: "Legal | Benefits Builder",
  description: "Legal documents for Benefits Builder",
};

export default function LegalPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-neutral-900 mb-8">Legal Documents</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Link
          href="/legal/terms"
          className="block p-6 bg-white rounded-xl shadow-md border border-neutral-200 hover:shadow-lg hover:border-primary-300 transition-all"
        >
          <h2 className="text-xl font-semibold text-neutral-800 mb-2">
            Terms of Service
          </h2>
          <p className="text-neutral-600">
            End User License Agreement and Terms of Service governing your use of
            Benefits Builder.
          </p>
          <span className="inline-block mt-4 text-primary-600 font-medium">
            Read Terms &rarr;
          </span>
        </Link>

        <Link
          href="/legal/privacy"
          className="block p-6 bg-white rounded-xl shadow-md border border-neutral-200 hover:shadow-lg hover:border-primary-300 transition-all"
        >
          <h2 className="text-xl font-semibold text-neutral-800 mb-2">
            Privacy Policy
          </h2>
          <p className="text-neutral-600">
            How we collect, use, and protect your personal and business information.
          </p>
          <span className="inline-block mt-4 text-primary-600 font-medium">
            Read Policy &rarr;
          </span>
        </Link>
      </div>

      <div className="mt-12 pt-8 border-t border-neutral-200">
        <a href="/" className="text-primary-600 hover:text-primary-800 font-medium">
          &larr; Back to Home
        </a>
      </div>
    </div>
  );
}
