export const metadata = {
  title: "Privacy Policy | Benefits Builder",
  description: "Privacy Policy for Benefits Builder SaaS platform",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-neutral-900 mb-8">Privacy Policy</h1>
      <p className="text-sm text-neutral-500 mb-8">Last Updated: December 13, 2025</p>

      <div className="prose prose-neutral max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">1. Introduction</h2>
          <p className="text-neutral-700 leading-relaxed">
            Benefits Builder (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy.
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information
            when you use our employee benefits administration platform (the &quot;Service&quot;).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">2. Information We Collect</h2>

          <h3 className="text-lg font-medium text-neutral-700 mt-4 mb-2">2.1 Personal Information</h3>
          <p className="text-neutral-700 leading-relaxed">We may collect the following types of personal information:</p>
          <ul className="list-disc list-inside text-neutral-700 ml-4 space-y-1">
            <li>Employee names and contact information</li>
            <li>Social Security numbers (encrypted)</li>
            <li>Employment information (salary, filing status, dependents)</li>
            <li>Benefits enrollment data</li>
            <li>Tax withholding preferences</li>
          </ul>

          <h3 className="text-lg font-medium text-neutral-700 mt-4 mb-2">2.2 Company Information</h3>
          <ul className="list-disc list-inside text-neutral-700 ml-4 space-y-1">
            <li>Company name and business address</li>
            <li>Tax identification numbers</li>
            <li>Payroll frequency and structure</li>
            <li>Benefits plan configurations</li>
          </ul>

          <h3 className="text-lg font-medium text-neutral-700 mt-4 mb-2">2.3 Technical Information</h3>
          <ul className="list-disc list-inside text-neutral-700 ml-4 space-y-1">
            <li>IP addresses and browser information</li>
            <li>Device identifiers</li>
            <li>Usage patterns and access logs</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">3. How We Use Your Information</h2>
          <p className="text-neutral-700 leading-relaxed">We use the collected information to:</p>
          <ul className="list-disc list-inside text-neutral-700 ml-4 space-y-1">
            <li>Calculate and manage employee benefits deductions</li>
            <li>Generate tax withholding calculations</li>
            <li>Produce reports for employers and employees</li>
            <li>Process payroll-related calculations</li>
            <li>Integrate with third-party services (e.g., QuickBooks) at your direction</li>
            <li>Improve our Service and develop new features</li>
            <li>Comply with legal and regulatory requirements</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">4. Data Security</h2>
          <p className="text-neutral-700 leading-relaxed">
            We implement industry-standard security measures to protect your data:
          </p>
          <ul className="list-disc list-inside text-neutral-700 ml-4 space-y-1">
            <li>Encryption of sensitive data at rest and in transit (TLS 1.3)</li>
            <li>Secure cloud infrastructure (Supabase/PostgreSQL)</li>
            <li>Role-based access controls</li>
            <li>Regular security audits and updates</li>
            <li>Encrypted backup systems</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">5. Data Sharing and Third Parties</h2>
          <p className="text-neutral-700 leading-relaxed">
            We do not sell your personal information. We may share data with:
          </p>
          <ul className="list-disc list-inside text-neutral-700 ml-4 space-y-1">
            <li>Service providers who assist in operating our platform</li>
            <li>Third-party integrations you authorize (e.g., QuickBooks)</li>
            <li>Legal authorities when required by law</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">6. Data Retention</h2>
          <p className="text-neutral-700 leading-relaxed">
            We retain your data for as long as your account is active or as needed to provide
            services. We may retain certain information as required by law or for legitimate
            business purposes (e.g., tax records for 7 years).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">7. Your Rights</h2>
          <p className="text-neutral-700 leading-relaxed">You have the right to:</p>
          <ul className="list-disc list-inside text-neutral-700 ml-4 space-y-1">
            <li>Access your personal data</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your data (subject to legal requirements)</li>
            <li>Export your data in a portable format</li>
            <li>Opt out of non-essential data processing</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">8. HIPAA Compliance</h2>
          <p className="text-neutral-700 leading-relaxed">
            While Benefits Builder processes benefits-related data, we do not directly handle
            protected health information (PHI) under HIPAA. Any health-related benefits
            information is handled through appropriate carriers and third-party administrators.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">9. Changes to This Policy</h2>
          <p className="text-neutral-700 leading-relaxed">
            We may update this Privacy Policy periodically. We will notify you of material
            changes by posting the new policy on this page and updating the &quot;Last Updated&quot; date.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">10. Contact Us</h2>
          <p className="text-neutral-700 leading-relaxed">
            If you have questions about this Privacy Policy, please contact us at:
          </p>
          <div className="mt-2 p-4 bg-neutral-100 rounded-lg">
            <p className="text-neutral-700">Benefits Builder</p>
            <p className="text-neutral-700">Email: privacy@benefitsbuilder.com</p>
          </div>
        </section>
      </div>

      <div className="mt-12 pt-8 border-t border-neutral-200">
        <a href="/" className="text-primary-600 hover:text-primary-800 font-medium">
          &larr; Back to Home
        </a>
      </div>
    </div>
  );
}
