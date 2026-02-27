// components/Footer.tsx
import Link from 'next/link';

const FOOTER_LINKS = [
  {
    heading: "Tax Calculators",
    links: [
      { href: "/calculators/income-tax", label: "Income Tax Calculator" },
      { href: "/calculators/self-employed-tax", label: "Self-Employed Tax" },
      { href: "/calculators/capital-gains", label: "Capital Gains" },
      { href: "/calculators/salary-vs-dividend", label: "Salary vs Dividend" },
      { href: "/calculators/cra-instalments", label: "CRA Instalments" },
      { href: "/calculators/cerb-repayment", label: "CERB Repayment" },
      { href: "/calculators/charitable-donation", label: "Charitable Donations" },
      { href: "/calculators/political-contribution", label: "Political Contributions" },
    ],
  },
  {
    heading: "Savings & Retirement",
    links: [
      { href: "/calculators/rrsp-contribution", label: "RRSP Calculator" },
      { href: "/calculators/tfsa-growth", label: "TFSA Growth" },
      { href: "/calculators/tfsa-vs-rrsp", label: "TFSA vs RRSP" },
      { href: "/calculators/fhsa", label: "FHSA Calculator" },
      { href: "/calculators/investment-return", label: "Investment Return" },
      { href: "/calculators/retirement-income", label: "Retirement Income" },
      { href: "/calculators/rrif", label: "RRIF Calculator" },
      { href: "/calculators/cpp-benefits", label: "CPP Benefits" },
    ],
  },
  {
    heading: "Mortgage & Debt",
    links: [
      { href: "/calculators/mortgage-payment", label: "Mortgage Payment" },
      { href: "/calculators/max-affordability", label: "Max Affordability" },
      { href: "/calculators/land-transfer-tax", label: "Land Transfer Tax" },
      { href: "/calculators/rent-vs-buy", label: "Rent vs Buy" },
      { href: "/calculators/auto-loan", label: "Auto Loan" },
      { href: "/calculators/debt-payoff", label: "Debt Payoff" },
      { href: "/calculators/credit-card-minimum-payment", label: "Credit Card Minimum Payment" },
      { href: "/calculators/mortgage-refinance", label: "Mortgage Refinance" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { href: "/tax-deadlines-2025", label: "📅 Tax Deadlines 2025" },
      { href: "/calculators/budget-5030", label: "50/30/20 Budget" },
      { href: "/calculators/net-worth", label: "Net Worth Calculator" },
      { href: "/calculators/emergency-fund", label: "Emergency Fund" },
      { href: "/calculators/resp", label: "RESP Calculator" },
      { href: "/calculators/gic-hisa", label: "GIC / HISA" },
      { href: "/calculators/oas-gis", label: "OAS & GIS" },
      { href: "/calculators/payroll-deductions", label: "Payroll Deductions" },
    ],
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#0d1f3c] text-white mt-16">
      {/* Tax Deadlines Banner */}
      <div className="border-b border-[#1a3260]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm text-blue-200">
            <span className="font-bold text-white">📅 Key 2025 dates:</span>
            {" "}RRSP deadline <span className="text-red-400 font-semibold">Mar 3</span>
            {" · "}Tax filing <span className="text-red-400 font-semibold">Apr 30</span>
            {" · "}Self-employed filing <span className="text-red-400 font-semibold">Jun 15</span>
          </div>
          <Link
            href="/tax-deadlines-2025"
            className="shrink-0 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-full transition-colors"
          >
            See All Tax Deadlines →
          </Link>
        </div>
      </div>

      {/* Main Footer Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {FOOTER_LINKS.map(section => (
            <div key={section.heading}>
              <h3 className="text-xs font-bold text-blue-300 uppercase tracking-widest mb-4">
                {section.heading}
              </h3>
              <ul className="space-y-2">
                {section.links.map(link => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-blue-200 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[#1a3260] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-blue-400">
          <div>
            © {year} Canadian Calculators · Free financial tools for Canadians
          </div>
          <div className="text-center">
            All calculators use {year} tax rates. Not financial advice — consult a qualified advisor for your situation.
          </div>
          <Link href="/" className="text-blue-300 hover:text-white transition-colors">
            All Calculators →
          </Link>
        </div>
      </div>
    </footer>
  );
}
