import Link from "next/link";
import Logo from "@/components/ui/Logo";

export const metadata = {
  title: "Privacy Policy — Baseform",
  description: "How Baseform collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="mb-8 block">
          <Logo variant="lockup" size="md" />
        </Link>

        <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
            <p className="mt-2 text-sm text-gray-500">Last updated: April 2026</p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">1. Who we are</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Baseform is a South African university application co-pilot designed to help Grade 12 students discover universities and bursaries, track applications, and never miss a deadline. We are operated by Lumen AI (Pty) Ltd, registered in South Africa.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">2. Information we collect</h2>
            <ul className="text-sm text-gray-600 leading-relaxed space-y-2 list-disc list-inside">
              <li>Your name, email address, and password when you create an account</li>
              <li>Academic information: school name, grade, subjects, and marks</li>
              <li>Guardian/parent contact details you provide during signup</li>
              <li>Application and bursary tracking data you enter in the app</li>
              <li>Documents you upload to the Vault (stored securely)</li>
              <li>Email account access if you choose to connect Gmail for application scanning</li>
              <li>Usage data: pages visited, features used, error logs</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">3. How we use your information</h2>
            <ul className="text-sm text-gray-600 leading-relaxed space-y-2 list-disc list-inside">
              <li>To provide and personalise the Baseform service</li>
              <li>To match you with universities and bursaries based on your APS and profile</li>
              <li>To send deadline reminders and application status updates</li>
              <li>To notify your guardian about your applications (with your consent)</li>
              <li>To improve the platform and fix bugs using aggregated, anonymised data</li>
              <li>To respond to support requests</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">4. Data storage and security</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Your data is stored on Supabase infrastructure hosted in secure data centres. We use row-level security so your data is only accessible to you and authorised Baseform staff. Passwords are hashed and never stored in plain text. Documents in the Vault are stored in private, access-controlled buckets.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">5. Sharing your data</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              We do not sell your personal information. We share data only with:
            </p>
            <ul className="text-sm text-gray-600 leading-relaxed space-y-2 list-disc list-inside">
              <li>Supabase (database and auth infrastructure)</li>
              <li>Google (if you connect your Gmail for email scanning)</li>
              <li>Resend (for sending transactional emails)</li>
              <li>Sentry (for error monitoring — no personally identifiable data is sent)</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">6. Google API Limited Use Disclosure</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Baseform's use and transfer to any other app of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer" className="text-orange-500 hover:underline">Google API Services User Data Policy</a>, including the Limited Use requirements. We only request read access to scan for university and bursary-related emails, and this data is never used to serve ads or sold to third parties.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">7. Your rights (POPIA)</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Under the Protection of Personal Information Act (POPIA), you have the right to access, correct, or delete your personal information. To exercise these rights, email us at{" "}
              <a href="mailto:info@baseformapplications.com" className="text-orange-500">info@baseformapplications.com</a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">8. Data retention</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              We retain your data for as long as your account is active. If you delete your account, your personal data is removed within 30 days. Anonymised, aggregated usage data may be retained indefinitely.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">9. Contact</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Questions about this policy? Contact us at{" "}
              <a href="mailto:info@baseformapplications.com" className="text-orange-500">info@baseformapplications.com</a>.
            </p>
          </section>

          <div className="pt-4 border-t border-gray-100 flex gap-4 text-sm">
            <Link href="/terms" className="text-orange-500 font-medium">Terms of Service</Link>
            <Link href="/" className="text-gray-400">← Back to Baseform</Link>
          </div>
        </div>
      </div>
    </main>
  );
}