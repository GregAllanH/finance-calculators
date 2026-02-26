"use client";

// app/calculators/fhsa/FHSAClient.tsx

import PrintButton from "@/components/PrintButton";
import { useState, useMemo } from "react";
import { NumericFormat } from "react-number-format";

// ─── FHSA Constants ───────────────────────────────────────────────────────────

const FHSA_ANNUAL_LIMIT     = 8000;   // annual contribution limit
const FHSA_LIFETIME_LIMIT   = 40000; // lifetime limit
const FHSA_CARRYFORWARD_MAX = 8000;  // max carry-forward per year
const FHSA_MAX_YEARS        = 15;    // account must be used within 15 years

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  Math.round(n).toLocaleString("en-CA");

const fmtDec = (n: number) =>
  n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Types ────────────────────────────────────────────────────────────────────

interface FHSAResult {
  // Contribution room
  currentRoom: number;
  yearsToMax: number;
  // Growth
  fhsaFinalValue: number;
  totalContributions: number;
  totalGrowth: number;
  // Tax savings
  annualTaxSaving: number;
  totalTaxSaving: number;
  // RRSP comparison
  rrspFinalValue: number;
  fhsaAdvantage: number;
  // Down payment goal
  yearsToGoal: number | null;
  onTrack: boolean;
  // Year-by-year breakdown (first 10 years)
  yearlyData: Array<{
    year: number;
    contribution: number;
    balance: number;
    roomUsed: number;
    taxSaving: number;
  }>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FHSAClient() {
  const [income, setIncome]               = useState<number | null>(null);
  const [contribution, setContribution]   = useState<number | null>(null);
  const [returnRate, setReturnRate]       = useState<number | null>(5);
  const [downPaymentGoal, setDownPaymentGoal] = useState<number | null>(null);
  const [yearsOpen, setYearsOpen]         = useState<number | null>(0);
  const [province, setProvince]           = useState<string>("ON");

  // Marginal tax rates by province (combined federal + provincial, approx for $80-120k range)
  const MARGINAL_RATES: Record<string, number> = {
    AB: 0.3800, BC: 0.3880, MB: 0.4275, NB: 0.4100, NL: 0.4300,
    NS: 0.4379, NT: 0.3405, NU: 0.3305, ON: 0.4341, PE: 0.4137,
    QC: 0.4530, SK: 0.4050, YT: 0.3800,
  };

  const result = useMemo<FHSAResult | null>(() => {
    if (!income || !contribution || !returnRate) return null;
    if (income <= 0 || contribution <= 0 || returnRate < 0) return null;

    const marginalRate  = MARGINAL_RATES[province] ?? 0.40;
    const annualContrib = Math.min(contribution, FHSA_ANNUAL_LIMIT);
    const r             = returnRate / 100;
    const existingYears = yearsOpen ?? 0;

    // ── Contribution room ──────────────────────────────────────────────────
    // Room accrued so far (each year open = $8,000, carry-forward up to $8,000 extra)
    const roomAccrued   = Math.min(existingYears * FHSA_ANNUAL_LIMIT, FHSA_LIFETIME_LIMIT);
    const currentRoom   = Math.min(roomAccrued + FHSA_ANNUAL_LIMIT, FHSA_LIFETIME_LIMIT); // this year's room
    const yearsToMax    = Math.max(0, Math.ceil((FHSA_LIFETIME_LIMIT - roomAccrued) / FHSA_ANNUAL_LIMIT));

    // ── Growth projection ──────────────────────────────────────────────────
    const maxYears = Math.min(FHSA_MAX_YEARS - existingYears, yearsToMax);
    let balance    = 0;
    let totalContribs = 0;
    let totalTaxSaving = 0;
    const yearlyData: FHSAResult["yearlyData"] = [];

    for (let y = 1; y <= Math.min(maxYears, 15); y++) {
      const contrib = Math.min(annualContrib, FHSA_LIFETIME_LIMIT - totalContribs);
      if (contrib <= 0) break;
      balance       = (balance + contrib) * (1 + r);
      totalContribs += contrib;
      const taxSaving = contrib * marginalRate;
      totalTaxSaving += taxSaving;

      if (y <= 10) {
        yearlyData.push({
          year:        y,
          contribution: contrib,
          balance:     Math.round(balance),
          roomUsed:    Math.min(totalContribs, FHSA_LIFETIME_LIMIT),
          taxSaving:   Math.round(taxSaving),
        });
      }
    }

    const fhsaFinalValue = balance;
    const totalGrowth    = fhsaFinalValue - totalContribs;
    const annualTaxSaving = Math.min(annualContrib, FHSA_ANNUAL_LIMIT) * marginalRate;

    // ── RRSP comparison ────────────────────────────────────────────────────
    // RRSP: same contributions, same growth, but taxed on withdrawal (assume 25% at withdrawal)
    let rrspBalance = 0;
    let rrspContribs = 0;
    for (let y = 1; y <= Math.min(maxYears, 15); y++) {
      const contrib = Math.min(annualContrib, FHSA_LIFETIME_LIMIT - rrspContribs);
      if (contrib <= 0) break;
      rrspBalance  = (rrspBalance + contrib) * (1 + r);
      rrspContribs += contrib;
    }
    const rrspFinalValue = rrspBalance * (1 - 0.25); // after 25% withdrawal tax
    const fhsaAdvantage  = fhsaFinalValue - rrspFinalValue;

    // ── Years to down payment goal ─────────────────────────────────────────
    let yearsToGoal: number | null = null;
    if (downPaymentGoal && downPaymentGoal > 0) {
      let b = 0;
      let c = 0;
      for (let y = 1; y <= 15; y++) {
        const contrib = Math.min(annualContrib, FHSA_LIFETIME_LIMIT - c);
        if (contrib <= 0) break;
        b = (b + contrib) * (1 + r);
        c += contrib;
        if (b >= downPaymentGoal) {
          yearsToGoal = y;
          break;
        }
      }
    }

    const onTrack = yearsToGoal !== null
      ? yearsToGoal <= (FHSA_MAX_YEARS - existingYears)
      : fhsaFinalValue >= (downPaymentGoal ?? 0);

    return {
      currentRoom,
      yearsToMax,
      fhsaFinalValue,
      totalContributions: totalContribs,
      totalGrowth,
      annualTaxSaving,
      totalTaxSaving,
      rrspFinalValue,
      fhsaAdvantage,
      yearsToGoal,
      onTrack,
      yearlyData,
    };
  }, [income, contribution, returnRate, downPaymentGoal, yearsOpen, province]);

  const provinceList = [
    ["AB","Alberta"],["BC","British Columbia"],["MB","Manitoba"],["NB","New Brunswick"],
    ["NL","Newfoundland & Labrador"],["NS","Nova Scotia"],["NT","Northwest Territories"],
    ["NU","Nunavut"],["ON","Ontario"],["PE","Prince Edward Island"],
    ["QC","Quebec"],["SK","Saskatchewan"],["YT","Yukon"],
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-gray-900">FHSA Calculator</h1>
          <p className="text-gray-500 mt-1">
            First Home Savings Account — project your growth, tax savings, and path to homeownership.
          </p>
        </div>

        {/* Inputs */}
        <div className="print:hidden bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-800">Your Details</h2>

          {/* Province */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Province</label>
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-gray-900"
            >
              {provinceList.map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>

          {/* Annual Income */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Annual Income
              <span className="text-gray-400 font-normal ml-1">(for tax rate calculation)</span>
            </label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$80,000"
              onValueChange={(v) => setIncome(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-right"
            />
          </div>

          {/* Annual Contribution */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Annual FHSA Contribution
              <span className="text-gray-400 font-normal ml-1">(max $8,000/year)</span>
            </label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$8,000"
              onValueChange={(v) => setContribution(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-right"
            />
            <p className="text-xs text-gray-400 mt-1">Lifetime maximum: $40,000</p>
          </div>

          {/* Expected Return */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expected Annual Return (%)
            </label>
            <input
              type="number" min="0" max="20" step="0.5"
              defaultValue={5}
              onChange={(e) => setReturnRate(Number(e.target.value) || null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-right"
            />
          </div>

          {/* Years account has been open */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Years FHSA Already Open
              <span className="text-gray-400 font-normal ml-1">(0 if new)</span>
            </label>
            <input
              type="number" min="0" max="14" step="1"
              defaultValue={0}
              onChange={(e) => setYearsOpen(Number(e.target.value) || 0)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-right"
            />
          </div>

          {/* Down payment goal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Down Payment Goal
              <span className="text-gray-400 font-normal ml-1">(optional)</span>
            </label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$50,000"
              onValueChange={(v) => setDownPaymentGoal(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-right"
            />
          </div>
        </div>

        {/* Results */}
                    <div className="print:hidden flex justify-end">
              <PrintButton label="Print Report" />
            </div>

            {result === null ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">🏠</div>
            <p className="text-xl font-semibold text-gray-700">Enter your details above</p>
            <p className="text-gray-500 mt-2">Your FHSA projection will appear here instantly.</p>
          </div>
        ) : (
          <>
            {/* Hero */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1 bg-blue-600 text-white rounded-xl p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-blue-200 uppercase tracking-wide">Projected FHSA Value</p>
                <p className="text-4xl font-black mt-2">${fmt(result.fhsaFinalValue)}</p>
                <p className="text-blue-200 text-sm mt-1">tax-free at withdrawal</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Tax Savings</p>
                <p className="text-3xl font-bold text-green-600 mt-2">${fmt(result.totalTaxSaving)}</p>
                <p className="text-gray-400 text-sm mt-1">${fmt(result.annualTaxSaving)}/year</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Investment Growth</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">${fmt(result.totalGrowth)}</p>
                <p className="text-gray-400 text-sm mt-1">on ${fmt(result.totalContributions)} contributed</p>
              </div>
            </div>

            {/* Contribution room */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Current Contribution Room</p>
                <p className="text-4xl font-bold text-blue-600">${fmt(result.currentRoom)}</p>
                <p className="text-gray-500 text-sm mt-2">
                  Available to contribute this year (including carry-forward).
                </p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Years to Max Lifetime Limit</p>
                <p className="text-4xl font-bold text-orange-500">{result.yearsToMax} yrs</p>
                <p className="text-gray-500 text-sm mt-2">
                  To reach the $40,000 lifetime maximum at ${fmt(Math.min(contribution ?? 8000, 8000))}/year.
                </p>
              </div>
            </div>

            {/* Down payment goal */}
            {downPaymentGoal && downPaymentGoal > 0 && (
              <div className={`rounded-xl p-6 shadow-sm border ${result.onTrack ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{result.onTrack ? "✅" : "⚠️"}</span>
                  <div>
                    <p className="font-semibold text-gray-800 text-lg">
                      {result.yearsToGoal
                        ? `You'll reach your $${fmt(downPaymentGoal)} goal in ${result.yearsToGoal} year${result.yearsToGoal === 1 ? "" : "s"}`
                        : `Your FHSA will reach $${fmt(result.fhsaFinalValue)} — $${fmt(downPaymentGoal - result.fhsaFinalValue)} short of your $${fmt(downPaymentGoal)} goal`}
                    </p>
                    <p className="text-gray-600 text-sm mt-0.5">
                      {result.onTrack
                        ? "You're on track — your FHSA will cover your down payment goal."
                        : `Consider a higher return rate, or supplement the remaining $${fmt(downPaymentGoal - result.fhsaFinalValue)} with a TFSA.`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* FHSA vs RRSP comparison */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">FHSA vs RRSP for First Home</h2>
                <p className="text-sm text-gray-500 mt-0.5">Same contributions, same growth — but FHSA withdrawals are 100% tax-free for first home purchase.</p>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  { label: "FHSA Final Value",        value: result.fhsaFinalValue,   color: "text-blue-600",  bold: true  },
                  { label: "RRSP After-Tax Value",     value: result.rrspFinalValue,   color: "text-gray-600",  bold: false,
                    note: "assumes 25% withdrawal tax" },
                  { label: "FHSA Advantage",           value: result.fhsaAdvantage,    color: "text-green-600", bold: true  },
                ].map((row) => (
                  <div key={row.label} className={`flex justify-between items-center px-6 py-3.5 ${row.bold ? "bg-gray-50" : ""}`}>
                    <div>
                      <span className={`text-sm ${row.bold ? "font-semibold text-gray-800" : "text-gray-600"}`}>{row.label}</span>
                      {row.note && <p className="text-xs text-gray-400">{row.note}</p>}
                    </div>
                    <span className={`font-bold text-sm ${row.color}`}>${fmt(row.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Year-by-year table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">Year-by-Year Breakdown</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                    <tr>
                      <th className="px-6 py-3 text-left">Year</th>
                      <th className="px-6 py-3 text-right">Contribution</th>
                      <th className="px-6 py-3 text-right">Balance</th>
                      <th className="px-6 py-3 text-right">Tax Saved</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {result.yearlyData.map((row) => (
                      <tr key={row.year} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3 font-medium text-gray-700">Year {row.year}</td>
                        <td className="px-6 py-3 text-right text-gray-600">${fmt(row.contribution)}</td>
                        <td className="px-6 py-3 text-right font-semibold text-blue-600">${fmt(row.balance)}</td>
                        <td className="px-6 py-3 text-right text-green-600">${fmt(row.taxSaving)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Visual growth bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Where Your FHSA Value Comes From
              </h3>
              <div className="space-y-3">
                {[
                  { label: "Your Contributions", value: result.totalContributions, color: "bg-blue-500",   pct: (result.totalContributions / result.fhsaFinalValue) * 100 },
                  { label: "Investment Growth",   value: result.totalGrowth,        color: "bg-purple-400", pct: (result.totalGrowth / result.fhsaFinalValue) * 100 },
                  { label: "Tax Savings",         value: result.totalTaxSaving,     color: "bg-green-400",  pct: (result.totalTaxSaving / result.fhsaFinalValue) * 100 },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{row.label}</span>
                      <span className="font-medium text-gray-800">${fmt(row.value)} ({row.pct.toFixed(1)}%)</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${row.color} rounded-full transition-all duration-500`} style={{ width: `${Math.min(row.pct, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* SEO / FAQ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 prose prose-gray max-w-none">
          <h2 className="text-xl font-bold text-gray-900 mb-4">What is the First Home Savings Account (FHSA)?</h2>
          <p className="text-gray-600">
            The FHSA is a registered account introduced in 2023 that lets first-time home buyers save up to <strong>$8,000 per year</strong> (lifetime max $40,000) for a home purchase. Contributions are <strong>tax-deductible</strong> like an RRSP, and withdrawals for a qualifying home purchase are <strong>completely tax-free</strong> like a TFSA — making it the most powerful savings account available to first-time buyers.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">FHSA vs RRSP Home Buyers' Plan</h3>
          <p className="text-gray-600">
            The RRSP Home Buyers' Plan lets you borrow up to $35,000 from your RRSP tax-free — but you must repay it over 15 years. The FHSA requires no repayment and withdrawals are permanently tax-free. For most first-time buyers, the FHSA is the better tool, though combining both is also allowed.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">FHSA Carry-Forward Rules</h3>
          <p className="text-gray-600">
            If you don't contribute the full $8,000 in a given year, you can carry forward the unused room — but only up to a maximum of $8,000 in carry-forward at any one time. The account must be used within <strong>15 years</strong> of opening, or funds can be transferred to an RRSP tax-free.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Who Qualifies for an FHSA?</h3>
          <p className="text-gray-600">
            You must be a Canadian resident, at least 18 years old, and a first-time home buyer (meaning you haven't owned a qualifying home you lived in during the current year or the preceding four years).
          </p>

          <p className="text-sm text-gray-400 mt-6">
            This calculator provides estimates based on current FHSA rules and contribution limits. Tax savings are estimated using approximate combined marginal rates by province. Consult a financial advisor or tax professional for personalized advice.
          </p>
        </div>

      </div>
    </div>
  );
}
