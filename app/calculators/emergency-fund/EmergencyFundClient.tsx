"use client";

import { useState, useMemo } from "react";
import { NumericFormat } from "react-number-format";
import PrintButton from "@/components/PrintButton";

function fmt(n: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
}
function fmtFull(n: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

type JobStability = "very_stable" | "stable" | "variable" | "uncertain";
type Dependents = "none" | "one" | "two_plus";
type IncomeType = "employed" | "self_employed" | "dual_income" | "single_income";

const STABILITY_MONTHS: Record<JobStability, { min: number; max: number; label: string }> = {
  very_stable:  { min: 3, max: 3,  label: "Very Stable — government, tenured, long-term employer" },
  stable:       { min: 3, max: 6,  label: "Stable — permanent employee, established field" },
  variable:     { min: 6, max: 9,  label: "Variable — contract, seasonal, or commission-based" },
  uncertain:    { min: 9, max: 12, label: "Uncertain — new job, unstable industry, or self-employed" },
};

const DEPENDENT_MONTHS: Record<Dependents, number> = {
  none: 0, one: 1, two_plus: 2,
};

const INCOME_MONTHS: Record<IncomeType, number> = {
  employed: 0, self_employed: 2, dual_income: -1, single_income: 1,
};

export default function EmergencyFundClient() {
  // Expenses
  const [rent, setRent] = useState(0);
  const [groceries, setGroceries] = useState(0);
  const [utilities, setUtilities] = useState(0);
  const [transport, setTransport] = useState(0);
  const [insurance, setInsurance] = useState(0);
  const [debtPayments, setDebtPayments] = useState(0);
  const [otherEssential, setOtherEssential] = useState(0);

  // Situation
  const [jobStability, setJobStability] = useState<JobStability>("stable");
  const [dependents, setDependents] = useState<Dependents>("none");
  const [incomeType, setIncomeType] = useState<IncomeType>("employed");
  const [currentSaved, setCurrentSaved] = useState(0);
  const [monthlySavings, setMonthlySavings] = useState(0);
  const [savingsRate, setSavingsRate] = useState(2.5); // HISA rate

  const [showInfo, setShowInfo] = useState(false);

  const monthlyExpenses = rent + groceries + utilities + transport + insurance + debtPayments + otherEssential;
  const hasResults = monthlyExpenses > 0;

  const results = useMemo(() => {
    if (!hasResults) return null;

    const stability = STABILITY_MONTHS[jobStability];
    const baseMonths = (stability.min + stability.max) / 2;
    const depMonths = DEPENDENT_MONTHS[dependents];
    const incomeMonths = INCOME_MONTHS[incomeType];
    const recommendedMonths = Math.max(3, Math.min(12, baseMonths + depMonths + incomeMonths));

    const minTarget = monthlyExpenses * stability.min;
    const idealTarget = monthlyExpenses * recommendedMonths;
    const maxTarget = monthlyExpenses * stability.max + monthlyExpenses * depMonths + monthlyExpenses * Math.max(0, incomeMonths);

    const gap = Math.max(0, idealTarget - currentSaved);
    const monthsToGoal = monthlySavings > 0 ? Math.ceil(gap / monthlySavings) : null;

    // With interest (compound monthly)
    let monthsWithInterest: number | null = null;
    if (monthlySavings > 0 && gap > 0) {
      const r = savingsRate / 100 / 12;
      let bal = currentSaved;
      let m = 0;
      while (bal < idealTarget && m < 600) {
        bal = bal * (1 + r) + monthlySavings;
        m++;
      }
      monthsWithInterest = m;
    }

    const interestEarned = monthsToGoal && monthlySavings > 0
      ? (currentSaved + monthlySavings * (monthsWithInterest ?? 0)) - (currentSaved + gap)
      : 0;

    // Milestones
    const milestones = [1, 2, 3, 6, recommendedMonths].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b).map(m => ({
      months: m,
      amount: monthlyExpenses * m,
      reached: currentSaved >= monthlyExpenses * m,
      monthsAway: monthlySavings > 0 ? Math.max(0, Math.ceil((monthlyExpenses * m - currentSaved) / monthlySavings)) : null,
    }));

    const percentComplete = idealTarget > 0 ? Math.min(100, (currentSaved / idealTarget) * 100) : 0;

    return {
      recommendedMonths, minTarget, idealTarget, maxTarget,
      gap, monthsToGoal, monthsWithInterest, interestEarned,
      milestones, percentComplete,
    };
  }, [monthlyExpenses, jobStability, dependents, incomeType, currentSaved, monthlySavings, savingsRate, hasResults]);

  const expenseItems = [
    { label: "Rent / Mortgage", value: rent, set: setRent },
    { label: "Groceries & Food", value: groceries, set: setGroceries },
    { label: "Utilities & Phone", value: utilities, set: setUtilities },
    { label: "Transportation", value: transport, set: setTransport },
    { label: "Insurance", value: insurance, set: setInsurance },
    { label: "Debt Payments", value: debtPayments, set: setDebtPayments },
    { label: "Other Essentials", value: otherEssential, set: setOtherEssential },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* Info Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl overflow-hidden">
        <button onClick={() => setShowInfo(!showInfo)}
          className="w-full flex items-center justify-between px-5 py-3 text-blue-800 font-semibold text-sm">
          <span>💡 How much should you save?</span>
          <span>{showInfo ? "▲ Hide" : "▼ Show"}</span>
        </button>
        {showInfo && (
          <div className="px-5 pb-4 text-blue-900 text-sm space-y-2">
            <p>An emergency fund covers essential living expenses — rent, food, utilities, transport, insurance, and debt payments — for a period long enough to weather a job loss, illness, or unexpected expense without going into debt.</p>
            <p>The standard recommendation is <strong>3–6 months</strong> of essential expenses. Self-employed individuals, those with variable income, or single-income households should target 6–12 months. Your ideal target depends on your specific situation.</p>
            <p>Keep your emergency fund in a <strong>high-interest savings account (HISA)</strong> or a cashable GIC — accessible within a few days but earning interest rather than sitting idle.</p>
          </div>
        )}
      </div>

      {/* Inputs */}
      <div className="print:hidden bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <h2 className="text-lg font-bold text-gray-800">Monthly Essential Expenses</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {expenseItems.map(item => (
            <div key={item.label}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{item.label}</label>
              <NumericFormat value={item.value || ""} onValueChange={v => item.set(v.floatValue ?? 0)}
                thousandSeparator prefix="$" placeholder="$0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          ))}
          <div className="md:col-span-2 bg-gray-50 rounded-lg px-4 py-3 flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700">Total Monthly Essential Expenses</span>
            <span className="text-xl font-black text-blue-700">{fmt(monthlyExpenses)}</span>
          </div>
        </div>

        {/* Situation */}
        <div className="pt-4 border-t border-gray-100 space-y-4">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Your Situation</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Job / Income Stability</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {(Object.entries(STABILITY_MONTHS) as [JobStability, typeof STABILITY_MONTHS[JobStability]][]).map(([key, val]) => (
                <button key={key} onClick={() => setJobStability(key)}
                  className={`py-2.5 px-3 rounded-lg text-xs border transition-colors text-left ${jobStability === key ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"}`}>
                  {val.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dependents</label>
              <div className="flex gap-2">
                {([["none", "None"], ["one", "1 dependent"], ["two_plus", "2+ dependents"]] as [Dependents, string][]).map(([key, label]) => (
                  <button key={key} onClick={() => setDependents(key)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${dependents === key ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Income Type</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ["employed", "Employed"],
                  ["self_employed", "Self-Employed"],
                  ["dual_income", "Dual Income"],
                  ["single_income", "Single Income"],
                ] as [IncomeType, string][]).map(([key, label]) => (
                  <button key={key} onClick={() => setIncomeType(key)}
                    className={`py-2 rounded-lg text-xs font-medium border transition-colors ${incomeType === key ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Savings Progress */}
        <div className="pt-4 border-t border-gray-100 space-y-4">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Savings Progress</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currently Saved</label>
              <NumericFormat value={currentSaved || ""} onValueChange={v => setCurrentSaved(v.floatValue ?? 0)}
                thousandSeparator prefix="$" placeholder="$0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Contribution</label>
              <NumericFormat value={monthlySavings || ""} onValueChange={v => setMonthlySavings(v.floatValue ?? 0)}
                thousandSeparator prefix="$" placeholder="$0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                HISA Rate: <span className="text-blue-600 font-bold">{savingsRate}%</span>
              </label>
              <input type="range" min={0} max={6} step={0.25} value={savingsRate}
                onChange={e => setSavingsRate(Number(e.target.value))}
                className="w-full accent-blue-600 mt-2" />
            </div>
          </div>
        </div>
      </div>

      {/* Results Gate */}
      {!hasResults && (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-400">
          <div className="text-3xl mb-2">🛟</div>
          <div className="font-medium">Enter your monthly essential expenses above to calculate your emergency fund target</div>
        </div>
      )}

      {hasResults && results && <>

      {/* Hero */}
      <div className="bg-blue-600 text-white rounded-xl p-6 text-center">
        <div className="text-sm font-medium text-blue-200 mb-1">Recommended Emergency Fund</div>
        <div className="text-5xl font-black mb-1">{fmt(results.idealTarget)}</div>
        <div className="text-blue-200 text-sm">
          {results.recommendedMonths} months of expenses · {fmt(monthlyExpenses)}/month essential costs
        </div>
      </div>

      <PrintButton />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Currently Saved</div>
          <div className="text-xl font-bold text-gray-800">{fmt(currentSaved)}</div>
          <div className="text-xs text-gray-400 mt-0.5">{results.percentComplete.toFixed(0)}% of goal</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Still Needed</div>
          <div className="text-xl font-bold text-red-600">{fmt(results.gap)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Months to Goal</div>
          <div className="text-xl font-bold text-gray-800">
            {results.monthsWithInterest !== null ? `${results.monthsWithInterest} mo` : "—"}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">at {fmt(monthlySavings)}/mo</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Recommended Range</div>
          <div className="text-xl font-bold text-gray-800">{results.recommendedMonths} months</div>
          <div className="text-xs text-gray-400 mt-0.5">{fmt(results.minTarget)} – {fmt(results.maxTarget)}</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
          <span>Progress to Goal</span>
          <span>{results.percentComplete.toFixed(1)}%</span>
        </div>
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-4 rounded-full transition-all ${results.percentComplete >= 100 ? "bg-green-500" : results.percentComplete >= 50 ? "bg-blue-500" : "bg-amber-400"}`}
            style={{ width: `${Math.min(100, results.percentComplete)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{fmt(currentSaved)} saved</span>
          <span>Goal: {fmt(results.idealTarget)}</span>
        </div>
      </div>

      {/* Milestones */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Savings Milestones</h2>
        <div className="space-y-3">
          {results.milestones.map(m => (
            <div key={m.months} className={`flex items-center justify-between p-3 rounded-lg ${m.reached ? "bg-green-50 border border-green-200" : "bg-gray-50"}`}>
              <div className="flex items-center gap-3">
                <span className="text-lg">{m.reached ? "✅" : "⏳"}</span>
                <div>
                  <div className="font-semibold text-sm text-gray-800">{m.months}-month fund</div>
                  <div className="text-xs text-gray-500">{fmt(m.amount)}</div>
                </div>
              </div>
              <div className="text-right text-sm">
                {m.reached
                  ? <span className="text-green-600 font-semibold">Reached!</span>
                  : m.monthsAway !== null
                    ? <span className="text-gray-600">{m.monthsAway} months away</span>
                    : <span className="text-gray-400">—</span>
                }
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Range Comparison */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Target Range by Months</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Coverage</th>
                <th className="px-4 py-3 text-right text-gray-500 font-medium">Target Amount</th>
                <th className="px-4 py-3 text-right text-gray-500 font-medium">Gap Remaining</th>
                <th className="px-4 py-3 text-right text-gray-500 font-medium">Months to Reach</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[3, 4, 6, 9, 12].map(m => {
                const target = monthlyExpenses * m;
                const gap = Math.max(0, target - currentSaved);
                const months = monthlySavings > 0 ? Math.ceil(gap / monthlySavings) : null;
                const isRec = m === results.recommendedMonths;
                return (
                  <tr key={m} className={isRec ? "bg-blue-50" : "hover:bg-gray-50"}>
                    <td className={`px-6 py-3 font-medium ${isRec ? "text-blue-700" : "text-gray-700"}`}>
                      {m} months {isRec && <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full ml-1">Recommended</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-800">{fmt(target)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{gap > 0 ? fmt(gap) : <span className="text-green-600">✓ Done</span>}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{months !== null ? (months === 0 ? "✓" : `${months} mo`) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      </>}

      {/* SEO / FAQ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5 text-sm text-gray-600 leading-relaxed">
        <h2 className="text-xl font-bold text-gray-900">Emergency Fund Planning for Canadians</h2>
        <p>An emergency fund is your financial safety net — a dedicated pool of cash that covers essential living expenses if you lose your job, face a major medical expense, or encounter an unexpected cost. Unlike investments, it prioritizes accessibility over returns.</p>
        <h3 className="text-base font-bold text-gray-800">How Many Months Do You Need?</h3>
        <p>The standard range is 3–6 months, but your ideal target depends on your situation. Self-employed Canadians, single-income households, and those in unstable industries should aim for 6–12 months. Dual-income families with stable jobs can often get by with 3 months.</p>
        <h3 className="text-base font-bold text-gray-800">Where to Keep It in Canada</h3>
        <p>Keep your emergency fund in a high-interest savings account (HISA) or a cashable GIC. Top Canadian HISAs currently offer 3–5% interest. EQ Bank, Oaken Financial, and credit unions often lead on rates. Avoid investing your emergency fund in stocks or non-cashable GICs — the risk of needing it exactly when markets are down is real.</p>
        <h3 className="text-base font-bold text-gray-800">TFSA vs Regular Savings Account</h3>
        <p>Keeping your emergency fund in a TFSA HISA is ideal — you earn interest tax-free and can withdraw anytime without tax consequences. Just remember that TFSA withdrawals create re-contribution room the following January, not immediately, so avoid withdrawing and redepositing frequently.</p>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-xs">
          <strong>Disclaimer:</strong> This calculator provides general guidance only. Individual financial circumstances vary. Consult a certified financial planner for personalized advice.
        </div>
      </div>
    </div>
  );
}
