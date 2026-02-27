import type { Metadata } from 'next';
import EmergencyFundClient from './EmergencyFundClient';

export const metadata: Metadata = {
  title: 'Emergency Fund Calculator Canada 2025 | How Much Do You Need?',
  description: 'Calculate your ideal emergency fund size based on your monthly expenses, job stability, dependents, and income type. See your savings milestones and how long to reach your goal.',
  keywords: ['emergency fund calculator canada', 'how much emergency fund canada', 'emergency savings calculator', 'emergency fund hisa canada', 'how many months emergency fund canada'],
  openGraph: {
    title: 'Emergency Fund Calculator Canada — How Much Do You Need?',
    description: 'Calculate your ideal emergency fund based on expenses, job stability, and dependents. See milestones and time to goal.',
    url: 'https://canadiancalculators.ca/calculators/emergency-fund',
  },
  alternates: { canonical: 'https://canadiancalculators.ca/calculators/emergency-fund' },
};

export default function EmergencyFundPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-[#0d1f3c] text-white py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-blue-300 text-sm mb-2 font-medium">Budgeting</div>
          <h1 className="text-3xl sm:text-4xl font-black mb-3 tracking-tight">Emergency Fund Calculator</h1>
          <p className="text-blue-200 text-lg max-w-2xl">
            Calculate your ideal emergency fund size based on your essential expenses, job stability, and household situation. See exactly how long it'll take to get there.
          </p>
        </div>
      </div>
      <EmergencyFundClient />
    </main>
  );
}
