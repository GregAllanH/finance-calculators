// app/page.tsx
import calculators from '@/data/finance-calculators.json';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 text-center mb-4">
          Canadian Finance Calculators
        </h1>
        <p className="text-xl text-gray-600 text-center mb-12">
          Simple, accurate estimates for Canadians — starting with TFSA planning
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                  Quick tax-free growth projections
                </p>
                <div className="text-blue-600 font-medium hover:underline">
                  Try it now →
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-16 text-center text-gray-500 text-sm">
          <p>Estimates only — not financial advice. Consult CRA or a professional.</p>
        </div>
      </div>
    </main>
  );
}