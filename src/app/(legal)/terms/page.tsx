import Link from "next/link";
import Logo from "@/components/ui/Logo";

export const metadata = {
  title: "Terms of Service — Baseform",
  description: "Terms and conditions for using the Baseform platform.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="mb-8 block">
          <Logo variant="lockup" size="md" />
        </Link>

        <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
            <p className="mt-2 text-sm text-gray-500">Last updated: April 2026</p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">1. Acceptance of terms</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              By creating a Baseform account, you agree to these Terms of Service. If you are under 18, a parent or guardian must agree on your behalf. If you do not agree, do not use the service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">2. What Baseform provides</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Baseform is an information and organisation tool to help South African matric students manage their university and bursary applications. We do not guarantee admission to any institution or award of any bursary. All university and bursary information is provided for guidance only — always verify requirements directly with the relevant institution.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">3. Your account</h2>
            <ul className="text-sm text-gray-600 leading-relaxed space-y-2 list-disc list-inside">
              <li>You are responsible for keeping your password secure</li>
              <li>You must provide accurate information when creating your profile</li>
              <li>One account per person — do not share your account</li>
              <li>You must be a South African matric student (Grade 11 or 12) or applying for university</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">4. Free and paid plans</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Baseform offers a free tier and paid subscription plans. Paid features are clearly marked. Subscriptions are billed monthly and can be cancelled at any time. We do not offer refunds for partial billing periods. Prices are in South African Rand (ZAR) and include VAT where applicable.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">5. Acceptable use</h2>
            <p className="text-sm text-gray-600 leading-relaxed">You may not:</p>
            <ul className="text-sm text-gray-600 leading-relaxed space-y-2 list-disc list-inside">
              <li>Use Baseform for any unlawful purpose</li>
              <li>Attempt to access another user&apos;s data</li>
              <li>Reverse-engineer or copy the platform</li>
              <li>Upload malicious files or content</li>
              <li>Abuse the AI assistant (BaseBot) with harmful prompts</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">6. AI assistant (BaseBot)</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              BaseBot is powered by AI and provides general guidance. It is not a qualified educational counsellor. Do not rely solely on BaseBot for important decisions — always consult official sources and qualified advisors. AI responses may occasionally be inaccurate.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">7. Intellectual property</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              All content, design, and code in Baseform is owned by Baseform (Pty) Ltd. You retain ownership of the documents and information you upload. By uploading content, you grant us a limited licence to store and display it to provide the service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">8. Limitation of liability</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Baseform is provided &ldquo;as is&rdquo;. To the fullest extent permitted by South African law, we are not liable for missed deadlines, unsuccessful applications, or any indirect loss arising from use of the platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">9. Changes to these terms</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              We may update these terms from time to time. We will notify you via email or in-app notification of significant changes. Continued use after changes means you accept the updated terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">10. Governing law</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              These terms are governed by the laws of the Republic of South Africa. Any disputes will be resolved in South African courts.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">11. Contact</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Questions? Email us at{" "}
              <a href="mailto:hello@baseformapplications.com" className="text-orange-500">hello@baseformapplications.com</a>.
            </p>
          </section>

          <div className="pt-4 border-t border-gray-100 flex gap-4 text-sm">
            <Link href="/privacy" className="text-orange-500 font-medium">Privacy Policy</Link>
            <Link href="/" className="text-gray-400">← Back to Baseform</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
