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
        slug: 'affordability-by-city',
        href: '/calculators/affordability-by-city',
        title: 'Home Affordability by City',
        description: 'Compare home affordability across 20 Canadian cities. See where you qualify, monthly costs, income needed, and land transfer tax — side by side.',
        badge: 'New',
      },
      {
        slug: 'mortgage-payment',
        href: '/calculators/mortgage-payment',
        title: 'Mortgage Payment Calculator',
        description: 'Calculate your monthly payment, CMHC insurance, stress test, total interest, and full amortization schedule.',
        badge: 'New',
      },
      {
        slug: 'max-affordability',
        href: '/calculators/max-affordability',
        title: 'Maximum Home Affordability',
        description: 'Find the maximum home price a lender will approve using GDS/TDS ratios and the stress test. Includes debt impact and conservative vs maximum scenarios.',
        badge: 'New',
      },
      {
        slug: 'mortgage-refinance',
        href: '/calculators/mortgage-refinance',
        title: 'Mortgage Refinance Break-Even',
        description: 'Should you break your mortgage early? Calculate the IRD penalty, total costs, monthly savings, and exact break-even point. Big bank vs monoline comparison.',
        badge: 'New',
      },
      {
        slug: 'mortgage-comparison',
        href: '/calculators/mortgage-comparison',
        title: 'Amortization Period Comparison',
        description: 'Compare 15, 20, 25, and 30-year amortization side by side — see total interest paid and monthly payment differences.',
        badge: 'New',
      },
      {
        slug: 'land-transfer-tax',
        href: '/calculators/land-transfer-tax',
        title: 'Land Transfer Tax Calculator',
        description: 'Calculate provincial land transfer tax for every province. Includes Toronto municipal LTT, first-time buyer rebates, and a province-by-province comparison.',
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
        slug: 'rental-income-tax',
        href: '/calculators/rental-income-tax',
        title: 'Rental Income Tax Calculator',
        description: 'Calculate tax on rental income after expenses, CCA, and deductions. See your net rental income, marginal rate, and year-over-year cash flow across all provinces.',
        badge: 'New',
      },
      {
        slug: 'salary-vs-dividend',
        href: '/calculators/salary-vs-dividend',
        title: 'Salary vs Dividend Calculator',
        description: 'Find the optimal pay mix for your Canadian corporation. Compare after-tax income, RRSP room, CPP trade-offs, and total tax burden for all provinces. 2025 rates.',
        badge: 'New',
      },
      {
        slug: 'payroll-deductions',
        href: '/calculators/payroll-deductions',
        title: 'Payroll Deductions Calculator',
        description: 'Calculate exact take-home pay after income tax, CPP/QPP, EI, RRSP, and benefits. All provinces, all pay frequencies. Includes pay stub view and raise impact.',
        badge: 'New',
      },
      {
        slug: 'self-employed-tax',
        href: '/calculators/self-employed-tax',
        title: 'Self-Employed Tax Calculator',
        description: 'Calculate income tax, CPP (both sides), business deductions, and quarterly instalments for Canadian freelancers and business owners.',
        badge: 'New',
      },
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
        slug: 'rrsp-contribution',
        href: '/calculators/rrsp-contribution',
        title: 'RRSP Contribution Room Calculator',
        description: 'Calculate your available RRSP room for 2024 & 2025. Get your estimated tax refund, check for over-contributions, and see how your contribution grows.',
        badge: 'New',
      },
      {
        slug: 'fhsa',
        href: '/calculators/fhsa',
        title: 'FHSA Calculator',
        description: 'Project your First Home Savings Account growth, tax savings, and years to your down payment goal.',
        badge: 'New',
      },
      {
        slug: 'gic-hisa',
        href: '/calculators/gic-hisa',
        title: 'GIC & HISA Interest Calculator',
        description: 'Calculate compound interest on GICs and high-interest savings accounts. Compare rates, compounding frequencies, and tax impact across account types.',
        badge: 'New',
      },
      {
        slug: 'resp',
        href: '/calculators/resp',
        title: 'RESP Calculator',
        description: 'Project RESP growth with CESG grants, Additional CESG, Canada Learning Bond, and Quebec QESI. Includes year-by-year schedule and university cost coverage.',
        badge: 'New',
      },
      {
        slug: 'tfsa-growth',
        href: '/calculators/tfsa-growth',
        title: 'TFSA Growth Calculator',
        description: 'Project your TFSA balance with investment type presets, contribution room tracker, tax savings estimate, and year-by-year growth chart.',
        badge: 'New',
      },
      {
        slug: 'tfsa-vs-rrsp',
        href: '/calculators/tfsa-vs-rrsp',
        title: 'TFSA vs RRSP Comparator',
        description: 'Side-by-side after-tax comparison, break-even retirement rate, refund reinvestment strategy, and a personalized recommendation for your income and province.',
        badge: 'New',
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
        slug: 'rrif',
        href: '/calculators/rrif',
        title: 'RRIF Withdrawal Calculator',
        description: 'Calculate mandatory minimum withdrawals by age, tax impact, OAS clawback risk, and how long your RRIF will last. Includes spouse age election and year-by-year schedule.',
        badge: 'New',
      },
      {
        slug: 'oas-gis',
        href: '/calculators/oas-gis',
        title: 'OAS & GIS Estimator',
        description: 'Estimate your Old Age Security and Guaranteed Income Supplement. Includes clawback, deferral comparison, partner Allowance, and total government retirement income.',
        badge: 'New',
      },
      {
        slug: 'cpp-benefits',
        href: '/calculators/cpp-benefits',
        title: 'CPP Benefits Estimator',
        description: 'Estimate your monthly CPP payments at 60, 65, or 70. Find your breakeven age and maximize your lifetime benefit.',
        badge: 'New',
      },
      {
        slug: 'retirement-income',
        href: '/calculators/retirement-income',
        title: 'Retirement Income Calculator',
        description: 'Project your retirement income from RRIF, CPP, OAS, TFSA, and pension. Year-by-year drawdown to age 95, OAS clawback warnings, pension income splitting, and spouse scenarios.',
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
