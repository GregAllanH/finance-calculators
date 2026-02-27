import type { Metadata } from 'next';
import CERBRepaymentClient from './CERBRepaymentClient';

export const metadata: Metadata = {
  title: 'CERB Repayment Calculator Canada | Tax Impact & Payment Plans',
  description: 'Calculate your CERB repayment amount, tax deduction from repayment, true net cost, and monthly payment plan options. Understand CRA interest charges and your options.',
  keywords: ['cerb repayment calculator', 'cerb repayment canada 2025', 'cerb tax deduction repayment', 'cerb cra collections', 'canada emergency response benefit repayment', 'cerb eligibility rules'],
  openGraph: {
    title: 'CERB Repayment Calculator — Net Cost, Tax Refund & Payment Plans',
    description: 'Calculate your outstanding CERB balance, the tax refund you\'ll receive from repayment, your true net cost, and monthly payment plan options.',
    url: 'https://canadiancalculators.ca/calculators/cerb-repayment',
  },
  alternates: {
    canonical: 'https://canadiancalculators.ca/calculators/cerb-repayment',
  },
};

export default function CERBRepaymentPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-[#0d1f3c] text-white py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-blue-300 text-sm mb-2 font-medium">Tax Calculators</div>
          <h1 className="text-3xl sm:text-4xl font-black mb-3 tracking-tight">
            CERB Repayment Calculator
          </h1>
          <p className="text-blue-200 text-lg max-w-2xl">
            Calculate your outstanding CERB balance, the tax deduction you'll receive when you repay, your true net out-of-pocket cost, and monthly payment plan options.
          </p>
        </div>
      </div>
      <CERBRepaymentClient />
    </main>
  );
}
