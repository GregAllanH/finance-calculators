"use client";

import { useState, useMemo } from "react";
import { NumericFormat } from "react-number-format";
import PrintButton from "@/components/PrintButton";

// ─── 2025 Tax Data ────────────────────────────────────────────────────────────

const FEDERAL_BRACKETS = [
  { min: 0, max: 57375, rate: 0.15 },
  { min: 57375, max: 114750, rate: 0.205 },
  { min: 114750, max: 158519, rate: 0.26 },
  { min: 158519, max: 220000, rate: 0.29 },
  { min: 220000, max: Infinity, rate: 0.33 },
];

const FED_BASIC_PERSONAL = 16129;
const CPP_MAX_EARNINGS = 71300;
const CPP_BASIC_EXEMPTION = 3500;
const CPP_RATE = 0.0595;
const CPP_EMPLOYER_RATE = 0.0595;
const EI_MAX_INSURABLE = 65700;
const EI_RATE = 0.0166;
const CRA_INSTALMENT_RATE = 0.10; // prescribed interest rate for 2025

const PROV_BRACKETS: Record<string, {
  name: string;
  brackets: { min: number; max: number; rate: number }[];
  basic: number;
  surtax?: { t1: number; r1: number; t2?: number; r2?: number };
}> = {
  AB: { name: "Alberta", basic: 21003, brackets: [{ min: 0, max: 148269, rate: 0.10 }, { min: 148269, max: 177922, rate: 0.12 }, { min: 177922, max: 237230, rate: 0.13 }, { min: 237230, max: 355845, rate: 0.14 }, { min: 355845, max: Infinity, rate: 0.15 }] },
  BC: { name: "British Columbia", basic: 11981, brackets: [{ min: 0, max: 45654, rate: 0.0506 }, { min: 45654, max: 91310, rate: 0.077 }, { min: 91310, max: 104835, rate: 0.105 }, { min: 104835, max: 127299, rate: 0.1229 }, { min: 127299, max: 172602, rate: 0.147 }, { min: 172602, max: 240716, rate: 0.168 }, { min: 240716, max: Infinity, rate: 0.205 }] },
  MB: { name: "Manitoba", basic: 15780, brackets: [{ min: 0, max: 47000, rate: 0.108 }, { min: 47000, max: 100000, rate: 0.1275 }, { min: 100000, max: Infinity, rate: 0.174 }] },
  NB: { name: "New Brunswick", basic: 12458, brackets: [{ min: 0, max: 49958, rate: 0.094 }, { min: 49958, max: 99916, rate: 0.14 }, { min: 99916, max: 185064, rate: 0.16 }, { min: 185064, max: Infinity, rate: 0.195 }] },
  NL: { name: "Newfoundland & Labrador", basic: 10818, brackets: [{ min: 0, max: 43198, rate: 0.087 }, { min: 43198, max: 86395, rate: 0.145 }, { min: 86395, max: 154244, rate: 0.158 }, { min: 154244, max: 215943, rate: 0.178 }, { min: 215943, max: Infinity, rate: 0.198 }] },
  NS: { name: "Nova Scotia", basic: 8481, brackets: [{ min: 0, max: 29590, rate: 0.0879 }, { min: 29590, max: 59180, rate: 0.1495 }, { min: 59180, max: 93000, rate: 0.1667 }, { min: 93000, max: 150000, rate: 0.175 }, { min: 150000, max: Infinity, rate: 0.21 }] },
  ON: { name: "Ontario", basic: 11865, brackets: [{ min: 0, max: 51446, rate: 0.0505 }, { min: 51446, max: 102894, rate: 0.0915 }, { min: 102894, max: 150000, rate: 0.1116 }, { min: 150000, max: 220000, rate: 0.1216 }, { min: 220000, max: Infinity, rate: 0.1316 }], surtax: { t1: 5315, r1: 0.20, t2: 6802, r2: 0.36 } },
  PE: { name: "Prince Edward Island", basic: 12000, brackets: [{ min: 0, max: 32656, rate: 0.096 }, { min: 32656, max: 64313, rate: 0.1337 }, { min: 64313, max: 105000, rate: 0.167 }, { min: 105000, max: Infinity, rate: 0.18 }] },
  QC: { name: "Quebec", basic: 17183, brackets: [{ min: 0, max: 53255, rate: 0.14 }, { min: 53255, max: 106495, rate: 0.19 }, { min: 106495, max: 129590, rate: 0.24 }, { min: 129590, max: Infinity, rate: 0.2575 }] },
  SK: { name: "Saskatchewan", basic: 17661, brackets: [{ min: 0, max: 49720, rate: 0.105 }, { min: 49720, max: 142058, rate: 0.125 }, { min: 142058, max: Infinity, rate: 0.145 }] },
  NT: { name: "Northwest Territories", basic: 16593, brackets: [{ min: 0, max: 50597, rate: 0.059 }, { min: 50597, max: 101198, rate: 0.086 }, { min: 101198, max: 164525, rate: 0.122 }, { min: 164525, max: Infinity, rate: 0.1405 }] },
  NU: { name: "Nunavut", basic: 17925, brackets: [{ min: 0, max: 53268, rate: 0.04 }, { min: 53268, max: 106537, rate: 0.07 }, { min: 106537, max: 173205, rate: 0.09 }, { min: 173205, max: Infinity, rate: 0.115 }] },
  YT: { name: "Yukon", basic: 15705, brackets: [{ min: 0, max: 57375, rate: 0.064 }, { min: 57375, max: 114750, rate: 0.09 }, { min: 114750, max: 500000, rate: 0.109 }, { min: 500000, max: Infinity, rate: 0.128 }] },
};

// ─── Tax Helpers ──────────────────────────────────────────────────────────────

function calcBracketTax(income: number, brackets: { min: number; max: number; rate: number }[]): number {
  let tax = 0;
  for (const b of brackets) {
    if (income <= b.min) break;
    tax += (Math.min(income, b.max) - b.min) * b.rate;
  }
  return tax;
}

function calcTotalTax(
  income: number,
  province: string,
  isSelfEmployed: boolean,
  withheld: number
): { federal: number; provincial: number; cpp: number; ei: number; total: number; netOwing: number } {
  const prov = PROV_BRACKETS[province];

  // Federal
  const fedBasic = FED_BASIC_PERSONAL * 0.15;
  const fedBracket = calcBracketTax(income, FEDERAL_BRACKETS);

  // CPP
  const cpp = isSelfEmployed
    ? Math.min(Math.max(0, income - CPP_BASIC_EXEMPTION) * (CPP_RATE + CPP_EMPLOYER_RATE), (CPP_MAX_EARNINGS - CPP_BASIC_EXEMPTION) * (CPP_RATE + CPP_EMPLOYER_RATE))
    : Math.min(Math.max(0, income - CPP_BASIC_EXEMPTION) * CPP_RATE, (CPP_MAX_EARNINGS - CPP_BASIC_EXEMPTION) * CPP_RATE);
  const cppCredit = Math.min(Math.max(0, income - CPP_BASIC_EXEMPTION) * CPP_RATE, (CPP_MAX_EARNINGS - CPP_BASIC_EXEMPTION) * CPP_RATE) * 0.15;

  // EI (not for self-employed unless opted in)
  const ei = isSelfEmployed ? 0 : Math.min(income * EI_RATE, EI_MAX_INSURABLE * EI_RATE);
  const eiCredit = ei * 0.15;

  const federal = Math.max(0, fedBracket - fedBasic - cppCredit - eiCredit);

  // Provincial
  const provBasic = prov.basic * prov.brackets[0].rate;
  let provincial = Math.max(0, calcBracketTax(income, prov.brackets) - provBasic);

  // Ontario surtax
  if (prov.surtax) {
    const s = prov.surtax;
    let surtax = 0;
    if (provincial > s.t1) surtax += (provincial - s.t1) * s.r1;
    if (s.t2 && provincial > s.t2) surtax += (provincial - s.t2) * s.r2!;
    provincial += surtax;
  }

  const total = federal + provincial + cpp + ei;
  const netOwing = Math.max(0, total - withheld);

  return { federal, provincial, cpp, ei, total, netOwing };
}

// ─── Instalment Due Dates 2025 ────────────────────────────────────────────────

const INSTALMENT_DATES_2025 = [
  { label: "March 15, 2025",    quarter: 1, fraction: 1 / 4 },
  { label: "June 15, 2025",     quarter: 2, fraction: 2 / 4 },
  { label: "September 15, 2025",quarter: 3, fraction: 3 / 4 },
  { label: "December 15, 2025", quarter: 4, fraction: 4 / 4 },
];

// ─── Formatting ───────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
}
function fmtFull(n: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

// ─── Component ────────────────────────────────────────────────────────────────

type IncomeType = "selfEmployed" | "rental" | "investment" | "employment";

export default function CRAInstalmentClient() {
  const [incomeType, setIncomeType] = useState<IncomeType>("selfEmployed");
  const [currentIncome, setCurrentIncome] = useState(0);
  const [priorIncome, setPriorIncome] = useState(0);
  const [twoYearPriorIncome, setTwoYearPriorIncome] = useState(0);
  const [withheld, setWithheld] = useState(0);
  const [province, setProvince] = useState("ON");
  const [missedPayments, setMissedPayments] = useState(0);
  const [showInfo, setShowInfo] = useState(false);

  const isSelfEmployed = incomeType === "selfEmployed";

  // Gate: need at least current year income
  const hasResults = currentIncome > 0 || priorIncome > 0;

  const results = useMemo(() => {
    if (!hasResults) return null;

    const current = calcTotalTax(currentIncome, province, isSelfEmployed, withheld);
    const prior = priorIncome > 0
      ? calcTotalTax(priorIncome, province, isSelfEmployed, 0)
      : null;
    const twoYearPrior = twoYearPriorIncome > 0
      ? calcTotalTax(twoYearPriorIncome, province, isSelfEmployed, 0)
      : null;

    // CRA Method 1: No-calculation (prior year instalments)
    // Pay same total as prior year tax owing, in 4 equal quarterly instalments
    const method1Annual = prior ? prior.total : current.total;
    const method1Quarterly = method1Annual / 4;

    // CRA Method 2: Prior-year instalment method
    // Q1+Q2: based on 2 years prior. Q3+Q4: adjusted to prior year total
    const twoYearBase = twoYearPrior ? twoYearPrior.total : method1Annual;
    const priorYearBase = prior ? prior.total : method1Annual;
    const method2Q1Q2 = twoYearBase / 4;
    const method2Q3Q4 = Math.max(0, (priorYearBase - twoYearBase / 2)) / 2;

    // CRA Method 3: Current-year instalment method
    // Pay estimated current year tax in 4 equal instalments
    const method3Quarterly = current.total / 4;

    // Recommended method (lowest total payments)
    const method1Total = method1Quarterly * 4;
    const method2Total = method2Q1Q2 * 2 + method2Q3Q4 * 2;
    const method3Total = method3Quarterly * 4;

    const methods = [
      { id: 1, name: "No-Calculation Method", total: method1Total, quarterly: method1Quarterly, description: "Pay the same amount you owed last year, divided into 4 equal quarterly instalments. Simplest option — no math required." },
      { id: 2, name: "Prior-Year Method", total: method2Total, q1q2: method2Q1Q2, q3q4: method2Q3Q4, description: "Q1 & Q2 based on 2 years ago; Q3 & Q4 adjusted to last year's total. Good if income has been stable." },
      { id: 3, name: "Current-Year Method", total: method3Total, quarterly: method3Quarterly, description: "Pay estimated current year tax in 4 equal instalments. Best if income is lower this year — but requires estimating your income." },
    ];

    const recommended = methods.reduce((a, b) => a.total < b.total ? a : b);

    // Instalment schedule for recommended method
    const schedule = INSTALMENT_DATES_2025.map((d, i) => {
      let amount = 0;
      if (recommended.id === 1) {
        amount = method1Quarterly;
      } else if (recommended.id === 2) {
        amount = i < 2 ? method2Q1Q2 : method2Q3Q4;
      } else {
        amount = method3Quarterly;
      }
      return { ...d, amount, cumulative: 0 };
    });

    // Add cumulative
    let cum = 0;
    schedule.forEach(s => { cum += s.amount; s.cumulative = cum; });

    // Penalty estimate for missed payments
    const perPayment = recommended.total / 4;
    const penaltyEstimate = missedPayments > 0
      ? missedPayments * perPayment * CRA_INSTALMENT_RATE * (3 / 12)
      : 0;

    // Balance owing at filing (Apr 30)
    const balanceOwing = Math.max(0, current.netOwing - recommended.total + current.total - current.netOwing);

    return {
      current, prior, methods, recommended, schedule,
      method1Quarterly, method2Q1Q2, method2Q3Q4, method3Quarterly,
      penaltyEstimate, balanceOwing,
    };
  }, [currentIncome, priorIncome, twoYearPriorIncome, withheld, province, isSelfEmployed, missedPayments, hasResults]);

  const incomeTypes: { key: IncomeType; label: string; icon: string }[] = [
    { key: "selfEmployed", label: "Self-Employed", icon: "💼" },
    { key: "rental", label: "Rental Income", icon: "🏠" },
    { key: "investment", label: "Investment Income", icon: "📈" },
    { key: "employment", label: "Employment (no withheld)", icon: "👤" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* Info Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl overflow-hidden">
        <button onClick={() => setShowInfo(!showInfo)}
          className="w-full flex items-center justify-between px-5 py-3 text-blue-800 font-semibold text-sm">
          <span>💡 Who needs to pay CRA instalments?</span>
          <span>{showInfo ? "▲ Hide" : "▼ Show"}</span>
        </button>
        {showInfo && (
          <div className="px-5 pb-4 text-blue-900 text-sm space-y-2">
            <p>You must pay tax by instalments if your <strong>net tax owing exceeds $3,000</strong> (or $1,800 in Quebec) in the current year AND in either of the two preceding years. This applies to self-employed individuals, rental income earners, investors with large investment income, and anyone without sufficient tax withheld at source.</p>
            <p>CRA offers <strong>three methods</strong> to calculate instalments — you can choose whichever results in the lowest total payment. As long as you pay at least the amount CRA calculates under the no-calculation or prior-year method, you won't be charged instalment interest.</p>
            <p>Instalments are due <strong>March 15, June 15, September 15, and December 15</strong> each year. Missing or underpaying triggers interest at the prescribed rate (currently 10%) plus a possible instalment penalty.</p>
          </div>
        )}
      </div>

      {/* Inputs */}
      <div className="print:hidden bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <h2 className="text-lg font-bold text-gray-800">Your Information</h2>

        {/* Income Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Income Type</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {incomeTypes.map(t => (
              <button key={t.key} onClick={() => setIncomeType(t.key)}
                className={`py-2.5 px-3 rounded-lg text-sm font-medium border transition-colors text-left ${incomeType === t.key ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"}`}>
                <span className="mr-1">{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Current Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              2025 Estimated Net Income
            </label>
            <NumericFormat value={currentIncome || ""} onValueChange={v => setCurrentIncome(v.floatValue ?? 0)}
              thousandSeparator prefix="$" placeholder="$0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
            <p className="text-xs text-gray-400 mt-1">Your best estimate of 2025 net income from all sources</p>
          </div>

          {/* Prior Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              2024 Net Income (Prior Year)
            </label>
            <NumericFormat value={priorIncome || ""} onValueChange={v => setPriorIncome(v.floatValue ?? 0)}
              thousandSeparator prefix="$" placeholder="$0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
            <p className="text-xs text-gray-400 mt-1">From your 2024 Notice of Assessment</p>
          </div>

          {/* Two Years Prior */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              2023 Net Income (2 Years Prior)
            </label>
            <NumericFormat value={twoYearPriorIncome || ""} onValueChange={v => setTwoYearPriorIncome(v.floatValue ?? 0)}
              thousandSeparator prefix="$" placeholder="$0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
            <p className="text-xs text-gray-400 mt-1">Needed for the Prior-Year Method (Method 2)</p>
          </div>

          {/* Tax Withheld */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tax Already Withheld at Source (2025)
            </label>
            <NumericFormat value={withheld || ""} onValueChange={v => setWithheld(v.floatValue ?? 0)}
              thousandSeparator prefix="$" placeholder="$0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
            <p className="text-xs text-gray-400 mt-1">From employment T4, pension, or RRIF withholding</p>
          </div>

          {/* Province */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
            <select value={province} onChange={e => setProvince(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none">
              {Object.entries(PROV_BRACKETS).sort((a, b) => a[1].name.localeCompare(b[1].name)).map(([code, p]) => (
                <option key={code} value={code}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Missed Payments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instalments Missed (for penalty estimate)</label>
            <select value={missedPayments} onChange={e => setMissedPayments(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none">
              {[0, 1, 2, 3, 4].map(n => <option key={n} value={n}>{n === 0 ? "None" : `${n} payment${n > 1 ? "s" : ""}`}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Results gate */}
      {!hasResults && (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-400">
          <div className="text-3xl mb-2">🧾</div>
          <div className="font-medium">Enter your estimated 2025 income or prior year income above to calculate your instalments</div>
        </div>
      )}

      {hasResults && results && <>

      {/* Hero */}
      <div className="bg-blue-600 text-white rounded-xl p-6 text-center">
        <div className="text-sm font-medium text-blue-200 mb-1">Recommended Quarterly Instalment</div>
        <div className="text-5xl font-black mb-1">
          {fmtFull(results.recommended.id === 2
            ? results.method2Q1Q2
            : (results.recommended.id === 1 ? results.method1Quarterly : results.method3Quarterly)
          )}
        </div>
        <div className="text-blue-200 text-sm">
          {results.recommended.name} · Total annual instalments: {fmt(results.recommended.total)} · 2025 estimated tax: {fmt(results.current.total)}
        </div>
      </div>

      <PrintButton />

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">2025 Estimated Tax</div>
          <div className="text-xl font-bold text-gray-800">{fmt(results.current.total)}</div>
          <div className="text-xs text-gray-400 mt-0.5">fed + prov + CPP{isSelfEmployed ? " (both)" : ""}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Tax Already Withheld</div>
          <div className="text-xl font-bold text-gray-800">{fmt(withheld)}</div>
          <div className="text-xs text-gray-400 mt-0.5">at source</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Net Tax Owing</div>
          <div className="text-xl font-bold text-gray-800">{fmt(results.current.netOwing)}</div>
          <div className="text-xs text-gray-400 mt-0.5">before instalments</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Instalment Threshold</div>
          <div className="text-xl font-bold text-gray-800">$3,000</div>
          <div className="text-xs text-gray-400 mt-0.5">{results.current.netOwing >= 3000 ? "⚠️ Instalments required" : "✅ Below threshold"}</div>
        </div>
      </div>

      {/* Threshold Warning */}
      {results.current.netOwing < 3000 && currentIncome > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <div className="font-semibold text-green-800 text-sm">Instalments May Not Be Required</div>
            <div className="text-green-700 text-sm mt-0.5">
              Your estimated net tax owing of {fmt(results.current.netOwing)} is below the $3,000 threshold. You generally don't need to pay instalments unless your net tax owing also exceeded $3,000 in 2023 or 2024. Confirm with your prior year Notices of Assessment.
            </div>
          </div>
        </div>
      )}

      {/* Missed Payment Penalty */}
      {missedPayments > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <div className="font-semibold text-red-800 text-sm">Estimated Instalment Interest for {missedPayments} Missed Payment{missedPayments > 1 ? "s" : ""}</div>
            <div className="text-red-700 text-sm mt-0.5">
              Approximately <strong>{fmtFull(results.penaltyEstimate)}</strong> in CRA instalment interest at the prescribed rate of {(CRA_INSTALMENT_RATE * 100).toFixed(0)}%. This estimate assumes payments missed for one quarter. Actual interest may vary. Pay as soon as possible to stop interest accruing.
            </div>
          </div>
        </div>
      )}

      {/* 3 Methods Comparison */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Three CRA Instalment Methods</h2>
          <p className="text-sm text-gray-500 mt-0.5">Choose whichever method results in the lowest total — CRA won't charge interest if you meet the threshold</p>
        </div>
        <div className="divide-y divide-gray-100">
          {results.methods.map(method => {
            const isRecommended = method.id === results.recommended.id;
            return (
              <div key={method.id} className={`p-5 ${isRecommended ? "bg-blue-50" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-bold ${isRecommended ? "text-blue-700" : "text-gray-800"}`}>
                        Method {method.id}: {method.name}
                      </span>
                      {isRecommended && (
                        <span className="bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">Recommended</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{method.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-gray-400 mb-0.5">Annual total</div>
                    <div className={`text-xl font-black ${isRecommended ? "text-blue-700" : "text-gray-800"}`}>{fmt(method.total)}</div>
                  </div>
                </div>

                {/* Quarterly breakdown */}
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {INSTALMENT_DATES_2025.map((d, i) => {
                    let amount = 0;
                    if (method.id === 1) amount = method.quarterly ?? 0;
                    else if (method.id === 2) amount = i < 2 ? (results.method2Q1Q2) : (results.method2Q3Q4);
                    else amount = method.quarterly ?? 0;
                    return (
                      <div key={d.label} className={`rounded-lg p-2 text-center text-xs ${isRecommended ? "bg-white border border-blue-200" : "bg-gray-50"}`}>
                        <div className="text-gray-500 mb-0.5">{d.label.split(",")[0]}</div>
                        <div className="font-bold text-gray-800">{fmtFull(amount)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Schedule */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">2025 Payment Schedule</h2>
          <p className="text-sm text-gray-500 mt-0.5">Based on recommended method — {results.recommended.name}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Due Date</th>
                <th className="px-4 py-3 text-right text-gray-500 font-medium">Amount Due</th>
                <th className="px-4 py-3 text-right text-gray-500 font-medium">Cumulative Paid</th>
                <th className="px-4 py-3 text-right text-gray-500 font-medium">% of Annual Tax</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {results.schedule.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-800">{row.label}</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-700">{fmtFull(row.amount)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{fmt(row.cumulative)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {results.current.total > 0 ? ((row.cumulative / results.current.total) * 100).toFixed(0) : 0}%
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td className="px-6 py-3 text-gray-700">April 30, 2026 (Balance)</td>
                <td className="px-4 py-3 text-right text-gray-700">{fmt(Math.max(0, results.current.total - results.recommended.total))}</td>
                <td className="px-4 py-3 text-right text-gray-700">{fmt(results.current.total)}</td>
                <td className="px-4 py-3 text-right text-gray-500">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Tax Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">2025 Estimated Tax Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Federal Income Tax", value: results.current.federal },
            { label: "Provincial Tax", value: results.current.provincial },
            { label: isSelfEmployed ? "CPP (both sides)" : "CPP Premiums", value: results.current.cpp },
            { label: "EI Premiums", value: results.current.ei },
          ].map(item => (
            <div key={item.label} className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">{item.label}</div>
              <div className="text-lg font-bold text-gray-800">{fmt(item.value)}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm font-bold text-gray-800">
          <span>Total Tax Liability</span><span>{fmt(results.current.total)}</span>
        </div>
        {withheld > 0 && (
          <div className="flex justify-between text-sm text-green-700 mt-1">
            <span>Less: Withheld at Source</span><span>−{fmt(withheld)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-bold text-blue-700 mt-1">
          <span>Net Tax Owing</span><span>{fmt(results.current.netOwing)}</span>
        </div>
      </div>

      </>}

      {/* SEO / FAQ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5 text-sm text-gray-600 leading-relaxed">
        <h2 className="text-xl font-bold text-gray-900">CRA Tax Instalments: A Guide for Canadians</h2>

        <p>If you earn income that isn't subject to withholding at source — such as self-employment income, rental income, or significant investment income — the CRA may require you to pay your taxes quarterly rather than in a single lump sum at tax time.</p>

        <h3 className="text-base font-bold text-gray-800">When Are Instalments Required?</h3>
        <p>You must pay instalments if your net tax owing (federal + provincial, after credits) exceeds <strong>$3,000</strong> (or $1,800 in Quebec) in the current year AND in at least one of the two preceding years. CRA will generally send you an instalment reminder notice in February and August if you're required to pay.</p>

        <h3 className="text-base font-bold text-gray-800">The Three CRA Instalment Methods</h3>
        <p>The <strong>No-Calculation Method</strong> uses your prior year's tax bill divided into 4 equal payments — the simplest option. The <strong>Prior-Year Method</strong> uses two years ago as the base for Q1 and Q2, then adjusts to last year's total for Q3 and Q4. The <strong>Current-Year Method</strong> lets you pay based on your estimated current year income — ideal if your income has dropped significantly.</p>

        <h3 className="text-base font-bold text-gray-800">Interest and Penalties for Late or Missed Payments</h3>
        <p>CRA charges interest on late or insufficient instalments at the prescribed rate (currently 10% for 2025) compounded daily. There is also an instalment penalty if your instalment interest exceeds $1,000 — the penalty equals 50% of the instalment interest minus the greater of $1,000 or 25% of the interest payable had you made no instalments. Paying on time is always the best strategy.</p>

        <h3 className="text-base font-bold text-gray-800">Self-Employed CPP Contributions</h3>
        <p>Self-employed individuals pay both the employee and employer share of CPP — effectively double (11.9% of net earnings up to maximum). This significantly increases instalment obligations compared to an employee earning the same income. CPP contributions are factored into your total instalment calculation.</p>

        <h3 className="text-base font-bold text-gray-800">How to Pay CRA Instalments</h3>
        <p>Instalments can be paid through online banking (CRA is a payee at most banks), through My Account on the CRA website, by cheque (made out to the Receiver General), or at a Canada Post outlet. Always use your SIN and indicate the tax year. Keep proof of payment.</p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-xs">
          <strong>Disclaimer:</strong> This calculator provides estimates only using 2025 tax rates. Actual CRA instalment amounts are based on your Notices of Assessment and may differ. Quebec residents use Revenu Québec for provincial instalments separately. Consult a tax professional or the CRA website for your exact obligations.
        </div>
      </div>
    </div>
  );
}
