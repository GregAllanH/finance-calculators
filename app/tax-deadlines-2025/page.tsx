import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Canadian Tax Deadlines 2025 | CRA Filing & Payment Due Dates',
  description: 'Complete guide to Canadian tax deadlines for 2025. Filing deadlines for individuals, self-employed, corporations, RRSP, TFSA, instalments, and more. Never miss a CRA deadline.',
  keywords: [
    'canadian tax deadlines 2025', 'cra tax filing deadline 2025', 'tax return due date canada 2025',
    'rrsp deadline 2025', 'self employed tax deadline canada', 'corporate tax deadline canada 2025',
    'cra instalment due dates 2025', 'tfsa deadline 2025', 'canada tax payment deadline',
    'when are taxes due canada 2025'
  ],
  openGraph: {
    title: 'Canadian Tax Deadlines 2025 — Complete CRA Due Date Guide',
    description: 'Every important CRA deadline for 2025: personal returns, self-employed, corporations, RRSP, instalments, payroll, and HST/GST remittances.',
    url: 'https://canadiancalculators.ca/tax-deadlines-2025',
  },
  alternates: { canonical: 'https://canadiancalculators.ca/tax-deadlines-2025' },
};

const DEADLINES = [
  {
    date: "February 28, 2025",
    dateShort: "Feb 28",
    category: "Employer Reporting",
    title: "T4, T4A, T5 Slips Due to CRA",
    description: "Employers must file all T4 (employment income), T4A (pension/other income), and T5 (investment income) information returns with CRA and distribute copies to employees/recipients.",
    whoItAffects: "Employers, businesses, financial institutions",
    penalty: "$25–$2,500 per return depending on number of slips",
    urgent: false,
    calculators: [],
  },
  {
    date: "March 3, 2025",
    dateShort: "Mar 3",
    category: "RRSP",
    title: "RRSP Contribution Deadline (2024 Tax Year)",
    description: "Last day to make RRSP contributions that can be deducted on your 2024 tax return. Contributions made between January 1 and March 3, 2025 can be claimed on either your 2024 or 2025 return.",
    whoItAffects: "All RRSP holders",
    penalty: "No penalty for missing — but you lose the 2024 deduction. Over-contributions are subject to 1%/month tax.",
    urgent: true,
    calculators: [
      { slug: 'rrsp-contribution', title: 'RRSP Contribution Calculator' },
      { slug: 'tfsa-vs-rrsp', title: 'TFSA vs RRSP Calculator' },
    ],
  },
  {
    date: "March 15, 2025",
    dateShort: "Mar 15",
    category: "Tax Instalments",
    title: "Q1 Tax Instalment Due",
    description: "First quarterly instalment payment due for individuals who owe more than $3,000 in tax and are required to pay instalments. Applies to self-employed, rental income, and investment income earners.",
    whoItAffects: "Self-employed, rental/investment income earners owing >$3,000",
    penalty: "CRA prescribed interest rate (10% in 2025) compounded daily on late payments",
    urgent: false,
    calculators: [
      { slug: 'cra-instalments', title: 'CRA Instalment Calculator' },
      { slug: 'self-employed-tax', title: 'Self-Employed Tax Calculator' },
    ],
  },
  {
    date: "April 30, 2025",
    dateShort: "Apr 30",
    category: "Personal Tax",
    title: "Personal Tax Return Filing & Payment Deadline",
    description: "The most important tax deadline for most Canadians. Your 2024 T1 personal income tax return must be filed AND any balance owing must be paid by this date to avoid interest and late-filing penalties.",
    whoItAffects: "All Canadian tax residents with income to report",
    penalty: "5% of balance owing + 1% per month for up to 12 months. Interest on unpaid balance at prescribed rate.",
    urgent: true,
    calculators: [
      { slug: 'income-tax', title: 'Income Tax Calculator' },
      { slug: 'payroll-deductions', title: 'Payroll Deductions Calculator' },
      { slug: 'capital-gains', title: 'Capital Gains Calculator' },
      { slug: 'rental-income-tax', title: 'Rental Income Tax Calculator' },
    ],
  },
  {
    date: "April 30, 2025",
    dateShort: "Apr 30",
    category: "Benefits",
    title: "Deadline to File to Receive Benefits Without Interruption",
    description: "Filing by April 30 ensures uninterrupted Canada Child Benefit (CCB), GST/HST credit, and other income-tested benefits. Late filing can cause benefit payments to stop from July onward.",
    whoItAffects: "Families receiving CCB, individuals receiving GST/HST credit",
    penalty: "Benefit payments may be suspended from July until return is filed",
    urgent: true,
    calculators: [],
  },
  {
    date: "June 15, 2025",
    dateShort: "Jun 15",
    category: "Self-Employed",
    title: "Self-Employed Tax Return Filing Deadline",
    description: "Self-employed individuals and their spouses/common-law partners have until June 15 to FILE their return. However, any taxes owing must still be PAID by April 30 to avoid interest charges.",
    whoItAffects: "Self-employed individuals and their spouses",
    penalty: "Interest on any balance owing accrues from May 1 even though filing deadline is June 15",
    urgent: true,
    calculators: [
      { slug: 'self-employed-tax', title: 'Self-Employed Tax Calculator' },
      { slug: 'salary-vs-dividend', title: 'Salary vs Dividend Calculator' },
      { slug: 'cra-instalments', title: 'CRA Instalment Calculator' },
    ],
  },
  {
    date: "June 15, 2025",
    dateShort: "Jun 15",
    category: "Tax Instalments",
    title: "Q2 Tax Instalment Due",
    description: "Second quarterly instalment payment for individuals required to pay instalments. You can use the no-calculation, prior-year, or current-year method — whichever results in the lowest payment.",
    whoItAffects: "Self-employed, rental/investment income earners owing >$3,000",
    penalty: "Interest at prescribed rate on late or insufficient payments",
    urgent: false,
    calculators: [
      { slug: 'cra-instalments', title: 'CRA Instalment Calculator' },
    ],
  },
  {
    date: "June 30, 2025",
    dateShort: "Jun 30",
    category: "Corporate Tax",
    title: "Corporate Tax Return (December Year-End)",
    description: "Corporations with a December 31 fiscal year-end must file their T2 corporate income tax return within 6 months of year-end. Balance owing must be paid within 2–3 months of year-end (February/March).",
    whoItAffects: "Canadian-controlled private corporations (CCPCs) and other corporations",
    penalty: "5% of unpaid tax + 1% per month for up to 12 months",
    urgent: false,
    calculators: [
      { slug: 'salary-vs-dividend', title: 'Salary vs Dividend Calculator' },
    ],
  },
  {
    date: "September 15, 2025",
    dateShort: "Sep 15",
    category: "Tax Instalments",
    title: "Q3 Tax Instalment Due",
    description: "Third quarterly instalment. Under the prior-year method, Q3 and Q4 payments are adjusted to cover the remainder of last year's total tax after Q1 and Q2 payments.",
    whoItAffects: "Self-employed, rental/investment income earners owing >$3,000",
    penalty: "Interest at prescribed rate on late or insufficient payments",
    urgent: false,
    calculators: [
      { slug: 'cra-instalments', title: 'CRA Instalment Calculator' },
    ],
  },
  {
    date: "December 15, 2025",
    dateShort: "Dec 15",
    category: "Tax Instalments",
    title: "Q4 Tax Instalment Due",
    description: "Final quarterly instalment for 2025. After this payment, any remaining balance for 2025 is due on April 30, 2026 when your 2025 return is filed.",
    whoItAffects: "Self-employed, rental/investment income earners owing >$3,000",
    penalty: "Interest at prescribed rate on late or insufficient payments",
    urgent: false,
    calculators: [
      { slug: 'cra-instalments', title: 'CRA Instalment Calculator' },
    ],
  },
  {
    date: "December 31, 2025",
    dateShort: "Dec 31",
    category: "Year-End Planning",
    title: "Last Day for TFSA Contributions & Withdrawals to Count for 2025",
    description: "TFSA contributions and withdrawals must be made by December 31 to count in the current year. Withdrawals in 2025 create new contribution room — but only as of January 1, 2026, not immediately.",
    whoItAffects: "All TFSA holders",
    penalty: "Over-contributions are taxed at 1% per month",
    urgent: false,
    calculators: [
      { slug: 'tfsa-growth', title: 'TFSA Growth Calculator' },
      { slug: 'tfsa-vs-rrsp', title: 'TFSA vs RRSP Calculator' },
    ],
  },
  {
    date: "December 31, 2025",
    dateShort: "Dec 31",
    category: "Year-End Planning",
    title: "Tax-Loss Selling Deadline",
    description: "The last day to sell non-registered investments at a loss to offset capital gains realized in 2025. The settlement date (not trade date) must be on or before December 31. For most equities, you need to sell by approximately December 27 to ensure settlement by Dec 31.",
    whoItAffects: "Investors with taxable accounts and capital gains to offset",
    penalty: "No penalty — but you miss the opportunity to reduce your 2025 capital gains",
    urgent: false,
    calculators: [
      { slug: 'capital-gains', title: 'Capital Gains Calculator' },
      { slug: 'investment-return', title: 'Investment Return Calculator' },
    ],
  },
  {
    date: "December 31, 2025",
    dateShort: "Dec 31",
    category: "FHSA",
    title: "FHSA Annual Contribution Deadline",
    description: "First Home Savings Account contributions must be made by December 31 to be deductible for the 2025 tax year. Annual limit is $8,000; lifetime limit is $40,000. Unused room carries forward.",
    whoItAffects: "First-time home buyers who have opened an FHSA",
    penalty: "Over-contributions taxed at 1% per month",
    urgent: false,
    calculators: [
      { slug: 'fhsa', title: 'FHSA Calculator' },
    ],
  },
];

const ONGOING = [
  {
    title: "GST/HST Monthly Remittances",
    frequency: "Monthly (due by the last day of the following month)",
    whoItAffects: "Businesses with >$6M in annual taxable supplies",
    details: "Large businesses must remit GST/HST monthly. Quarterly filers remit by the last day of the month following the quarter-end.",
  },
  {
    title: "Payroll Source Deductions",
    frequency: "Regular (threshold-based: monthly, bi-weekly, or accelerated)",
    whoItAffects: "All employers",
    details: "Employers must remit CPP, EI, and income tax withheld from employees. The remittance schedule depends on your average monthly withholding amount.",
  },
  {
    title: "Corporate Instalment Payments",
    frequency: "Monthly or quarterly",
    whoItAffects: "Most Canadian corporations",
    details: "CCPCs with taxable income under the small business limit may pay quarterly. Larger corporations pay monthly instalments.",
  },
  {
    title: "RRIF Minimum Withdrawals",
    frequency: "Annual (must withdraw by December 31)",
    whoItAffects: "All RRIF holders",
    details: "Minimum annual withdrawals are mandatory starting the year after converting your RRSP to a RRIF. Rates increase with age from 5.28% at 71 to 20% at 95.",
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  "RRSP":             "bg-blue-100 text-blue-800",
  "Personal Tax":     "bg-red-100 text-red-800",
  "Self-Employed":    "bg-orange-100 text-orange-800",
  "Tax Instalments":  "bg-purple-100 text-purple-800",
  "Corporate Tax":    "bg-gray-100 text-gray-700",
  "Benefits":         "bg-green-100 text-green-800",
  "Year-End Planning":"bg-amber-100 text-amber-800",
  "Employer Reporting":"bg-teal-100 text-teal-800",
  "FHSA":             "bg-indigo-100 text-indigo-800",
};

export default function TaxDeadlines2025Page() {
  return (
    <main className="min-h-screen bg-gray-50">

      {/* Hero */}
      <div className="bg-[#0d1f3c] text-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-blue-300 text-sm mb-2 font-medium">Tax Resources · 2025</div>
          <h1 className="text-3xl sm:text-4xl font-black mb-4 tracking-tight">
            Canadian Tax Deadlines 2025
          </h1>
          <p className="text-blue-200 text-lg max-w-2xl mb-6">
            Every important CRA deadline for 2025 — personal returns, self-employed, RRSP, instalments, corporations, and year-end planning. Updated for the 2024 tax year.
          </p>
          {/* Quick Jump */}
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
            <div className="font-bold text-red-800 mb-1">Most Important Dates at a Glance</div>
            <div className="text-red-700 text-sm space-y-1">
              <p><strong>March 3:</strong> RRSP contribution deadline for 2024 tax year</p>
              <p><strong>April 30:</strong> Personal tax return filing AND payment deadline</p>
              <p><strong>June 15:</strong> Self-employed filing deadline (but payment still due Apr 30)</p>
              <p><strong>Dec 31:</strong> TFSA, FHSA, tax-loss selling, and RRIF withdrawal deadline</p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-gray-900">2025 Tax Calendar</h2>

          {DEADLINES.map((d, i) => (
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
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-1 ${CATEGORY_COLORS[d.category] ?? "bg-gray-100 text-gray-600"}`}>
                        {d.category}
                      </span>
                      <h3 className="font-bold text-gray-900 text-base">{d.title}</h3>
                    </div>
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

        {/* Ongoing Obligations */}
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
          <h2 className="text-xl font-black text-blue-900">RRSP Deadline: March 3, 2025</h2>
          <p className="text-blue-800 text-sm leading-relaxed">
            The RRSP deadline is always <strong>60 days after December 31</strong> — which falls on March 3 in 2025 (March 1 in non-leap years). Contributions made in the first 60 days of the year can be applied to either the previous tax year or the current tax year.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="bg-white rounded-lg p-3">
              <div className="font-bold text-gray-800 mb-1">2024 Contribution Room</div>
              <div className="text-gray-600">18% of 2023 earned income up to <strong>$31,560</strong>. Check your 2023 Notice of Assessment.</div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="font-bold text-gray-800 mb-1">Over-Contribution Limit</div>
              <div className="text-gray-600">Lifetime over-contribution buffer of <strong>$2,000</strong>. Amounts above that are taxed at 1%/month.</div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="font-bold text-gray-800 mb-1">Home Buyers' Plan</div>
              <div className="text-gray-600">Withdraw up to <strong>$35,000</strong> tax-free for a first home purchase (must repay over 15 years).</div>
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
            Self-employed Canadians have a <strong>June 15 filing deadline</strong> but an <strong>April 30 payment deadline</strong>. This trips up thousands of Canadians every year. If you owe tax and don't pay by April 30, interest accrues from May 1 — even if you file on time by June 15.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="bg-white rounded-lg p-3">
              <div className="font-bold text-gray-800 mb-1">CPP Contributions</div>
              <div className="text-gray-600">Self-employed pay <strong>both</strong> the employee and employer CPP share — 11.9% of net earnings up to $71,300. This is a major part of your tax bill.</div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="font-bold text-gray-800 mb-1">Quarterly Instalments</div>
              <div className="text-gray-600">If you owe more than $3,000, you must pay quarterly instalments. Missing them triggers CRA interest at 10%.</div>
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

        {/* Penalties Explainer */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-xl font-black text-gray-900">CRA Penalties & Interest in 2025</h2>
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
                  { situation: "Late filing (balance owing)", penalty: "5% of balance + 1%/month for up to 12 months" },
                  { situation: "Repeated late filing (within 3 years)", penalty: "10% of balance + 2%/month for up to 20 months" },
                  { situation: "Unpaid balance owing", penalty: "Prescribed interest rate (10% in 2025), compounded daily" },
                  { situation: "Late or insufficient instalments", penalty: "Prescribed rate on shortfall, compounded daily" },
                  { situation: "TFSA over-contribution", penalty: "1% per month on excess amount" },
                  { situation: "RRSP over-contribution (above $2,000 buffer)", penalty: "1% per month on excess amount" },
                  { situation: "Failure to report income (repeated)", penalty: "10% of unreported amount" },
                  { situation: "Gross negligence / tax evasion", penalty: "50% of unpaid tax + possible criminal charges" },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{row.situation}</td>
                    <td className="px-4 py-3 text-right text-red-600 font-medium">{row.penalty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500">The prescribed interest rate for 2025 Q1 is 10%. This rate is set quarterly by CRA based on the 90-day T-bill rate plus 4%.</p>
        </div>

        {/* Tips */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-black text-gray-900 mb-4">Tips to Never Miss a CRA Deadline</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            {[
              { icon: "📬", tip: "Sign up for CRA My Account — view your RRSP room, benefit amounts, and filing status online at canada.ca." },
              { icon: "📱", tip: "Set calendar reminders for March 3, April 30, and the four instalment dates (Mar 15, Jun 15, Sep 15, Dec 15)." },
              { icon: "💸", tip: "If you expect to owe tax, pay by April 30 even if you haven't filed yet — this stops interest from accruing." },
              { icon: "🏦", tip: "Add 'CRA – Tax Instalments' or 'Receiver General for Canada' as a payee in your online banking for quick payment." },
              { icon: "📊", tip: "Estimate your taxes in January using our income tax calculator so you know what you'll owe before April 30." },
              { icon: "🗂️", tip: "Collect all slips (T4, T5, T3, T4A) before filing. CRA's Auto-fill My Return can import slips directly into tax software." },
            ].map((t, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-xl shrink-0">{t.icon}</span>
                <p>{t.tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Calculator Links */}
        <div className="bg-[#0d1f3c] rounded-xl p-6 text-white">
          <h2 className="text-xl font-black mb-2">Prepare for Tax Season</h2>
          <p className="text-blue-200 text-sm mb-5">Use our free Canadian tax calculators to estimate what you owe before the deadline.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { slug: 'income-tax', title: '2024 Income Tax Calculator' },
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

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-amber-800 text-xs leading-relaxed">
          <strong>Disclaimer:</strong> This page provides general information about CRA tax deadlines for 2025 based on publicly available information. Deadlines may change — always verify with the CRA website at canada.ca or consult a tax professional. This is not tax advice. Some deadlines fall on weekends or holidays, in which case CRA typically extends to the next business day.
        </div>

      </div>
    </main>
  );
}
