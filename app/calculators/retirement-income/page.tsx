import type { Metadata } from 'next';
import RetirementIncomeClient from './RetirementIncomeClient';

export const metadata: Metadata = {
  title: 'Retirement Income Calculator Canada 2025 | RRIF + CPP + OAS + TFSA',
  description: 'Plan your Canadian retirement income with RRIF drawdown, CPP, OAS, TFSA, and pension income. Includes pension splitting, OAS clawback, year-by-year table to age 95. All provinces.',
  keywords: ['retirement income calculator canada', 'rrif drawdown calculator', 'cpp oas rrif combined', 'canada retirement planning 2025', 'oas clawback calculator', 'pension income splitting canada'],
  openGraph: {
    title: 'Retirement Income Calculator — RRIF + CPP + OAS + TFSA',
    description: 'Project your Canadian retirement income from all sources. Year-by-year drawdown to age 95, OAS clawback warnings, pension splitting, and spouse scenarios.',
    url: 'https://canadiancalculators.ca/calculators/retirement-income',
  },
  alternates: {
    canonical: 'https://canadiancalculators.ca/calculators/retirement-income',
  },
};

export default function RetirementIncomePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-[#0d1f3c] text-white py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-blue-300 text-sm mb-2 font-medium">Retirement Planning</div>
          <h1 className="text-3xl sm:text-4xl font-black mb-3 tracking-tight">
            Retirement Income Calculator
          </h1>
          <p className="text-blue-200 text-lg max-w-2xl">
            Project your retirement income from RRIF, CPP, OAS, TFSA, and pension. Year-by-year drawdown to age 95, OAS clawback warnings, pension income splitting, and spouse scenarios. 2025 rates.
          </p>
        </div>
      </div>
      <RetirementIncomeClient />
    </main>
  );
}
