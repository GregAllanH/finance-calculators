import type { Metadata } from 'next';
import InvestmentReturnClient from './InvestmentReturnClient';

export const metadata: Metadata = {
  title: 'Investment Return Calculator Canada 2025 | TFSA RRSP Taxable Account',
  description: 'Calculate investment growth with lump sum and monthly contributions. Compare TFSA vs RRSP vs taxable accounts, inflation-adjusted returns, and different return rate scenarios. 2025.',
  keywords: ['investment return calculator canada', 'compound interest calculator canada', 'tfsa rrsp taxable comparison', 'lump sum vs dca canada', 'investment growth calculator 2025', 'real return inflation adjusted'],
  openGraph: {
    title: 'Investment Return Calculator — TFSA vs RRSP vs Taxable | Canada 2025',
    description: 'Project investment growth with lump sum and DCA. Compare account types, inflation-adjusted returns, and return rate scenarios. All provinces.',
    url: 'https://canadiancalculators.ca/calculators/investment-return',
  },
  alternates: {
    canonical: 'https://canadiancalculators.ca/calculators/investment-return',
  },
};

export default function InvestmentReturnPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-[#0d1f3c] text-white py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-blue-300 text-sm mb-2 font-medium">Savings & Investments</div>
          <h1 className="text-3xl sm:text-4xl font-black mb-3 tracking-tight">
            Investment Return Calculator
          </h1>
          <p className="text-blue-200 text-lg max-w-2xl">
            Project your portfolio growth with lump sum and monthly contributions. Compare TFSA, RRSP, and taxable accounts — with inflation-adjusted returns, tax drag, and scenario comparisons.
          </p>
        </div>
      </div>
      <InvestmentReturnClient />
    </main>
  );
}
