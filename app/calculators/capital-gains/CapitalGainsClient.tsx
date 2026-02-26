"use client";

// app/calculators/capital-gains/CapitalGainsClient.tsx

import { useState, useMemo } from "react";
import { NumericFormat } from "react-number-format";

// ─── Constants ────────────────────────────────────────────────────────────────

// Federal inclusion rates
const OLD_INCLUSION_RATE = 0.50;  // pre-2024
const NEW_INCLUSION_RATE_BELOW = 0.50;   // first $250k of gains (individuals)
const NEW_INCLUSION_RATE_ABOVE = 0.6667; // above $250k of gains (individuals)
const NEW_THRESHOLD = 250000;

// Lifetime Capital Gains Exemption (2025)
const LCGE_SMALL_BUSINESS = 1016602;
const LCGE_FARM_FISHING   = 1016602;

// Federal brackets 2025
const FEDERAL_BRACKETS = [
  { min: 0,       max: 57375,   rate: 0.15   },
  { min: 57375,   max: 114750,  rate: 0.205  },
  { min: 114750,  max: 158519,  rate: 0.26   },
  { min: 158519,  max: 220000,  rate: 0.29   },
  { min: 220000,  max: Infinity,rate: 0.33   },
];
const FEDERAL_BASIC_PERSONAL = 16129;

// Provincial top marginal rates (combined approx, for display)
const PROV_RATES: Record<string, { name: string; rate: number }> = {
  AB: { name: "Alberta",                  rate: 0.15   },
  BC: { name: "British Columbia",         rate: 0.205  },
  MB: { name: "Manitoba",                 rate: 0.174  },
  NB: { name: "New Brunswick",            rate: 0.195  },
  NL: { name: "Newfoundland & Labrador",  rate: 0.218  },
  NS: { name: "Nova Scotia",              rate: 0.21   },
  NT: { name: "Northwest Territories",    rate: 0.1405 },
  NU: { name: "Nunavut",                  rate: 0.1195 },
  ON: { name: "Ontario",                  rate: 0.1316 },
  PE: { name: "Prince Edward Island",     rate: 0.167  },
  QC: { name: "Quebec",                   rate: 0.225  },
  SK: { name: "Saskatchewan",             rate: 0.145  },
  YT: { name: "Yukon",                    rate: 0.1502 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt    = (n: number) => Math.round(n).toLocaleString("en-CA");
const fmtDec = (n: number) => n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function calcFederalTax(taxableIncome: number): number {
  const income = Math.max(0, taxableIncome - FEDERAL_BASIC_PERSONAL);
  let tax = 0;
  for (const bracket of FEDERAL_BRACKETS) {
    if (income <= bracket.min) break;
    const taxable = Math.min(income, bracket.max) - bracket.min;
    tax += taxable * bracket.rate;
  }
  return tax;
}

// Tax on just the capital gains portion (marginal method)
function taxOnGains(otherIncome: number, gains: number, provRate: number): number {
  const fedWithout = calcFederalTax(otherIncome);
  const fedWith    = calcFederalTax(otherIncome + gains);
  const fedTax     = fedWith - fedWithout;
  const provTax    = gains * provRate;
  return fedTax + provTax;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CGResult {
  capitalGain:        number;
  // Old rules (50% inclusion)
  oldIncludedGain:    number;
  oldTax:             number;
  oldEffectiveRate:   number;
  // New rules (50% up to $250k, 66.7% above)
  newIncludedGain:    number;
  newTax:             number;
  newEffectiveRate:   number;
  // Difference
  extraTax:           number;
  // After LCGE
  lcgeApplies:        boolean;
  gainAfterLCGE:      number;
  taxAfterLCGE:       number;
  // Principal residence
  prApplies:          boolean;
  taxableGainAfterPR: number;
  // Net proceeds
  netAfterOldRules:   number;
  netAfterNewRules:   number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CapitalGainsClient() {
  const [province,        setProvince]        = useState("ON");
  const [otherIncome,     setOtherIncome]     = useState<number | null>(null);
  const [purchasePrice,   setPurchasePrice]   = useState<number | null>(null);
  const [salePrice,       setSalePrice]       = useState<number | null>(null);
  const [expenses,        setExpenses]        = useState<number | null>(null);
  const [assetType,       setAssetType]       = useState<"property" | "stocks" | "business" | "other">("property");
  const [isPrincipalRes,  setIsPrincipalRes]  = useState(false);
  const [yearsOwned,      setYearsOwned]      = useState<number | null>(null);
  const [yearsAsPrincipal,setYearsAsPrincipal]= useState<number | null>(null);
  const [useLCGE,         setUseLCGE]         = useState(false);
  const [lcgeUsed,        setLcgeUsed]        = useState<number | null>(null);

  const provData = PROV_RATES[province];

  const result = useMemo<CGResult | null>(() => {
    if (!purchasePrice || !salePrice) return null;
    if (salePrice <= 0 || purchasePrice < 0) return null;

    const income      = otherIncome ?? 0;
    const exp         = expenses ?? 0;
    const capitalGain = Math.max(0, salePrice - purchasePrice - exp);
    const provRate    = provData.rate;

    // ── Principal residence exemption ──────────────────────────────────────
    let prExemptionPct = 0;
    let taxableGainAfterPR = capitalGain;
    if (isPrincipalRes && yearsOwned && yearsAsPrincipal) {
      prExemptionPct    = Math.min(1, (yearsAsPrincipal + 1) / yearsOwned);
      taxableGainAfterPR = capitalGain * (1 - prExemptionPct);
    }
    const prApplies = isPrincipalRes && prExemptionPct > 0;

    // ── LCGE ───────────────────────────────────────────────────────────────
    const lcgeRemaining  = Math.max(0, LCGE_SMALL_BUSINESS - (lcgeUsed ?? 0));
    const lcgeDeduction  = useLCGE ? Math.min(taxableGainAfterPR, lcgeRemaining) : 0;
    const gainAfterLCGE  = Math.max(0, taxableGainAfterPR - lcgeDeduction);
    const lcgeApplies    = useLCGE && lcgeDeduction > 0;

    const effectiveGain  = gainAfterLCGE;

    // ── Old rules (50% inclusion) ──────────────────────────────────────────
    const oldIncludedGain = effectiveGain * OLD_INCLUSION_RATE;
    const oldTax          = taxOnGains(income, oldIncludedGain, provRate);
    const oldEffectiveRate = capitalGain > 0 ? (oldTax / capitalGain) * 100 : 0;

    // ── New rules (50% up to $250k, 66.7% above) ──────────────────────────
    const gainBelow = Math.min(effectiveGain, NEW_THRESHOLD);
    const gainAbove = Math.max(0, effectiveGain - NEW_THRESHOLD);
    const newIncludedGain = gainBelow * NEW_INCLUSION_RATE_BELOW + gainAbove * NEW_INCLUSION_RATE_ABOVE;
    const newTax          = taxOnGains(income, newIncludedGain, provRate);
    const newEffectiveRate = capitalGain > 0 ? (newTax / capitalGain) * 100 : 0;

    const extraTax = newTax - oldTax;

    // After LCGE tax
    const taxAfterLCGE = lcgeApplies
      ? taxOnGains(income, gainAfterLCGE * NEW_INCLUSION_RATE_BELOW, provRate)
      : newTax;

    return {
      capitalGain,
      oldIncludedGain,
      oldTax,
      oldEffectiveRate,
      newIncludedGain,
      newTax,
      newEffectiveRate,
      extraTax,
      lcgeApplies,
      gainAfterLCGE,
      taxAfterLCGE,
      prApplies,
      taxableGainAfterPR,
      netAfterOldRules: salePrice - oldTax,
      netAfterNewRules: salePrice - newTax,
    };
  }, [province, otherIncome, purchasePrice, salePrice, expenses, isPrincipalRes,
      yearsOwned, yearsAsPrincipal, useLCGE, lcgeUsed, provData]);

  const provinceList = Object.entries(PROV_RATES).sort((a, b) => a[1].name.localeCompare(b[1].name));

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-gray-900">Capital Gains Tax Calculator</h1>
          <p className="text-gray-500 mt-1">
            Calculate your Canadian capital gains tax under the 2024 inclusion rate changes — old vs new rules side by side.
          </p>
        </div>

        {/* Inputs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-800">Asset Details</h2>

          {/* Asset type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Asset Type</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "property", label: "🏠 Property" },
                { value: "stocks",   label: "📈 Stocks / ETFs" },
                { value: "business", label: "🏢 Business" },
                { value: "other",    label: "💼 Other" },
              ].map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setAssetType(t.value as typeof assetType)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                    assetType === t.value
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Province */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Province</label>
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-gray-900"
            >
              {provinceList.map(([code, data]) => (
                <option key={code} value={code}>{data.name}</option>
              ))}
            </select>
          </div>

          {/* Other income */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Other Annual Income
              <span className="text-gray-400 font-normal ml-1">(employment, rental, etc.)</span>
            </label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$80,000"
              onValueChange={(v) => setOtherIncome(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-right"
            />
          </div>

          {/* Purchase price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Original Purchase Price (ACB)
            </label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$300,000"
              onValueChange={(v) => setPurchasePrice(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-right"
            />
          </div>

          {/* Sale price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sale Price
            </label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$600,000"
              onValueChange={(v) => setSalePrice(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-right"
            />
          </div>

          {/* Selling expenses */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selling Expenses
              <span className="text-gray-400 font-normal ml-1">(commissions, legal fees, etc.)</span>
            </label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$15,000"
              onValueChange={(v) => setExpenses(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-right"
            />
          </div>

          {/* Principal residence toggle */}
          {assetType === "property" && (
            <div className="border border-gray-200 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Apply Principal Residence Exemption?
                </label>
                <button
                  type="button"
                  onClick={() => setIsPrincipalRes(!isPrincipalRes)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isPrincipalRes ? "bg-blue-600" : "bg-gray-300"
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPrincipalRes ? "translate-x-6" : "translate-x-1"
                  }`} />
                </button>
              </div>
              {isPrincipalRes && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Years Owned</label>
                    <input
                      type="number" min="1" max="50" placeholder="10"
                      onChange={(e) => setYearsOwned(Number(e.target.value) || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Years as Principal Residence</label>
                    <input
                      type="number" min="1" max="50" placeholder="10"
                      onChange={(e) => setYearsAsPrincipal(Number(e.target.value) || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* LCGE toggle */}
          {(assetType === "business") && (
            <div className="border border-gray-200 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Apply Lifetime Capital Gains Exemption (LCGE)?
                  <span className="block text-xs text-gray-400 font-normal mt-0.5">For qualifying small business shares or farm/fishing property</span>
                </label>
                <button
                  type="button"
                  onClick={() => setUseLCGE(!useLCGE)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ml-4 ${
                    useLCGE ? "bg-blue-600" : "bg-gray-300"
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    useLCGE ? "translate-x-6" : "translate-x-1"
                  }`} />
                </button>
              </div>
              {useLCGE && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    LCGE Already Used (if any)
                  </label>
                  <NumericFormat
                    thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
                    placeholder="$0"
                    onValueChange={(v) => setLcgeUsed(v.floatValue ?? null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">2025 LCGE limit: ${fmt(LCGE_SMALL_BUSINESS)}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results */}
        {result === null ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">📈</div>
            <p className="text-xl font-semibold text-gray-700">Enter your asset details above</p>
            <p className="text-gray-500 mt-2">Your capital gains tax estimate will appear here instantly.</p>
          </div>
        ) : result.capitalGain <= 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center text-amber-700 font-medium">
            No capital gain — your sale price is less than or equal to your adjusted cost base.
          </div>
        ) : (
          <>
            {/* Capital gain hero */}
            <div className="bg-blue-600 text-white rounded-xl p-6 text-center shadow-sm">
              <p className="text-sm font-medium text-blue-200 uppercase tracking-wide">Total Capital Gain</p>
              <p className="text-5xl font-black mt-2">${fmt(result.capitalGain)}</p>
              <p className="text-blue-200 text-sm mt-1">
                ${fmt(salePrice! - (purchasePrice ?? 0))} gain minus ${fmt(expenses ?? 0)} in expenses
              </p>
            </div>

            {/* PR exemption notice */}
            {result.prApplies && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-green-800">✅ Principal Residence Exemption Applied</p>
                <p className="text-sm text-green-700 mt-0.5">
                  Taxable gain reduced to <strong>${fmt(result.taxableGainAfterPR)}</strong> after exemption.
                </p>
              </div>
            )}

            {/* LCGE notice */}
            {result.lcgeApplies && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-green-800">✅ Lifetime Capital Gains Exemption Applied</p>
                <p className="text-sm text-green-700 mt-0.5">
                  Taxable gain reduced to <strong>${fmt(result.gainAfterLCGE)}</strong> after LCGE deduction.
                </p>
              </div>
            )}

            {/* Old vs New rules comparison — the hero feature */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-800">Old vs New Inclusion Rate — 2024 Change</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Before June 25, 2024 vs after — see exactly how much more you owe.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                {/* Old rules */}
                <div className="p-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Before June 25, 2024</p>
                  <p className="text-sm text-gray-600 mb-1">Inclusion Rate: <strong>50%</strong></p>
                  <p className="text-sm text-gray-600 mb-4">Taxable Gain: <strong>${fmt(result.oldIncludedGain)}</strong></p>
                  <p className="text-3xl font-black text-gray-800">${fmt(result.oldTax)}</p>
                  <p className="text-gray-400 text-sm mt-1">estimated tax</p>
                  <p className="text-orange-500 text-sm font-medium mt-2">{result.oldEffectiveRate.toFixed(1)}% effective rate on gain</p>
                </div>
                {/* New rules */}
                <div className="p-6 bg-red-50">
                  <p className="text-xs font-bold uppercase tracking-widest text-red-400 mb-3">After June 25, 2024</p>
                  <p className="text-sm text-gray-600 mb-1">
                    Inclusion Rate: <strong>50% (first $250k) / 66.7% (above)</strong>
                  </p>
                  <p className="text-sm text-gray-600 mb-4">Taxable Gain: <strong>${fmt(result.newIncludedGain)}</strong></p>
                  <p className="text-3xl font-black text-red-700">${fmt(result.newTax)}</p>
                  <p className="text-gray-400 text-sm mt-1">estimated tax</p>
                  <p className="text-red-500 text-sm font-medium mt-2">{result.newEffectiveRate.toFixed(1)}% effective rate on gain</p>
                </div>
              </div>
              {/* Extra tax callout */}
              <div className={`px-6 py-4 border-t border-gray-100 flex items-center justify-between ${result.extraTax > 0 ? "bg-red-50" : "bg-green-50"}`}>
                <p className="text-sm font-semibold text-gray-700">
                  {result.extraTax > 0 ? "⚠️ Additional tax under new rules" : "✅ No change — gain is under $250,000"}
                </p>
                <p className={`text-lg font-black ${result.extraTax > 0 ? "text-red-600" : "text-green-600"}`}>
                  {result.extraTax > 0 ? `+$${fmt(result.extraTax)}` : "—"}
                </p>
              </div>
            </div>

            {/* Full breakdown table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">Full Breakdown — New Rules</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  { label: "Sale Price",              value: salePrice!,               color: "text-gray-900", bold: false },
                  { label: "Adjusted Cost Base",       value: purchasePrice!,           color: "text-gray-600", bold: false, negative: true },
                  { label: "Selling Expenses",         value: expenses ?? 0,            color: "text-gray-600", bold: false, negative: true },
                  { label: "Capital Gain",             value: result.capitalGain,       color: "text-gray-900", bold: true  },
                  { label: "Taxable Gain (included)",  value: result.newIncludedGain,   color: "text-orange-600", bold: false },
                  { label: "Estimated Tax Owing",      value: result.newTax,            color: "text-red-600",  bold: true, negative: true  },
                  { label: "Net Proceeds After Tax",   value: result.netAfterNewRules,  color: "text-blue-700", bold: true  },
                ].map((row) => (
                  <div key={row.label} className={`flex justify-between items-center px-6 py-3.5 ${row.bold ? "bg-gray-50" : "hover:bg-gray-50"} transition-colors`}>
                    <span className={`text-sm ${row.bold ? "font-semibold text-gray-800" : "text-gray-600"}`}>{row.label}</span>
                    <span className={`text-sm font-${row.bold ? "bold" : "medium"} ${row.color}`}>
                      {row.negative ? "−" : ""}${fmt(row.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual bars */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Where Your Sale Proceeds Go
              </h3>
              <div className="space-y-3">
                {[
                  { label: "Net After Tax (new rules)", value: result.netAfterNewRules, color: "bg-blue-500" },
                  { label: "Tax Owing (new rules)",     value: result.newTax,           color: "bg-red-500"  },
                  { label: "Original Cost + Expenses",  value: (purchasePrice ?? 0) + (expenses ?? 0), color: "bg-gray-400" },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{row.label}</span>
                      <span className="font-medium text-gray-800">${fmt(row.value)}</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${row.color} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min((row.value / salePrice!) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Net proceeds comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Net Proceeds — Old Rules</p>
                <p className="text-3xl font-bold text-gray-800">${fmt(result.netAfterOldRules)}</p>
                <p className="text-gray-400 text-sm mt-1">after tax (pre-2024)</p>
              </div>
              <div className="bg-white border border-red-200 rounded-xl p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Net Proceeds — New Rules</p>
                <p className="text-3xl font-bold text-red-600">${fmt(result.netAfterNewRules)}</p>
                <p className="text-gray-400 text-sm mt-1">after tax (2024+)</p>
              </div>
            </div>
          </>
        )}

        {/* SEO / FAQ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 prose prose-gray max-w-none">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Canadian Capital Gains Tax — 2024 Rule Changes Explained
          </h2>
          <p className="text-gray-600">
            A capital gain occurs when you sell an asset for more than you paid for it. In Canada, only a portion of your capital gain is included in your taxable income — this is called the <strong>inclusion rate</strong>.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">What Changed in 2024?</h3>
          <p className="text-gray-600">
            Effective June 25, 2024, the federal government increased the capital gains inclusion rate from <strong>50% to 66.7%</strong> on capital gains above <strong>$250,000 per year</strong> for individuals. Below $250,000, the 50% inclusion rate still applies. This means if you sell a cottage with a $500,000 gain, the first $250,000 is included at 50% and the remaining $250,000 at 66.7%.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Principal Residence Exemption</h3>
          <p className="text-gray-600">
            If the property was your principal residence for all or part of your ownership, you may be able to eliminate or reduce the capital gain using the <strong>Principal Residence Exemption (PRE)</strong>. The formula is: (years designated + 1) ÷ total years owned × capital gain = exempt amount.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Lifetime Capital Gains Exemption (LCGE)</h3>
          <p className="text-gray-600">
            If you're selling qualifying small business corporation shares or qualified farm/fishing property, you may be eligible for the <strong>Lifetime Capital Gains Exemption</strong>. For 2025, the LCGE limit is <strong>${fmt(LCGE_SMALL_BUSINESS)}</strong> — meaning up to that amount of capital gains can be sheltered from tax entirely.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Adjusted Cost Base (ACB)</h3>
          <p className="text-gray-600">
            Your ACB is what you originally paid for the asset, plus any capital improvements (for property) or additional purchases (for stocks). Selling expenses like real estate commissions and legal fees are deducted from your proceeds before calculating the gain.
          </p>

          <p className="text-sm text-gray-400 mt-6">
            This calculator provides estimates based on 2025 federal tax brackets and provincial top marginal rates. Actual tax owing depends on your complete tax situation. The 2024 inclusion rate change remains subject to parliamentary confirmation. Consult a tax professional for personalized advice.
          </p>
        </div>

      </div>
    </div>
  );
}
