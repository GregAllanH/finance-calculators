// app/income-tax/page.tsx

import type { Metadata } from 'next';
import IncomeTaxClient from './IncomeTaxClient';

export const metadata: Metadata = {
  title: 'Canadian Income Tax Calculator 2024 & 2025 | Canadian Calculators',
  description:
    'Free Canadian income tax calculator for 2024 and 2025. Calculate federal and provincial taxes, CPP, EI, marginal and effective tax rates, and take-home pay for all provinces and territories.',
  keywords:
    'Canadian income tax calculator 2025, Canadian tax calculator 2024, provincial tax calculator, take home pay Canada, marginal tax rate Canada, CPP EI calculator',
  openGraph: {
    title: 'Canadian Income Tax Calculator 2024 & 2025',
    description:
      'Calculate your federal and provincial income tax, CPP, EI deductions, and take-home pay for any Canadian province.',
    url: 'https://canadiancalculators.ca/income-tax',
    siteName: 'Canadian Calculators',
    locale: 'en_CA',
    type: 'website',
  },
};

export default function IncomeTaxPage() {
  return <IncomeTaxClient />;
}
