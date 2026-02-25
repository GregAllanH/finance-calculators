"use client";

// app/calculators/rrsp-contribution/RRSPContributionClient.tsx

import { useState, useMemo } from "react";
import { NumericFormat } from "react-number-format";

// ─── Constants ────────────────────────────────────────────────────────────────

// RRSP contribution limits by year
const RRSP_LIMITS: Record<number, number> = {
  2010: 22000, 2011: 22450, 2012: 22970, 2013: 23820,
  2014: 24270, 2015: 24930, 2016: 25370, 2017: 26010,
  2018: 26500, 2019: 26500, 2020: 27230, 2021: 27830,
  2022: 29210, 2023: 30780, 2024: 31560, 2025: 32490,
};

const RRSP_RATE         = 0.18;   // 18% of earned income
const RRSP_DEADLINE_2025 = "March 3, 2025"; // for 2024 tax year
const RRSP_DEADLINE_2026 = "March 2, 2026"; // for 2025 tax year

// Provincial marginal rates (approximate combined for $80-120k range)
const PROV_RATES: Record<string, { name: string; rate: number }> = {
  AB: { name: "Alberta",                  rate: 0.3800 },
  BC: { name: "British Columbia",         rate: 0.3880 },
  MB: { name: "Manitoba",                 rate: 0.4275 },
  NB: { name: "New Brunswick",            rate: 0.4100 },
  NL: { name: "Newfoundland & Labrador",  rate: 0.4300 },
  NS: { name: "Nova Scotia",              rate: 0.4379 },
  NT: { name: "Northwest Territories",    rate: 0.3405 },
  NU: { name: "Nunavut",                  rate: 0.3305 },
  ON: { name: "Ontario",                  rate: 0.4341 },
  PE: { name: "Prince Edward Island",     rate: 0.4137 },
  QC: { name: "Quebec",                   rate: 0.4530 },
  SK: { name: "Saskatchewan",             rate: 0.4050 },
  YT: { name: "Yukon",                    rate: 0.3800 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt    = (n: number) => Math.round(n).toLocaleString("en-CA");
const fmtPct = (n: number) => (n * 100).toFixed(1);

function calcRRSPRoom(earnedIncome: number, year: number): number {
  const limit = RRSP_LIMITS[year] ?? RRSP_LIMITS[2025];
  return Math.min(Math.round(earnedIncome * RRSP_RATE), limit);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RRSPContributionClient() {
  const [province,        setProvince]        = useState("ON");
  const [earnedIncome,    setEarnedIncome]     = useState<number | null>(null);
  const [priorRoom,       setPriorRoom]        = useState<number | null>(null);
  const [paContributions, setPAContributions]  = useState<number | null>(null); // pension adjustment
  const [contributions,   setContributions]    = useState<number | null>(null); // already contributed this year
  const [plannedContrib,  setPlannedContrib]   = useState<number | null>(null);
  const [taxYear,         setTaxYear]          = useState<2024 | 2025>(2025);
  const [showTips,        setShowTips]         = useState(false);

  const provData = PROV_RATES[province];

  const result = useMemo(() => {
    if (!earnedIncome || earnedIncome <= 0) return null;

    // New room generated this year from earned income
    const newRoom        = calcRRSPRoom(earnedIncome, taxYear);
    const limit          = RRSP_LIMITS[taxYear];

    // Total available room
    const prior          = priorRoom ?? 0;
    const pa             = paContributions ?? 0;  // pension adjustment reduces room
    const totalRoom      = prior + newRoom - pa;
    const alreadyContrib = contributions ?? 0;
    const remainingRoom  = Math.max(0, totalRoom - alreadyContrib);

    // Tax refund estimate
    const marginalRate   = provData.rate;
    const planned        = Math.min(plannedContrib ?? remainingRoom, remainingRoom);
    const taxRefund      = planned * marginalRate;
    const netCost        = planned - taxRefund;

    // Over-contribution check
    const overContrib    = Math.max(0, alreadyContrib - totalRoom);
    const overLimit      = 2000; // CRA allows $2,000 over-contribution buffer
    const penaltyAmount  = Math.max(0, overContrib - overLimit);
    const monthlyPenalty = penaltyAmount * 0.01; // 1% per month

    // Growth projection if max contributed
    const growthYears    = 20;
    const growthRate     = 0.06;
    const projectedValue = remainingRoom > 0
      ? remainingRoom * Math.pow(1 + growthRate, growthYears)
      : 0;

    return {
      newRoom,
      limit,
      prior,
      pa,
      totalRoom,
      alreadyContrib,
      remainingRoom,
      marginalRate,
      planned,
      taxRefund,
      netCost,
      overContrib,
      overLimit,
      penaltyAmount,
      monthlyPenalty,
      projectedValue,
      deadline: taxYear === 2025 ? RRSP_DEADLINE_2026 : RRSP_DEADLINE_2025,
    };
  }, [earnedIncome, priorRoom, paContributions, contributions, plannedContrib, taxYear, province, provData]);

  const provinceList = Object.entries(PROV_RATES).sort((a, b) => a[1].name.localeCompare(b[1].name));

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-gray-900">RRSP Contribution Room Calculator</h1>
          <p className="text-gray-500 mt-1">
            Calculate your available RRSP room, estimated tax refund, and how much your contribution will grow over time.
          </p>
        </div>

        {/* Deadline banner */}
        <div className="bg-blue-600 text-white rounded-xl px-5 py-4 flex items-center gap-4">
          <span className="text-3xl">📅</span>
          <div>
            <p className="font-bold text-sm">RRSP Contribution Deadline</p>
            <p className="text-blue-200 text-sm mt-0.5">
              To claim on your <strong>{taxYear}</strong> tax return: <strong>{result?.deadline ?? (taxYear === 2025 ? RRSP_DEADLINE_2026 : RRSP_DEADLINE_2025)}</strong>
            </p>
          </div>
        </div>

        {/* RRSP tips banner */}
        <button
          type="button"
          onClick={() => setShowTips(!showTips)}
          className="w-full bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-center justify-between text-left hover:bg-blue-100 transition-colors"
        >
          <div>
            <p className="text-sm font-semibold text-blue-800">💡 RRSP Strategy Tips for Canadians</p>
            <p className="text-xs text-blue-600 mt-0.5">Spousal RRSP, HBP, LLP, and when TFSA beats RRSP</p>
          </div>
          <span className="text-blue-500 text-lg">{showTips ? "▲" : "▼"}</span>
        </button>

        {showTips && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            {[
              {
                icon: "👫",
                title: "Spousal RRSP — Income Splitting in Retirement",
                body: "Contributing to a spousal RRSP lets the higher-income spouse claim the deduction now, while the lower-income spouse withdraws in retirement at a lower tax rate. The contributor must not make withdrawals from the spousal RRSP for 3 years (calendar years) or the income is attributed back.",
              },
              {
                icon: "🏠",
                title: "Home Buyers' Plan (HBP) — Up to $60,000",
                body: "First-time home buyers can withdraw up to $60,000 ($120,000 per couple) from their RRSP tax-free for a home purchase. Repayments must begin 2 years after withdrawal and be completed over 15 years. If not repaid, the amount is added to income each year.",
              },
              {
                icon: "🎓",
                title: "Lifelong Learning Plan (LLP) — Up to $10,000/year",
                body: "Withdraw up to $10,000/year (max $20,000 total) from your RRSP tax-free to finance full-time education for you or your spouse. Repayments must be made over 10 years.",
              },
              {
                icon: "⚖️",
                title: "RRSP vs TFSA — Which is Better?",
                body: "RRSP wins when your tax rate at contribution is higher than at withdrawal (most middle-to-high earners). TFSA wins when your tax rate is low now and expected to be higher later, or if you may need the money before retirement. For income under ~$50,000, TFSA is often the better choice.",
              },
              {
                icon: "📆",
                title: "Contribute Early in the Year",
                body: "Contributing in January rather than the following March gives your money an extra 14 months of tax-sheltered growth. Over 30 years, this timing difference can add tens of thousands to your retirement savings.",
              },
              {
                icon: "🔄",
                title: "RRSP to RRIF Conversion",
                body: "You must convert your RRSP to a RRIF (Registered Retirement Income Fund) by December 31 of the year you turn 71. RRIFs have minimum annual withdrawal amounts that increase with age — plan your drawdown strategy early.",
              },
            ].map(tip => (
              <div key={tip.title} className="border border-gray-100 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-800 mb-1">{tip.icon} {tip.title}</p>
                <p className="text-xs text-gray-500">{tip.body}</p>
              </div>
            ))}
          </div>
        )}

        {/* Inputs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-800">Your Details</h2>

          {/* Tax year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tax Year</label>
            <div className="flex gap-3">
              {([2024, 2025] as const).map(y => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setTaxYear(y)}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                    taxYear === y
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                  }`}
                >
                  {y}
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
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
            >
              {provinceList.map(([code, data]) => (
                <option key={code} value={code}>{data.name}</option>
              ))}
            </select>
          </div>

          {/* Earned income */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {taxYear} Earned Income
              <span className="text-gray-400 font-normal ml-1">(employment, self-employment, rental net income)</span>
            </label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$90,000"
              onValueChange={(v) => setEarnedIncome(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right"
            />
            {earnedIncome && (
              <p className="text-xs text-gray-400 mt-1">
                18% of earned income = ${fmt(earnedIncome * RRSP_RATE)} — capped at ${fmt(RRSP_LIMITS[taxYear])}
              </p>
            )}
          </div>

          {/* Prior room */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Unused RRSP Room from Prior Years
              <span className="text-gray-400 font-normal ml-1">(from CRA My Account or last NOA)</span>
            </label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$45,000"
              onValueChange={(v) => setPriorRoom(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right"
            />
            <p className="text-xs text-gray-400 mt-1">
              Find this on your Notice of Assessment or at <a href="https://www.canada.ca/en/revenue-agency/services/e-services/digital-services-individuals/account-individuals.html" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">CRA My Account</a>.
            </p>
          </div>

          {/* Pension adjustment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pension Adjustment (PA)
              <span className="text-gray-400 font-normal ml-1">(from T4 box 52 — if you have a workplace pension)</span>
            </label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$0"
              onValueChange={(v) => setPAContributions(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right"
            />
          </div>

          {/* Already contributed */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Already Contributed This Year
              <span className="text-gray-400 font-normal ml-1">(optional)</span>
            </label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$0"
              onValueChange={(v) => setContributions(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right"
            />
          </div>

          {/* Planned contribution */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Planned Additional Contribution
              <span className="text-gray-400 font-normal ml-1">(to estimate your tax refund)</span>
            </label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$10,000"
              onValueChange={(v) => setPlannedContrib(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right"
            />
          </div>
        </div>

        {/* Results */}
        {result === null ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">📊</div>
            <p className="text-xl font-semibold text-gray-700">Enter your earned income above</p>
            <p className="text-gray-500 mt-2">Your RRSP contribution room will appear here instantly.</p>
          </div>
        ) : (
          <>
            {/* Over-contribution warning */}
            {result.overContrib > 0 && (
              <div className={`rounded-xl p-5 border ${result.penaltyAmount > 0 ? "bg-red-50 border-red-300" : "bg-amber-50 border-amber-200"}`}>
                <p className={`text-sm font-semibold mb-1 ${result.penaltyAmount > 0 ? "text-red-700" : "text-amber-700"}`}>
                  {result.penaltyAmount > 0 ? "🚨 Over-Contribution Penalty!" : "⚠️ Over-Contribution (within $2,000 buffer)"}
                </p>
                <p className={`text-sm ${result.penaltyAmount > 0 ? "text-red-600" : "text-amber-600"}`}>
                  {result.penaltyAmount > 0
                    ? `You are $${fmt(result.penaltyAmount)} over the $2,000 buffer. CRA charges a 1% penalty per month — approximately $${fmt(result.monthlyPenalty)}/month. Withdraw the excess immediately.`
                    : `You've over-contributed by $${fmt(result.overContrib)} but are within CRA's $2,000 lifetime over-contribution buffer. No penalty applies yet — but don't contribute more.`}
                </p>
              </div>
            )}

            {/* Hero cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-600 text-white rounded-xl p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-blue-200 uppercase tracking-wide">Available Room</p>
                <p className="text-4xl font-black mt-2">${fmt(result.remainingRoom)}</p>
                <p className="text-blue-200 text-sm mt-1">you can contribute now</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">New Room ({taxYear})</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">${fmt(result.newRoom)}</p>
                <p className="text-gray-400 text-sm mt-1">18% of ${fmt(earnedIncome!)} — max ${fmt(result.limit)}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Est. Tax Refund</p>
                <p className="text-3xl font-bold text-green-600 mt-2">${fmt(result.taxRefund)}</p>
                <p className="text-gray-400 text-sm mt-1">on ${fmt(result.planned)} contribution</p>
              </div>
            </div>

            {/* Room breakdown table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">Contribution Room Breakdown</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  { label: `Prior year unused room`,        value: result.prior,          color: "text-gray-800", bold: false, negative: false },
                  { label: `New room from ${taxYear} income`, value: result.newRoom,      color: "text-blue-600", bold: false, negative: false },
                  { label: "Pension adjustment (PA)",        value: result.pa,             color: "text-red-500",  bold: false, negative: result.pa > 0 },
                  { label: "Total available room",           value: result.totalRoom,      color: "text-gray-900", bold: true,  negative: false },
                  { label: "Already contributed",            value: result.alreadyContrib, color: "text-gray-600", bold: false, negative: result.alreadyContrib > 0 },
                  { label: "Remaining room",                 value: result.remainingRoom,  color: "text-blue-700", bold: true,  negative: false },
                ].map(row => (
                  <div key={row.label} className={`flex justify-between items-center px-6 py-3.5 ${row.bold ? "bg-gray-50" : "hover:bg-gray-50"} transition-colors`}>
                    <span className={`text-sm ${row.bold ? "font-semibold text-gray-800" : "text-gray-600"}`}>{row.label}</span>
                    <span className={`text-sm font-${row.bold ? "bold" : "medium"} ${row.color}`}>
                      {row.negative ? "−" : ""}${fmt(row.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tax refund detail */}
            {result.planned > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800">Tax Refund Estimate</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Based on {fmtPct(result.marginalRate)}% combined marginal rate in {provData.name}</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {[
                    { label: "Planned contribution",  value: result.planned,   color: "text-gray-800", negative: false, bold: false },
                    { label: "Estimated tax refund",  value: result.taxRefund, color: "text-green-600", negative: false, bold: true  },
                    { label: "Net cost to you",       value: result.netCost,   color: "text-blue-700", negative: false, bold: true  },
                  ].map(row => (
                    <div key={row.label} className={`flex justify-between items-center px-6 py-3.5 ${row.bold ? "bg-gray-50" : "hover:bg-gray-50"}`}>
                      <span className={`text-sm ${row.bold ? "font-semibold text-gray-800" : "text-gray-600"}`}>{row.label}</span>
                      <span className={`text-sm font-${row.bold ? "bold" : "medium"} ${row.color}`}>${fmt(row.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Growth projection */}
            {result.remainingRoom > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">
                  If You Max Your Remaining Room Today
                </h3>
                <p className="text-xs text-gray-400 mb-4">Projected value at 6% annual return over 20 years</p>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs text-gray-400">Contribution</p>
                    <p className="text-2xl font-bold text-gray-700">${fmt(result.remainingRoom)}</p>
                  </div>
                  <div className="text-3xl text-gray-300 font-light">→</div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">In 20 years</p>
                    <p className="text-4xl font-black text-blue-600">${fmt(result.projectedValue)}</p>
                  </div>
                </div>
                <div className="mt-4 h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
                  <div className="h-full bg-gray-400 rounded-l-full" style={{ width: `${(result.remainingRoom / result.projectedValue) * 100}%` }} />
                  <div className="h-full bg-blue-500" style={{ width: `${((result.projectedValue - result.remainingRoom) / result.projectedValue) * 100}%` }} />
                </div>
                <div className="flex gap-4 mt-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><span className="w-3 h-2 bg-gray-400 rounded inline-block" />Your contribution ${fmt(result.remainingRoom)}</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-2 bg-blue-500 rounded inline-block" />Tax-free growth ${fmt(result.projectedValue - result.remainingRoom)}</span>
                </div>
              </div>
            )}

            {/* Historical limits reference */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">RRSP Annual Contribution Limits</h2>
                <p className="text-sm text-gray-500 mt-0.5">18% of prior year earned income, up to the annual limit</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                    <tr>
                      <th className="px-6 py-3 text-left">Year</th>
                      <th className="px-6 py-3 text-right">Annual Limit</th>
                      <th className="px-6 py-3 text-right">Income Needed to Max</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {Object.entries(RRSP_LIMITS)
                      .filter(([y]) => Number(y) >= 2020)
                      .map(([year, limit]) => (
                        <tr key={year} className={`hover:bg-gray-50 transition-colors ${Number(year) === taxYear ? "bg-blue-50" : ""}`}>
                          <td className="px-6 py-3 font-medium text-gray-700">
                            {year}
                            {Number(year) === taxYear && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">Current</span>}
                          </td>
                          <td className="px-6 py-3 text-right font-semibold text-gray-800">${fmt(limit)}</td>
                          <td className="px-6 py-3 text-right text-gray-500">${fmt(Math.ceil(limit / RRSP_RATE))}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* SEO / FAQ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 prose prose-gray max-w-none">
          <h2 className="text-xl font-bold text-gray-900 mb-4">RRSP Contribution Rules for Canadians</h2>
          <p className="text-gray-600">
            Your RRSP contribution room is calculated as <strong>18% of your prior year's earned income</strong>, up to the annual dollar limit ($32,490 for 2025). Any unused room carries forward indefinitely — so if you've been under-contributing for years, you may have significant room built up.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">What Counts as Earned Income?</h3>
          <p className="text-gray-600">
            Earned income for RRSP purposes includes employment income, self-employment income, net rental income, royalties, alimony received, and research grants. It does not include investment income (dividends, interest, capital gains), pension income, or OAS/CPP.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Pension Adjustment (PA)</h3>
          <p className="text-gray-600">
            If you belong to a workplace pension plan (defined benefit or defined contribution), your RRSP room is reduced by a Pension Adjustment (PA) reported in Box 52 of your T4. This ensures Canadians with pension plans don't get a double benefit from both the pension and RRSP.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Over-Contribution Penalties</h3>
          <p className="text-gray-600">
            CRA allows a lifetime over-contribution buffer of <strong>$2,000</strong> — no penalty applies within this buffer. Beyond $2,000, a <strong>1% per month penalty</strong> applies to the excess amount. If you've over-contributed beyond the buffer, withdraw the excess immediately and file CRA Form T1-OVP.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Finding Your Contribution Room</h3>
          <p className="text-gray-600">
            The most accurate source is CRA My Account, which shows your current RRSP deduction limit. Your Notice of Assessment (NOA) from last year's tax return also shows your available room. The room shown reflects contributions made as of the NOA date — subtract any additional contributions made since then.
          </p>

          <p className="text-sm text-gray-400 mt-6">
            This calculator provides estimates based on CRA's RRSP contribution rules for 2024–2025. Actual room may differ based on pension adjustments, past-service pension adjustments, or other factors. Consult CRA My Account or a tax professional for your exact contribution room.
          </p>
        </div>

      </div>
    </div>
  );
}
