// app/calculator/[slug]/page.tsx
import calculators from '@/data/finance-calculators.json';
import CalculatorWrapper from './CalculatorWrapper';

interface CalculatorData {
  slug: string;
  title: string;
  resultUnit: string;
  fields: Array<{
    name: string;
    label: string;
    type: string;
    unit?: string;
    placeholder?: string;
  }>;
  formula?: string;           // for single-formula calculators
  formula_tfsa?: string;      // for TFSA vs RRSP
  formula_rrsp?: string;      // for TFSA vs RRSP
  notes?: string;
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CalculatorPage({ params }: PageProps) {
  const { slug } = await params;

  const calcData = (calculators as CalculatorData[]).find(
    (c) => c.slug === slug
  );

  if (!calcData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-10 bg-white rounded-2xl shadow-xl max-w-lg mx-4">
          <h1 className="text-4xl font-bold text-red-600 mb-6">Calculator Not Found</h1>
          <p className="text-lg text-gray-700 mb-8">
            We couldn't find that calculator. It may have been removed or the link is incorrect.
          </p>
          <a
            href="/"
            className="inline-block bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition"
          >
            ← Back to All Calculators
          </a>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Back link */}
        <a
          href="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium mb-8"
        >
          ← Back to calculators
        </a>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
          {calcData.title}
        </h1>

        {/* Disclaimer banner – very important for finance tools */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-5 mb-8 rounded-r-lg">
          <p className="text-yellow-800">
            <strong>Important:</strong> This tool provides general estimates only. It is not personalized financial or tax advice. Always verify your contribution room, tax rates, and limits through CRA My Account. Results depend on many variables and assumptions. Consult a qualified financial advisor or the Canada Revenue Agency.
          </p>
        </div>

        {/* Notes if present */}
        {calcData.notes && (
          <div className="bg-gray-100 p-5 rounded-lg mb-8 text-gray-700 text-sm">
            {calcData.notes}
          </div>
        )}

        {/* The actual calculator */}
        <CalculatorWrapper calcData={calcData} />
      </div>
    </main>
  );
}