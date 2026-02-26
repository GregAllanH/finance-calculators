"use client";

// app/calculators/affordability-by-city/AffordabilityByCityClient.tsx

import PrintButton from "@/components/PrintButton";
import { useState, useMemo } from "react";
import { NumericFormat } from "react-number-format";
import { CITIES, PROVINCE_LTT, type City } from "./cities";

// ─── Constants ────────────────────────────────────────────────────────────────

const STRESS_BUFFER   = 2.0;
const MIN_STRESS      = 5.25;
const GDS_LIMIT       = 0.39;
const TDS_LIMIT       = 0.44;
const CMHC_TIERS      = [
  { min: 0.05, max: 0.0999, rate: 0.04  },
  { min: 0.10, max: 0.1499, rate: 0.031 },
  { min: 0.15, max: 0.1999, rate: 0.028 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt    = (n: number) => Math.round(n).toLocaleString("en-CA");
const fmtDec = (n: number, d = 1) => n.toFixed(d);

function getCMHC(downPct: number): number {
  for (const t of CMHC_TIERS) {
    if (downPct >= t.min && downPct <= t.max) return t.rate;
  }
  return 0;
}

function monthlyPayment(principal: number, rate: number, years: number): number {
  const r = rate / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function cityAffordability(city: City, income: number, downPayment: number, rate: number, amort: number, debts: number, isFirstTime: boolean, isToronto: boolean) {
  const price       = city.medianPrice;
  const down        = Math.min(downPayment, price);
  const downPct     = down / price;
  const principal   = price - down;
  const cmhcRate    = getCMHC(downPct);
  const cmhc        = cmhcRate * principal;
  const totalPrinc  = principal + cmhc;
  const stressRate  = Math.max(rate + STRESS_BUFFER, MIN_STRESS);
  const stressPmt   = monthlyPayment(totalPrinc, stressRate, amort);
  const actualPmt   = monthlyPayment(totalPrinc, rate, amort);
  const propTax     = (price * city.propTaxRate / 100) / 12;
  const heating     = city.avgHeating;
  const condoFee    = city.avgCondoFee * 0.5; // 50% rule

  const grossMonthly = income / 12;
  const gds = (stressPmt + propTax + heating + condoFee) / grossMonthly;
  const tds = (stressPmt + propTax + heating + condoFee + debts) / grossMonthly;

  const qualifies   = gds <= GDS_LIMIT && tds <= TDS_LIMIT && downPct >= 0.05;

  // LTT
  const provCode    = city.provinceCode;
  const lttCalc     = PROVINCE_LTT[provCode];
  const provLTT     = lttCalc ? lttCalc.calculate(price, isFirstTime) : 0;
  const munLTT      = (isToronto && city.name === "Toronto" && lttCalc?.hasMunicipalLTT)
    ? (lttCalc.municipalLTT?.(price, isFirstTime) ?? 0) : 0;
  const lttRebate   = isFirstTime ? (lttCalc?.firstTimeRebate ?? 0) : 0;
  const totalLTT    = Math.max(0, provLTT + munLTT - lttRebate);

  // Closing costs estimate (~1.5% of purchase price)
  const closingCosts = price * 0.015 + totalLTT;

  // Income needed to qualify (binary search)
  let loInc = 0, hiInc = 1000000, neededIncome = hiInc;
  for (let i = 0; i < 50; i++) {
    const mid = (loInc + hiInc) / 2;
    const gds_ = (stressPmt + propTax + heating + condoFee) / (mid / 12);
    const tds_ = (stressPmt + propTax + heating + condoFee + debts) / (mid / 12);
    if (gds_ <= GDS_LIMIT && tds_ <= TDS_LIMIT) { neededIncome = mid; hiInc = mid; }
    else loInc = mid;
  }

  // Affordability score (0–100)
  const incomeRatio  = income / neededIncome;
  const score        = Math.min(100, Math.round(incomeRatio * 70 + (downPct >= 0.2 ? 30 : downPct * 150)));

  // Rent vs buy: years to break even (rough)
  const annualRentSaved   = city.avgRent2br * 12;
  const annualOwnerCost   = (actualPmt + propTax + heating + city.avgCondoFee) * 12;
  const annualNetOwnerCost = annualOwnerCost - annualRentSaved;

  return {
    city,
    price,
    down,
    downPct,
    cmhcRate,
    cmhc,
    totalPrinc,
    actualPmt,
    stressPmt,
    stressRate,
    propTax,
    heating,
    totalMonthly:  actualPmt + propTax + heating + city.avgCondoFee,
    gds,
    tds,
    qualifies,
    neededIncome,
    provLTT,
    munLTT,
    lttRebate,
    totalLTT,
    closingCosts,
    incomeRatio,
    score,
    annualNetOwnerCost,
  };
}

// ─── Score badge ──────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const { label, color, bg } =
    score >= 75 ? { label: "Affordable",      color: "text-green-700",  bg: "bg-green-100"  } :
    score >= 50 ? { label: "Moderate",        color: "text-amber-700",  bg: "bg-amber-100"  } :
    score >= 25 ? { label: "Challenging",     color: "text-orange-700", bg: "bg-orange-100" } :
                  { label: "Very Difficult",  color: "text-red-700",    bg: "bg-red-100"    };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color} ${bg}`}>{label}</span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AffordabilityByCityClient() {
  const [income,        setIncome]        = useState<number | null>(null);
  const [downPayment,   setDownPayment]   = useState<number | null>(null);
  const [rate,          setRate]          = useState<number>(5.0);
  const [amort,         setAmort]         = useState<number>(25);
  const [debts,         setDebts]         = useState<number | null>(null);
  const [isFirstTime,   setIsFirstTime]   = useState(false);
  const [selectedCity,  setSelectedCity]  = useState<string | null>(null);
  const [sortBy,        setSortBy]        = useState<"price" | "score" | "income" | "name">("score");
  const [filterProv,    setFilterProv]    = useState<string>("all");
  const [showAffordable,setShowAffordable]= useState(false);

  const monthlyDebts = debts ?? 0;

  // All provinces for filter
  const provinces = ["all", ...Array.from(new Set(CITIES.map(c => c.provinceCode))).sort()];

  const allResults = useMemo(() => {
    if (!income || income <= 0 || !downPayment || downPayment < 0) return null;
    return CITIES.map(city =>
      cityAffordability(city, income, downPayment, rate, amort, monthlyDebts, isFirstTime, city.name === "Toronto")
    );
  }, [income, downPayment, rate, amort, monthlyDebts, isFirstTime]);

  const filteredResults = useMemo(() => {
    if (!allResults) return null;
    let results = filterProv === "all" ? allResults : allResults.filter(r => r.city.provinceCode === filterProv);
    if (showAffordable) results = results.filter(r => r.qualifies);
    return [...results].sort((a, b) => {
      if (sortBy === "price")  return a.city.medianPrice - b.city.medianPrice;
      if (sortBy === "score")  return b.score - a.score;
      if (sortBy === "income") return a.neededIncome - b.neededIncome;
      return a.city.name.localeCompare(b.city.name);
    });
  }, [allResults, filterProv, showAffordable, sortBy]);

  const selectedResult = useMemo(() => {
    if (!allResults || !selectedCity) return null;
    return allResults.find(r => r.city.name === selectedCity) ?? null;
  }, [allResults, selectedCity]);

  const summary = useMemo(() => {
    if (!allResults) return null;
    const affordable  = allResults.filter(r => r.qualifies).length;
    const cheapest    = [...allResults].sort((a, b) => a.city.medianPrice - b.city.medianPrice)[0];
    const mostAfford  = [...allResults].sort((a, b) => b.score - a.score)[0];
    return { affordable, total: allResults.length, cheapest, mostAfford };
  }, [allResults]);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-gray-900">Home Affordability by City</h1>
          <p className="text-gray-500 mt-1">
            Compare housing affordability across {CITIES.length} Canadian cities — see where you qualify, what it costs monthly, and how cities stack up side by side.
          </p>
          <p className="text-xs text-gray-400 mt-1">Data last updated: March 2025 · Sources: CREA, CMHC, municipal tax rates</p>
        </div>

        {/* Inputs */}
        <div className="print:hidden bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-800">Your Financial Profile</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Annual Household Income</label>
              <NumericFormat
                thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
                placeholder="$120,000"
                onValueChange={(v) => setIncome(v.floatValue ?? null)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Down Payment</label>
              <NumericFormat
                thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
                placeholder="$100,000"
                onValueChange={(v) => setDownPayment(v.floatValue ?? null)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Interest Rate (%)</label>
              <input
                type="number" min="0.5" max="15" step="0.05"
                value={rate}
                onChange={(e) => setRate(Number(e.target.value) || 5)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Debt Payments</label>
              <NumericFormat
                thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
                placeholder="$0"
                onValueChange={(v) => setDebts(v.floatValue ?? null)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amortization</label>
              <div className="flex gap-2">
                {[20, 25, 30].map(y => (
                  <button key={y} type="button" onClick={() => setAmort(y)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition-colors ${amort === y ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"}`}>
                    {y}yr
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-5">
              <button type="button" onClick={() => setIsFirstTime(!isFirstTime)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isFirstTime ? "bg-blue-600" : "bg-gray-300"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isFirstTime ? "translate-x-6" : "translate-x-1"}`} />
              </button>
              <span className="text-sm text-gray-700">First-time buyer (applies rebates)</span>
            </div>
          </div>
        </div>

        {/* Results */}
                    <div className="print:hidden flex justify-end">
              <PrintButton label="Print Report" />
            </div>

            {!allResults ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">🏙️</div>
            <p className="text-xl font-semibold text-gray-700">Enter your income and down payment above</p>
            <p className="text-gray-500 mt-2">See how {CITIES.length} Canadian cities compare for your situation.</p>
          </div>
        ) : (
          <>
            {/* Summary */}
            {summary && (

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Cities You Qualify In", value: `${summary.affordable} / ${summary.total}`, color: summary.affordable > 10 ? "text-green-600" : summary.affordable > 5 ? "text-amber-600" : "text-red-500" },
                  { label: "Most Affordable City",  value: summary.mostAfford.city.name,  color: "text-blue-600"   },
                  { label: "Cheapest Market",        value: summary.cheapest.city.name,    color: "text-purple-600" },
                  { label: "Cheapest Median Price",  value: `$${fmt(summary.cheapest.city.medianPrice)}`, color: "text-gray-800" },
                ].map(s => (
                  <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{s.label}</p>
                    <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Province:</label>
                <select
                  value={filterProv}
                  onChange={(e) => setFilterProv(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 bg-white"
                >
                  <option value="all">All Provinces</option>
                  {provinces.filter(p => p !== "all").map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 bg-white"
                >
                  <option value="score">Affordability Score</option>
                  <option value="price">Home Price (Low→High)</option>
                  <option value="income">Income Needed</option>
                  <option value="name">City Name</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setShowAffordable(!showAffordable)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${showAffordable ? "bg-blue-600" : "bg-gray-300"}`}>
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${showAffordable ? "translate-x-5" : "translate-x-1"}`} />
                </button>
                <span className="text-sm text-gray-700">Show only cities I qualify in</span>
              </div>
            </div>

            {/* City grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredResults?.map(r => (
                <button
                  key={r.city.name}
                  type="button"
                  onClick={() => setSelectedCity(selectedCity === r.city.name ? null : r.city.name)}
                  className={`text-left bg-white rounded-xl border-2 shadow-sm p-4 transition-all hover:border-blue-400 ${
                    selectedCity === r.city.name ? "border-blue-600 ring-2 ring-blue-100" :
                    r.qualifies ? "border-gray-200" : "border-gray-100 opacity-75"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-gray-900">{r.city.name}</p>
                      <p className="text-xs text-gray-400">{r.city.province}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <ScoreBadge score={r.score} />
                      {!r.qualifies && (
                        <span className="text-xs text-red-500 font-medium">Doesn't qualify</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center mt-3">
                    <div>
                      <p className="text-xs text-gray-400">Median Price</p>
                      <p className="text-sm font-bold text-gray-800">${fmt(r.city.medianPrice)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Monthly Pmt</p>
                      <p className="text-sm font-bold text-blue-600">${fmt(r.actualPmt)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Income Needed</p>
                      <p className={`text-sm font-bold ${r.neededIncome <= (income ?? 0) ? "text-green-600" : "text-red-500"}`}>
                        ${fmt(r.neededIncome)}
                      </p>
                    </div>
                  </div>

                  {/* Score bar */}
                  <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${r.score >= 75 ? "bg-green-400" : r.score >= 50 ? "bg-amber-400" : r.score >= 25 ? "bg-orange-400" : "bg-red-400"}`}
                      style={{ width: `${r.score}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>

            {/* Selected city detail */}
            {selectedResult && (
              <div className="bg-white rounded-xl shadow-sm border-2 border-blue-600 overflow-hidden">
                <div className="bg-blue-600 text-white px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-black">{selectedResult.city.name}</h2>
                      <p className="text-blue-200 text-sm">{selectedResult.city.province} · {selectedResult.city.population}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-black">${fmt(selectedResult.actualPmt)}</p>
                      <p className="text-blue-200 text-sm">/month mortgage</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  {/* Notes */}
                  {selectedResult.city.notes && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                      <p className="text-sm text-blue-700">💡 {selectedResult.city.notes}</p>
                    </div>
                  )}

                  {/* Price breakdown */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Price Range</h3>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      {[
                        { label: "Condo / Apt",  value: selectedResult.city.medianCondo    },
                        { label: "All Types",    value: selectedResult.city.medianPrice     },
                        { label: "Detached",     value: selectedResult.city.medianDetached  },
                      ].map(p => (
                        <div key={p.label} className="border border-gray-100 rounded-xl p-3">
                          <p className="text-xs text-gray-400 mb-1">{p.label}</p>
                          <p className="text-lg font-bold text-gray-800">${fmt(p.value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Monthly cost breakdown */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Monthly Ownership Costs</h3>
                    <div className="space-y-2">
                      {[
                        { label: "Mortgage Payment",   value: selectedResult.actualPmt,             color: "bg-blue-500"   },
                        { label: "Property Tax",        value: selectedResult.propTax,               color: "bg-purple-400" },
                        { label: "Heating",             value: selectedResult.heating,               color: "bg-orange-400" },
                        { label: "Avg Condo Fee",       value: selectedResult.city.avgCondoFee,      color: "bg-gray-400"   },
                      ].map(row => (
                        <div key={row.label}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">{row.label}</span>
                            <span className="font-medium text-gray-800">${fmt(row.value)}</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${row.color} rounded-full`}
                              style={{ width: `${(row.value / selectedResult.totalMonthly) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2 border-t border-gray-100">
                        <span className="text-sm font-bold text-gray-800">Total Monthly</span>
                        <span className="text-lg font-black text-blue-700">${fmt(selectedResult.totalMonthly)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Qualification */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Mortgage Qualification</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "GDS Ratio",       value: `${(selectedResult.gds * 100).toFixed(1)}%`, limit: "39% max", ok: selectedResult.gds <= 0.39 },
                        { label: "TDS Ratio",       value: `${(selectedResult.tds * 100).toFixed(1)}%`, limit: "44% max", ok: selectedResult.tds <= 0.44 },
                        { label: "Stress Test Pmt", value: `$${fmt(selectedResult.stressPmt)}/mo`,       limit: `at ${selectedResult.stressRate.toFixed(2)}%`, ok: true },
                        { label: "Income Needed",   value: `$${fmt(selectedResult.neededIncome)}/yr`,    limit: `you earn $${fmt(income!)}`, ok: selectedResult.neededIncome <= (income ?? 0) },
                      ].map(q => (
                        <div key={q.label} className={`border rounded-xl p-3 ${q.ok ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                          <p className="text-xs text-gray-500">{q.label}</p>
                          <p className={`text-base font-bold ${q.ok ? "text-green-700" : "text-red-600"}`}>{q.value}</p>
                          <p className="text-xs text-gray-400">{q.limit}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* LTT + closing costs */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Closing Costs</h3>
                    <div className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden">
                      {[
                        { label: "Provincial Land Transfer Tax", value: selectedResult.provLTT,    show: true                        },
                        { label: "Municipal LTT (Toronto)",      value: selectedResult.munLTT,     show: selectedResult.munLTT > 0   },
                        { label: "First-Time Buyer Rebate",      value: -selectedResult.lttRebate, show: selectedResult.lttRebate > 0},
                        { label: "Legal / Title / Inspection",   value: selectedResult.city.medianPrice * 0.015, show: true         },
                      ].filter(r => r.show).map(row => (
                        <div key={row.label} className="flex justify-between px-4 py-2.5">
                          <span className="text-sm text-gray-600">{row.label}</span>
                          <span className={`text-sm font-medium ${row.value < 0 ? "text-green-600" : "text-gray-800"}`}>
                            {row.value < 0 ? "−" : ""}${fmt(Math.abs(row.value))}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between px-4 py-3 bg-gray-50 font-semibold">
                        <span className="text-sm text-gray-800">Est. Total Closing Costs</span>
                        <span className="text-sm font-bold text-gray-900">${fmt(selectedResult.closingCosts)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Plus your down payment of ${fmt(selectedResult.down)} = ${fmt(selectedResult.down + selectedResult.closingCosts)} needed upfront</p>
                  </div>

                  {/* Rent vs buy */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Rent vs Own in {selectedResult.city.name}</h3>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Avg 2BR Rent</p>
                        <p className="text-xl font-bold text-green-600">${fmt(selectedResult.city.avgRent2br)}/mo</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Total Ownership Cost</p>
                        <p className="text-xl font-bold text-blue-600">${fmt(selectedResult.totalMonthly)}/mo</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-3 text-center">
                      Owning costs <strong>${fmt(selectedResult.totalMonthly - selectedResult.city.avgRent2br)}/mo more</strong> than renting — but builds equity and is protected from rent increases.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* SEO / FAQ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 prose prose-gray max-w-none">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Home Affordability Across Canada — 2025</h2>
          <p className="text-gray-600">
            Housing affordability varies enormously across Canada — from Edmonton where median detached homes are around $510,000, to Vancouver where the median detached home exceeds $1.8 million. This calculator applies the same lender qualification standards to every city so you get an apples-to-apples comparison.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">How Affordability is Calculated</h3>
          <p className="text-gray-600">
            Each city is evaluated using the same GDS (39%) and TDS (44%) debt service ratios that Canadian lenders use, applied at the mortgage stress test rate (your rate + 2%, minimum 5.25%). Property tax rates, average heating costs, and condo fees are city-specific — so the comparison reflects real local costs, not just home prices.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Most Affordable Major Cities in Canada (2025)</h3>
          <p className="text-gray-600">
            Edmonton and Regina consistently rank as the most affordable major cities — combining lower home prices with stronger relative incomes. Winnipeg, Saskatoon, and Quebec City also offer strong affordability. At the other end, Vancouver, Toronto, and Victoria remain severely unaffordable for median-income households without significant down payments.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Land Transfer Tax by Province</h3>
          <p className="text-gray-600">
            Alberta, Saskatchewan, Nunavut, and Yukon have no provincial land transfer tax — a significant savings on a $500,000 home. Ontario and BC buyers face the highest closing costs. Toronto buyers pay a double land transfer tax (provincial + municipal), adding $20,000–$30,000 in closing costs on a typical home.
          </p>

          <p className="text-sm text-gray-400 mt-6">
            Median prices sourced from CREA and regional real estate boards (Q1 2025). Property tax rates from municipal websites. Rent averages from CMHC Rental Market Report. All figures are estimates — actual costs vary by neighbourhood, property type, and market conditions. Not financial advice.
          </p>
        </div>

      </div>
    </div>
  );
}
