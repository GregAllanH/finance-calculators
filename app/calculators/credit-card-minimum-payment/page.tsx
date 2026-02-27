import type { Metadata } from 'next';
import CreditCardMinPaymentClient from './CreditCardMinPaymentClient';

export const metadata: Metadata = {
  title: 'Credit Card Minimum Payment Calculator Canada 2025 | True Cost & Payoff Time',
  description: 'See how long it really takes to pay off your credit card making only minimum payments, total interest paid, and how much you save by paying more. Canadian rates.',
  keywords: ['credit card minimum payment calculator canada', 'credit card payoff calculator canada', 'credit card interest calculator', 'minimum payment trap canada', 'pay off credit card faster canada'],
  openGraph: {
    title: 'Credit Card Minimum Payment Calculator Canada — True Cost Revealed',
    description: 'See how long minimum payments really take, total interest cost, and how much you save with fixed or extra payments.',
    url: 'https://canadiancalculators.ca/calculators/credit-card-minimum-payment',
  },
  alternates: { canonical: 'https://canadiancalculators.ca/calculators/credit-card-minimum-payment' },
};

export default function CreditCardMinPaymentPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-[#0d1f3c] text-white py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-blue-300 text-sm mb-2 font-medium">Debt Management</div>
          <h1 className="text-3xl sm:text-4xl font-black mb-3 tracking-tight">Credit Card Minimum Payment Calculator</h1>
          <p className="text-blue-200 text-lg max-w-2xl">
            Discover the true cost of making only minimum payments — and how much you save by paying a fixed amount or a little extra each month.
          </p>
        </div>
      </div>
      <CreditCardMinPaymentClient />
    </main>
  );
}
