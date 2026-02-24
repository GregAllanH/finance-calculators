// app/page.tsx
import calculators from '@/data/finance-calculators.json';
import Link from 'next/link';

const STATIC_CALCULATORS = [
  {
    slug: 'income-tax',
    href: '/calculators/income-tax',
    title: 'Canadian Income Tax Calculator',
    description: 'Calculate federal & provincial tax, CPP, EI, and take-home pay for 2024 & 2025.',
    badge: 'New',
  },
  {
    slug: 'cpp-benefits',
    href: '/calculators/cpp-benefits',
    title: 'CPP Benefits Estimator',
    description: 'Estimate your monthly CPP payments at 60, 65, or 70. Find your breakeven age and maximize your lifetime benefit.',
    badge: 'New',
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 text-center mb-4">
          Canadian Finance Calculators
        </h1>
        <p className="text-xl text-gray-600 text-center mb-12">
          Free, accurate financial tools built for Canadians
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

          {/* Static calculators (income tax, cpp etc.) */}
          {STATIC_CALCULATORS.map((calc) => (
            <Link
              key={calc.slug}
              href={calc.href}
              className="block bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow overflow-hidden border border-gray-200"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h2 className="text-2xl font-semibold text-gray-800">
                    {calc.title}
                  </h2>
                  {calc.badge && (
                    <span className="ml-2 mt-1 shrink-0 bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {calc.badge}
                    </span>
                  )}
                </div>
                <p className="text-gray-600 mb-4">{calc.description}</p>
                <div className="text-blue-600 font-medium hover:underline">
                  Try it now →
                </div>
              </div>
            </Link>
          ))}

          {/* JSON-driven calculators */}
          {(calculators as any[]).map((calc) => (
            <Link
              key={calc.slug}
              href={`/calculator/${calc.slug}`}
              className="block bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow overflow-hidden border border-gray-200"
            >
              <div className="p-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                  {calc.title}
                </h2>
                <p className="text-gray-600 mb-4">
                  {calc.description ?? 'Quick financial projection for Canadians'}
                </p>
                <div className="text-blue-600 font-medium hover:underline">
                  Try it now →
                </div>
              </div>
            </Link>
          ))}

        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-gray-500 text-sm space-y-2">
          <p>Estimates only — not financial advice. Consult CRA or a qualified professional.</p>
          <p>
            <Link href="/privacy" className="text-blue-500 hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
