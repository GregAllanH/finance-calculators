"use client";

// app/calculators/mortgage-comparison/MortgageComparisonClient.tsx

import { useState, useMemo } from "react";
import { NumericFormat } from "react-number-format";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt  = (n: number) => Math.round(n).toLocaleString("en-CA");
const fmtK = (n: number) => {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface PeriodResult {
  years:          number;
  monthlyPayment: number;
  totalPaid:      number;
  totalInterest:  number;
  interestPct:    number;
  // with extra payments
  extraMonthly:   number;
  yearsWithExtra: number;
  interestSaved:  number;
}

// ─── Mortgage math ────────────────────────────────────────────────────────────

function calcMortgage(principal: number, annualRate: number, years: number): {
  monthly: number; totalPaid: number; totalInterest: number;
} {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) {
    const monthly = principal / n;
    return { monthly, totalPaid: principal, totalInterest: 0 };
  }
  const monthly     = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const totalPaid   = monthly * n;
  const totalInterest = totalPaid - principal;
  return { monthly, totalPaid, totalInterest };
}

function calcPayoffWithExtra(principal: number, annualRate: number, baseMonthly: number, extraMonthly: number): {
  months: number; totalInterest: number;
} {
  const r       = annualRate / 100 / 12;
  const payment = baseMonthly + extraMonthly;
  let balance   = principal;
  let months    = 0;
  let totalInt  = 0;

  while (balance > 0.01 && months < 600) {
    const interest = balance * r;
    totalInt      += interest;
    balance        = balance + interest - payment;
    if (balance < 0) balance = 0;
    months++;
  }
  return { months, totalInterest: totalInt };
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const PERIOD_COLORS = [
  { bar: "bg-blue-500",   text: "text-blue-600",   border: "border-blue-500",   light: "bg-blue-50"   },
  { bar: "bg-purple-500", text: "text-purple-600",  border: "border-purple-500", light: "bg-purple-50" },
  { bar: "bg-orange-500", text: "text-orange-600",  border: "border-orange-500", light: "bg-orange-50" },
  { bar: "bg-green-500",  text: "text-green-600",   border: "border-green-500",  light: "bg-green-50"  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function MortgageComparisonClient() {
  const [principal,    setPrincipal]    = useState<number | null>(null);
  const [rate,         setRate]         = useState<number | null>(5);
  const [extraPayment, setExtraPayment] = useState<number | null>(null);
  const [periods,      setPeriods]      = useState<number[]>([20, 25, 30]);

  // Period picker helpers
  const availablePeriods = [5, 10, 15, 20, 25, 30];

  const togglePeriod = (y: number) => {
    setPeriods((prev) =>
      prev.includes(y)
        ? prev.length > 1 ? prev.filter((p) => p !== y) : prev
        : [...prev, y].sort((a, b) => a - b)
    );
  };

  const results = useMemo<PeriodResult[]>(() => {
    if (!principal || !rate || principal <= 0 || rate <= 0) return [];

    return periods.map((years) => {
      const { monthly, totalPaid, totalInterest } = calcMortgage(principal, rate, years);
      const extra = extraPayment ?? 0;
      const { months: mWithExtra, totalInterest: intWithExtra } = calcPayoffWithExtra(
        principal, rate, monthly, extra
      );

      return {
        years,
        monthlyPayment: monthly,
        totalPaid,
        totalInterest,
        interestPct:    (totalInterest / totalPaid) * 100,
        extraMonthly:   extra,
        yearsWithExtra: Math.ceil(mWithExtra / 12),
        interestSaved:  extra > 0 ? totalInterest - intWithExtra : 0,
      };
    });
  }, [principal, rate, extraPayment, periods]);

  const hasResults  = results.length > 0;
  const maxTotal    = hasResults ? Math.max(...results.map((r) => r.totalPaid))    : 1;
  const maxInterest = hasResults ? Math.max(...results.map((r) => r.totalInterest)) : 1;
  const maxMonthly  = hasResults ? Math.max(...results.map((r) => r.monthlyPayment)) : 1;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-gray-900">Mortgage Amortization Comparison</h1>
          <p className="text-gray-500 mt-1">
            Compare monthly payments, total interest, and true cost across different amortization periods.
          </p>
        </div>

        {/* Inputs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-800">Mortgage Details</h2>

          {/* Principal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mortgage Principal
            </label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$500,000"
              onValueChange={(v) => setPrincipal(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-right"
            />
          </div>

          {/* Interest rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Annual Interest Rate (%)
            </label>
            <input
              type="number" min="0.1" max="20" step="0.1"
              defaultValue={5}
              onChange={(e) => setRate(Number(e.target.value) || null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-right"
            />
          </div>

          {/* Extra monthly payment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Extra Monthly Payment
              <span className="text-gray-400 font-normal ml-1">(optional — see how much you save)</span>
            </label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$0"
              onValueChange={(v) => setExtraPayment(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-right"
            />
          </div>

          {/* Period picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Amortization Periods to Compare
            </label>
            <div className="flex flex-wrap gap-2">
              {availablePeriods.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => togglePeriod(y)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                    periods.includes(y)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                  }`}
                >
                  {y} yr
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">Select 1–4 periods to compare. Click to toggle.</p>
          </div>
        </div>

        {/* Empty state */}
        {!hasResults ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">🏠</div>
            <p className="text-xl font-semibold text-gray-700">Enter your mortgage details above</p>
            <p className="text-gray-500 mt-2">Your amortization comparison will appear here instantly.</p>
          </div>
        ) : (
          <>
            {/* Period cards */}
            <div className={`grid grid-cols-1 gap-4 ${results.length === 2 ? "md:grid-cols-2" : results.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-4"}`}>
              {results.map((r, i) => {
                const c = PERIOD_COLORS[i % PERIOD_COLORS.length];
                return (
                  <div key={r.years} className={`bg-white border-2 ${c.border} rounded-xl p-6 shadow-sm`}>
                    <p className={`text-xs font-bold uppercase tracking-widest ${c.text} mb-3`}>
                      {r.years}-Year
                    </p>
                    <p className="text-3xl font-black text-gray-900">${fmt(r.monthlyPayment)}</p>
                    <p className="text-gray-400 text-sm mt-0.5">per month</p>

                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Interest</span>
                        <span className={`font-semibold ${c.text}`}>${fmt(r.totalInterest)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Cost</span>
                        <span className="font-semibold text-gray-800">${fmt(r.totalPaid)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Interest %</span>
                        <span className="font-semibold text-gray-800">{r.interestPct.toFixed(1)}%</span>
                      </div>
                      {(extraPayment ?? 0) > 0 && (
                        <>
                          <div className="border-t border-gray-100 pt-2 mt-2">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Paid off in</span>
                              <span className="font-semibold text-gray-800">{r.yearsWithExtra} yrs</span>
                            </div>
                            <div className="flex justify-between mt-1">
                              <span className="text-gray-500">Interest saved</span>
                              <span className="font-semibold text-green-600">${fmt(r.interestSaved)}</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Monthly payment comparison bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Monthly Payment Comparison
              </h3>
              <div className="space-y-3">
                {results.map((r, i) => {
                  const c = PERIOD_COLORS[i % PERIOD_COLORS.length];
                  return (
                    <div key={r.years}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{r.years}-Year</span>
                        <span className="font-medium text-gray-800">${fmt(r.monthlyPayment)}/mo</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${c.bar} rounded-full transition-all duration-500`}
                          style={{ width: `${(r.monthlyPayment / maxMonthly) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Total interest comparison bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Total Interest Paid
              </h3>
              <div className="space-y-3">
                {results.map((r, i) => {
                  const c = PERIOD_COLORS[i % PERIOD_COLORS.length];
                  return (
                    <div key={r.years}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{r.years}-Year</span>
                        <span className={`font-medium ${c.text}`}>${fmt(r.totalInterest)}</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${c.bar} rounded-full transition-all duration-500`}
                          style={{ width: `${(r.totalInterest / maxInterest) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Principal vs Interest stacked bars */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Principal vs Interest — Total Cost
              </h3>
              <p className="text-xs text-gray-400 mb-4">How much of every dollar goes to interest vs your home</p>
              <div className="space-y-4">
                {results.map((r, i) => {
                  const c           = PERIOD_COLORS[i % PERIOD_COLORS.length];
                  const principalPct = (principal! / r.totalPaid) * 100;
                  const interestPct  = (r.totalInterest / r.totalPaid) * 100;
                  return (
                    <div key={r.years}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium text-gray-700">{r.years}-Year — ${fmt(r.totalPaid)} total</span>
                        <span className="text-gray-400 text-xs">{interestPct.toFixed(1)}% interest</span>
                      </div>
                      <div className="h-5 bg-gray-100 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-gray-400 rounded-l-full transition-all duration-500"
                          style={{ width: `${principalPct}%` }}
                          title={`Principal: $${fmt(principal!)}`}
                        />
                        <div
                          className={`h-full ${c.bar} transition-all duration-500`}
                          style={{ width: `${interestPct}%` }}
                          title={`Interest: $${fmt(r.totalInterest)}`}
                        />
                      </div>
                      <div className="flex gap-4 mt-1 text-xs text-gray-400">
                        <span>■ Principal ${fmt(principal!)}</span>
                        <span className={c.text}>■ Interest ${fmt(r.totalInterest)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Extra payment savings summary */}
            {(extraPayment ?? 0) > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Impact of ${fmt(extraPayment!)} Extra per Month
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">See how much faster you pay off and how much interest you save</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {results.map((r, i) => {
                    const c        = PERIOD_COLORS[i % PERIOD_COLORS.length];
                    const yearsSaved = r.years - r.yearsWithExtra;
                    return (
                      <div key={r.years} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                        <div>
                          <span className={`text-sm font-semibold ${c.text}`}>{r.years}-Year amortization</span>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Paid off in {r.yearsWithExtra} years — {yearsSaved > 0 ? `${yearsSaved} years early` : "no change"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-green-600">−${fmt(r.interestSaved)}</p>
                          <p className="text-xs text-gray-400">interest saved</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Key insight callout */}
            {results.length >= 2 && (() => {
              const shortest = results[0];
              const longest  = results[results.length - 1];
              const diff     = longest.totalInterest - shortest.totalInterest;
              const monthlyDiff = longest.monthlyPayment - shortest.monthlyPayment;
              return (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                  <p className="text-sm font-semibold text-blue-800 mb-1">💡 Key Insight</p>
                  <p className="text-sm text-blue-700">
                    Choosing a <strong>{shortest.years}-year</strong> over a <strong>{longest.years}-year</strong> amortization
                    saves <strong>${fmt(diff)}</strong> in interest — but costs <strong>${fmt(monthlyDiff)}</strong> more per month.
                    That's ${fmt(monthlyDiff * 12)} more per year for {shortest.years} years in exchange for ${fmtK(diff)} in savings.
                  </p>
                </div>
              );
            })()}
          </>
        )}

        {/* SEO / FAQ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 prose prose-gray max-w-none">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Choosing the Right Amortization Period in Canada
          </h2>
          <p className="text-gray-600">
            Your amortization period is how long it takes to fully pay off your mortgage. In Canada, the maximum amortization for insured mortgages (less than 20% down) is <strong>25 years</strong>. For uninsured mortgages (20%+ down), some lenders offer up to <strong>30 years</strong>.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Shorter vs Longer Amortization</h3>
          <p className="text-gray-600">
            A shorter amortization means higher monthly payments but dramatically less interest paid over time. A longer amortization lowers your monthly payment and improves cash flow — but you'll pay significantly more in total interest. The right choice depends on your income stability, other financial goals, and how much flexibility you need month-to-month.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">The Power of Extra Payments</h3>
          <p className="text-gray-600">
            Making even small extra monthly payments can shave years off your mortgage and save tens of thousands in interest. Most Canadian mortgages allow annual prepayments of 10–20% of the original principal without penalty — check your mortgage terms for details.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Canadian Mortgage Terms vs Amortization</h3>
          <p className="text-gray-600">
            In Canada, your <strong>mortgage term</strong> (typically 1–5 years) is different from your <strong>amortization period</strong>. At the end of each term you renew at current rates — so a 25-year amortization typically involves 5 or more renewals. This means your total interest cost can change significantly if rates rise at renewal.
          </p>

          <p className="text-sm text-gray-400 mt-6">
            This calculator provides estimates based on fixed interest rates and regular monthly payments. Actual mortgage costs may vary based on payment frequency, compound period, rate changes at renewal, and prepayment options. Consult a mortgage professional for personalized advice.
          </p>
        </div>

      </div>
    </div>
  );
}
