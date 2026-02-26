"use client";

// app/calculators/tfsa-growth/TFSAGrowthClient.tsx

import { useState, useMemo } from "react";
import { NumericFormat } from "react-number-format";

// ─── Constants ────────────────────────────────────────────────────────────────

// TFSA annual contribution limits by year
const TFSA_LIMITS: Record<number, number> = {
  2009: 5000, 2010: 5000, 2011: 5000, 2012: 5000, 2013: 5500,
  2014: 5500, 2015: 10000, 2016: 5500, 2017: 5500, 2018: 5500,
  2019: 6000, 2020: 6000, 2021: 6000, 2022: 6000, 2023: 6500,
  2024: 7000, 2025: 7000,
};

const CUMULATIVE_ROOM_2025 = 102000; // if eligible since 2009, never contributed
const CURRENT_YEAR = 2025;

// Investment type presets
const INVESTMENT_PRESETS = [
  { label: "HISA / GIC",         rate: 4.5,  icon: "🏦", desc: "Current high-interest savings rates" },
  { label: "Conservative ETF",   rate: 5.5,  icon: "📊", desc: "Bond-heavy balanced portfolio"       },
  { label: "Balanced ETF",       rate: 7.0,  icon: "⚖️", desc: "60/40 stocks and bonds"             },
  { label: "Growth ETF",         rate: 8.5,  icon: "📈", desc: "Mostly equities, long-term focus"   },
  { label: "All-Equity ETF",     rate: 10.0, icon: "🚀", desc: "100% stocks, higher volatility"     },
  { label: "Custom",             rate: 0,    icon: "✏️", desc: "Enter your own rate"                },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt    = (n: number) => Math.round(n).toLocaleString("en-CA");
const fmtDec = (n: number) => n.toLocaleString("en-CA", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function getTFSARoomFromYear(birthYear: number | null): number {
  if (!birthYear) return CUMULATIVE_ROOM_2025;
  const eligibleYear = Math.max(birthYear + 18, 2009);
  if (eligibleYear > CURRENT_YEAR) return 0;
  return Object.entries(TFSA_LIMITS)
    .filter(([y]) => Number(y) >= eligibleYear && Number(y) <= CURRENT_YEAR)
    .reduce((s, [, limit]) => s + limit, 0);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TFSAGrowthClient() {
  const [currentBalance,  setCurrentBalance]  = useState<number | null>(null);
  const [annualContrib,   setAnnualContrib]   = useState<number | null>(null);
  const [years,           setYears]           = useState<number>(25);
  const [presetIndex,     setPresetIndex]     = useState<number>(3);
  const [customRate,      setCustomRate]      = useState<number>(7);
  const [birthYear,       setBirthYear]       = useState<number | null>(null);
  const [alreadyContrib,  setAlreadyContrib]  = useState<number | null>(null);
  const [showLimits,      setShowLimits]      = useState(false);

  const selectedPreset = INVESTMENT_PRESETS[presetIndex];
  const returnRate     = selectedPreset.label === "Custom" ? customRate : selectedPreset.rate;

  const result = useMemo(() => {
    const balance  = currentBalance ?? 0;
    const contrib  = annualContrib ?? 0;
    const r        = returnRate / 100;

    if (r < 0 || years <= 0) return null;

    // Contribution room
    const lifetimeRoom  = getTFSARoomFromYear(birthYear);
    const used          = alreadyContrib ?? 0;
    const remainingRoom = Math.max(0, lifetimeRoom - used);

    // Year-by-year projection
    let balanceVal = balance;
    const yearlyData: Array<{
      year:          number;
      contribution:  number;
      growth:        number;
      endBalance:    number;
      totalContrib:  number;
      totalGrowth:   number;
    }> = [];

    let totalContrib = balance;
    let totalGrowth  = 0;

    for (let y = 1; y <= years; y++) {
      const startBal   = balanceVal;
      const growth     = (startBal + contrib) * r;
      balanceVal       = startBal + contrib + growth;
      totalContrib    += contrib;
      totalGrowth     += growth;
      yearlyData.push({
        year:         y,
        contribution: contrib,
        growth:       Math.round(growth),
        endBalance:   Math.round(balanceVal),
        totalContrib: Math.round(totalContrib),
        totalGrowth:  Math.round(totalGrowth),
      });
    }

    const finalBalance  = Math.round(balanceVal);
    const growthTotal   = finalBalance - totalContrib;
    const growthPct     = totalContrib > 0 ? (growthTotal / totalContrib) * 100 : 0;

    // Milestone years
    const milestones = [5, 10, 15, 20, 25, 30].filter(m => m <= years);

    // Tax savings estimate — what this would cost in a taxable account
    // Assume marginal rate of 40% on investment income
    const taxSavings = growthTotal * 0.40;

    // Max contribution scenario (max TFSA each year)
    const maxAnnual    = TFSA_LIMITS[CURRENT_YEAR];
    let   maxBalance   = balance;
    for (let y = 0; y < years; y++) {
      maxBalance = (maxBalance + maxAnnual) * (1 + r);
    }

    return {
      finalBalance,
      totalContrib:   Math.round(totalContrib),
      growthTotal:    Math.round(growthTotal),
      growthPct,
      taxSavings:     Math.round(taxSavings),
      lifetimeRoom,
      remainingRoom,
      yearlyData,
      milestones,
      maxContribFinal: Math.round(maxBalance),
    };
  }, [currentBalance, annualContrib, years, returnRate, birthYear, alreadyContrib]);

  const yearOptions = [5, 10, 15, 20, 25, 30, 35, 40];
  const limitEntries = Object.entries(TFSA_LIMITS).reverse();

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-gray-900">TFSA Growth Calculator</h1>
          <p className="text-gray-500 mt-1">
            Project your Tax-Free Savings Account growth — see how much your contributions compound tax-free over time.
          </p>
        </div>

        {/* TFSA limits panel */}
        <button
          type="button"
          onClick={() => setShowLimits(!showLimits)}
          className="w-full bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-center justify-between text-left hover:bg-blue-100 transition-colors"
        >
          <div>
            <p className="text-sm font-semibold text-blue-800">📋 TFSA Annual Contribution Limits by Year</p>
            <p className="text-xs text-blue-600 mt-0.5">
              2025 limit: $7,000 · Cumulative room since 2009: $102,000
            </p>
          </div>
          <span className="text-blue-500 text-lg">{showLimits ? "▲" : "▼"}</span>
        </button>

        {showLimits && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>
                    <th className="px-5 py-3 text-left">Year</th>
                    <th className="px-5 py-3 text-right">Annual Limit</th>
                    <th className="px-5 py-3 text-right">Cumulative Room</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {limitEntries.map(([year, limit], i) => {
                    const cumulative = Object.entries(TFSA_LIMITS)
                      .filter(([y]) => Number(y) <= Number(year))
                      .reduce((s, [, l]) => s + l, 0);
                    return (
                      <tr key={year} className={`hover:bg-gray-50 ${Number(year) === CURRENT_YEAR ? "bg-blue-50" : ""}`}>
                        <td className="px-5 py-2.5 font-medium text-gray-700">
                          {year}
                          {Number(year) === CURRENT_YEAR && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">Current</span>
                          )}
                        </td>
                        <td className="px-5 py-2.5 text-right font-semibold text-gray-800">${fmt(limit)}</td>
                        <td className="px-5 py-2.5 text-right text-gray-500">${fmt(cumulative)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Room accumulates every January 1st for Canadian residents 18+. Withdrawals create new contribution room the following January.
              </p>
            </div>
          </div>
        )}

        {/* Inputs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-800">Your TFSA Details</h2>

          {/* Current balance */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Current TFSA Balance</label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$0"
              onValueChange={(v) => setCurrentBalance(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
            />
          </div>

          {/* Annual contribution */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Annual Contribution
              <span className="text-gray-400 font-normal ml-1">(2025 max: $7,000)</span>
            </label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$7,000"
              onValueChange={(v) => setAnnualContrib(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
            />
          </div>

          {/* Investment type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Investment Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {INVESTMENT_PRESETS.map((preset, i) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setPresetIndex(i)}
                  className={`px-3 py-2.5 rounded-lg text-left border-2 transition-colors ${
                    presetIndex === i
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-200 hover:border-blue-400"
                  }`}
                >
                  <span className="text-base">{preset.icon}</span>
                  <p className="text-xs font-semibold mt-0.5">{preset.label}</p>
                  {preset.label !== "Custom" && (
                    <p className={`text-xs ${presetIndex === i ? "text-blue-200" : "text-gray-400"}`}>{preset.rate}%/yr</p>
                  )}
                </button>
              ))}
            </div>
            {selectedPreset.label !== "Custom" && (
              <p className="text-xs text-gray-400 mt-2">{selectedPreset.desc} — {selectedPreset.rate}% annual return</p>
            )}
            {selectedPreset.label === "Custom" && (
              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Custom Annual Return (%)</label>
                <input
                  type="number" min="0" max="30" step="0.1"
                  value={customRate}
                  onChange={(e) => setCustomRate(Number(e.target.value) || 0)}
                  className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
                />
              </div>
            )}
          </div>

          {/* Years */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Investment Horizon</label>
            <div className="flex flex-wrap gap-2">
              {yearOptions.map(y => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setYears(y)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition-colors ${
                    years === y ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                  }`}
                >
                  {y}yr
                </button>
              ))}
            </div>
          </div>

          {/* Contribution room tracker */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">
              Contribution Room Tracker
              <span className="text-gray-400 font-normal ml-1">(optional)</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Birth Year</label>
                <input
                  type="number" min="1960" max="2007" step="1"
                  placeholder="1985"
                  onChange={(e) => setBirthYear(Number(e.target.value) || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Total Contributed to Date</label>
                <NumericFormat
                  thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
                  placeholder="$45,000"
                  onValueChange={(v) => setAlreadyContrib(v.floatValue ?? null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right text-sm"
                />
              </div>
            </div>
            {result && (
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex justify-between items-center">
                <p className="text-sm text-blue-700">
                  Lifetime room: <strong>${fmt(result.lifetimeRoom)}</strong>
                </p>
                <p className={`text-sm font-bold ${result.remainingRoom > 0 ? "text-green-600" : "text-red-500"}`}>
                  ${fmt(result.remainingRoom)} remaining
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {!result ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">💰</div>
            <p className="text-xl font-semibold text-gray-700">Enter your TFSA details above</p>
            <p className="text-gray-500 mt-2">Your tax-free growth projection will appear here instantly.</p>
          </div>
        ) : (
          <>
            {/* Hero */}
            <div className="bg-blue-600 text-white rounded-xl p-6 text-center shadow-sm">
              <p className="text-sm font-medium text-blue-200 uppercase tracking-wide">
                TFSA Value in {years} Years
              </p>
              <p className="text-6xl font-black mt-2">${fmt(result.finalBalance)}</p>
              <p className="text-blue-200 text-sm mt-1">
                {selectedPreset.icon} {selectedPreset.label} · {returnRate}%/yr · ${fmt(annualContrib ?? 0)}/yr contributions
              </p>
            </div>

            {/* Key stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total Contributed",  value: `$${fmt(result.totalContrib)}`,  sub: `over ${years} years`,          color: "text-gray-800"  },
                { label: "Tax-Free Growth",    value: `$${fmt(result.growthTotal)}`,   sub: `${result.growthPct.toFixed(0)}% return`,  color: "text-green-600" },
                { label: "Tax Savings Est.",   value: `$${fmt(result.taxSavings)}`,    sub: "vs taxable account",            color: "text-blue-600"  },
                { label: "Max Contrib Scenario", value: `$${fmt(result.maxContribFinal)}`, sub: `$7k/yr at ${returnRate}%`, color: "text-purple-600" },
              ].map(s => (
                <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Growth breakdown bars */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Where Your Balance Comes From</h3>
              <div className="space-y-3">
                {[
                  { label: `Contributions (${(result.totalContrib / result.finalBalance * 100).toFixed(0)}%)`,  value: result.totalContrib, color: "bg-blue-500"  },
                  { label: `Tax-Free Growth (${(result.growthTotal / result.finalBalance * 100).toFixed(0)}%)`, value: result.growthTotal,  color: "bg-green-500" },
                ].map(row => (
                  <div key={row.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{row.label}</span>
                      <span className="font-medium text-gray-800">${fmt(row.value)}</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${row.color} rounded-full transition-all duration-500`}
                        style={{ width: `${(row.value / result.finalBalance) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Milestone table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">Growth Milestones</h2>
                <p className="text-sm text-gray-500 mt-0.5">Balance at key points in time</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                    <tr>
                      <th className="px-5 py-3 text-left">Year</th>
                      <th className="px-5 py-3 text-right">Total Contributed</th>
                      <th className="px-5 py-3 text-right">Tax-Free Growth</th>
                      <th className="px-5 py-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {result.milestones.map(m => {
                      const row = result.yearlyData[m - 1];
                      return (
                        <tr key={m} className="hover:bg-gray-50">
                          <td className="px-5 py-3 font-medium text-gray-700">Year {m}</td>
                          <td className="px-5 py-3 text-right text-blue-600">${fmt(row.totalContrib)}</td>
                          <td className="px-5 py-3 text-right text-green-600">${fmt(row.totalGrowth)}</td>
                          <td className="px-5 py-3 text-right font-bold text-gray-800">${fmt(row.endBalance)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Year by year chart (bar-style) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Balance Over Time</h3>
              <div className="space-y-1.5">
                {result.yearlyData.filter((_, i) => i % Math.max(1, Math.floor(years / 10)) === 0 || i === years - 1).map(row => {
                  const maxBal = result.finalBalance;
                  const contribPct = (row.totalContrib / maxBal) * 100;
                  const growthPct  = (row.totalGrowth  / maxBal) * 100;
                  return (
                    <div key={row.year} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-10 shrink-0">Yr {row.year}</span>
                      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden flex">
                        <div className="h-full bg-blue-400" style={{ width: `${contribPct}%` }} />
                        <div className="h-full bg-green-400" style={{ width: `${growthPct}%` }} />
                      </div>
                      <span className="text-xs font-medium text-gray-700 w-20 text-right shrink-0">
                        ${fmt(row.endBalance)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-6 mt-3 text-xs text-gray-400">
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-blue-400 rounded inline-block" />Contributions</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-green-400 rounded inline-block" />Tax-Free Growth</span>
              </div>
            </div>
          </>
        )}

        {/* SEO / FAQ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 prose prose-gray max-w-none">
          <h2 className="text-xl font-bold text-gray-900 mb-4">TFSA Growth — What Every Canadian Should Know</h2>
          <p className="text-gray-600">
            The Tax-Free Savings Account is Canada's most flexible registered account. Unlike the RRSP, contributions aren't tax-deductible — but all growth, dividends, and withdrawals are completely tax-free, forever. There's no mandatory withdrawal age and no impact on income-tested benefits.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Contribution Room Rules</h3>
          <p className="text-gray-600">
            Every Canadian resident 18+ earns new TFSA room each January 1st. The 2025 limit is <strong>$7,000</strong>. If you've never contributed and were 18+ in 2009, you have <strong>$102,000</strong> in cumulative room. Withdrawals are added back to your room the following January — so money can be re-contributed without penalty.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">What to Hold in Your TFSA</h3>
          <p className="text-gray-600">
            Prioritize high-growth, high-return assets in your TFSA to maximize tax-free compounding. Canadian and US equity ETFs, dividend-paying stocks, and REITs are ideal. Avoid holding foreign dividend-paying stocks (US withholding tax applies even in a TFSA) and keep lower-return assets like GICs in your TFSA only when capital preservation is the goal.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">TFSA vs RRSP — Which is Better?</h3>
          <p className="text-gray-600">
            TFSA wins when your current tax rate is lower than your expected retirement tax rate, or when you may need access to funds before retirement. RRSP wins when you're in a high tax bracket now and expect to be in a lower bracket at withdrawal. Most Canadians benefit from maxing both — TFSA first if income is under ~$50,000, RRSP first if income is over $80,000.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">The Power of Tax-Free Compounding</h3>
          <p className="text-gray-600">
            In a taxable account, investment gains are taxed each year — reducing the compounding base. In a TFSA, 100% of your returns compound untouched. On a $7,000/year contribution over 30 years at 7%, the TFSA advantage over a taxable account (at 40% marginal rate) is over $150,000 in after-tax wealth.
          </p>

          <p className="text-sm text-gray-400 mt-6">
            Projections assume a constant annual return and beginning-of-year contributions. Actual returns will vary. TFSA limits are current as of 2025 and subject to change by the federal government. Not financial advice.
          </p>
        </div>

      </div>
    </div>
  );
}
