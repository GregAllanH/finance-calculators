// app/privacy/page.tsx

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Canadian Calculators',
  description: 'Privacy policy for Canadian Calculators. Learn how we collect, use, and protect your information.',
};

export default function PrivacyPolicy() {
  const lastUpdated = 'February 23, 2026';

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">

        {/* Back link */}
        <a
          href="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium mb-8"
        >
          ← Back to calculators
        </a>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 md:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: {lastUpdated}</p>

          <div className="prose prose-gray max-w-none space-y-8">

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">1. Introduction</h2>
              <p className="text-gray-600 leading-relaxed">
                Welcome to Canadian Calculators ("we," "us," or "our"), operated at canadiancalculators.ca.
                We are committed to protecting your privacy. This Privacy Policy explains how we collect,
                use, and safeguard information when you visit our website.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">2. Information We Collect</h2>
              <p className="text-gray-600 leading-relaxed mb-3">
                <strong>Information you enter into calculators:</strong> All calculations are performed
                locally in your browser. We do not collect, store, or transmit any financial figures
                you enter into our calculators. Your income, tax, or mortgage data never leaves your device.
              </p>
              <p className="text-gray-600 leading-relaxed mb-3">
                <strong>Automatically collected information:</strong> When you visit our site, we may
                automatically collect certain information including your IP address, browser type,
                operating system, referring URLs, and pages visited. This is standard web server log data.
              </p>
              <p className="text-gray-600 leading-relaxed">
                <strong>Cookies:</strong> We use cookies and similar tracking technologies to analyze
                website traffic and improve your experience. You can instruct your browser to refuse
                all cookies or to indicate when a cookie is being sent.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">3. Google Analytics</h2>
              <p className="text-gray-600 leading-relaxed">
                We use Google Analytics to understand how visitors interact with our website. Google
                Analytics collects information such as how often users visit the site, what pages they
                visit, and what other sites they used prior to visiting. We use this information to
                improve our site. Google Analytics collects only the IP address assigned to you on the
                date you visit, not your name or other identifying information. We do not combine the
                information collected through Google Analytics with personally identifiable information.
                Google's ability to use and share information collected by Google Analytics is restricted
                by the Google Analytics Terms of Service and Google Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Google AdSense</h2>
              <p className="text-gray-600 leading-relaxed">
                We may use Google AdSense to display advertisements on our website. Google AdSense uses
                cookies to serve ads based on your prior visits to our website or other websites.
                Google's use of advertising cookies enables it and its partners to serve ads based on
                your visit to our site and other sites on the Internet. You may opt out of personalized
                advertising by visiting{' '}
                <a
                  href="https://www.google.com/settings/ads"
                  className="text-blue-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google Ads Settings
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">5. Affiliate Links</h2>
              <p className="text-gray-600 leading-relaxed">
                Our website may contain affiliate links to third-party financial products and services.
                If you click on an affiliate link and sign up for a product, we may receive a commission
                at no additional cost to you. We only recommend products and services we believe may be
                useful to our visitors. Affiliate relationships do not influence our calculator results
                or editorial content.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">6. How We Use Your Information</h2>
              <p className="text-gray-600 leading-relaxed">
                We use the information we collect to operate and improve our website, analyze usage
                trends, and display relevant advertising. We do not sell, trade, or otherwise transfer
                your personally identifiable information to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">7. Third-Party Links</h2>
              <p className="text-gray-600 leading-relaxed">
                Our website may contain links to third-party websites. We have no control over and
                assume no responsibility for the content, privacy policies, or practices of any
                third-party sites. We encourage you to review the privacy policy of every site you visit.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">8. Children's Privacy</h2>
              <p className="text-gray-600 leading-relaxed">
                Our website is not directed to children under the age of 13. We do not knowingly collect
                personally identifiable information from children under 13.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">9. Your Rights (PIPEDA)</h2>
              <p className="text-gray-600 leading-relaxed">
                As a Canadian website, we comply with the Personal Information Protection and Electronic
                Documents Act (PIPEDA). You have the right to access personal information we hold about
                you and to request corrections. To exercise these rights, please contact us.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">10. Changes to This Policy</h2>
              <p className="text-gray-600 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes
                by posting the new policy on this page and updating the "Last updated" date above.
                Your continued use of the site after any changes constitutes acceptance of the new policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">11. Contact Us</h2>
              <p className="text-gray-600 leading-relaxed">
                If you have any questions about this Privacy Policy, please contact us at{' '}
                <a
                  href="mailto:privacy@canadiancalculators.ca"
                  className="text-blue-600 hover:underline"
                >
                  privacy@canadiancalculators.ca
                </a>
                .
              </p>
            </section>

          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-400">
          <p>Canadian Calculators — canadiancalculators.ca</p>
        </div>
      </div>
    </main>
  );
}
