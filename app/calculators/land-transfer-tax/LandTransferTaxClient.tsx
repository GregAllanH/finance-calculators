"use client";

// app/calculators/land-transfer-tax/LandTransferTaxClient.tsx

import PrintButton from "@/components/PrintButton";
import { useState, useMemo } from "react";
import { NumericFormat } from "react-number-format";

// ─── LTT Rate Tables ──────────────────────────────────────────────────────────

// Each bracket: { max, rate } where max is upper bound (Infinity for last bracket)
type Bracket = { max: number; rate: number };

const PROVINCIAL_LTT: Record<string, {
  name:         string;
  brackets:     Bracket[];
  rebate?:      { amount: number; maxPrice: number; label: string };
  notes?:       string;
  hasLTT:       boolean;
  flatFee?:     number;
}> = {
  ON: {
    name: "Ontario",
    hasLTT: true,
    brackets: [
      { max: 55000,    rate: 0.005  },
      { max: 250000,   rate: 0.010  },
      { max: 400000,   rate: 0.015  },
      { max: 2000000,  rate: 0.020  },
      { max: Infinity, rate: 0.025  },
    ],
    rebate: { amount: 4000, maxPrice: 368000, label: "First-Time Home Buyer Rebate (max $4,000)" },
    notes: "Toronto buyers pay an additional Municipal Land Transfer Tax (MLTT) on top of the provincial tax.",
  },
  BC: {
    name: "British Columbia",
    hasLTT: true,
    brackets: [
      { max: 200000,   rate: 0.010  },
      { max: 2000000,  rate: 0.020  },
      { max: 3000000,  rate: 0.030  },
      { max: Infinity, rate: 0.050  },
    ],
    rebate: { amount: 8000, maxPrice: 500000, label: "First-Time Home Buyer Exemption (max $8,000)" },
    notes: "Foreign buyers pay an additional 20% Foreign Buyer Tax in certain regions.",
  },
  QC: {
    name: "Quebec",
    hasLTT: true,
    brackets: [
      { max: 53200,    rate: 0.005  },
      { max: 266200,   rate: 0.010  },
      { max: 528300,   rate: 0.015  },
      { max: 1056500,  rate: 0.020  },
      { max: Infinity, rate: 0.025  },
    ],
    notes: "Quebec's Welcome Tax (Taxe de bienvenue) rates vary by municipality. Montreal rates shown.",
  },
  MB: {
    name: "Manitoba",
    hasLTT: true,
    brackets: [
      { max: 30000,    rate: 0.000  },
      { max: 90000,    rate: 0.005  },
      { max: 150000,   rate: 0.010  },
      { max: 200000,   rate: 0.015  },
      { max: Infinity, rate: 0.020  },
    ],
    rebate: { amount: 4500, maxPrice: 150000, label: "First-Time Home Buyer Rebate (max $4,500)" },
  },
  PE: {
    name: "Prince Edward Island",
    hasLTT: true,
    brackets: [
      { max: 30000,    rate: 0.000  },
      { max: Infinity, rate: 0.010  },
    ],
    rebate: { amount: 2000, maxPrice: 200000, label: "First-Time Home Buyer Rebate (max $2,000)" },
    notes: "PEI charges 1% on amounts over $30,000.",
  },
  NS: {
    name: "Nova Scotia",
    hasLTT: false,
    brackets: [],
    notes: "Nova Scotia does not have a provincial land transfer tax. Municipal deed transfer taxes apply and vary by municipality (typically 1–1.5% of purchase price).",
  },
  NB: {
    name: "New Brunswick",
    hasLTT: true,
    brackets: [
      { max: Infinity, rate: 0.010 },
    ],
    notes: "New Brunswick charges a flat 1% on the greater of purchase price or assessed value.",
  },
  AB: {
    name: "Alberta",
    hasLTT: false,
    brackets: [],
    flatFee: 0,
    notes: "Alberta has no land transfer tax — one of its major advantages for home buyers. A small land title transfer fee applies (approximately $400–$600 on most purchases).",
  },
  SK: {
    name: "Saskatchewan",
    hasLTT: false,
    brackets: [],
    notes: "Saskatchewan has no land transfer tax. A title transfer fee applies (approximately $500–$800).",
  },
  NL: {
    name: "Newfoundland & Labrador",
    hasLTT: false,
    brackets: [],
    notes: "Newfoundland & Labrador has no provincial land transfer tax. A registration fee applies.",
  },
  NT: {
    name: "Northwest Territories",
    hasLTT: true,
    brackets: [
      { max: 1000000,  rate: 0.015 },
      { max: Infinity, rate: 0.020 },
    ],
  },
  NU: {
    name: "Nunavut",
    hasLTT: false,
    brackets: [],
    notes: "Nunavut does not have a land transfer tax.",
  },
  YT: {
    name: "Yukon",
    hasLTT: false,
    brackets: [],
    notes: "Yukon does not have a provincial land transfer tax.",
  },
};

// Toronto Municipal LTT (same structure as Ontario provincial)
const TORONTO_MLTT: Bracket[] = [
  { max: 55000,    rate: 0.005  },
  { max: 250000,   rate: 0.010  },
  { max: 400000,   rate: 0.015  },
  { max: 2000000,  rate: 0.020  },
  { max: Infinity, rate: 0.025  },
];
const TORONTO_REBATE = { amount: 4475, maxPrice: 400000, label: "Toronto First-Time Buyer Rebate (max $4,475)" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => Math.round(n).toLocaleString("en-CA");

function calcLTT(price: number, brackets: Bracket[]): number {
  if (!brackets.length) return 0;
  let tax = 0;
  let prev = 0;
  for (const bracket of brackets) {
    if (price <= prev) break;
    const taxable = Math.min(price, bracket.max) - prev;
    tax += taxable * bracket.rate;
    prev = bracket.max;
    if (bracket.max === Infinity) break;
  }
  return tax;
}

function calcRebate(tax: number, price: number, rebate: { amount: number; maxPrice: number }): number {
  if (price > rebate.maxPrice) {
    // Partial rebate (prorated for some provinces)
    return 0;
  }
  return Math.min(tax, rebate.amount);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LandTransferTaxClient() {
  const [province,       setProvince]       = useState("ON");
  const [purchasePrice,  setPurchasePrice]  = useState<number | null>(null);
  const [isFirstTimeBuyer, setIsFirstTimeBuyer] = useState(false);
  const [isToronto,      setIsToronto]      = useState(false);

  const provData = PROVINCIAL_LTT[province];

  const result = useMemo(() => {
    if (!purchasePrice || purchasePrice <= 0) return null;
    const price = purchasePrice;

    // Provincial LTT
    const provTax    = provData.hasLTT ? calcLTT(price, provData.brackets) : 0;
    const provRebate = isFirstTimeBuyer && provData.rebate
      ? calcRebate(provTax, price, provData.rebate) : 0;
    const provNet    = Math.max(0, provTax - provRebate);

    // Toronto MLTT
    const torontoTax    = isToronto && province === "ON" ? calcLTT(price, TORONTO_MLTT) : 0;
    const torontoRebate = isToronto && isFirstTimeBuyer && province === "ON"
      ? calcRebate(torontoTax, price, TORONTO_REBATE) : 0;
    const torontoNet    = Math.max(0, torontoTax - torontoRebate);

    const totalTax    = provTax + torontoTax;
    const totalRebate = provRebate + torontoRebate;
    const totalNet    = provNet + torontoNet;
    const effectiveRate = price > 0 ? (totalNet / price) * 100 : 0;

    // Bracket breakdown for display
    const brackets = provData.brackets.map((b, i) => {
      const prev   = i === 0 ? 0 : provData.brackets[i - 1].max;
      const taxable = Math.max(0, Math.min(price, b.max) - prev);
      return {
        range:   prev === 0 ? `First $${fmt(Math.min(b.max, price))}` :
                 b.max === Infinity ? `Over $${fmt(prev)}` :
                 `$${fmt(prev + 1)} – $${fmt(b.max)}`,
        rate:    b.rate,
        taxable,
        tax:     taxable * b.rate,
        applies: price > prev,
      };
    }).filter(b => b.applies);

    return {
      price,
      provTax,
      provRebate,
      provNet,
      torontoTax,
      torontoRebate,
      torontoNet,
      totalTax,
      totalRebate,
      totalNet,
      effectiveRate,
      brackets,
    };
  }, [purchasePrice, province, isFirstTimeBuyer, isToronto, provData]);

  const provinceList = Object.entries(PROVINCIAL_LTT).sort((a, b) => a[1].name.localeCompare(b[1].name));

  // Comparison across all LTT provinces for the entered price
  const comparison = useMemo(() => {
    if (!purchasePrice || purchasePrice <= 0) return [];
    return Object.entries(PROVINCIAL_LTT)
      .map(([code, prov]) => ({
        code,
        name:  prov.name,
        tax:   prov.hasLTT ? calcLTT(purchasePrice, prov.brackets) : 0,
        hasLTT: prov.hasLTT,
      }))
      .sort((a, b) => a.tax - b.tax);
  }, [purchasePrice]);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-gray-900">Land Transfer Tax Calculator</h1>
          <p className="text-gray-500 mt-1">
            Calculate provincial land transfer tax for every Canadian province — including Toronto's municipal tax and first-time buyer rebates.
          </p>
        </div>

        {/* Inputs */}
        <div className="print:hidden bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-800">Property Details</h2>

          {/* Province */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Province</label>
            <select
              value={province}
              onChange={(e) => { setProvince(e.target.value); setIsToronto(false); }}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 bg-white text-gray-900"
            >
              {provinceList.map(([code, data]) => (
                <option key={code} value={code}>{data.name}</option>
              ))}
            </select>
          </div>

          {/* Purchase price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Price</label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$650,000"
              onValueChange={(v) => setPurchasePrice(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
            />
          </div>

          {/* First-time buyer toggle */}
          {provData.rebate && (
            <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
              <div>
                <p className="text-sm font-medium text-gray-700">First-Time Home Buyer?</p>
                <p className="text-xs text-gray-400 mt-0.5">{provData.rebate.label}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsFirstTimeBuyer(!isFirstTimeBuyer)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ml-4 ${isFirstTimeBuyer ? "bg-blue-600" : "bg-gray-300"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isFirstTimeBuyer ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          )}

          {/* Toronto toggle */}
          {province === "ON" && (
            <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Buying in the City of Toronto?</p>
                <p className="text-xs text-gray-400 mt-0.5">Toronto charges an additional Municipal Land Transfer Tax on top of Ontario's provincial tax</p>
              </div>
              <button
                type="button"
                onClick={() => setIsToronto(!isToronto)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ml-4 ${isToronto ? "bg-blue-600" : "bg-gray-300"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isToronto ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          )}

          {/* No LTT notice */}
          {!provData.hasLTT && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-green-800 mb-1">✅ {provData.name} has no provincial land transfer tax!</p>
              {provData.notes && <p className="text-sm text-green-700">{provData.notes}</p>}
            </div>
          )}
        </div>

        {/* Results */}
                    <div className="print:hidden flex justify-end">
              <PrintButton label="Print Report" />
            </div>

            {result === null ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">🏠</div>
            <p className="text-xl font-semibold text-gray-700">Enter a purchase price above</p>
            <p className="text-gray-500 mt-2">Your land transfer tax will calculate instantly.</p>
          </div>
        ) : (
          <>
            {/* Hero */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-600 text-white rounded-xl p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-blue-200 uppercase tracking-wide">
                  Total LTT {isToronto ? "(Provincial + Toronto)" : ""}
                </p>
                <p className="text-4xl font-black mt-2">${fmt(result.totalNet)}</p>
                <p className="text-blue-200 text-sm mt-1">{result.effectiveRate.toFixed(2)}% of purchase price</p>
              </div>
              {result.totalRebate > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center shadow-sm">
                  <p className="text-sm font-medium text-green-600 uppercase tracking-wide">First-Time Buyer Rebate</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">−${fmt(result.totalRebate)}</p>
                  <p className="text-gray-400 text-sm mt-1">applied to your total</p>
                </div>
              )}
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Before Rebate</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">${fmt(result.totalTax)}</p>
                <p className="text-gray-400 text-sm mt-1">gross LTT</p>
              </div>
            </div>

            {/* Toronto split */}
            {isToronto && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Ontario Provincial LTT</p>
                  <p className="text-3xl font-bold text-gray-800">${fmt(result.provNet)}</p>
                  {result.provRebate > 0 && <p className="text-xs text-green-600 mt-1">After ${fmt(result.provRebate)} first-time buyer rebate</p>}
                </div>
                <div className="bg-white border border-orange-200 rounded-xl p-6 shadow-sm">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Toronto Municipal LTT</p>
                  <p className="text-3xl font-bold text-orange-600">${fmt(result.torontoNet)}</p>
                  {result.torontoRebate > 0 && <p className="text-xs text-green-600 mt-1">After ${fmt(result.torontoRebate)} Toronto first-time buyer rebate</p>}
                </div>
              </div>
            )}

            {/* Bracket breakdown */}
            {provData.hasLTT && result.brackets.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800">
                    {provData.name} Tax Bracket Breakdown
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">How the tax is calculated on ${fmt(result.price)}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                      <tr>
                        <th className="px-6 py-3 text-left">Price Range</th>
                        <th className="px-6 py-3 text-right">Rate</th>
                        <th className="px-6 py-3 text-right">Taxable Amount</th>
                        <th className="px-6 py-3 text-right">Tax</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {result.brackets.map((b, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-6 py-3 text-gray-700">{b.range}</td>
                          <td className="px-6 py-3 text-right text-gray-600">{(b.rate * 100).toFixed(2)}%</td>
                          <td className="px-6 py-3 text-right text-gray-600">${fmt(b.taxable)}</td>
                          <td className="px-6 py-3 text-right font-semibold text-gray-800">${fmt(b.tax)}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-semibold">
                        <td className="px-6 py-3 text-gray-800" colSpan={3}>Total LTT (before rebate)</td>
                        <td className="px-6 py-3 text-right text-blue-700">${fmt(result.provTax)}</td>
                      </tr>
                      {result.provRebate > 0 && (
                        <tr className="bg-green-50">
                          <td className="px-6 py-3 text-green-700" colSpan={3}>First-Time Buyer Rebate</td>
                          <td className="px-6 py-3 text-right font-semibold text-green-700">−${fmt(result.provRebate)}</td>
                        </tr>
                      )}
                      <tr className="bg-blue-50 font-bold">
                        <td className="px-6 py-3 text-blue-800" colSpan={3}>Net LTT Owing</td>
                        <td className="px-6 py-3 text-right text-blue-700">${fmt(result.provNet)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Province comparison */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">Province-by-Province Comparison</h2>
                <p className="text-sm text-gray-500 mt-0.5">LTT on a ${fmt(result.price)} purchase across Canada</p>
              </div>
              <div className="divide-y divide-gray-50">
                {comparison.map((prov) => {
                  const maxTax = Math.max(...comparison.map(p => p.tax), 1);
                  const isCurrent = prov.code === province;
                  return (
                    <div key={prov.code} className={`px-6 py-3.5 ${isCurrent ? "bg-blue-50" : "hover:bg-gray-50"} transition-colors`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-sm ${isCurrent ? "font-bold text-blue-800" : "font-medium text-gray-700"}`}>
                          {prov.name}
                          {isCurrent && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Selected</span>}
                        </span>
                        <span className={`text-sm font-bold ${!prov.hasLTT ? "text-green-600" : isCurrent ? "text-blue-700" : "text-gray-800"}`}>
                          {!prov.hasLTT ? "No LTT ✅" : `$${fmt(prov.tax)}`}
                        </span>
                      </div>
                      {prov.hasLTT && (
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${isCurrent ? "bg-blue-500" : "bg-gray-400"}`}
                            style={{ width: `${(prov.tax / maxTax) * 100}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            {provData.notes && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <p className="text-sm font-semibold text-amber-800 mb-1">📌 {provData.name} Notes</p>
                <p className="text-sm text-amber-700">{provData.notes}</p>
              </div>
            )}
          </>
        )}

        {/* SEO / FAQ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 prose prose-gray max-w-none">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Canadian Land Transfer Tax — Province by Province</h2>
          <p className="text-gray-600">
            Land transfer tax (LTT) is a one-time tax paid by the buyer when a property changes hands. It's one of the largest closing costs in Canadian real estate — often $10,000–$30,000+ on a typical home purchase — yet many buyers forget to budget for it.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Which Provinces Have No Land Transfer Tax?</h3>
          <p className="text-gray-600">
            Alberta, Saskatchewan, Newfoundland, Nunavut, and Yukon have no provincial land transfer tax — a significant advantage for buyers. Nova Scotia has no provincial LTT but municipalities charge a deed transfer tax (typically 1–1.5%). New Brunswick charges a flat 1%.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Toronto's Double Land Transfer Tax</h3>
          <p className="text-gray-600">
            Toronto is the only Canadian city with its own municipal land transfer tax on top of the provincial tax. On a $1,000,000 Toronto home, buyers pay approximately $16,475 in Ontario LTT plus $16,475 in Toronto MLTT — over $32,000 in total before any rebates. First-time buyers can claim up to $8,475 in combined rebates.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">First-Time Home Buyer Rebates</h3>
          <p className="text-gray-600">
            Ontario, BC, Manitoba, and PEI offer partial or full LTT rebates for first-time home buyers. In Ontario, first-time buyers get up to $4,000 back (eliminating LTT on homes up to ~$368,000). In BC, first-time buyers are fully exempt on homes up to $500,000. Always apply for your rebate when submitting your land transfer — it cannot be claimed retroactively after closing in most provinces.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">When is Land Transfer Tax Due?</h3>
          <p className="text-gray-600">
            LTT is due on closing day and is typically handled by your real estate lawyer. It's paid directly to the provincial government as part of the land title registration process. Budget for LTT alongside your down payment, legal fees, and home inspection costs when planning your purchase.
          </p>

          <p className="text-sm text-gray-400 mt-6">
            Tax rates and rebate amounts are based on published 2025 rates. Rates are subject to change. BC rates exclude the Foreign Buyer Tax and Speculation & Vacancy Tax. Quebec rates shown are for Montreal — other municipalities may vary. Always confirm with a real estate lawyer in your province.
          </p>
        </div>

      </div>
    </div>
  );
}
