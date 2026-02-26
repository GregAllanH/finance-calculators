import type { Metadata } from 'next';
import CRAInstalmentClient from './CRAInstalmentClient';

export const metadata: Metadata = {
  title: 'CRA Instalment Payment Calculator Canada 2025 | Quarterly Tax Payments',
  description: 'Calculate your CRA quarterly tax instalment payments for 2025. Compare all three CRA methods, get your payment schedule, penalty estimates, and self-employed CPP breakdown. All provinces.',
  keywords: ['cra instalment calculator', 'quarterly tax payments canada 2025', 'tax instalments self employed canada', 'cra instalment interest', 'canada tax instalments due dates 2025', 'net tax owing instalment threshold'],
  openGraph: {
    title: 'CRA Instalment Payment Calculator 2025 — Quarterly Tax Payments',
    description: 'Calculate your quarterly CRA tax instalments. Compare all three CRA methods, get your 2025 payment schedule, and estimate penalties for missed payments.',
    url: 'https://canadiancalculators.ca/calculators/cra-instalments',
  },
  alternates: {
    canonical: 'https://canadiancalculators.ca/calculators/cra-instalments',
  },
};

export default function CRAInstalmentPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-[#0d1f3c] text-white py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-blue-300 text-sm mb-2 font-medium">Tax Calculators</div>
          <h1 className="text-3xl sm:text-4xl font-black mb-3 tracking-tight">
            CRA Instalment Payment Calculator
          </h1>
          <p className="text-blue-200 text-lg max-w-2xl">
            Calculate your quarterly tax instalments for 2025. Compare all three CRA methods, find the lowest payment option, and get your full payment schedule with due dates.
          </p>
        </div>
      </div>
      <CRAInstalmentClient />
    </main>
  );
}
