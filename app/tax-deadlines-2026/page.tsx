import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Canadian Tax Deadlines 2026 | CRA Filing & Payment Due Dates',
  description: 'Complete guide to Canadian tax deadlines for 2026. Filing deadlines for individuals, self-employed, corporations, RRSP, TFSA, instalments, and more. Never miss a CRA deadline.',
  keywords: [
    'canadian tax deadlines 2026', 'cra tax filing deadline 2026', 'tax return due date canada 2026',
    'rrsp deadline 2026', 'self employed tax deadline canada 2026', 'corporate tax deadline canada 2026',
    'cra instalment due dates 2026', 'tfsa deadline 2026', 'canada tax payment deadline 2026',
    'when are taxes due canada 2026'
  ],
  openGraph: {
    title: 'Canadian Tax Deadlines 2026 — Complete CRA Due Date Guide',
    description: 'Every important CRA deadline for 2026: personal returns, self-employed, corporations, RRSP, instalments, payroll, and HST/GST remittances.',
    url: 'https://canadiancalculators.ca/tax-deadlines-2026',
  },
  alternates: { canonical: 'https://canadiancalculators.ca/tax-deadlines-2026' },
};

const DEADLINES = [
  {
    date: "March 2, 2026",
    dateShort: "Mar 2",
    category: "RRSP",
    title: "RRSP Contribution Deadline (2025 Tax Year)",
    description: "Last day to make RRSP contributions that can be deducted on your 2025 tax return. The deadline is always 60 days after December 31 — falling on March 2 in 2026. Contributions made between January 1 and March 2, 2026 can be claimed on either your 2025 or 2026 return.",
    whoItAffects: "All RRSP holders",
    penalty: "No penalty for missing — but you lose the 2025 deduction. Over-contributions above the $2,000 buffer are subject to 1%/month tax.",
    urgent: true,
    calculators: [
      { slug: 'rrsp-contribution', title: 'RRSP Contribution Calculator' },
      { slug: 'tfsa-vs-rrsp', title: 'TFSA vs RRSP Calculator' },
    ],
  },
  {
    date: "February 28, 2026",
    dateShort: "Feb 28",
    category: "Employer Reporting",
    title: "T4, T4A, T5 Slips Due to CRA",
    description: "Employers must file all T4 (employment income), T4A (pension/other income), and T5 (investment income) information returns with CRA and distribute copies to employees and recipients by the last day of February.",
    whoItAffects: "Employers, businesses, financial institutions",
    penalty: "$25–$2,500 per return depending on number of slips filed late",
    urgent: false,
    calculators: [],
  },
  {
    date: "March 16, 2026",
    dateShort: "Mar 16",
    category: "Tax Instalments",
    title: "Q1 Tax Instalment Due",
    description: "First quarterly instalment payment for individuals required to pay instalments. Applies to self-employed, rental income earners, and investors whose net tax owing exceeds $3,000 in the current year and either of the two preceding years. March 15 falls on a Sunday in 2026, so the deadline moves to March 16.",
    whoItAffects: "Self-employed, rental/investment income earners owing >$3,000",
    penalty: "CRA prescribed interest rate compounded daily on late or insufficient payments",
    urgent: false,
    calculators: [
      { slug: 'cra-instalments', title: 'CRA Instalment Calculator' },
      { slug: 'self-employed-tax', title: 'Self-Employed Tax Calculator' },
    ],
  },
  {
    date: "April 30, 2026",
    dateShort: "Apr 30",
    category: "Personal Tax",
    title: "Personal Tax Return Filing & Payment Deadline",
    description: "The most important tax deadline for most Canadians. Your 2025 T1 personal income tax return must be filed AND any balance owing must be paid by April 30 to avoid interest and late-filing penalties. This single date covers both filing and payment for employed individuals.",
    whoItAffects: "All Canadian tax residents with income to report",
    penalty: "5% of balance owing + 1% per month for up to 12 months. Interest on unpaid balance at the prescribed rate from May 1.",
    urgent: true,
    calculators: [
      { slug: 'income-tax', title: 'Income Tax Calculator' },
      { slug: 'payroll-deductions', title: 'Payroll Deductions Calculator' },
      { slug: 'capital-gains', title: 'Capital Gains Calculator' },
      { slug: 'rental-income-tax', title: 'Rental Income Tax Calculator' },
    ],
  },
  {
    date: "April 30, 2026",
    dateShort: "Apr 30",
    category: "Benefits",
    title: "Deadline to File to Receive Benefits Without Interruption",
    description: "Filing by April 30 ensures uninterrupted Canada Child Benefit (CCB), GST/HST credit, Ontario Trillium Benefit, and other income-tested benefits. Late filing can cause benefit payments to stop from July onward until your return is assessed.",
    whoItAffects: "Families receiving CCB, individuals receiving GST/HST credit and provincial benefits",
    penalty: "Benefit payments may be suspended from July until return is filed and assessed",
    urgent: true,
    calculators: [],
  },
  {
    date: "June 15, 2026",
    dateShort: "Jun 15",
    category: "Self-Employed",
    title: "Self-Employed Tax Return Filing Deadline",
    description: "Self-employed individuals and their spouses or common-law partners have until June 15 to FILE their 2025 return. However, any taxes owing must still be PAID by April 30 to avoid interest charges. This is the most common source of unexpected CRA interest for self-employed Canadians.",
    whoItAffects: "Self-employed individuals and their spouses/common-law partners",
    penalty: "Late-filing penalty if filed after June 15. Interest on any balance owing accrues from May 1 regardless of filing deadline.",
    urgent: true,
    calculators: [
      { slug: 'self-employed-tax', title: 'Self-Employed Tax Calculator' },
      { slug: 'salary-vs-dividend', title: 'Salary vs Dividend Calculator' },
      { slug: 'cra-instalments', title: 'CRA Instalment Calculator' },
    ],
  },
  {
    date: "June 15, 2026",
    dateShort: "Jun 15",
    category: "Tax Instalments",
    title: "Q2 Tax Instalment Due",
    description: "Second quarterly instalment payment for individuals required to pay instalments. You can use the no-calculation method, prior-year method, or current-year method — whichever results in the lowest payment without triggering interest.",
    whoItAffects: "Self-employed, rental/investment income earners owing >$3,000",
    penalty: "Interest at prescribed rate on late or insufficient payments, compounded daily",
    urgent: false,
    calculators: [
      { slug: 'cra-instalments', title: 'CRA Instalment Calculator' },
    ],
  },
  {
    date: "June 30, 2026",
    dateShort: "Jun 30",
    category: "Corporate Tax",
    title: "Corporate Tax Return (December Year-End)",
    description: "Corporations with a December 31 fiscal year-end must file their T2 corporate income tax return within 6 months of year-end. Note: the balance owing for most CCPCs must be paid within 2 months of year-end (by February 28, 2026) — well before the filing deadline.",
    whoItAffects: "Canadian-controlled private corporations (CCPCs) and other corporations with Dec 31 year-end",
    penalty: "5% of unpaid tax + 1% per month for up to 12 months for late filing",
    urgent: false,
    calculators: [
      { slug: 'salary-vs-dividend', title: 'Salary vs Dividend Calculator' },
    ],
  },
  {
    date: "September 15, 2026",
    dateShort: "Sep 15",
    category: "Tax Instalments",
    title: "Q3 Tax Instalment Due",
    description: "Third quarterly instalment. Under the prior-year method, Q3 and Q4 are adjusted to cover the remainder of last year's total tax after Q1 and Q2 payments. Under the current-year method, all four payments are equal at 25% of estimated current-year tax.",
    whoItAffects: "Self-employed, rental/investment income earners owing >$3,000",
    penalty: "Interest at prescribed rate on late or insufficient payments, compounded daily",
    urgent: false,
    calculators: [
      { slug: 'cra-instalments', title: 'CRA Instalment Calculator' },
    ],
  },
  {
    date: "December 15, 2026",
    dateShort: "Dec 15",
    category: "Tax Instalments",
    title: "Q4 Tax Instalment Due",
    description: "Final quarterly instalment for 2026. After this payment, any remaining balance for 2026 is due on April 30, 2027 when you file your 2026 return. If you've overpaid through instalments, the excess will be refunded after filing.",
    whoItAffects: "Self-employed, rental/investment income earners owing >$3,000",
    penalty: "Interest at prescribed rate on late or insufficient payments, compounded daily",
    urgent: false,
    calculators: [
      { slug: 'cra-instalments', title: 'CRA Instalment Calculator' },
    ],
  },
  {
    date: "December 31, 2026",
    dateShort: "Dec 31",
    category: "Year-End Planning",
    title: "TFSA Contribution & Withdrawal Deadline",
    description: "TFSA contributions must be made by December 31 to count toward your 2026 room. Withdrawals made in 2026 create new contribution room — but only as of January 1, 2027, not immediately. The 2026 TFSA annual limit is expected to be $7,000 (subject to CRA confirmation).",
    whoItAffects: "All TFSA holders",
    penalty: "Over-contributions taxed at 1% per month on the excess amount",
    urgent: false,
    calculators: [
      { slug: 'tfsa-growth', title: 'TFSA Growth Calculator' },
      { slug: 'tfsa-vs-rrsp', title: 'TFSA vs RRSP Calculator' },
    ],
  },
  {
    date: "December 31, 2026",
    dateShort: "Dec 31",
    category: "Year-End Planning",
    title: "Tax-Loss Selling Deadline",
    description: "Last day for investment losses to count against 2026 capital gains. The settlement date — not the trade date — must be on or before December 31. For most Canadian equities settling T+1, you need to sell by approximately December 30. For T+2 markets, sell by December 29.",
    whoItAffects: "Investors with taxable accounts and capital gains to offset",
    penalty: "No CRA penalty — but you permanently lose the opportunity to offset 2026 capital gains",
    urgent: false,
    calculators: [
      { slug: 'capital-gains', title: 'Capital Gains Calculator' },
      { slug: 'investment-return', title: 'Investment Return Calculator' },
    ],
  },
  {
    date: "December 31, 2026",
    dateShort: "Dec 31",
    category: "FHSA",
    title: "FHSA Annual Contribution Deadline",
    description: "First Home Savings Account contributions must be made by December 31 to be deductible on your 2026 return. Annual limit is $8,000; lifetime limit is $40,000. Unused annual room carries forward one year only.",
    whoItAffects: "First-time home buyers with an open FHSA account",
    penalty: "Over-contributions taxed at 1% per month on excess amount",
    urgent: false,
    calculators: [
      { slug: 'fhsa', title: 'FHSA Calculator' },
    ],
  },
  {
    date: "December 31, 2026",
    dateShort: "Dec 31",
    category: "Year-End Planning",
    title: "RRIF Minimum Withdrawal Deadline",
    description: "All RRIF holders must take their minimum annual withdrawal by December 31. Failure to withdraw the minimum results in a tax equal to 100% of the shortfall. Minimum rates increase with age — from 5.28% at age 71 to 20% at age 95+.",
    whoItAffects: "All RRIF holders (anyone who converted their RRSP)",
    penalty: "Tax equal to 100% of the amount that should have been withdrawn but wasn't",
    urgent: false,
    calculators: [
      { slug: 'rrif', title: 'RRIF Calculator' },
      { slug: 'retirement-income', title: 'Retirement Income Calculator' },
    ],
  },
];

const ONGOING = [
  {
    title: "GST/HST Remittances",
    frequency: "Monthly, quarterly, or annually depending on revenue",
    whoItAffects: "GST/HST registrants",
    details: "Businesses with >$6M in annual taxable supplies remit monthly. $1.5M–$6M remit quarterly. Under $1.5M may file annually. Due the last day of the month following the period.",
  },
  {
    title: "Payroll Source Deductions",
    frequency: "Regular (monthly, bi-weekly, or accelerated)",
    whoItAffects: "All employers",
    details: "CPP contributions, EI premiums, and income tax withheld from employees must be remitted to CRA. Schedule depends on average monthly withholding — large employers remit bi-weekly or faster.",
  },
  {
    title: "Corporate Instalment Payments",
    frequency: "Monthly or quarterly",
    whoItAffects: "Most Canadian corporations",
    details: "CCPCs with taxable income under the small business limit may pay quarterly. Larger corporations pay monthly instalments due on the last day of each month.",
  },
  {
    title: "HST New Residential Rental Rebate",
    frequency: "Within 2 years of substantial completion",
    whoItAffects: "Landlords who build or substantially renovate rental properties",
    details: "Claim the HST/GST New Residential Rental Property Rebate within 2 years of the property being first occupied as a rental. Missing this window means losing the rebate permanently.",
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  "RRSP":              "bg-blue-100 text-blue-800",
  "Personal Tax":      "bg-red-100 text-red-800",
  "Self-Employed":     "bg-orange-100 text-orange-800",
  "Tax Instalments":   "bg-purple-100 text-purple-800",
  "Corporate Tax":     "bg-gray-100 text-gray-700",
  "Benefits":          "bg-green-100 text-green-800",
  "Year-End Planning": "bg-amber-100 text-amber-800",
  "Employer Reporting":"bg-teal-100 text-teal-800",
  "FHSA":              "bg-indigo-100 text-indigo-800",
};

export default function TaxDeadlines2026Page() {
  return (
    <main className="min-h-screen bg-gray-50">

      {/* Hero */}
      <div className="bg-[#0d1f3c] text-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-blue-300 text-sm mb-2 font-medium">Tax Resources · 2026</div>
          <h1 className="text-3xl sm:text-4xl font-black mb-4 tracking-tight">
            Canadian Tax Deadlines 2026
          </h1>
          <p className="text-blue-200 text-lg max-w-2xl mb-6">
            Every important CRA deadline for 2026 — personal returns, self-employed, RRSP, instalments, corporations, and year-end planning. Filing your 2025 tax return.
          </p>
          <div className="flex flex-wrap gap-2 text-sm">
            {["RRSP", "Personal Tax", "Self-Employed", "Tax Instalments", "Year-End Planning"].map(cat => (
              <span key={cat} className={`px-3 py-1 rounded-full font-medium ${CATEGORY_COLORS[cat] ?? "bg-gray-100 text-gray-700"}`}>
                {cat}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

        {/* Alert Banner */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-4">
          <span className="text-2xl shrink-0">📅</span>
          <div>
            <div className="font-bold text-red-800 mb-1">Most Important 2026 Dates at a Glance</div>
            <div className="text-red-700 text-sm space-y-1">
              <p><strong>March 2:</strong> RRSP contribution deadline for the 2025 tax year</p>
              <p><strong>April 30:</strong> Personal tax return filing AND payment deadline</p>
              <p><strong>June 15:</strong> Self-employed filing deadline (payment still due Apr 30)</p>
              <p><strong>Dec 31:</strong> TFSA, FHSA, tax-loss selling, and RRIF withdrawal deadline</p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-gray-900">2026 Tax Calendar</h2>

          {DEADLINES.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((d, i) => (
            <div key={i} className={`bg-white rounded-xl shadow-sm border overflow-hidden ${d.urgent ? "border-red-200" : "border-gray-200"}`}>
              <div className="flex items-stretch">
                {/* Date column */}
                <div className={`shrink-0 w-24 flex flex-col items-center justify-center p-4 text-center ${d.urgent ? "bg-red-600 text-white" : "bg-[#0d1f3c] text-white"}`}>
                  <div className="text-xs font-medium opacity-80">{d.dateShort.split(" ")[0]}</div>
                  <div className="text-2xl font-black leading-tight">{d.dateShort.split(" ")[1]}</div>
                  {d.urgent && <div className="text-xs mt-1 bg-white text-red-600 font-bold px-1.5 py-0.5 rounded">KEY</div>}
                </div>

                {/* Content */}
                <div className="flex-1 p-5">
                  <div className="mb-2">
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-1 ${CATEGORY_COLORS[d.category] ?? "bg-gray-100 text-gray-600"}`}>
                      {d.category}
                    </span>
                    <h3 className="font-bold text-gray-900 text-base">{d.title}</h3>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed mb-3">{d.description}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="font-semibold text-gray-500 uppercase tracking-wide mb-1">Who It Affects</div>
                      <div className="text-gray-700">{d.whoItAffects}</div>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-3">
                      <div className="font-semibold text-amber-600 uppercase tracking-wide mb-1">Penalty for Missing</div>
                      <div className="text-amber-800">{d.penalty}</div>
                    </div>
                  </div>

                  {d.calculators.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="text-xs text-gray-400 self-center">Related calculators:</span>
                      {d.calculators.map(c => (
                        <Link key={c.slug} href={`/calculators/${c.slug}`}
                          className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors font-medium">
                          {c.title} →
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Ongoing */}
        <div>
          <h2 className="text-2xl font-black text-gray-900 mb-4">Ongoing CRA Obligations</h2>
          <p className="text-gray-600 text-sm mb-4">These deadlines recur throughout the year and don't have a single annual date.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ONGOING.map((o, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="font-bold text-gray-900 text-sm mb-1">{o.title}</div>
                <div className="text-xs text-blue-700 font-semibold mb-2">{o.frequency}</div>
                <div className="text-xs text-gray-500 mb-1 font-medium">{o.whoItAffects}</div>
                <div className="text-xs text-gray-600 leading-relaxed">{o.details}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RRSP Deep Dive */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 space-y-3">
          <h2 className="text-xl font-black text-blue-900">RRSP Deadline: March 2, 2026</h2>
          <p className="text-blue-800 text-sm leading-relaxed">
            The RRSP deadline is always <strong>60 days after December 31</strong> — falling on March 2 in 2026. Contributions made in the first 60 days of 2026 can be applied to either your 2025 or 2026 return. Your 2025 contribution room is 18% of your 2024 earned income up to a maximum of <strong>$32,490</strong>.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="bg-white rounded-lg p-3">
              <div className="font-bold text-gray-800 mb-1">2025 Contribution Room</div>
              <div className="text-gray-600">18% of 2024 earned income up to <strong>$32,490</strong>. Check your 2024 Notice of Assessment.</div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="font-bold text-gray-800 mb-1">Over-Contribution Buffer</div>
              <div className="text-gray-600">Lifetime over-contribution buffer of <strong>$2,000</strong>. Amounts above are taxed at 1%/month.</div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="font-bold text-gray-800 mb-1">Home Buyers' Plan</div>
              <div className="text-gray-600">Withdraw up to <strong>$35,000</strong> tax-free for a qualifying first home purchase. Repay over 15 years.</div>
            </div>
          </div>
          <Link href="/calculators/rrsp-contribution"
            className="inline-block bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors">
            Calculate Your RRSP Contribution →
          </Link>
        </div>

        {/* Self-Employed Warning */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 space-y-3">
          <h2 className="text-xl font-black text-orange-900">Self-Employed? Read This Carefully</h2>
          <p className="text-orange-800 text-sm leading-relaxed">
            Self-employed Canadians have a <strong>June 15 filing deadline</strong> but an <strong>April 30 payment deadline</strong>. If you owe tax and don't pay by April 30, interest accrues from May 1 — even if you file on time by June 15. This trips up thousands of Canadians every year.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="bg-white rounded-lg p-3">
              <div className="font-bold text-gray-800 mb-1">CPP Contributions</div>
              <div className="text-gray-600">Self-employed pay <strong>both</strong> the employee and employer CPP share — 11.9% of net earnings up to the year's maximum pensionable earnings.</div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="font-bold text-gray-800 mb-1">Quarterly Instalments</div>
              <div className="text-gray-600">If you owe more than $3,000, you must pay quarterly instalments on Mar 16, Jun 15, Sep 15, and Dec 15.</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/calculators/self-employed-tax"
              className="inline-block bg-orange-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-orange-700 transition-colors">
              Self-Employed Tax Calculator →
            </Link>
            <Link href="/calculators/cra-instalments"
              className="inline-block bg-white text-orange-700 border border-orange-300 text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-orange-50 transition-colors">
              CRA Instalment Calculator →
            </Link>
          </div>
        </div>

        {/* Penalties Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-xl font-black text-gray-900">CRA Penalties & Interest</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Situation</th>
                  <th className="px-4 py-3 text-right text-gray-500 font-medium">Penalty / Interest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { situation: "Late filing with balance owing", penalty: "5% of balance + 1%/month up to 12 months" },
                  { situation: "Repeated late filing (within 3 years)", penalty: "10% of balance + 2%/month up to 20 months" },
                  { situation: "Unpaid balance owing", penalty: "Prescribed interest rate, compounded daily from May 1" },
                  { situation: "Late or insufficient instalments", penalty: "Prescribed rate on shortfall, compounded daily" },
                  { situation: "TFSA over-contribution", penalty: "1% per month on excess amount" },
                  { situation: "RRSP over-contribution (above $2,000 buffer)", penalty: "1% per month on excess amount" },
                  { situation: "Failure to report income (repeated)", penalty: "10% of unreported amount" },
                  { situation: "RRIF minimum withdrawal shortfall", penalty: "Tax equal to 100% of the shortfall" },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{row.situation}</td>
                    <td className="px-4 py-3 text-right text-red-600 font-medium">{row.penalty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-black text-gray-900 mb-4">Tips to Never Miss a CRA Deadline</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            {[
              { icon: "📬", tip: "Sign up for CRA My Account to view your RRSP room, benefit amounts, and prior year returns at canada.ca/my-cra-account." },
              { icon: "📱", tip: "Set calendar reminders now: March 2 (RRSP), April 30 (filing/payment), June 15 (self-employed), and the four instalment dates." },
              { icon: "💸", tip: "If you expect to owe tax, pay by April 30 even if you haven't filed yet — this stops interest from accruing immediately." },
              { icon: "🏦", tip: "Add 'CRA – Tax Instalments' or 'Receiver General for Canada' as a payee in online banking for quick same-day payment." },
              { icon: "📊", tip: "Estimate your 2025 taxes early using our income tax calculator so you know what you'll owe well before April 30." },
              { icon: "🗂️", tip: "Collect all slips (T4, T5, T3, T4A, T4RSP) before filing. CRA's Auto-fill My Return imports slips directly into tax software." },
            ].map((t, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-xl shrink-0">{t.icon}</span>
                <p>{t.tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Calculator Grid */}
        <div className="bg-[#0d1f3c] rounded-xl p-6 text-white">
          <h2 className="text-xl font-black mb-2">Prepare for Tax Season</h2>
          <p className="text-blue-200 text-sm mb-5">Use our free Canadian tax calculators to estimate what you'll owe before the deadline.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { slug: 'income-tax', title: 'Income Tax Calculator' },
              { slug: 'rrsp-contribution', title: 'RRSP Contribution Calculator' },
              { slug: 'self-employed-tax', title: 'Self-Employed Tax Calculator' },
              { slug: 'capital-gains', title: 'Capital Gains Calculator' },
              { slug: 'cra-instalments', title: 'CRA Instalment Calculator' },
              { slug: 'cerb-repayment', title: 'CERB Repayment Calculator' },
              { slug: 'salary-vs-dividend', title: 'Salary vs Dividend Calculator' },
              { slug: 'charitable-donation', title: 'Charitable Donation Credit' },
              { slug: 'political-contribution', title: 'Political Contribution Credit' },
            ].map(c => (
              <Link key={c.slug} href={`/calculators/${c.slug}`}
                className="bg-white/10 hover:bg-white/20 transition-colors rounded-lg px-4 py-3 text-sm font-medium text-white border border-white/20">
                {c.title} →
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-amber-800 text-xs leading-relaxed">
          <strong>Disclaimer:</strong> This page provides general information about CRA tax deadlines for 2026 based on publicly available information. Deadlines may change — always verify with the CRA website at canada.ca or consult a tax professional. When a deadline falls on a weekend or holiday, CRA typically extends it to the next business day. The 2026 TFSA limit and other indexed amounts are subject to official CRA confirmation.
        </div>

      </div>
    </main>
  );
}
