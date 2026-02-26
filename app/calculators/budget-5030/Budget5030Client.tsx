"use client";

// app/calculators/budget-5030/Budget5030Client.tsx

import PrintButton from "@/components/PrintButton";
import { useState, useMemo } from "react";
import { NumericFormat } from "react-number-format";

// ─── Constants ────────────────────────────────────────────────────────────────

const NEEDS_CATEGORIES = [
  { key: "rent",        label: "Rent / Mortgage",        icon: "🏠", placeholder: "$1,800" },
  { key: "groceries",   label: "Groceries",              icon: "🛒", placeholder: "$600"   },
  { key: "transport",   label: "Transportation",         icon: "🚗", placeholder: "$400"   },
  { key: "utilities",   label: "Utilities & Phone",      icon: "💡", placeholder: "$200"   },
  { key: "insurance",   label: "Insurance",              icon: "🛡",  placeholder: "$200"   },
  { key: "childcare",   label: "Childcare / Education",  icon: "👶", placeholder: "$0"     },
  { key: "minDebt",     label: "Minimum Debt Payments",  icon: "💳", placeholder: "$300"   },
  { key: "medical",     label: "Medical / Prescriptions",icon: "💊", placeholder: "$100"   },
];

const WANTS_CATEGORIES = [
  { key: "dining",      label: "Dining Out / Takeout",   icon: "🍽",  placeholder: "$300"   },
  { key: "entertainment",label: "Entertainment",         icon: "🎬", placeholder: "$100"   },
  { key: "shopping",    label: "Shopping / Clothing",    icon: "👗", placeholder: "$200"   },
  { key: "subscriptions",label: "Subscriptions",         icon: "📺", placeholder: "$50"    },
  { key: "gym",         label: "Gym / Hobbies",          icon: "🏋",  placeholder: "$80"    },
  { key: "travel",      label: "Travel / Vacations",     icon: "✈️", placeholder: "$150"   },
  { key: "personal",    label: "Personal Care / Beauty", icon: "💅", placeholder: "$100"   },
  { key: "gifts",       label: "Gifts / Donations",      icon: "🎁", placeholder: "$50"    },
];

const SAVINGS_CATEGORIES = [
  { key: "emergency",   label: "Emergency Fund",         icon: "🆘", placeholder: "$200"   },
  { key: "rrsp",        label: "RRSP",                   icon: "📈", placeholder: "$300"   },
  { key: "tfsa",        label: "TFSA",                   icon: "💰", placeholder: "$200"   },
  { key: "fhsa",        label: "FHSA",                   icon: "🏠", placeholder: "$200"   },
  { key: "extraDebt",   label: "Extra Debt Payments",    icon: "💳", placeholder: "$200"   },
  { key: "retirement",  label: "Retirement / Pension",   icon: "🌅", placeholder: "$200"   },
  { key: "other",       label: "Other Savings / Goals",  icon: "🎯", placeholder: "$100"   },
];

const PAY_FREQUENCIES = [
  { label: "Annual",      multiplier: 1        },
  { label: "Monthly",     multiplier: 12       },
  { label: "Semi-monthly",multiplier: 24       },
  { label: "Bi-weekly",   multiplier: 26       },
  { label: "Weekly",      multiplier: 52       },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt    = (n: number) => Math.round(n).toLocaleString("en-CA");
const fmtPct = (n: number) => n.toFixed(1);

// ─── Component ────────────────────────────────────────────────────────────────

export default function Budget5030Client() {
  const [grossIncome,   setGrossIncome]   = useState<number | null>(null);
  const [taxRate,       setTaxRate]       = useState<number | null>(25);
  const [frequency,     setFrequency]     = useState(1); // index into PAY_FREQUENCIES
  const [needs,         setNeeds]         = useState<Record<string, number | null>>({});
  const [wants,         setWants]         = useState<Record<string, number | null>>({});
  const [savings,       setSavings]       = useState<Record<string, number | null>>({});
  const [activeSection, setActiveSection] = useState<"needs" | "wants" | "savings">("needs");

  const freq = PAY_FREQUENCIES[frequency];

  const result = useMemo(() => {
    if (!grossIncome || grossIncome <= 0) return null;

    const annualGross  = grossIncome * freq.multiplier;
    const annualNet    = annualGross * (1 - (taxRate ?? 25) / 100);
    const monthlyNet   = annualNet / 12;

    // Targets
    const targetNeeds   = monthlyNet * 0.50;
    const targetWants   = monthlyNet * 0.30;
    const targetSavings = monthlyNet * 0.20;

    // Actuals
    const totalNeeds   = Object.values(needs).reduce((s, v) => (s ?? 0) + (v ?? 0), 0) as number;
    const totalWants   = Object.values(wants).reduce((s, v) => (s ?? 0) + (v ?? 0), 0) as number;
    const totalSavings = Object.values(savings).reduce((s, v) => (s ?? 0) + (v ?? 0), 0) as number;
    const totalSpent   = totalNeeds + totalWants + totalSavings;
    const unallocated  = monthlyNet - totalSpent;

    // Pct of net income
    const needsPct   = monthlyNet > 0 ? (totalNeeds   / monthlyNet) * 100 : 0;
    const wantsPct   = monthlyNet > 0 ? (totalWants   / monthlyNet) * 100 : 0;
    const savingsPct = monthlyNet > 0 ? (totalSavings / monthlyNet) * 100 : 0;

    return {
      annualGross,
      annualNet,
      monthlyNet,
      targetNeeds,
      targetWants,
      targetSavings,
      totalNeeds,
      totalWants,
      totalSavings,
      totalSpent,
      unallocated,
      needsPct,
      wantsPct,
      savingsPct,
      needsDiff:   totalNeeds   - targetNeeds,
      wantsDiff:   totalWants   - targetWants,
      savingsDiff: totalSavings - targetSavings,
    };
  }, [grossIncome, taxRate, frequency, needs, wants, savings]);

  const setCategory = (
    setter: React.Dispatch<React.SetStateAction<Record<string, number | null>>>,
    key: string,
    val: number | null
  ) => setter(prev => ({ ...prev, [key]: val }));

  const renderSection = (
    title: string,
    emoji: string,
    color: string,
    bgColor: string,
    borderColor: string,
    targetPct: number,
    totalActual: number,
    actualPct: number,
    diff: number,
    categories: typeof NEEDS_CATEGORIES,
    values: Record<string, number | null>,
    setter: React.Dispatch<React.SetStateAction<Record<string, number | null>>>,
    sectionKey: "needs" | "wants" | "savings"
  ) => {
    const isActive = activeSection === sectionKey;
    const isOver   = diff > 0;

    return (
      <div className={`bg-white rounded-xl shadow-sm border-2 ${isActive ? borderColor : "border-gray-200"} overflow-hidden transition-all`}>
        {/* Section header */}
        <button
          type="button"
          onClick={() => setActiveSection(isActive ? sectionKey : sectionKey)}
          className="w-full px-6 py-4 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{emoji}</span>
            <div>
              <p className="font-bold text-gray-800">{title}</p>
              <p className="text-xs text-gray-400">Target: {targetPct}% of take-home</p>
            </div>
          </div>
          <div className="text-right">
            {result ? (
              <>
                <p className={`text-lg font-black ${color}`}>${fmt(totalActual)}/mo</p>
                <p className={`text-xs font-semibold ${isOver ? "text-red-500" : "text-green-600"}`}>
                  {isOver ? `▲ $${fmt(diff)} over` : `▼ $${fmt(Math.abs(diff))} under`} target
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-400">Enter income first</p>
            )}
          </div>
        </button>

        {/* Progress bar */}
                    <div className="print:hidden flex justify-end">
              <PrintButton label="Print Report" />
            </div>

            {result && (
          <div className="px-6 pb-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{fmtPct(actualPct)}% of take-home</span>
              <span>Target: {targetPct}%</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isOver ? "bg-red-400" : bgColor.replace("bg-", "bg-")}`}
                style={{ width: `${Math.min(actualPct / targetPct * 100, 150)}%`, maxWidth: "100%" }}
              />
              {/* Target marker at 100% */}
              <div className="absolute top-0 bottom-0 w-0.5 bg-gray-400 opacity-60" style={{ left: "66.7%" }} />
            </div>
          </div>
        )}

        {/* Category inputs */}
        <div className="px-6 pb-5 space-y-3">
          {categories.map((cat) => (
            <div key={cat.key} className="flex items-center gap-3">
              <span className="text-base w-6 text-center shrink-0">{cat.icon}</span>
              <label className="flex-1 text-sm text-gray-600 min-w-0">{cat.label}</label>
              <NumericFormat
                thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
                placeholder={cat.placeholder}
                value={values[cat.key] ?? ""}
                onValueChange={(v) => setCategory(setter, cat.key, v.floatValue ?? null)}
                className="w-28 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right text-sm"
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-gray-900">50/30/20 Budget Calculator</h1>
          <p className="text-gray-500 mt-1">
            The simplest budgeting rule: 50% needs, 30% wants, 20% savings. See how your spending stacks up.
          </p>
        </div>

        {/* Income inputs */}
        <div className="print:hidden bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Your Income</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Pay amount */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gross Pay Amount
              </label>
              <NumericFormat
                thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
                placeholder="$5,000"
                onValueChange={(v) => setGrossIncome(v.floatValue ?? null)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
              />
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(Number(e.target.value))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 bg-white text-gray-900"
              >
                {PAY_FREQUENCIES.map((f, i) => (
                  <option key={f.label} value={i}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tax rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimated Tax Rate (%)
              <span className="text-gray-400 font-normal ml-1">(income tax + CPP + EI combined)</span>
            </label>
            <input
              type="number" min="0" max="60" step="1"
              defaultValue={25}
              onChange={(e) => setTaxRate(Number(e.target.value) || null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
            />
            <p className="text-xs text-gray-400 mt-1">
              Typical range: 20–35%. Use our <a href="/calculators/income-tax" className="text-blue-500 hover:underline">Income Tax Calculator</a> for a precise figure.
            </p>
          </div>

          {/* Income summary */}
          {result && (
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-100">
              <div className="text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Annual Gross</p>
                <p className="text-lg font-bold text-gray-800">${fmt(result.annualGross)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Annual Net</p>
                <p className="text-lg font-bold text-gray-700">${fmt(result.annualNet)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Monthly Take-Home</p>
                <p className="text-lg font-bold text-blue-600">${fmt(result.monthlyNet)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Target breakdown */}
        {result && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "50% Needs",   value: result.targetNeeds,   color: "text-blue-600",  bg: "bg-blue-50",   border: "border-blue-200"  },
              { label: "30% Wants",   value: result.targetWants,   color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
              { label: "20% Savings", value: result.targetSavings, color: "text-green-600",  bg: "bg-green-50",  border: "border-green-200"  },
            ].map((t) => (
              <div key={t.label} className={`${t.bg} border ${t.border} rounded-xl p-4 text-center`}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t.label}</p>
                <p className={`text-xl font-black mt-1 ${t.color}`}>${fmt(t.value)}</p>
                <p className="text-xs text-gray-400 mt-0.5">per month</p>
              </div>
            ))}
          </div>
        )}

        {/* The three sections */}
        {renderSection(
          "Needs — Essentials", "🏠", "text-blue-600", "bg-blue-500", "border-blue-500",
          50, result?.totalNeeds ?? 0, result?.needsPct ?? 0, result?.needsDiff ?? 0,
          NEEDS_CATEGORIES, needs, setNeeds, "needs"
        )}
        {renderSection(
          "Wants — Lifestyle", "🎉", "text-purple-600", "bg-purple-500", "border-purple-500",
          30, result?.totalWants ?? 0, result?.wantsPct ?? 0, result?.wantsDiff ?? 0,
          WANTS_CATEGORIES, wants, setWants, "wants"
        )}
        {renderSection(
          "Savings & Debt Payoff", "💰", "text-green-600", "bg-green-500", "border-green-500",
          20, result?.totalSavings ?? 0, result?.savingsPct ?? 0, result?.savingsDiff ?? 0,
          SAVINGS_CATEGORIES, savings, setSavings, "savings"
        )}

        {/* Summary */}
        {result && (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">Budget Summary</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  { label: "Monthly Take-Home",       value: result.monthlyNet,    color: "text-blue-700",  bold: true  },
                  { label: "Needs",                   value: result.totalNeeds,    color: result.needsDiff   > 0 ? "text-red-500" : "text-gray-800", bold: false,
                    note: `${fmtPct(result.needsPct)}% — target 50%` },
                  { label: "Wants",                   value: result.totalWants,    color: result.wantsDiff   > 0 ? "text-red-500" : "text-gray-800", bold: false,
                    note: `${fmtPct(result.wantsPct)}% — target 30%` },
                  { label: "Savings & Debt Payoff",   value: result.totalSavings,  color: result.savingsDiff < 0 ? "text-amber-600" : "text-green-600", bold: false,
                    note: `${fmtPct(result.savingsPct)}% — target 20%` },
                  { label: "Total Allocated",         value: result.totalSpent,    color: "text-gray-900",  bold: true  },
                  { label: result.unallocated >= 0 ? "Unallocated" : "Over Budget",
                    value: Math.abs(result.unallocated), color: result.unallocated >= 0 ? "text-green-600" : "text-red-600", bold: true },
                ].map((row) => (
                  <div key={row.label} className={`flex justify-between items-center px-6 py-3.5 ${row.bold ? "bg-gray-50" : "hover:bg-gray-50"}`}>
                    <div>
                      <span className={`text-sm ${row.bold ? "font-semibold text-gray-800" : "text-gray-600"}`}>{row.label}</span>
                      {"note" in row && row.note && <p className="text-xs text-gray-400">{row.note}</p>}
                    </div>
                    <span className={`text-sm font-${row.bold ? "bold" : "medium"} ${row.color}`}>
                      {row.label.includes("Over") ? "−" : ""}${fmt(row.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual allocation bars */}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Your Budget vs 50/30/20 Target
              </h3>

              {/* Full-width stacked bar */}
              <div className="mb-6">
                <p className="text-xs text-gray-400 mb-2">Your actual allocation</p>
                <div className="h-5 bg-gray-100 rounded-full overflow-hidden flex">
                  {[
                    { value: result.needsPct,   color: "bg-blue-500"   },
                    { value: result.wantsPct,   color: "bg-purple-500" },
                    { value: result.savingsPct, color: "bg-green-500"  },
                  ].map((s, i) => (
                    <div key={i} className={`h-full ${s.color} transition-all duration-500`}
                      style={{ width: `${Math.min(s.value, 100)}%` }} />
                  ))}
                </div>
                <div className="flex gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                  <span className="flex items-center gap-1"><span className="w-3 h-2 bg-blue-500 rounded inline-block" />Needs {fmtPct(result.needsPct)}%</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-2 bg-purple-500 rounded inline-block" />Wants {fmtPct(result.wantsPct)}%</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-2 bg-green-500 rounded inline-block" />Savings {fmtPct(result.savingsPct)}%</span>
                </div>
              </div>

              <div className="mb-2">
                <p className="text-xs text-gray-400 mb-2">50/30/20 target</p>
                <div className="h-5 bg-gray-100 rounded-full overflow-hidden flex">
                  <div className="h-full bg-blue-300 transition-all duration-500"   style={{ width: "50%" }} />
                  <div className="h-full bg-purple-300 transition-all duration-500" style={{ width: "30%" }} />
                  <div className="h-full bg-green-300 transition-all duration-500"  style={{ width: "20%" }} />
                </div>
              </div>
            </div>

            {/* Personalised tips */}
            <div className="space-y-3">
              {result.needsDiff > result.monthlyNet * 0.05 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                  <p className="text-sm font-semibold text-red-700 mb-1">⚠️ Your needs are over budget</p>
                  <p className="text-sm text-red-600">
                    You're spending ${fmt(result.needsDiff)} more than the 50% target on essentials.
                    Consider reviewing housing costs (the biggest lever), transportation, or shopping around for insurance.
                  </p>
                </div>
              )}
              {result.wantsDiff > result.monthlyNet * 0.05 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                  <p className="text-sm font-semibold text-amber-700 mb-1">💡 Your wants are over the 30% target</p>
                  <p className="text-sm text-amber-600">
                    You're spending ${fmt(result.wantsDiff)} more than the 30% target on lifestyle.
                    Dining out and subscriptions are often the easiest categories to trim.
                  </p>
                </div>
              )}
              {result.savingsDiff < -(result.monthlyNet * 0.05) && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                  <p className="text-sm font-semibold text-amber-700 mb-1">📉 You're saving less than the 20% target</p>
                  <p className="text-sm text-amber-600">
                    You're ${fmt(Math.abs(result.savingsDiff))} short of the 20% savings goal.
                    Even automating a small amount to your TFSA or FHSA each paycheque builds the habit.
                  </p>
                </div>
              )}
              {result.unallocated > 0 && result.totalSpent > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                  <p className="text-sm font-semibold text-green-700 mb-1">✅ You have ${fmt(result.unallocated)} unallocated</p>
                  <p className="text-sm text-green-600">
                    Consider directing this toward extra debt payments, your FHSA, or an emergency fund.
                  </p>
                </div>
              )}
              {result.unallocated < 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                  <p className="text-sm font-semibold text-red-700 mb-1">🚨 You're ${fmt(Math.abs(result.unallocated))} over budget</p>
                  <p className="text-sm text-red-600">
                    Your total expenses exceed your take-home pay. Review your wants and non-essential spending first.
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* SEO / FAQ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 prose prose-gray max-w-none">
          <h2 className="text-xl font-bold text-gray-900 mb-4">The 50/30/20 Budget Rule for Canadians</h2>
          <p className="text-gray-600">
            The 50/30/20 rule divides your after-tax income into three simple buckets: <strong>50% for needs</strong> (essentials you can't avoid), <strong>30% for wants</strong> (lifestyle and discretionary spending), and <strong>20% for savings and debt repayment</strong>. Popularized by U.S. Senator Elizabeth Warren in her book "All Your Worth," it's become one of the most widely recommended budgeting frameworks in the world.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Adapting the Rule for Canada</h3>
          <p className="text-gray-600">
            In high cost-of-living cities like Toronto and Vancouver, keeping needs under 50% is genuinely difficult. If housing alone consumes 40% of your take-home, you may need to adjust to a 60/20/20 or 65/15/20 split while working toward reducing fixed costs. The exact percentages matter less than the habit of tracking and being intentional about each category.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">What Counts as a "Need" vs a "Want"?</h3>
          <p className="text-gray-600">
            Needs are expenses you truly can't avoid: rent, groceries, utilities, basic transportation, insurance, and minimum debt payments. Wants are upgrades and lifestyle choices — dining out instead of cooking, a gym membership, streaming services, or a newer car than you need. The line can be blurry, so be honest with yourself.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Where Should Your 20% Savings Go?</h3>
          <p className="text-gray-600">
            For most Canadians, the priority order is: build a small emergency fund ($1,000–$2,000) → pay off high-interest debt → max FHSA (if first-time buyer) → contribute to TFSA and RRSP → invest additional savings. Automating transfers on payday ensures savings happen before spending.
          </p>

          <p className="text-sm text-gray-400 mt-6">
            This calculator uses estimated take-home pay based on your gross income and tax rate. For a more precise net income figure, use our Income Tax Calculator. Not financial advice.
          </p>
        </div>

      </div>
    </div>
  );
}
