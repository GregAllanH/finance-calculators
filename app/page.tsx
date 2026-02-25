// app/page.tsx
import Link from 'next/link';

// ─── Calculator Registry ───────────────────────────────────────────────────────

const CATEGORIES = [
  {
    id: 'mortgage',
    title: 'Mortgage & Real Estate',
    icon: '🏠',
    description: 'Calculate payments, compare amortization periods, and find out what you can afford.',
    calculators: [
      {
        slug: 'mortgage-payment-affordability',
        href: '/calculator/mortgage-payment-affordability',
        title: 'Mortgage Payment Calculator',
        description: 'Calculate your monthly mortgage payment including CMHC insurance, property tax, and heating costs.',
        badge: null,
      },
      {
        slug: 'max-house-affordability',
        href: '/calculator/max-house-affordability',
        title: 'Maximum Home Affordability',
        description: 'Find the maximum home price you can afford based on your income, debts, and down payment.',
        badge: null,
      },
      {
        slug: 'mortgage-comparison',
        href: '/calculators/mortgage-comparison',
        title: 'Amortization Period Comparison',
        description: 'Compare 15, 20, 25, and 30-year amortization side by side — see total interest paid and monthly payment differences.',
        badge: 'New',
      },
      {
        slug: 'rent-vs-buy',
        href: '/calculators/rent-vs-buy',
        title: 'Rent vs Buy Calculator',
        description: 'Compare the true cost of renting vs buying — monthly costs, 10-year net worth, break-even year, stress test, and provincial down payment assistance programs.',
        badge: 'New',
      },
    ],
  },
  {
    id: 'tax',
    title: 'Tax Calculators',
    icon: '🧾',
    description: 'Estimate your federal and provincial income tax, take-home pay, and capital gains.',
    calculators: [
      {
        slug: 'income-tax',
        href: '/calculators/income-tax',
        title: 'Canadian Income Tax Calculator',
        description: 'Calculate federal & provincial income tax, CPP, EI, and take-home pay for 2024 & 2025.',
        badge: 'New',
      },
      {
        slug: 'capital-gains',
        href: '/calculators/capital-gains',
        title: 'Capital Gains Tax Calculator',
        description: 'Calculate capital gains tax under the 2024 inclusion rate changes. Compare old vs new rules, apply principal residence exemption, and see your net proceeds.',
        badge: 'New',
      },
      {
        slug: 'charitable-donation',
        href: '/calculators/charitable-donation',
        title: 'Charitable Donation Tax Credit',
        description: 'Calculate your federal + provincial donation tax credit. See what your generosity truly costs after tax — and why donating securities beats cash.',
        badge: 'New',
      },
    ],
  },
  {
    id: 'savings',
    title: 'Savings & Investments',
    icon: '💰',
    description: 'Grow your TFSA, RRSP, and FHSA — and find out which account is right for your goals.',
    calculators: [
      {
        slug: 'fhsa',
        href: '/calculators/fhsa',
        title: 'FHSA Calculator',
        description: 'Project your First Home Savings Account growth, tax savings, and years to your down payment goal.',
        badge: 'New',
      },
      {
        slug: 'tfsa-contribution-growth',
        href: '/calculator/tfsa-contribution-growth',
        title: 'TFSA Contribution & Growth Estimator',
        description: 'Estimate how much your TFSA will grow based on your contributions and expected annual return.',
        badge: null,
      },
      {
        slug: 'tfsa-vs-rrsp',
        href: '/calculator/tfsa-vs-rrsp',
        title: 'TFSA vs RRSP Comparator',
        description: 'Compare after-tax retirement value of TFSA vs RRSP based on your current and future tax rates.',
        badge: null,
      },
    ],
  },
  {
    id: 'budgeting',
    title: 'Budgeting',
    icon: '📊',
    description: 'Take control of your money — track spending, build a budget, and find out where every dollar goes.',
    calculators: [
      {
        slug: 'budget-5030',
        href: '/calculators/budget-5030',
        title: '50/30/20 Budget Calculator',
        description: 'The simplest budgeting rule — 50% needs, 30% wants, 20% savings. See how your spending stacks up and get personalized tips.',
        badge: 'New',
      },
      {
        slug: 'net-worth',
        href: '/calculators/net-worth',
        title: 'Net Worth Calculator',
        description: 'Calculate everything you own minus everything you owe. Compare to Canadian median by age and track your wealth-building progress.',
        badge: 'New',
      },
    ],
  },
  {
    id: 'debt',
    title: 'Debt Management',
    icon: '💳',
    description: 'Pay off debt faster, compare strategies, and find the best way to reduce your interest costs.',
    calculators: [
      {
        slug: 'debt-payoff',
        href: '/calculators/debt-payoff',
        title: 'Debt Payoff Calculator',
        description: 'See how fast you can get debt-free. Compare avalanche vs snowball strategies, extra payment impact, and refinancing options.',
        badge: 'New',
      },
    ],
  },
  {
    id: 'retirement',
    title: 'Retirement Planning',
    icon: '🌅',
    description: 'Plan your retirement income with CPP estimates and savings projections.',
    calculators: [
      {
        slug: 'cpp-benefits',
        href: '/calculators/cpp-benefits',
        title: 'CPP Benefits Estimator',
        description: 'Estimate your monthly CPP payments at 60, 65, or 70. Find your breakeven age and maximize your lifetime benefit.',
        badge: 'New',
      },
    ],
  },
];

// ─── Ad Slot Component ────────────────────────────────────────────────────────

function AdSlot({ id }: { id: string }) {
  return (
    <div
      id={id}
      className="w-full h-24 bg-gray-100 border border-dashed border-gray-300 rounded-xl flex items-center justify-center"
      aria-label="Advertisement"
    >
      <span className="text-gray-400 text-xs font-medium uppercase tracking-widest">Advertisement</span>
    </div>
  );
}

// ─── Calculator Card ──────────────────────────────────────────────────────────

function CalcCard({ calc }: { calc: typeof CATEGORIES[0]['calculators'][0] }) {
  return (
    <Link
      href={calc.href}
      className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 group"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors leading-snug">
            {calc.title}
          </h3>
          {calc.badge && (
            <span className="ml-2 mt-0.5 shrink-0 bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {calc.badge}
            </span>
          )}
        </div>
        <p className="text-gray-500 text-sm leading-relaxed mb-4">{calc.description}</p>
        <div className="text-blue-600 text-sm font-medium group-hover:underline">
          Try it now →
        </div>
      </div>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">

      {/* Hero */}
      <div className="bg-[#0d1f3c] text-white py-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-black mb-4 tracking-tight">
            Canadian Finance Calculators
          </h1>
          <p className="text-blue-200 text-lg sm:text-xl max-w-2xl mx-auto">
            Free, accurate financial tools built for Canadians — mortgages, taxes, TFSA, RRSP, FHSA, CPP and more.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">

        {/* Ad slot 1 — below hero, high visibility */}
        <AdSlot id="ad-slot-top" />

        {/* Category sections */}
        {CATEGORIES.map((category, idx) => (
          <div key={category.id}>

            {/* Category header */}
            <div className="flex items-center gap-3 mb-5">
              <span className="text-3xl">{category.icon}</span>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{category.title}</h2>
                <p className="text-gray-500 text-sm mt-0.5">{category.description}</p>
              </div>
            </div>

            {/* Calculator cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {category.calculators.map((calc) => (
                <CalcCard key={calc.slug} calc={calc} />
              ))}
            </div>

            {/* Ad slot between categories (not after last one) */}
            {idx < CATEGORIES.length - 1 && (
              <div className="mt-10">
                <AdSlot id={`ad-slot-${category.id}`} />
              </div>
            )}
          </div>
        ))}

        {/* Footer */}
        <div className="border-t border-gray-200 pt-8 text-center text-gray-400 text-sm space-y-2">
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
