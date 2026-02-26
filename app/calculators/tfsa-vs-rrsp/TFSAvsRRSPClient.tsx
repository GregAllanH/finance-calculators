"use client";

// app/calculators/tfsa-vs-rrsp/TFSAvsRRSPClient.tsx

import PrintButton from "@/components/PrintButton";
import { useState, useMemo } from "react";
import { NumericFormat } from "react-number-format";

// ─── Provincial marginal rates (combined fed+prov, ~$80-120k range) ───────────

const PROV_RATES: Record<string, { name: string; rate: number }> = {
  AB: { name: "Alberta",                  rate: 0.38   },
  BC: { name: "British Columbia",         rate: 0.388  },
  MB: { name: "Manitoba",                 rate: 0.4275 },
  NB: { name: "New Brunswick",            rate: 0.41   },
  NL: { name: "Newfoundland & Labrador",  rate: 0.43   },
  NS: { name: "Nova Scotia",              rate: 0.4379 },
  NT: { name: "Northwest Territories",    rate: 0.3405 },
  NU: { name: "Nunavut",                  rate: 0.3305 },
  ON: { name: "Ontario",                  rate: 0.4341 },
  PE: { name: "Prince Edward Island",     rate: 0.4137 },
  QC: { name: "Quebec",                   rate: 0.453  },
  SK: { name: "Saskatchewan",             rate: 0.405  },
  YT: { name: "Yukon",                    rate: 0.38   },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt    = (n: number) => Math.round(n).toLocaleString("en-CA");
const fmtPct = (n: number) => (n * 100).toFixed(1);

// ─── Component ────────────────────────────────────────────────────────────────

export default function TFSAvsRRSPClient() {
  const [province,        setProvince]        = useState("ON");
  const [annualIncome,    setAnnualIncome]     = useState<number | null>(null);
  const [contribution,    setContribution]     = useState<number | null>(null);
  const [returnRate,      setReturnRate]       = useState<number>(7);
  const [years,           setYears]            = useState<number>(25);
  const [retirementRate,  setRetirementRate]   = useState<number | null>(null); // if null, auto-estimate
  const [showAdvanced,    setShowAdvanced]     = useState(false);
  const [rrspWithdrawal,  setRrspWithdrawal]   = useState<"lump" | "annual">("annual");

  const provData = PROV_RATES[province];
  const provinceList = Object.entries(PROV_RATES).sort((a, b) => a[1].name.localeCompare(b[1].name));

  const result = useMemo(() => {
    const income = annualIncome ?? 0;
    const contrib = contribution ?? 0;
    if (income <= 0 || contrib <= 0 || returnRate <= 0 || years <= 0) return null;

    const currentRate    = provData.rate;
    const r              = returnRate / 100;

    // Estimate retirement tax rate (lower income in retirement)
    // Use provided rate or estimate at ~60% of current rate (rough heuristic)
    const retRate = retirementRate !== null
      ? retirementRate / 100
      : Math.max(0.15, currentRate * 0.60);

    // ── TFSA ──────────────────────────────────────────────────────────────────
    // After-tax contribution — TFSA is funded with after-tax dollars
    const afterTaxContrib  = contrib * (1 - currentRate);
    let   tfsaBalance      = 0;
    const tfsaYearly: number[] = [];
    for (let y = 0; y < years; y++) {
      tfsaBalance = (tfsaBalance + afterTaxContrib) * (1 + r);
      tfsaYearly.push(Math.round(tfsaBalance));
    }
    // TFSA withdrawal is 100% tax-free
    const tfsaAfterTax     = tfsaBalance;
    const tfsaTotalContrib = afterTaxContrib * years;
    const tfsaGrowth       = tfsaBalance - tfsaTotalContrib;

    // ── RRSP ──────────────────────────────────────────────────────────────────
    // Pre-tax contribution — full amount goes in (tax deferred)
    let   rrspBalance      = 0;
    const rrspYearly: number[] = [];
    for (let y = 0; y < years; y++) {
      rrspBalance = (rrspBalance + contrib) * (1 + r);
      rrspYearly.push(Math.round(rrspBalance));
    }
    // Tax refund received now, re-invested or spent
    const rrspRefund         = contrib * currentRate * years; // cumulative refund
    // RRSP withdrawal taxed at retirement rate
    const rrspAfterTax       = rrspBalance * (1 - retRate);
    const rrspTaxOnWithdrawal = rrspBalance * retRate;
    const rrspTotalContrib    = contrib * years;
    const rrspGrowth          = rrspBalance - rrspTotalContrib;

    // ── Refund reinvested scenario ─────────────────────────────────────────
    // If RRSP refund is reinvested in TFSA each year
    const annualRefund        = contrib * currentRate;
    let   refundInvested      = 0;
    for (let y = 0; y < years; y++) {
      refundInvested = (refundInvested + annualRefund) * (1 + r);
    }
    const rrspPlusRefund      = rrspAfterTax + refundInvested;

    // ── Winner determination ───────────────────────────────────────────────
    const winner = tfsaAfterTax >= rrspAfterTax ? "TFSA" : "RRSP";
    const refundWinner = tfsaAfterTax >= rrspPlusRefund ? "TFSA" : "RRSP (+ refund)";
    const difference   = Math.abs(tfsaAfterTax - rrspAfterTax);
    const diffWithRefund = Math.abs(tfsaAfterTax - rrspPlusRefund);

    // ── Break-even retirement rate ─────────────────────────────────────────
    // At what retirement tax rate does RRSP = TFSA?
    // tfsaAfterTax = rrspBalance * (1 - breakEvenRate)
    // breakEvenRate = 1 - tfsaAfterTax / rrspBalance
    const breakEvenRate = 1 - tfsaAfterTax / rrspBalance;

    // ── Year-by-year ───────────────────────────────────────────────────────
    const yearlyData = tfsaYearly.map((tBal, i) => {
      const rBal = rrspYearly[i];
      return {
        year:           i + 1,
        tfsaBalance:    tBal,
        rrspBalance:    rBal,
        rrspAfterTax:   Math.round(rBal * (1 - retRate)),
        tfsaAhead:      tBal > rBal * (1 - retRate),
      };
    });

    // Milestone years
    const milestones = [5, 10, 15, 20, 25, 30].filter(m => m <= years);

    return {
      currentRate,
      retRate,
      afterTaxContrib,
      // TFSA
      tfsaBalance:      Math.round(tfsaBalance),
      tfsaAfterTax:     Math.round(tfsaAfterTax),
      tfsaTotalContrib: Math.round(tfsaTotalContrib),
      tfsaGrowth:       Math.round(tfsaGrowth),
      // RRSP
      rrspBalance:      Math.round(rrspBalance),
      rrspAfterTax:     Math.round(rrspAfterTax),
      rrspTaxOnWithdrawal: Math.round(rrspTaxOnWithdrawal),
      rrspTotalContrib: Math.round(rrspTotalContrib),
      rrspGrowth:       Math.round(rrspGrowth),
      rrspRefund:       Math.round(rrspRefund),
      // Refund reinvested
      refundInvested:   Math.round(refundInvested),
      rrspPlusRefund:   Math.round(rrspPlusRefund),
      // Analysis
      winner,
      refundWinner,
      difference:       Math.round(difference),
      diffWithRefund:   Math.round(diffWithRefund),
      breakEvenRate,
      yearlyData,
      milestones,
    };
  }, [annualIncome, contribution, returnRate, years, province, retirementRate, provData]);

  const yearOptions = [10, 15, 20, 25, 30, 35];

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-gray-900">TFSA vs RRSP Calculator</h1>
          <p className="text-gray-500 mt-1">
            See which account wins after tax for your specific income, province, and retirement plans — side by side.
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
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 bg-white text-gray-900"
            >
              {provinceList.map(([code, data]) => (
                <option key={code} value={code}>{data.name}</option>
              ))}
            </select>
          </div>

          {/* Income */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Annual Income
              <span className="text-gray-400 font-normal ml-1">(determines your marginal tax rate)</span>
            </label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$90,000"
              onValueChange={(v) => setAnnualIncome(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
            />
            {annualIncome && (
              <p className="text-xs text-gray-400 mt-1">
                Estimated marginal rate in {provData.name}: <strong>{fmtPct(provData.rate)}%</strong>
              </p>
            )}
          </div>

          {/* Contribution */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Annual Contribution Amount
              <span className="text-gray-400 font-normal ml-1">(same dollar amount compared in both accounts)</span>
            </label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$7,000"
              onValueChange={(v) => setContribution(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
            />
          </div>

          {/* Return rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expected Annual Return (%)
            </label>
            <input
              type="number" min="0" max="20" step="0.5"
              value={returnRate}
              onChange={(e) => setReturnRate(Number(e.target.value) || 7)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
            />
          </div>

          {/* Years */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Years Until Retirement</label>
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

          {/* Advanced */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {showAdvanced ? "▲ Hide" : "▼ Show"} advanced — set your expected retirement tax rate
          </button>

          {showAdvanced && (
            <div className="pt-1 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Retirement Marginal Tax Rate (%)
                  <span className="text-gray-400 font-normal ml-1">(leave blank to auto-estimate)</span>
                </label>
                <input
                  type="number" min="0" max="60" step="1"
                  placeholder={result ? fmtPct(result.retRate) : "Auto"}
                  onChange={(e) => setRetirementRate(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Auto-estimate: ~60% of your current rate. Actual depends on retirement income sources (CPP, OAS, RRIF, etc.)
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {!result ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">⚖️</div>
            <p className="text-xl font-semibold text-gray-700">Enter your details above</p>
            <p className="text-gray-500 mt-2">Your personalized TFSA vs RRSP comparison will appear here instantly.</p>
          </div>
        ) : (
          <>
            {/* Winner hero */}
            <div className={`rounded-xl p-6 text-center shadow-sm text-white ${
              result.winner === "TFSA" ? "bg-green-600" : "bg-blue-600"
            }`}>
              <p className="text-sm font-medium uppercase tracking-wide opacity-80">
                Winner (after-tax value in retirement)
              </p>
              <p className="text-5xl font-black mt-2">
                {result.winner === "TFSA" ? "🏆 TFSA Wins" : "🏆 RRSP Wins"}
              </p>
              <p className="text-sm mt-2 opacity-80">
                by ${fmt(result.difference)} after-tax
                {result.winner === "TFSA"
                  ? " — because your retirement tax rate is similar to or higher than today"
                  : " — because your retirement tax rate is meaningfully lower than today"}
              </p>
            </div>

            {/* Tax rate context */}
                        {/* Print button */}
            <div className="print:hidden flex justify-end mb-4">
              <PrintButton label="Print Report" />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Current Tax Rate</p>
                  <p className="text-2xl font-bold text-gray-800">{fmtPct(result.currentRate)}%</p>
                  <p className="text-xs text-gray-400 mt-0.5">{provData.name}</p>
                </div>
                <div className="flex items-center justify-center text-3xl text-gray-200">→</div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Est. Retirement Rate</p>
                  <p className="text-2xl font-bold text-gray-800">{fmtPct(result.retRate)}%</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {retirementRate !== null ? "your estimate" : "auto-estimated"}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 text-center">
                  Break-even retirement rate: <strong>{fmtPct(result.breakEvenRate)}%</strong> —
                  {result.breakEvenRate > result.retRate
                    ? " TFSA wins unless your retirement rate exceeds this"
                    : " RRSP wins unless your retirement rate drops below this"}
                </p>
              </div>
            </div>

            {/* Side-by-side comparison */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">Side-by-Side Comparison</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  ${fmt(contribution!)} contributed annually for {years} years at {returnRate}%
                </p>
              </div>
              <div className="grid grid-cols-2 divide-x divide-gray-100">
                {/* TFSA */}
                <div className={`p-6 ${result.winner === "TFSA" ? "bg-green-50" : ""}`}>
                  <p className="text-xs font-bold uppercase tracking-widest text-green-600 mb-3">💰 TFSA</p>
                  <div className="space-y-3">
                    {[
                      { label: "Contribution (after-tax)", value: `$${fmt(result.afterTaxContrib)}/yr`, sub: `${fmtPct(result.currentRate)}% tax paid upfront` },
                      { label: "Total Contributed",        value: `$${fmt(result.tfsaTotalContrib)}`,   sub: `over ${years} years`                 },
                      { label: "Tax-Free Growth",          value: `$${fmt(result.tfsaGrowth)}`,         sub: "0% tax on growth"                     },
                      { label: "Gross Balance",            value: `$${fmt(result.tfsaBalance)}`,        sub: "before withdrawal"                    },
                      { label: "Tax on Withdrawal",        value: "$0",                                 sub: "completely tax-free"                  },
                    ].map(row => (
                      <div key={row.label}>
                        <p className="text-xs text-gray-500">{row.label}</p>
                        <p className="text-sm font-semibold text-gray-800">{row.value}</p>
                        <p className="text-xs text-gray-400">{row.sub}</p>
                      </div>
                    ))}
                    <div className="pt-3 border-t border-green-200">
                      <p className="text-xs text-gray-500">After-Tax Value</p>
                      <p className={`text-2xl font-black ${result.winner === "TFSA" ? "text-green-600" : "text-gray-800"}`}>
                        ${fmt(result.tfsaAfterTax)}
                      </p>
                      {result.winner === "TFSA" && (
                        <p className="text-xs text-green-600 font-semibold mt-0.5">🏆 Winner</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* RRSP */}
                <div className={`p-6 ${result.winner === "RRSP" ? "bg-blue-50" : ""}`}>
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">📊 RRSP</p>
                  <div className="space-y-3">
                    {[
                      { label: "Contribution (pre-tax)",   value: `$${fmt(contribution!)}/yr`,          sub: "tax refund received now"               },
                      { label: "Total Contributed",        value: `$${fmt(result.rrspTotalContrib)}`,   sub: `over ${years} years`                   },
                      { label: "Tax-Deferred Growth",      value: `$${fmt(result.rrspGrowth)}`,         sub: "grows tax-free inside account"          },
                      { label: "Gross Balance",            value: `$${fmt(result.rrspBalance)}`,        sub: "before withdrawal"                      },
                      { label: "Tax on Withdrawal",        value: `$${fmt(result.rrspTaxOnWithdrawal)}`,sub: `${fmtPct(result.retRate)}% retirement rate` },
                    ].map(row => (
                      <div key={row.label}>
                        <p className="text-xs text-gray-500">{row.label}</p>
                        <p className="text-sm font-semibold text-gray-800">{row.value}</p>
                        <p className="text-xs text-gray-400">{row.sub}</p>
                      </div>
                    ))}
                    <div className="pt-3 border-t border-blue-200">
                      <p className="text-xs text-gray-500">After-Tax Value</p>
                      <p className={`text-2xl font-black ${result.winner === "RRSP" ? "text-blue-600" : "text-gray-800"}`}>
                        ${fmt(result.rrspAfterTax)}
                      </p>
                      {result.winner === "RRSP" && (
                        <p className="text-xs text-blue-600 font-semibold mt-0.5">🏆 Winner</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RRSP refund reinvested scenario */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-1">
                What If You Reinvest the RRSP Refund?
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                The RRSP generates a tax refund of ${fmt(contribution! * provData.rate)}/yr. If you invest that refund in a TFSA each year:
              </p>
              <div className="grid grid-cols-3 gap-4 text-center mb-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">RRSP After-Tax</p>
                  <p className="text-xl font-bold text-blue-600">${fmt(result.rrspAfterTax)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">+ Refund Invested</p>
                  <p className="text-xl font-bold text-green-600">+${fmt(result.refundInvested)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">RRSP + Refund Total</p>
                  <p className="text-xl font-bold text-gray-800">${fmt(result.rrspPlusRefund)}</p>
                </div>
              </div>
              <div className={`rounded-lg p-4 ${result.refundWinner === "TFSA" ? "bg-green-50 border border-green-200" : "bg-blue-50 border border-blue-200"}`}>
                <p className={`text-sm font-semibold ${result.refundWinner === "TFSA" ? "text-green-700" : "text-blue-700"}`}>
                  {result.refundWinner === "TFSA"
                    ? `✅ TFSA still wins by $${fmt(result.diffWithRefund)} even when RRSP refund is reinvested`
                    : `🏆 RRSP + reinvested refund wins by $${fmt(result.diffWithRefund)} — the refund strategy makes a big difference`}
                </p>
              </div>
            </div>

            {/* Visual comparison bars */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                After-Tax Value Comparison
              </h3>
              <div className="space-y-4">
                {[
                  { label: "TFSA (after-tax)",            value: result.tfsaAfterTax,   color: "bg-green-500" },
                  { label: "RRSP (after-tax)",            value: result.rrspAfterTax,   color: "bg-blue-500"  },
                  { label: "RRSP + Refund Reinvested",    value: result.rrspPlusRefund, color: "bg-purple-500"},
                ].map(row => {
                  const max = Math.max(result.tfsaAfterTax, result.rrspPlusRefund, 1);
                  return (
                    <div key={row.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{row.label}</span>
                        <span className="font-bold text-gray-800">${fmt(row.value)}</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${row.color} rounded-full transition-all duration-500`}
                          style={{ width: `${(row.value / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Milestone table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">Growth Milestones</h2>
                <p className="text-sm text-gray-500 mt-0.5">TFSA vs RRSP after-tax balance at key years</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                    <tr>
                      <th className="px-5 py-3 text-left">Year</th>
                      <th className="px-5 py-3 text-right">TFSA Balance</th>
                      <th className="px-5 py-3 text-right">RRSP (after-tax)</th>
                      <th className="px-5 py-3 text-right">Leader</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {result.milestones.map(m => {
                      const row = result.yearlyData[m - 1];
                      if (!row) return null;
                      return (
                        <tr key={m} className="hover:bg-gray-50">
                          <td className="px-5 py-3 font-medium text-gray-700">Year {m}</td>
                          <td className="px-5 py-3 text-right font-semibold text-green-600">${fmt(row.tfsaBalance)}</td>
                          <td className="px-5 py-3 text-right font-semibold text-blue-600">${fmt(row.rrspAfterTax)}</td>
                          <td className="px-5 py-3 text-right">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              row.tfsaAhead ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                            }`}>
                              {row.tfsaAhead ? "TFSA" : "RRSP"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recommendation */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-3">
              <h3 className="text-lg font-semibold text-gray-800">Our Recommendation</h3>
              <div className="space-y-3">
                {[
                  {
                    condition: result.currentRate > 0.40,
                    icon: "📊",
                    color: "bg-blue-50 border-blue-200 text-blue-800",
                    msg: `At ${fmtPct(result.currentRate)}% marginal rate, RRSP contributions give you a powerful refund now. Prioritize RRSP — especially if retirement income will be lower.`,
                  },
                  {
                    condition: result.currentRate <= 0.30,
                    icon: "💰",
                    color: "bg-green-50 border-green-200 text-green-800",
                    msg: `At ${fmtPct(result.currentRate)}% marginal rate, the RRSP deduction is less powerful. TFSA is likely the better choice — and keeps flexibility for future needs.`,
                  },
                  {
                    condition: result.currentRate > 0.30 && result.currentRate <= 0.40,
                    icon: "⚖️",
                    color: "bg-amber-50 border-amber-200 text-amber-800",
                    msg: `At ${fmtPct(result.currentRate)}%, it's close. Consider splitting contributions between both. Max TFSA first for flexibility, then RRSP for the tax refund.`,
                  },
                ].filter(r => r.condition).map(r => (
                  <div key={r.msg} className={`rounded-lg border p-4 ${r.color}`}>
                    <p className="text-sm font-medium">{r.icon} {r.msg}</p>
                  </div>
                ))}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    <strong>Break-even rate:</strong> If your retirement marginal rate is below <strong>{fmtPct(result.breakEvenRate)}%</strong>, RRSP wins. Above it, TFSA wins. The best strategy for most Canadians: max both accounts.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* SEO / FAQ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 prose prose-gray max-w-none">
          <h2 className="text-xl font-bold text-gray-900 mb-4">TFSA vs RRSP — The Complete Canadian Guide</h2>
          <p className="text-gray-600">
            The TFSA vs RRSP debate is one of the most common personal finance questions in Canada. The short answer: both accounts shelter investments from tax, but they do it differently — and which is better depends entirely on your tax rate now versus in retirement.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">How They Differ</h3>
          <p className="text-gray-600">
            The <strong>RRSP</strong> gives you a tax deduction today (reducing this year's tax bill) but taxes withdrawals in retirement as income. The <strong>TFSA</strong> uses after-tax dollars but every dollar of growth and every withdrawal is completely tax-free forever. Both shelter investment returns from annual taxation while the money remains in the account.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">When RRSP Wins</h3>
          <p className="text-gray-600">
            RRSP is better when your tax rate at contribution is <em>higher</em> than your tax rate at withdrawal. If you earn $120,000 today (43% marginal rate) and retire on $50,000/year (30% marginal rate), the RRSP's deduction now and lower-rate withdrawal later is a powerful advantage.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">When TFSA Wins</h3>
          <p className="text-gray-600">
            TFSA is better when your tax rate at retirement is similar to or higher than today, or when you're in a low income year. TFSA is also better if you might need the money before retirement, if you receive income-tested benefits (OAS, GIS, child benefits) that RRSP withdrawals could claw back, or if flexibility matters to you.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">The Refund Reinvestment Strategy</h3>
          <p className="text-gray-600">
            A key RRSP advantage is the annual tax refund. If you contribute $7,000 to an RRSP at a 43% marginal rate, you get ~$3,000 back. Immediately investing that $3,000 refund into a TFSA each year can make the RRSP+TFSA combination significantly more powerful than TFSA alone.
          </p>

          <p className="text-sm text-gray-400 mt-6">
            This calculator uses approximate combined federal and provincial marginal tax rates for a middle-income range. Actual rates depend on your complete income picture. Retirement tax rate is estimated — use the advanced option to enter your own estimate. Not financial advice.
          </p>
        </div>

      </div>
    </div>
  );
}
