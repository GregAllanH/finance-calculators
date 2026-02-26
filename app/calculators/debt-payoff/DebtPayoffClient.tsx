"use client";

// app/calculators/debt-payoff/DebtPayoffClient.tsx

import PrintButton from "@/components/PrintButton";
import { useState, useMemo } from "react";
import { NumericFormat } from "react-number-format";

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPICAL_RATES = {
  "Credit Card":        19.99,
  "Store Card":         29.99,
  "Line of Credit":     7.5,
  "HELOC":              6.5,
  "Personal Loan":      11.0,
  "Student Loan":       6.5,
  "Car Loan":           8.5,
};

const REFINANCE_INFO = [
  {
    title: "Balance Transfer Credit Card",
    rate: "0–3.99% promotional",
    details: "Transfer high-interest credit card debt to a 0% or low-rate balance transfer card. Promotional periods typically last 6–12 months. Watch for transfer fees (usually 1–3%) and what rate kicks in after the promo ends.",
    tip: "Best for: credit card debt you can pay off within 12 months.",
  },
  {
    title: "Home Equity Line of Credit (HELOC)",
    rate: "Prime + 0.5–1%",
    details: "If you own a home with equity, a HELOC can consolidate high-interest debt at a much lower rate (currently ~6–7%). Your home is collateral — missing payments puts it at risk.",
    tip: "Best for: homeowners with significant equity and disciplined repayment habits.",
  },
  {
    title: "Personal Debt Consolidation Loan",
    rate: "8–15% typical",
    details: "A bank or credit union consolidation loan rolls multiple debts into one fixed monthly payment at a lower rate than credit cards. Requires decent credit score (650+).",
    tip: "Best for: multiple high-interest debts, steady income, good credit.",
  },
  {
    title: "Credit Union Refinancing",
    rate: "Often 2–4% lower than banks",
    details: "Credit unions in Canada often offer better rates than big banks for personal loans and lines of credit. Worth comparing if you're paying 19%+ on credit cards.",
    tip: "Best for: anyone — credit unions are member-owned and often more flexible.",
  },
  {
    title: "Debt Management Program (DMP)",
    rate: "Reduced or 0% (negotiated)",
    details: "A non-profit credit counselling agency negotiates with creditors to reduce or eliminate interest. You make one monthly payment to the agency. Does not require home equity or good credit.",
    tip: "Best for: those who can't qualify for traditional refinancing. Contact NFCC-affiliated agencies.",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => Math.round(n).toLocaleString("en-CA");
let nextId = 1;
const newId = () => String(nextId++);

// ─── Types ────────────────────────────────────────────────────────────────────

interface Debt {
  id:         string;
  name:       string;
  balance:    number | null;
  rate:       number | null;
  minPayment: number | null;
  type:       string;
}

interface DebtResult {
  id:              string;
  name:            string;
  balance:         number;
  rate:            number;
  minPayment:      number;
  // Minimum payments only
  minMonths:       number;
  minTotalInterest:number;
  minTotalPaid:    number;
  // With extra payment
  extraMonths:     number;
  extraTotalInterest: number;
  extraTotalPaid:  number;
  monthsSaved:     number;
  interestSaved:   number;
}

interface StrategyResult {
  order:          string[];
  totalMonths:    number;
  totalInterest:  number;
  payoffDates:    Record<string, number>; // debt id -> months to payoff
}

function calcPayoff(balance: number, rate: number, monthly: number): {
  months: number; totalInterest: number;
} {
  if (monthly <= 0) return { months: 9999, totalInterest: 9999999 };
  const r = rate / 100 / 12;
  if (r === 0) {
    const months = Math.ceil(balance / monthly);
    return { months, totalInterest: 0 };
  }
  // Check if payment covers interest
  const minRequired = balance * r;
  if (monthly <= minRequired) return { months: 9999, totalInterest: 9999999 };

  let bal = balance;
  let months = 0;
  let totalInt = 0;
  while (bal > 0.01 && months < 600) {
    const interest = bal * r;
    totalInt += interest;
    bal = bal + interest - monthly;
    if (bal < 0) bal = 0;
    months++;
  }
  return { months, totalInterest: totalInt };
}

function runStrategy(
  debts: Array<{ id: string; balance: number; rate: number; minPayment: number; name: string }>,
  extraMonthly: number,
  method: "avalanche" | "snowball"
): StrategyResult {
  // Sort: avalanche = highest rate first, snowball = lowest balance first
  const sorted = [...debts].sort((a, b) =>
    method === "avalanche" ? b.rate - a.rate : a.balance - b.balance
  );

  const balances: Record<string, number> = {};
  debts.forEach(d => { balances[d.id] = d.balance; });

  const payoffDates: Record<string, number> = {};
  let month = 0;
  let totalInterest = 0;
  let freedPayment = 0; // payments freed up as debts are paid off

  while (Object.keys(payoffDates).length < debts.length && month < 600) {
    month++;
    // Find current focus debt (first unpaid in sorted order)
    const focusDebt = sorted.find(d => !payoffDates[d.id]);

    for (const debt of sorted) {
      if (payoffDates[debt.id]) continue;
      const r = debt.rate / 100 / 12;
      const interest = balances[debt.id] * r;
      totalInterest += interest;
      balances[debt.id] += interest;

      // Apply payment
      let payment = debt.minPayment;
      if (focusDebt && debt.id === focusDebt.id) {
        payment += extraMonthly + freedPayment;
      }
      balances[debt.id] = Math.max(0, balances[debt.id] - payment);

      if (balances[debt.id] <= 0.01) {
        payoffDates[debt.id] = month;
        freedPayment += debt.minPayment;
      }
    }
  }

  return {
    order:        sorted.map(d => d.name),
    totalMonths:  month,
    totalInterest,
    payoffDates,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DebtPayoffClient() {
  const [debts, setDebts] = useState<Debt[]>([
    { id: newId(), name: "Credit Card 1", balance: null, rate: 19.99, minPayment: null, type: "Credit Card" },
  ]);
  const [extraPayment, setExtraPayment] = useState<number | null>(null);
  const [showRefinance, setShowRefinance] = useState(false);

  // ── Debt management ───────────────────────────────────────────────────────

  const addDebt = () => {
    setDebts(prev => [...prev, {
      id: newId(), name: `Debt ${prev.length + 1}`, balance: null, rate: 19.99, minPayment: null, type: "Credit Card",
    }]);
  };

  const removeDebt = (id: string) => {
    setDebts(prev => prev.filter(d => d.id !== id));
  };

  const updateDebt = (id: string, field: keyof Debt, value: any) => {
    setDebts(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  // ── Results ───────────────────────────────────────────────────────────────

  const results = useMemo<DebtResult[]>(() => {
    return debts
      .filter(d => d.balance && d.rate && d.minPayment)
      .map(d => {
        const balance    = d.balance!;
        const rate       = d.rate!;
        const minPayment = d.minPayment!;
        const extra      = extraPayment ?? 0;

        const min   = calcPayoff(balance, rate, minPayment);
        const withX = calcPayoff(balance, rate, minPayment + extra);

        return {
          id:                d.id,
          name:              d.name,
          balance,
          rate,
          minPayment,
          minMonths:         min.months,
          minTotalInterest:  min.totalInterest,
          minTotalPaid:      balance + min.totalInterest,
          extraMonths:       withX.months,
          extraTotalInterest:withX.totalInterest,
          extraTotalPaid:    balance + withX.totalInterest,
          monthsSaved:       min.months - withX.months,
          interestSaved:     min.totalInterest - withX.totalInterest,
        };
      });
  }, [debts, extraPayment]);

  const validDebts = debts.filter(d => d.balance && d.rate && d.minPayment).map(d => ({
    id:         d.id,
    name:       d.name,
    balance:    d.balance!,
    rate:       d.rate!,
    minPayment: d.minPayment!,
  }));

  const avalanche = useMemo(() =>
    validDebts.length > 0 ? runStrategy(validDebts, extraPayment ?? 0, "avalanche") : null,
    [validDebts, extraPayment]
  );

  const snowball = useMemo(() =>
    validDebts.length > 0 ? runStrategy(validDebts, extraPayment ?? 0, "snowball") : null,
    [validDebts, extraPayment]
  );

  const totalBalance      = results.reduce((s, r) => s + r.balance, 0);
  const totalMinInterest  = results.reduce((s, r) => s + r.minTotalInterest, 0);
  const totalExtraInterest= results.reduce((s, r) => s + r.extraTotalInterest, 0);
  const totalSaved        = totalMinInterest - totalExtraInterest;
  const hasResults        = results.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-gray-900">Debt Payoff Calculator</h1>
          <p className="text-gray-500 mt-1">
            See how fast you can get debt-free — and how much interest you save by paying extra each month.
          </p>
        </div>

        {/* Refinance info banner */}
        <button
          type="button"
          onClick={() => setShowRefinance(!showRefinance)}
          className="w-full bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-center justify-between text-left hover:bg-blue-100 transition-colors"
        >
          <div>
            <p className="text-sm font-semibold text-blue-800">💡 Refinancing & Consolidation Options</p>
            <p className="text-xs text-blue-600 mt-0.5">Balance transfers, HELOCs, consolidation loans — ways to lower your interest rate</p>
          </div>
          <span className="text-blue-500 text-lg">{showRefinance ? "▲" : "▼"}</span>
        </button>

        {showRefinance && (
          <div className="print:hidden bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Ways to Reduce Your Interest Rate</h3>
            {REFINANCE_INFO.map((item) => (
              <div key={item.title} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                  <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    {item.rate}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-1">{item.details}</p>
                <p className="text-xs text-blue-600 font-medium">{item.tip}</p>
              </div>
            ))}
            <p className="text-xs text-gray-400">
              Rates are approximate as of 2025. Always compare offers from multiple lenders. Your actual rate depends on credit score, income, and lender policies.
            </p>
          </div>
        )}

        {/* Debt inputs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">Your Debts</h2>
            <button
              type="button"
              onClick={addDebt}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-400 px-3 py-1.5 rounded-lg transition-colors"
            >
              + Add Debt
            </button>
          </div>

          {debts.map((debt, idx) => (
            <div key={debt.id} className="border border-gray-200 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={debt.name}
                  onChange={(e) => updateDebt(debt.id, "name", e.target.value)}
                  className="text-sm font-semibold text-gray-800 border-0 outline-none bg-transparent w-40"
                  placeholder="Debt name"
                />
                <div className="flex items-center gap-3">
                  <select
                    value={debt.type}
                    onChange={(e) => {
                      updateDebt(debt.id, "type", e.target.value);
                      updateDebt(debt.id, "rate", TYPICAL_RATES[e.target.value as keyof typeof TYPICAL_RATES] ?? debt.rate);
                    }}
                    className="text-xs px-2 py-1 border border-gray-300 rounded-lg outline-none bg-white text-gray-700"
                  >
                    {Object.keys(TYPICAL_RATES).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  {debts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDebt(debt.id)}
                      className="text-red-400 hover:text-red-600 text-sm font-medium"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Balance Owing</label>
                  <NumericFormat
                    thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
                    placeholder="$5,000"
                    onValueChange={(v) => updateDebt(debt.id, "balance", v.floatValue ?? null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Interest Rate (%)</label>
                  <input
                    type="number" min="0" max="50" step="0.01"
                    value={debt.rate ?? ""}
                    onChange={(e) => updateDebt(debt.id, "rate", Number(e.target.value) || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Monthly Payment</label>
                  <NumericFormat
                    thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
                    placeholder="$150"
                    onValueChange={(v) => updateDebt(debt.id, "minPayment", v.floatValue ?? null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right text-sm"
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Extra payment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Extra Monthly Payment
              <span className="text-gray-400 font-normal ml-1">(applied to focus debt)</span>
            </label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$100"
              onValueChange={(v) => setExtraPayment(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
            />
          </div>
        </div>

        {/* Results */}
                    <div className="print:hidden flex justify-end">
              <PrintButton label="Print Report" />
            </div>

            {!hasResults ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">💳</div>
            <p className="text-xl font-semibold text-gray-700">Enter your debt details above</p>
            <p className="text-gray-500 mt-2">Your payoff plan will appear here instantly.</p>
          </div>
        ) : (
          <>
            {/* Hero totals */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-600 text-white rounded-xl p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-blue-200 uppercase tracking-wide">Total Debt</p>
                <p className="text-4xl font-black mt-2">${fmt(totalBalance)}</p>
                <p className="text-blue-200 text-sm mt-1">across {results.length} debt{results.length > 1 ? "s" : ""}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Interest (min payments)</p>
                <p className="text-3xl font-bold text-red-500 mt-2">${fmt(totalMinInterest)}</p>
                <p className="text-gray-400 text-sm mt-1">total if you pay minimums</p>
              </div>
              {(extraPayment ?? 0) > 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center shadow-sm">
                  <p className="text-sm font-medium text-green-600 uppercase tracking-wide">Interest Saved</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">${fmt(totalSaved)}</p>
                  <p className="text-gray-400 text-sm mt-1">by paying ${fmt(extraPayment!)} extra/mo</p>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Cost</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">${fmt(totalBalance + totalMinInterest)}</p>
                  <p className="text-gray-400 text-sm mt-1">principal + interest</p>
                </div>
              )}
            </div>

            {/* Per-debt breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">Debt-by-Debt Breakdown</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {results.map((r) => (
                  <div key={r.id} className="px-6 py-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold text-gray-800">{r.name}</p>
                        <p className="text-xs text-gray-400">${fmt(r.balance)} at {r.rate}% — ${fmt(r.minPayment)}/mo</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-500">${fmt(r.minTotalInterest)} interest</p>
                        <p className="text-xs text-gray-400">
                          {r.minMonths >= 600 ? "Never (payment too low)" : `${Math.floor(r.minMonths / 12)}y ${r.minMonths % 12}m`}
                        </p>
                      </div>
                    </div>

                    {/* Interest bar */}
                    <div className="mb-2">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Principal</span>
                        <span>Interest ({((r.minTotalInterest / r.minTotalPaid) * 100).toFixed(0)}%)</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
                        <div className="h-full bg-gray-400 rounded-l-full"
                          style={{ width: `${(r.balance / r.minTotalPaid) * 100}%` }} />
                        <div className="h-full bg-red-400"
                          style={{ width: `${(r.minTotalInterest / r.minTotalPaid) * 100}%` }} />
                      </div>
                    </div>

                    {/* Extra payment impact */}
                    {(extraPayment ?? 0) > 0 && r.interestSaved > 0 && (
                      <div className="mt-3 bg-green-50 rounded-lg px-4 py-2.5 flex justify-between items-center">
                        <p className="text-xs text-green-700 font-medium">
                          With +${fmt(extraPayment!)}/mo extra:
                          paid off {Math.floor(r.monthsSaved / 12)}y {r.monthsSaved % 12}m sooner
                        </p>
                        <p className="text-xs font-bold text-green-700">−${fmt(r.interestSaved)}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Avalanche vs Snowball — only show for multiple debts */}
            {validDebts.length > 1 && avalanche && snowball && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800">Avalanche vs Snowball Strategy</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Two proven methods to pay off multiple debts faster</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                  {/* Avalanche */}
                  <div className="p-6">
                    <p className="text-xs font-bold uppercase tracking-widest text-red-500 mb-1">🏔 Debt Avalanche</p>
                    <p className="text-xs text-gray-500 mb-3">Pay highest interest rate first — saves the most money</p>
                    <p className="text-2xl font-black text-gray-800">${fmt(avalanche.totalInterest)}</p>
                    <p className="text-gray-400 text-sm">total interest</p>
                    <p className="text-gray-600 text-sm mt-2">
                      Paid off in <strong>{Math.floor(avalanche.totalMonths / 12)}y {avalanche.totalMonths % 12}m</strong>
                    </p>
                    <p className="text-xs text-gray-400 mt-2">Order: {avalanche.order.join(" → ")}</p>
                  </div>
                  {/* Snowball */}
                  <div className="p-6">
                    <p className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-1">⛄ Debt Snowball</p>
                    <p className="text-xs text-gray-500 mb-3">Pay lowest balance first — faster wins, more motivation</p>
                    <p className="text-2xl font-black text-gray-800">${fmt(snowball.totalInterest)}</p>
                    <p className="text-gray-400 text-sm">total interest</p>
                    <p className="text-gray-600 text-sm mt-2">
                      Paid off in <strong>{Math.floor(snowball.totalMonths / 12)}y {snowball.totalMonths % 12}m</strong>
                    </p>
                    <p className="text-xs text-gray-400 mt-2">Order: {snowball.order.join(" → ")}</p>
                  </div>
                </div>
                <div className={`px-6 py-4 border-t border-gray-100 ${avalanche.totalInterest <= snowball.totalInterest ? "bg-red-50" : "bg-blue-50"}`}>
                  <p className="text-sm text-gray-700">
                    {avalanche.totalInterest <= snowball.totalInterest ? (
                      <>🏆 <strong>Avalanche saves ${fmt(snowball.totalInterest - avalanche.totalInterest)} more</strong> in interest — but Snowball may keep you more motivated with quick wins.</>
                    ) : (
                      <>🏆 <strong>Snowball saves ${fmt(avalanche.totalInterest - snowball.totalInterest)} more</strong> in this case — and gives you faster motivation boosts.</>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Extra payment wow moment */}
            {(extraPayment ?? 0) > 0 && totalSaved > 0 && (
              <div className="bg-green-600 text-white rounded-xl p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-green-200 uppercase tracking-wide">Total Interest Saved</p>
                <p className="text-5xl font-black mt-2">${fmt(totalSaved)}</p>
                <p className="text-green-200 text-sm mt-1">
                  by paying just ${fmt(extraPayment!)} extra per month — ${fmt(extraPayment! * 12)}/year
                </p>
              </div>
            )}
          </>
        )}

        {/* SEO / FAQ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 prose prose-gray max-w-none">
          <h2 className="text-xl font-bold text-gray-900 mb-4">How to Pay Off Debt Faster in Canada</h2>
          <p className="text-gray-600">
            The average Canadian carries significant credit card and line of credit debt, often at interest rates of 19–29%. Even small extra payments can dramatically reduce the time and total interest paid.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Avalanche vs Snowball — Which is Better?</h3>
          <p className="text-gray-600">
            The <strong>debt avalanche</strong> method targets your highest-interest debt first — mathematically optimal, saving the most money. The <strong>debt snowball</strong> targets your smallest balance first — psychologically powerful, giving you quick wins to stay motivated. Research shows the snowball method leads to higher debt payoff completion rates despite costing slightly more in interest.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">The Power of Extra Payments</h3>
          <p className="text-gray-600">
            On a $10,000 credit card at 19.99% with a $250/month minimum payment, you'd pay over $6,800 in interest and take 6+ years to pay it off. Adding just $100/month extra cuts the payoff time nearly in half and saves over $3,000 in interest.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Balance Transfers in Canada</h3>
          <p className="text-gray-600">
            Many Canadian credit cards offer <strong>0% balance transfer promotions</strong> for 6–12 months. Transferring a $5,000 balance from a 19.99% card to a 0% promotional card and paying it off during the promo period can save hundreds in interest. Watch for transfer fees (typically 1–3%) and the rate after the promo ends.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Credit Counselling in Canada</h3>
          <p className="text-gray-600">
            If you're overwhelmed by debt, non-profit credit counselling agencies can help negotiate with creditors and set up a <strong>Debt Management Program (DMP)</strong>. Look for agencies affiliated with Credit Counselling Canada or the NFCC. Beware of for-profit "debt settlement" companies that charge high fees.
          </p>

          <p className="text-sm text-gray-400 mt-6">
            This calculator provides estimates based on fixed interest rates and regular monthly payments. Actual payoff times may vary. Not financial advice — consult a credit counsellor or financial advisor for personalized guidance.
          </p>
        </div>

      </div>
    </div>
  );
}
