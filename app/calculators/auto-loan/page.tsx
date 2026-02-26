import type { Metadata } from 'next';
import AutoLoanClient from './AutoLoanClient';

export const metadata: Metadata = {
  title: 'Auto Loan Calculator Canada 2025 | Car Payment & Total Cost',
  description: 'Calculate your monthly car payment, total interest, and true cost of ownership. Includes provincial sales tax, loan term comparison, down payment impact, and extra payment savings. All provinces.',
  keywords: ['auto loan calculator canada', 'car payment calculator canada', 'vehicle loan calculator', 'car financing canada 2025', 'auto loan amortization', 'canadian car loan interest'],
  openGraph: {
    title: 'Auto Loan Calculator Canada — Monthly Payment & True Cost',
    description: 'Calculate monthly car payments with provincial tax, compare loan terms, and see how extra payments save interest. All Canadian provinces.',
    url: 'https://canadiancalculators.ca/calculators/auto-loan',
  },
  alternates: {
    canonical: 'https://canadiancalculators.ca/calculators/auto-loan',
  },
};

export default function AutoLoanPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-[#0d1f3c] text-white py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-blue-300 text-sm mb-2 font-medium">Debt Management</div>
          <h1 className="text-3xl sm:text-4xl font-black mb-3 tracking-tight">
            Auto Loan Calculator
          </h1>
          <p className="text-blue-200 text-lg max-w-2xl">
            Calculate your monthly car payment, total interest, and true cost of ownership — including provincial sales tax, loan term comparison, and extra payment savings.
          </p>
        </div>
      </div>
      <AutoLoanClient />
    </main>
  );
}
