"use client";

// app/calculators/mortgage-refinance/MortgageRefinanceClient.tsx

import { useState, useMemo } from "react";
import { NumericFormat } from "react-number-format";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt    = (n: number) => Math.round(n).toLocaleString("en-CA");
const fmtDec = (n: number, d = 2) => n.toLocaleString("en-CA", { minimumFractionDigits: d, maximumFractionDigits: d });

function monthlyPayment(principal: number, annualRate: number, months: number): number {
  if (annualRate === 0) return principal / months;
  const r = annualRate / 100 / 12;
  return principal * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

function remainingBalance(principal: number, annualRate: number, totalMonths: number, monthsPaid: number): number {
  if (annualRate === 0) return principal * (1 - monthsPaid / totalMonths);
  const r = annualRate / 100 / 12;
  const pmt = monthlyPayment(principal, annualRate, totalMonths);
  return principal * Math.pow(1 + r, monthsPaid) - pmt * (Math.pow(1 + r, monthsPaid) - 1) / r;
}

function totalInterest(principal: number, annualRate: number, months: number): number {
  return monthlyPayment(principal, annualRate, months) * months - principal;
}

// IRD — Interest Rate Differential penalty (Canadian standard)
// Greater of: 3 months interest OR IRD
function calcIRD(
  balance: number,
  currentRate: number,
  newRate: number,
  monthsRemaining: number,
  lenderType: "big6" | "monoline" | "credit_union"
): { ird: number; threeMonths: number; penalty: number; method: string } {
  const threeMonths = balance * (currentRate / 100 / 12) * 3;

  let ird = 0;
  if (lenderType === "big6") {
    // Big 6 banks use posted rate minus discounted rate — very punitive
    // Approximation: they compare current rate vs posted rate for remaining term
    // Posted rate is typically ~1.5–2% above contract rate
    const postedPremium = 1.65;
    const effectiveRate = Math.max(0, currentRate - newRate - postedPremium);
    ird = balance * (effectiveRate / 100) * (monthsRemaining / 12);
  } else if (lenderType === "monoline") {
    // Monolines use actual rate differential
    const rateDiff = Math.max(0, currentRate - newRate);
    ird = balance * (rateDiff / 100) * (monthsRemaining / 12);
  } else {
    // Credit unions — often 3 months interest only
    ird = threeMonths;
  }

  const penalty = Math.max(threeMonths, ird);
  const method  = penalty === threeMonths ? "3 months interest" : "Interest Rate Differential (IRD)";
  return { ird, threeMonths, penalty, method };
}

// ─── Component ────────────────────────────────────────────────────────────────

type LenderType = "big6" | "monoline" | "credit_union";

const LENDER_LABELS: Record<LenderType, string> = {
  big6:         "Big 6 Bank (TD, RBC, BMO, CIBC, Scotia, NBC)",
  monoline:     "Monoline Lender (MCAP, First National, etc.)",
  credit_union: "Credit Union / Other",
};

export default function MortgageRefinanceClient() {
  // Current mortgage
  const [currentBalance,   setCurrentBalance]   = useState<number | null>(null);
  const [currentRate,      setCurrentRate]       = useState<number | null>(null);
  const [currentAmort,     setCurrentAmort]      = useState<number>(25);
  const [monthsRemaining,  setMonthsRemaining]   = useState<number | null>(null);
  const [lenderType,       setLenderType]        = useState<LenderType>("big6");

  // New mortgage
  const [newRate,          setNewRate]           = useState<number | null>(null);
  const [newAmort,         setNewAmort]          = useState<number>(25);
  const [extraCosts,       setExtraCosts]        = useState<number | null>(null); // appraisal, legal, etc.

  // Optional
  const [cashOut,          setCashOut]           = useState<number | null>(null);
  const [showInfo,         setShowInfo]          = useState(false);
  const [showSchedule,     setShowSchedule]      = useState(false);

  const result = useMemo(() => {
    if (!currentBalance || !currentRate || !monthsRemaining || !newRate) return null;
    if (monthsRemaining <= 0 || currentBalance <= 0) return null;

    const balance   = currentBalance;
    const oldRate   = currentRate;
    const newRt     = newRate;
    const moRemain  = monthsRemaining;
    const addCash   = cashOut ?? 0;
    const newBal    = balance + addCash;

    // Current mortgage payments for remaining term
    const oldMonthly    = monthlyPayment(balance, oldRate, moRemain);
    const oldTotalPaid  = oldMonthly * moRemain;
    const oldInterest   = oldTotalPaid - balance;

    // Penalty
    const { ird, threeMonths, penalty, method } = calcIRD(balance, oldRate, newRt, moRemain, lenderType);

    // Other refinance costs
    const adminFees     = 300;   // discharge fee
    const appraisal     = 500;   // typical appraisal
    const legal         = 1500;  // legal fees
    const other         = extraCosts ?? 0;
    const totalCosts    = penalty + adminFees + appraisal + legal + other;

    // New mortgage
    const newMonthly    = monthlyPayment(newBal, newRt, newAmort * 12);
    const newTotalPaid  = newMonthly * newAmort * 12;
    const newInterest   = newTotalPaid - newBal;

    // Monthly savings
    const monthlySaving = oldMonthly - newMonthly;

    // Break-even in months
    const breakEvenMonths = monthlySaving > 0 ? totalCosts / monthlySaving : Infinity;
    const breakEvenYears  = breakEvenMonths / 12;

    // Interest saved over remaining term (apples-to-apples comparison)
    // New mortgage interest for same period (moRemain months)
    const newInterestSamePeriod = newMonthly * moRemain - (newBal - remainingBalance(newBal, newRt, newAmort * 12, moRemain));
    const interestSavedOverTerm = oldInterest - newInterestSamePeriod;
    const netSavingOverTerm     = interestSavedOverTerm - totalCosts;

    // Is it worth it?
    const worthIt = netSavingOverTerm > 0 && breakEvenMonths < moRemain;

    // 5-year comparison (60 months)
    const compare5yr = Math.min(60, moRemain);
    const old5yrInterest  = oldMonthly * compare5yr - (balance - remainingBalance(balance, oldRate, moRemain, compare5yr));
    const new5yrInterest  = newMonthly * compare5yr - (newBal - remainingBalance(newBal, newRt, newAmort * 12, compare5yr));
    const net5yrSaving    = old5yrInterest - new5yrInterest - totalCosts;

    // Monthly breakdown comparison
    const oldBalance5yr = remainingBalance(balance, oldRate, moRemain, compare5yr);
    const newBalance5yr = remainingBalance(newBal, newRt, newAmort * 12, compare5yr);

    // Year-by-year net saving (cumulative monthly savings minus upfront cost)
    const yearlyComparison: Array<{
      year: number;
      cumulativeSaving: number;
      netPosition: number;
      breakEven: boolean;
    }> = [];

    for (let y = 1; y <= Math.min(Math.ceil(moRemain / 12), 10); y++) {
      const months = y * 12;
      const cumSaving = monthlySaving * Math.min(months, moRemain);
      const net = cumSaving - totalCosts;
      yearlyComparison.push({
        year: y,
        cumulativeSaving: Math.round(cumSaving),
        netPosition: Math.round(net),
        breakEven: net >= 0,
      });
    }

    return {
      // Current
      oldMonthly,
      oldInterest,
      // Penalty
      ird,
      threeMonths,
      penalty,
      method,
      // Costs
      adminFees,
      appraisal,
      legal,
      other,
      totalCosts,
      // New
      newMonthly,
      newInterest,
      newBal,
      // Comparison
      monthlySaving,
      breakEvenMonths,
      breakEvenYears,
      interestSavedOverTerm,
      netSavingOverTerm,
      worthIt,
      net5yrSaving,
      old5yrInterest,
      new5yrInterest,
      oldBalance5yr,
      newBalance5yr,
      yearlyComparison,
      moRemain,
      rateDiff: oldRate - newRt,
    };
  }, [currentBalance, currentRate, monthsRemaining, newRate, newAmort,
      lenderType, extraCosts, cashOut]);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-gray-900">Mortgage Refinance Break-Even Calculator</h1>
          <p className="text-gray-500 mt-1">
            Should you break your mortgage early? Calculate the penalty, total refinance costs, monthly savings, and exact break-even point.
          </p>
        </div>

        {/* Info panel */}
        <button
          type="button"
          onClick={() => setShowInfo(!showInfo)}
          className="w-full bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-center justify-between text-left hover:bg-blue-100 transition-colors"
        >
          <div>
            <p className="text-sm font-semibold text-blue-800">💡 How Mortgage Penalties Work in Canada</p>
            <p className="text-xs text-blue-600 mt-0.5">IRD vs 3-months interest, big bank vs monoline, when it makes sense to break</p>
          </div>
          <span className="text-blue-500 text-lg">{showInfo ? "▲" : "▼"}</span>
        </button>

        {showInfo && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            {[
              {
                icon: "⚖️", title: "3 Months Interest vs IRD — Which Applies?",
                body: "Variable rate mortgages: always 3 months interest. Fixed rate mortgages: the greater of 3 months interest OR the Interest Rate Differential (IRD). IRD is almost always larger for fixed rate mortgages when rates have fallen — and can be shockingly high at big banks.",
              },
              {
                icon: "🏦", title: "Big Bank IRD is Calculated Differently (and More Expensively)",
                body: "Big 6 banks calculate IRD using their posted rate minus your discounted rate, not your actual contract rate vs current rates. Because posted rates are ~1.5–2% above contract rates, this formula dramatically inflates the penalty. A $400k mortgage with 2 years remaining could have a $15,000–$25,000 penalty at a big bank vs $5,000–$8,000 at a monoline lender.",
              },
              {
                icon: "📋", title: "Other Costs to Factor In",
                body: "Beyond the penalty: discharge fee ($200–$400), appraisal ($400–$600), legal fees ($1,000–$2,000), and potentially mortgage insurance if your equity is under 20%. Some lenders offer to blend-and-extend instead of charging a full penalty — worth asking.",
              },
              {
                icon: "🔄", title: "Blend-and-Extend — An Alternative",
                body: "Instead of breaking your mortgage and paying a penalty, ask your lender about blend-and-extend. They'll blend your current rate with the new lower rate over a new term. You avoid the penalty but don't get the full benefit of the lower rate either.",
              },
              {
                icon: "📅", title: "When Does Refinancing Make Sense?",
                body: "Generally worth it if: (1) your break-even point is well before your renewal date, (2) rates have dropped significantly (1%+ difference), (3) you need to access equity, (4) you're consolidating high-interest debt. Rarely worth it if you're less than 6 months from renewal — just wait.",
              },
              {
                icon: "💰", title: "The Prepayment Privilege Loophole",
                body: "Before breaking your mortgage, check your prepayment privileges. Most mortgages allow 10–20% lump-sum payments per year without penalty. Making a large prepayment first reduces your outstanding balance — and therefore your penalty, since IRD is calculated on the remaining balance.",
              },
            ].map(tip => (
              <div key={tip.title} className="border border-gray-100 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-800 mb-1">{tip.icon} {tip.title}</p>
                <p className="text-xs text-gray-500">{tip.body}</p>
              </div>
            ))}
          </div>
        )}

        {/* Inputs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-800">Current Mortgage</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Outstanding Balance</label>
              <NumericFormat
                thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
                placeholder="$450,000"
                onValueChange={(v) => setCurrentBalance(v.floatValue ?? null)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Rate (%)</label>
              <input
                type="number" min="0.5" max="15" step="0.01"
                placeholder="5.49"
                onChange={(e) => setCurrentRate(Number(e.target.value) || null)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Months Remaining in Term</label>
              <input
                type="number" min="1" max="120" step="1"
                placeholder="24"
                onChange={(e) => setMonthsRemaining(Number(e.target.value) || null)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
              />
              <p className="text-xs text-gray-400 mt-1">e.g. 2 years left = 24 months</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Remaining Amortization (years)</label>
              <div className="flex gap-2">
                {[15, 20, 25, 30].map(y => (
                  <button key={y} type="button" onClick={() => setCurrentAmort(y)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${currentAmort === y ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"}`}>
                    {y}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Lender type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Lender Type</label>
            <div className="space-y-2">
              {(Object.entries(LENDER_LABELS) as [LenderType, string][]).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLenderType(key)}
                  className={`w-full px-4 py-3 rounded-lg text-sm text-left border-2 transition-colors ${
                    lenderType === key
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-200 hover:border-blue-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Big bank IRD penalties are typically 2–4× higher than monoline lenders due to posted rate calculation method.
            </p>
          </div>
        </div>

        {/* New mortgage */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-800">New Mortgage</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Rate (%)</label>
              <input
                type="number" min="0.5" max="15" step="0.01"
                placeholder="4.19"
                onChange={(e) => setNewRate(Number(e.target.value) || null)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
              />
              {currentRate && newRate && (
                <p className={`text-xs font-medium mt-1 ${newRate < currentRate ? "text-green-600" : "text-red-500"}`}>
                  {newRate < currentRate
                    ? `${(currentRate - newRate).toFixed(2)}% lower than current rate`
                    : `${(newRate - currentRate).toFixed(2)}% higher — refinancing may not make sense`}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Amortization (years)</label>
              <div className="flex gap-2">
                {[15, 20, 25, 30].map(y => (
                  <button key={y} type="button" onClick={() => setNewAmort(y)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${newAmort === y ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"}`}>
                    {y}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cash-Out Amount
                <span className="text-gray-400 font-normal ml-1">(optional — e.g. for renovations)</span>
              </label>
              <NumericFormat
                thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
                placeholder="$0"
                onValueChange={(v) => setCashOut(v.floatValue ?? null)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Costs
                <span className="text-gray-400 font-normal ml-1">(beyond our estimates)</span>
              </label>
              <NumericFormat
                thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
                placeholder="$0"
                onValueChange={(v) => setExtraCosts(v.floatValue ?? null)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
              />
            </div>
          </div>
        </div>

        {/* Results */}
        {!result ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">🏡</div>
            <p className="text-xl font-semibold text-gray-700">Enter your current and new mortgage details above</p>
            <p className="text-gray-500 mt-2">Your penalty, break-even, and true cost comparison will appear here.</p>
          </div>
        ) : (
          <>
            {/* Worth it verdict */}
            <div className={`rounded-xl p-6 text-center shadow-sm ${result.worthIt ? "bg-green-600" : "bg-red-600"} text-white`}>
              <p className="text-sm font-medium uppercase tracking-wide opacity-80">
                {result.worthIt ? "✅ Refinancing Likely Makes Sense" : "⚠️ Refinancing May Not Be Worth It"}
              </p>
              <p className="text-5xl font-black mt-2">
                {result.breakEvenMonths === Infinity
                  ? "Never"
                  : result.breakEvenMonths < 12
                  ? `${Math.ceil(result.breakEvenMonths)} months`
                  : `${fmtDec(result.breakEvenYears, 1)} years`}
              </p>
              <p className="opacity-80 text-sm mt-1">
                {result.breakEvenMonths === Infinity
                  ? "New rate is not lower — no monthly savings to recover costs"
                  : `to break even on $${fmt(result.totalCosts)} in refinancing costs`}
              </p>
            </div>

            {/* Key stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Penalty",          value: `$${fmt(result.penalty)}`,      sub: result.method,                              color: "text-red-500"   },
                { label: "Total Costs",      value: `$${fmt(result.totalCosts)}`,   sub: "penalty + legal + appraisal",              color: "text-orange-500"},
                { label: "Monthly Savings",  value: result.monthlySaving > 0 ? `$${fmt(result.monthlySaving)}` : "None", sub: `$${fmt(result.oldMonthly)} → $${fmt(result.newMonthly)}`, color: result.monthlySaving > 0 ? "text-green-600" : "text-red-500" },
                { label: "Net Saving (Term)",value: result.netSavingOverTerm > 0 ? `$${fmt(result.netSavingOverTerm)}` : `-$${fmt(Math.abs(result.netSavingOverTerm))}`, sub: `over ${Math.round(result.moRemain / 12 * 10) / 10} yrs remaining`, color: result.netSavingOverTerm > 0 ? "text-green-600" : "text-red-500" },
              ].map(s => (
                <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Penalty breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">Penalty & Cost Breakdown</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {LENDER_LABELS[lenderType]} · {result.method} applies
                </p>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  { label: "3 Months Interest",          value: result.threeMonths,  note: "always the minimum"         },
                  { label: "Interest Rate Differential",  value: result.ird,          note: `${currentRate?.toFixed(2)}% → ${newRate?.toFixed(2)}%` },
                  { label: "Penalty (greater of above)",  value: result.penalty,      note: result.method, bold: true    },
                  { label: "Discharge Fee (est.)",        value: result.adminFees,    note: "paid to current lender"     },
                  { label: "Appraisal (est.)",            value: result.appraisal,    note: "required for new mortgage"  },
                  { label: "Legal Fees (est.)",           value: result.legal,        note: "title transfer + closing"   },
                  ...(result.other > 0 ? [{ label: "Additional Costs", value: result.other, note: "as entered", bold: false }] : []),
                ].map((row, i) => (
                  <div key={i} className={`flex justify-between items-center px-6 py-3 ${(row as any).bold ? "bg-red-50" : "hover:bg-gray-50"}`}>
                    <div>
                      <p className={`text-sm ${(row as any).bold ? "font-semibold text-gray-800" : "text-gray-600"}`}>{row.label}</p>
                      <p className="text-xs text-gray-400">{row.note}</p>
                    </div>
                    <span className={`text-sm font-medium ${(row as any).bold ? "text-red-600 font-bold text-base" : "text-gray-800"}`}>
                      ${fmt(row.value)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-center px-6 py-4 bg-gray-50">
                  <span className="text-sm font-bold text-gray-800">Total Refinancing Costs</span>
                  <span className="text-xl font-black text-red-600">${fmt(result.totalCosts)}</span>
                </div>
              </div>
            </div>

            {/* Monthly comparison */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Monthly Payment Comparison</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Current Payment",  value: result.oldMonthly, rate: currentRate!, color: "bg-red-100 border-red-200"   },
                  { label: "New Payment",       value: result.newMonthly, rate: newRate!,     color: "bg-green-100 border-green-200"},
                ].map(c => (
                  <div key={c.label} className={`border-2 rounded-xl p-5 text-center ${c.color}`}>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{c.label}</p>
                    <p className="text-3xl font-black text-gray-800">${fmt(c.value)}</p>
                    <p className="text-xs text-gray-500 mt-1">at {c.rate.toFixed(2)}%</p>
                  </div>
                ))}
              </div>
              {result.monthlySaving > 0 && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">Monthly Saving</p>
                  <p className="text-3xl font-black text-green-700 mt-1">${fmt(result.monthlySaving)}</p>
                  <p className="text-xs text-green-600 mt-1">${fmt(result.monthlySaving * 12)}/year</p>
                </div>
              )}
            </div>

            {/* Cumulative savings chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Cumulative Net Position Over Time
              </h3>
              <div className="space-y-2">
                {result.yearlyComparison.map(row => {
                  const maxAbs = Math.max(...result.yearlyComparison.map(r => Math.abs(r.netPosition)));
                  const pct    = Math.abs(row.netPosition) / (maxAbs || 1) * 100;
                  return (
                    <div key={row.year}>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Year {row.year}</span>
                        <span className={`font-semibold ${row.netPosition >= 0 ? "text-green-600" : "text-red-500"}`}>
                          {row.netPosition >= 0 ? "+" : ""}${fmt(row.netPosition)}
                        </span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${row.netPosition >= 0 ? "bg-green-500" : "bg-red-400"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {row.breakEven && !result.yearlyComparison[row.year - 2]?.breakEven && (
                        <p className="text-xs text-green-600 font-semibold mt-0.5">✅ Break-even reached in Year {row.year}</p>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Net position = cumulative monthly savings minus total upfront refinancing costs of ${fmt(result.totalCosts)}.
              </p>
            </div>

            {/* 5-year side-by-side */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                5-Year Comparison (Interest Paid)
              </h3>
              <div className="grid grid-cols-2 gap-4 text-center">
                {[
                  { label: "Keep Current Mortgage", interest: result.old5yrInterest, balance: result.oldBalance5yr, color: "text-red-500" },
                  { label: "Refinance Now",          interest: result.new5yrInterest + result.totalCosts, balance: result.newBalance5yr, color: "text-green-600" },
                ].map(c => (
                  <div key={c.label} className="border border-gray-100 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-2">{c.label}</p>
                    <p className="text-xs text-gray-500">Interest + costs paid</p>
                    <p className={`text-xl font-bold ${c.color}`}>${fmt(c.interest)}</p>
                    <p className="text-xs text-gray-500 mt-2">Balance remaining</p>
                    <p className="text-base font-semibold text-gray-700">${fmt(c.balance)}</p>
                  </div>
                ))}
              </div>
              <div className={`mt-4 rounded-xl p-4 text-center ${result.net5yrSaving > 0 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">5-Year Net Saving from Refinancing</p>
                <p className={`text-2xl font-black mt-1 ${result.net5yrSaving > 0 ? "text-green-700" : "text-red-600"}`}>
                  {result.net5yrSaving > 0 ? "+" : ""}${fmt(result.net5yrSaving)}
                </p>
              </div>
            </div>

            {/* Prepayment tip */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <p className="text-sm font-semibold text-blue-800 mb-1">
                💡 Reduce Your Penalty With Prepayment Privileges
              </p>
              <p className="text-sm text-blue-700">
                Most mortgages allow 10–20% lump-sum prepayments per year without penalty. Making a prepayment before breaking reduces your outstanding balance — and since your penalty is calculated on the remaining balance, it directly reduces what you owe.
                On a ${fmt(currentBalance ?? 0)} balance with a 15% prepayment privilege, a ${fmt((currentBalance ?? 0) * 0.15)} prepayment could reduce your penalty by approximately ${fmt(result.penalty * 0.15)}.
              </p>
            </div>
          </>
        )}

        {/* SEO / FAQ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 prose prose-gray max-w-none">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Breaking Your Mortgage in Canada — 2025 Guide</h2>
          <p className="text-gray-600">
            With mortgage rates having risen significantly since 2022, many Canadians locked in at high rates are now wondering whether to break their mortgage early and refinance at a lower rate. The answer depends on your penalty, how much you'll save monthly, and how long you plan to stay in the home.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">How the IRD Penalty is Calculated</h3>
          <p className="text-gray-600">
            For fixed-rate mortgages, lenders charge the greater of 3 months interest or the Interest Rate Differential. The IRD compensates the lender for the income they lose when you break the mortgage at a lower rate environment. Big 6 banks use a posted rate formula that inflates the penalty significantly — always get the exact penalty in writing before making any decisions.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Variable Rate Mortgages — Much Simpler</h3>
          <p className="text-gray-600">
            Variable rate mortgages only ever charge 3 months interest as a penalty — there is no IRD. This is one of the key advantages of variable rate: you can break it cheaply if rates drop significantly or your circumstances change.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">When Refinancing Doesn't Make Sense</h3>
          <p className="text-gray-600">
            If you're within 6–12 months of your renewal date, it almost never makes sense to pay a penalty — just wait. Similarly, if you plan to sell the home before the break-even point, refinancing costs money. And if the rate difference is less than 0.5%, the math rarely works out in your favour after penalties and fees.
          </p>

          <p className="text-sm text-gray-400 mt-6">
            Penalty estimates are approximations. Big bank IRD uses an estimated posted rate premium of 1.65% — your actual penalty may differ. Always request an official penalty quote from your lender before making any decisions. Not financial advice.
          </p>
        </div>

      </div>
    </div>
  );
}
