import type { Metadata } from 'next';
import PoliticalContributionClient from './PoliticalContributionClient';

export const metadata: Metadata = {
  title: 'Political Contribution Tax Credit Calculator Canada 2025',
  description: 'Calculate your federal and provincial political contribution tax credits. See the three-tier federal credit structure, provincial credits for BC, MB, ON, SK, QC, and your true net cost after credits.',
  keywords: ['political contribution tax credit canada', 'federal political donation credit 2025', 'canada elections act tax credit', 'political donation calculator canada', 'ontario political contribution credit', 'bc political donation credit'],
  openGraph: {
    title: 'Political Contribution Tax Credit Calculator Canada 2025',
    description: 'Calculate federal and provincial political contribution credits. See your net cost after the 75% first-tier credit and all provincial credits.',
    url: 'https://canadiancalculators.ca/calculators/political-contribution',
  },
  alternates: {
    canonical: 'https://canadiancalculators.ca/calculators/political-contribution',
  },
};

export default function PoliticalContributionPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-[#0d1f3c] text-white py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-blue-300 text-sm mb-2 font-medium">Tax Calculators</div>
          <h1 className="text-3xl sm:text-4xl font-black mb-3 tracking-tight">
            Political Contribution Tax Credit Calculator
          </h1>
          <p className="text-blue-200 text-lg max-w-2xl">
            Calculate your federal and provincial political contribution tax credits. See exactly how much your donation really costs after the generous three-tier federal credit — often just 25 cents on the dollar.
          </p>
        </div>
      </div>
      <PoliticalContributionClient />
    </main>
  );
}
