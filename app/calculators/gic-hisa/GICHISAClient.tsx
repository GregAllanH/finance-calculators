"use client";

// app/calculators/gic-hisa/GICHISAClient.tsx

import PrintButton from "@/components/PrintButton";
import { useState, useMemo } from "react";
import { NumericFormat } from "react-number-format";

// ─── Current Rate Presets (approximate, Feb 2025) ─────────────────────────────

const RATE_PRESETS = [
  {
    category: "HISA",
    products: [
      { label: "EQ Bank HISA",          rate: 3.75, type: "HISA",     compound: "daily"    },
      { label: "Tangerine HISA",         rate: 3.25, type: "HISA",     compound: "daily"    },
      { label: "Simplii HISA",           rate: 3.00, type: "HISA",     compound: "monthly"  },
      { label: "Generic HISA",           rate: 3.50, type: "HISA",     compound: "daily"    },
    ],
  },
  {
    category: "GIC — Non-Redeemable",
    products: [
      { label: "1-Year GIC",             rate: 4.50, type: "GIC-1",    compound: "annually" },
      { label: "2-Year GIC",             rate: 4.25, type: "GIC-2",    compound: "annually" },
      { label: "3-Year GIC",             rate: 4.00, type: "GIC-3",    compound: "annually" },
      { label: "4-Year GIC",             rate: 3.90, type: "GIC-4",    compound: "annually" },
      { label: "5-Year GIC",             rate: 3.85, type: "GIC-5",    compound: "annually" },
    ],
  },
  {
    category: "GIC — Cashable / Market",
    products: [
      { label: "Cashable GIC (90-day)",  rate: 3.00, type: "GIC-C",    compound: "annually" },
      { label: "Market-Linked GIC",      rate: 5.50, type: "GIC-M",    compound: "annually" },
      { label: "Custom / Other",         rate: 0,    type: "custom",   compound: "annually" },
    ],
  },
];

const COMPOUND_FREQUENCIES = [
  { label: "Daily",      value: "daily",      n: 365  },
  { label: "Monthly",    value: "monthly",    n: 12   },
  { label: "Quarterly",  value: "quarterly",  n: 4    },
  { label: "Semi-Annual",value: "semiannual", n: 2    },
  { label: "Annually",   value: "annually",   n: 1    },
];

const ACCOUNT_TYPES = [
  { label: "TFSA",        value: "tfsa",    desc: "Tax-free — no tax on interest ever"              },
  { label: "RRSP",        value: "rrsp",    desc: "Tax-deferred — taxed on withdrawal"              },
  { label: "FHSA",        value: "fhsa",    desc: "Tax-free — like TFSA for first home"             },
  { label: "Non-Reg",     value: "nonreg",  desc: "Taxable — interest taxed as income each year"    },
  { label: "RESP",        value: "resp",    desc: "Tax-sheltered inside RESP"                       },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt    = (n: number) => n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n: number) => Math.round(n).toLocaleString("en-CA");

function compoundGrowth(
  principal: number,
  annualRate: number,
  years: number,
  compoundFreq: number,
  monthlyDeposit: number = 0
): { balance: number; interest: number; yearlyData: Array<{ year: number; balance: number; interest: number; totalDeposits: number }> } {
  const r = annualRate / 100 / compoundFreq;
  const yearlyData = [];
  let balance = principal;
  let totalDeposits = principal;
  let totalInterest = 0;

  for (let y = 1; y <= years; y++) {
    const startBal = balance;
    // Apply compounding periods within the year
    const periodsPerYear = compoundFreq;
    const depositsPerYear = 12; // monthly deposits

    if (monthlyDeposit > 0) {
      // Interleave deposits and compounding
      let bal = balance;
      const depositPerPeriod = monthlyDeposit * 12 / periodsPerYear;
      for (let p = 0; p < periodsPerYear; p++) {
        bal = (bal + depositPerPeriod) * (1 + r);
      }
      balance = bal;
      totalDeposits += monthlyDeposit * 12;
    } else {
      balance = balance * Math.pow(1 + r, periodsPerYear);
    }

    const yearInterest = balance - startBal - (monthlyDeposit * 12);
    totalInterest += yearInterest;

    yearlyData.push({
      year: y,
      balance: Math.round(balance * 100) / 100,
      interest: Math.round(yearInterest * 100) / 100,
      totalDeposits: Math.round(totalDeposits * 100) / 100,
    });
  }

  return {
    balance: Math.round(balance * 100) / 100,
    interest: Math.round((balance - totalDeposits) * 100) / 100,
    yearlyData,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GICHISAClient() {
  const [principal,       setPrincipal]       = useState<number | null>(null);
  const [monthlyDeposit,  setMonthlyDeposit]  = useState<number | null>(null);
  const [customRate,      setCustomRate]       = useState<number>(4.5);
  const [selectedPreset,  setSelectedPreset]  = useState<string>("1-Year GIC");
  const [compoundFreq,    setCompoundFreq]    = useState<string>("annually");
  const [years,           setYears]           = useState<number>(5);
  const [accountType,     setAccountType]     = useState<string>("tfsa");
  const [marginalRate,    setMarginalRate]    = useState<number>(40);
  const [showSchedule,    setShowSchedule]    = useState(false);
  const [showComparison,  setShowComparison]  = useState(false);

  // Find selected preset rate
  const allProducts = RATE_PRESETS.flatMap(c => c.products);
  const presetProduct = allProducts.find(p => p.label === selectedPreset);
  const activeRate = selectedPreset === "Custom / Other" ? customRate : (presetProduct?.rate ?? customRate);
  const activeCompound = selectedPreset === "Custom / Other"
    ? compoundFreq
    : (presetProduct?.compound ?? compoundFreq);
  const compoundN = COMPOUND_FREQUENCIES.find(f => f.value === activeCompound)?.n ?? 1;

  const yearOptions = [1, 2, 3, 5, 10, 15, 20, 25, 30];

  const result = useMemo(() => {
    const p = principal ?? 0;
    const m = monthlyDeposit ?? 0;
    if ((p <= 0 && m <= 0) || activeRate <= 0) return null;

    const { balance, interest, yearlyData } = compoundGrowth(p, activeRate, years, compoundN, m);
    const totalDeposited = p + m * 12 * years;

    // Tax impact for non-registered
    let taxOwing = 0;
    let afterTaxBalance = balance;
    let afterTaxInterest = interest;

    if (accountType === "nonreg") {
      taxOwing = interest * (marginalRate / 100);
      afterTaxBalance = balance - taxOwing;
      afterTaxInterest = interest - taxOwing;
    }

    // Effective annual yield (for comparison)
    const ear = Math.pow(1 + activeRate / 100 / compoundN, compoundN) - 1;

    // Rate comparison scenarios
    const rateScenarios = [3.0, 3.5, 4.0, 4.5, 5.0, 5.5].map(r => {
      const { balance: bal } = compoundGrowth(p, r, years, compoundN, m);
      return { rate: r, balance: bal, interest: bal - totalDeposited };
    });

    // Simple vs compound comparison (same rate, same period)
    const simpleInterest = p * (activeRate / 100) * years;
    const compoundAdvantage = interest - simpleInterest;

    return {
      balance,
      interest,
      totalDeposited,
      taxOwing,
      afterTaxBalance,
      afterTaxInterest,
      ear,
      yearlyData,
      rateScenarios,
      simpleInterest,
      compoundAdvantage,
      interestPct: totalDeposited > 0 ? (interest / totalDeposited) * 100 : 0,
    };
  }, [principal, monthlyDeposit, activeRate, years, compoundN, accountType, marginalRate]);

  const isNonReg = accountType === "nonreg";

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-gray-900">GIC & HISA Interest Calculator</h1>
          <p className="text-gray-500 mt-1">
            Calculate compound interest on GICs and high-interest savings accounts — compare rates, account types, and tax impact.
          </p>
        </div>

        {/* Rate presets */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Select Product or Enter Rate</h2>
          {RATE_PRESETS.map(category => (
            <div key={category.category}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{category.category}</p>
              <div className="flex flex-wrap gap-2">
                {category.products.map(product => (
                  <button
                    key={product.label}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(product.label);
                      if (product.type !== "custom") {
                        setCompoundFreq(product.compound);
                      }
                    }}
                    className={`px-3 py-2 rounded-lg text-sm border-2 transition-colors ${
                      selectedPreset === product.label
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-200 hover:border-blue-400"
                    }`}
                  >
                    <span className="font-semibold">{product.label}</span>
                    {product.rate > 0 && (
                      <span className={`ml-1.5 text-xs ${selectedPreset === product.label ? "text-blue-200" : "text-gray-400"}`}>
                        {product.rate}%
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {selectedPreset === "Custom / Other" && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Annual Interest Rate (%)</label>
                <input
                  type="number" min="0.01" max="20" step="0.01"
                  value={customRate}
                  onChange={(e) => setCustomRate(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Compounding Frequency</label>
                <select
                  value={compoundFreq}
                  onChange={(e) => setCompoundFreq(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 bg-white"
                >
                  {COMPOUND_FREQUENCIES.map(f => (
                    <option key={f.value} value={f.value}>{f.label} ({f.n}×/yr)</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {selectedPreset !== "Custom / Other" && presetProduct && (
            <div className="flex items-center gap-6 pt-1 text-sm text-gray-500">
              <span>Rate: <strong className="text-gray-800">{presetProduct.rate}%</strong></span>
              <span>Compounds: <strong className="text-gray-800 capitalize">{presetProduct.compound}</strong></span>
              {result && <span>Effective annual yield: <strong className="text-green-600">{(result.ear * 100).toFixed(3)}%</strong></span>}
            </div>
          )}
        </div>

        {/* Inputs */}
        <div className="print:hidden bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-800">Investment Details</h2>

          {/* Principal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Initial Deposit / Principal</label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$10,000"
              onValueChange={(v) => setPrincipal(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
            />
          </div>

          {/* Monthly deposit (for HISA) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monthly Deposits
              <span className="text-gray-400 font-normal ml-1">(optional — for HISA savings plans)</span>
            </label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$0"
              onValueChange={(v) => setMonthlyDeposit(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
            />
          </div>

          {/* Term */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Investment Term</label>
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

          {/* Account type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {ACCOUNT_TYPES.map(a => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setAccountType(a.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold border-2 transition-colors text-center ${
                    accountType === a.value
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-200 hover:border-blue-400"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              {ACCOUNT_TYPES.find(a => a.value === accountType)?.desc}
            </p>

            {/* Marginal rate for non-reg */}
            {isNonReg && (
              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Marginal Tax Rate (%) — interest taxed as income
                </label>
                <input
                  type="number" min="15" max="55" step="1"
                  value={marginalRate}
                  onChange={(e) => setMarginalRate(Number(e.target.value) || 40)}
                  className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right text-sm"
                />
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {!result ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">🏦</div>
            <p className="text-xl font-semibold text-gray-700">Enter a deposit amount above</p>
            <p className="text-gray-500 mt-2">Your compound interest projection will appear instantly.</p>
          </div>
        ) : (
          <>
            {/* Tax notice for non-reg */}
            {isNonReg && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <p className="text-sm font-semibold text-amber-800 mb-1">
                  ⚠️ Interest Income is Fully Taxable in Non-Registered Accounts
                </p>
                <p className="text-sm text-amber-700">
                  GIC and HISA interest is taxed as ordinary income — the least tax-efficient investment income type.
                  Consider holding GICs/HISAs in a TFSA or RRSP to shelter the interest. Tax owing: <strong>${fmtInt(result.taxOwing)}</strong> at {marginalRate}%.
                </p>
              </div>
            )}

            {/* Hero */}
            <div className="bg-blue-600 text-white rounded-xl p-6 text-center shadow-sm">
              <p className="text-sm font-medium text-blue-200 uppercase tracking-wide">
                {isNonReg ? "After-Tax" : "Tax-Free"} Balance After {years} Year{years > 1 ? "s" : ""}
              </p>
              <p className="text-6xl font-black mt-2">
                ${fmt(isNonReg ? result.afterTaxBalance : result.balance)}
              </p>
              <p className="text-blue-200 text-sm mt-1">
                {activeRate}% · {COMPOUND_FREQUENCIES.find(f => f.value === activeCompound)?.label} compounding
                {isNonReg ? ` · after ${marginalRate}% tax` : ` · ${ACCOUNT_TYPES.find(a => a.value === accountType)?.label}`}
              </p>
            </div>

            {/* Key stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total Deposited",  value: `$${fmtInt(result.totalDeposited)}`, sub: "principal + deposits",            color: "text-gray-800"  },
                { label: isNonReg ? "After-Tax Interest" : "Interest Earned", value: `$${fmtInt(isNonReg ? result.afterTaxInterest : result.interest)}`, sub: `${result.interestPct.toFixed(1)}% of deposited`, color: "text-green-600" },
                { label: "Effective Yield",  value: `${(result.ear * 100).toFixed(3)}%`, sub: "true annual return",              color: "text-blue-600"  },
                { label: "Compound Advantage", value: `$${fmtInt(result.compoundAdvantage)}`, sub: "vs simple interest",         color: "text-purple-600"},
              ].map(s => (
                <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Principal vs interest bars */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Balance Breakdown</h3>
              <div className="space-y-3">
                {[
                  { label: `Principal & Deposits (${((result.totalDeposited / result.balance) * 100).toFixed(0)}%)`,      value: result.totalDeposited,  color: "bg-blue-500"   },
                  { label: `Interest Earned (${((result.interest / result.balance) * 100).toFixed(0)}%)`,                 value: result.interest,        color: "bg-green-500"  },
                  ...(isNonReg ? [{ label: `Tax Owing (${marginalRate}% rate)`, value: result.taxOwing, color: "bg-red-400" }] : []),
                ].filter(r => r.value > 0).map(row => (
                  <div key={row.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{row.label}</span>
                      <span className="font-medium text-gray-800">${fmtInt(row.value)}</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${row.color} rounded-full transition-all duration-500`}
                        style={{ width: `${(row.value / result.balance) * 100}%` }}
                      />
                    </div>
                  </div>
            {/* Print button */}
            <div className="print:hidden flex justify-end">
              <PrintButton label="Print Report" />
            </div>
                ))}
              </div>
            </div>

            {/* Rate comparison */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowComparison(!showComparison)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Rate Comparison</h2>
                  <p className="text-sm text-gray-500 mt-0.5">How much difference does the rate make over {years} years?</p>
                </div>
                <span className="text-gray-400 text-sm">{showComparison ? "▲ Hide" : "▼ Show"}</span>
              </button>
              {showComparison && (
                <div className="border-t border-gray-100">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                        <tr>
                          <th className="px-5 py-3 text-left">Rate</th>
                          <th className="px-5 py-3 text-right">Balance</th>
                          <th className="px-5 py-3 text-right">Interest</th>
                          <th className="px-5 py-3 text-right">vs {activeRate}%</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {result.rateScenarios.map(s => {
                          const diff = s.balance - result.balance;
                          const isActive = Math.abs(s.rate - activeRate) < 0.01;
                          return (
                            <tr key={s.rate} className={`hover:bg-gray-50 ${isActive ? "bg-blue-50" : ""}`}>
                              <td className="px-5 py-3 font-medium text-gray-700">
                                {s.rate}%
                                {isActive && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">Current</span>}
                              </td>
                              <td className="px-5 py-3 text-right font-semibold text-gray-800">${fmtInt(s.balance)}</td>
                              <td className="px-5 py-3 text-right text-green-600">${fmtInt(s.interest)}</td>
                              <td className={`px-5 py-3 text-right font-medium ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-500" : "text-gray-400"}`}>
                                {isActive ? "—" : `${diff > 0 ? "+" : ""}$${fmtInt(diff)}`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Year-by-year schedule */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowSchedule(!showSchedule)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Year-by-Year Schedule</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Balance and interest earned each year</p>
                </div>
                <span className="text-gray-400 text-sm">{showSchedule ? "▲ Hide" : "▼ Show"}</span>
              </button>
              {showSchedule && (
                <div className="border-t border-gray-100 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                      <tr>
                        <th className="px-5 py-3 text-left">Year</th>
                        <th className="px-5 py-3 text-right">Interest Earned</th>
                        <th className="px-5 py-3 text-right">Total Deposits</th>
                        <th className="px-5 py-3 text-right">Balance</th>
                        {isNonReg && <th className="px-5 py-3 text-right">Tax ({marginalRate}%)</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {result.yearlyData.map(row => (
                        <tr key={row.year} className="hover:bg-gray-50">
                          <td className="px-5 py-3 font-medium text-gray-700">Year {row.year}</td>
                          <td className="px-5 py-3 text-right text-green-600">${fmt(row.interest)}</td>
                          <td className="px-5 py-3 text-right text-blue-600">${fmtInt(row.totalDeposits)}</td>
                          <td className="px-5 py-3 text-right font-bold text-gray-800">${fmt(row.balance)}</td>
                          {isNonReg && <td className="px-5 py-3 text-right text-red-500">${fmt(row.interest * (marginalRate / 100))}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* TFSA tip for non-reg */}
            {isNonReg && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                <p className="text-sm font-semibold text-green-800 mb-1">
                  💡 Hold This in a TFSA Instead — Save ${fmtInt(result.taxOwing)} in Tax
                </p>
                <p className="text-sm text-green-700">
                  GIC and HISA interest is fully taxable as income in non-registered accounts. Moving this investment to a TFSA would save <strong>${fmtInt(result.taxOwing)}</strong> in tax over {years} years and increase your after-tax balance to <strong>${fmtInt(result.balance)}</strong>.
                </p>
              </div>
            )}
          </>
        )}

        {/* SEO / FAQ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 prose prose-gray max-w-none">
          <h2 className="text-xl font-bold text-gray-900 mb-4">GICs and HISAs in Canada — 2025 Guide</h2>
          <p className="text-gray-600">
            Guaranteed Investment Certificates (GICs) and High-Interest Savings Accounts (HISAs) are Canada's most popular low-risk savings tools. With interest rates at multi-decade highs, Canadians have been moving billions into these products — but understanding how compounding works and where to hold them can significantly impact your returns.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">GIC vs HISA — Which is Better?</h3>
          <p className="text-gray-600">
            GICs typically offer higher rates than HISAs in exchange for locking in your money for a fixed term (1–5 years). Non-redeemable GICs cannot be accessed early without penalty. HISAs offer full liquidity — you can withdraw anytime — but rates fluctuate with the Bank of Canada rate and are generally lower than GICs.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Compounding Frequency Matters</h3>
          <p className="text-gray-600">
            Daily compounding produces slightly more interest than annual compounding at the same stated rate. The "effective annual rate" (EAR) shows the true annual return after accounting for compounding frequency. A 4.5% rate compounded daily has an EAR of 4.603% — meaningfully higher over longer periods.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Where to Hold GICs and HISAs</h3>
          <p className="text-gray-600">
            Interest income is taxed at your full marginal rate — the least tax-efficient form of investment income. Holding GICs and HISAs inside a TFSA or RRSP shelters this interest entirely. If you have available TFSA room, always prioritize holding interest-bearing investments there before non-registered accounts.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">CDIC Insurance</h3>
          <p className="text-gray-600">
            GICs and savings deposits at CDIC member institutions are insured up to $100,000 per depositor per category (e.g., $100k in TFSA, $100k in RRSP, $100k in non-registered). Credit union deposits are covered by provincial deposit insurance — typically unlimited in provinces like BC, MB, and ON.
          </p>

          <p className="text-sm text-gray-400 mt-6">
            Rates shown are approximate as of early 2025 and change frequently. Always check current rates directly with your financial institution. Calculations assume rates remain constant for the full term. Not financial advice.
          </p>
        </div>

      </div>
    </div>
  );
}
