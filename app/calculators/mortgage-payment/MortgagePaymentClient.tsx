"use client";

// app/calculators/mortgage-payment/MortgagePaymentClient.tsx

import { useState, useMemo } from "react";
import { NumericFormat } from "react-number-format";

// ─── Constants ────────────────────────────────────────────────────────────────

const AMORT_OPTIONS  = [10, 15, 20, 25, 30];
const TERM_OPTIONS   = [1, 2, 3, 5, 7, 10];
const CMHC_RATES     = [
  { minDown: 0.05, maxDown: 0.0999, rate: 0.0400, label: "5–9.99%" },
  { minDown: 0.10, maxDown: 0.1499, rate: 0.0310, label: "10–14.99%" },
  { minDown: 0.15, maxDown: 0.1999, rate: 0.0280, label: "15–19.99%" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt    = (n: number) => Math.round(n).toLocaleString("en-CA");
const fmtDec = (n: number, d = 2) => n.toLocaleString("en-CA", { minimumFractionDigits: d, maximumFractionDigits: d });

function calcMonthlyPayment(principal: number, annualRate: number, amortYears: number): number {
  const r = annualRate / 100 / 12;
  const n = amortYears * 12;
  if (r === 0) return principal / n;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function getCMHCRate(downPct: number): number {
  for (const tier of CMHC_RATES) {
    if (downPct >= tier.minDown && downPct <= tier.maxDown) return tier.rate;
  }
  return 0;
}

// Build amortization schedule — returns first N years
function buildSchedule(principal: number, annualRate: number, amortYears: number, extraMonthly: number) {
  const r       = annualRate / 100 / 12;
  const monthly = calcMonthlyPayment(principal, annualRate, amortYears);
  const total   = monthly + extraMonthly;
  let   balance = principal;
  const years: Array<{
    year: number; openingBalance: number; totalPaid: number;
    principalPaid: number; interestPaid: number; closingBalance: number;
  }> = [];

  let yearOpen = balance;
  let yearPrincipal = 0;
  let yearInterest  = 0;
  let yearTotal     = 0;
  let month         = 0;
  let actualYears   = 0;

  while (balance > 0.01 && month < amortYears * 12) {
    const interest   = balance * r;
    const principal_ = Math.min(total - interest, balance);
    balance          = Math.max(0, balance - principal_);
    yearInterest    += interest;
    yearPrincipal   += principal_;
    yearTotal       += interest + principal_;
    month++;

    if (month % 12 === 0 || balance <= 0.01) {
      actualYears++;
      years.push({
        year:           actualYears,
        openingBalance: yearOpen,
        totalPaid:      yearTotal,
        principalPaid:  yearPrincipal,
        interestPaid:   yearInterest,
        closingBalance: balance,
      });
      yearOpen      = balance;
      yearPrincipal = 0;
      yearInterest  = 0;
      yearTotal     = 0;
      if (balance <= 0.01) break;
    }
  }
  return { schedule: years, actualMonths: month };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MortgagePaymentClient() {
  const [homePrice,    setHomePrice]    = useState<number | null>(null);
  const [downPayment,  setDownPayment]  = useState<number | null>(null);
  const [downType,     setDownType]     = useState<"amount" | "percent">("amount");
  const [rate,         setRate]         = useState<number>(5.0);
  const [amortYears,   setAmortYears]   = useState<number>(25);
  const [termYears,    setTermYears]    = useState<number>(5);
  const [extraPayment, setExtraPayment] = useState<number | null>(null);
  const [propTax,      setPropTax]      = useState<number | null>(null);
  const [condoFee,     setCondoFee]     = useState<number | null>(null);
  const [insurance,    setInsurance]    = useState<number | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);

  // Derived down payment
  const downAmt = useMemo(() => {
    if (!homePrice) return null;
    if (downType === "amount") return downPayment;
    return downPayment ? homePrice * (downPayment / 100) : null;
  }, [homePrice, downPayment, downType]);

  const downPct = homePrice && downAmt ? downAmt / homePrice : 0;

  const result = useMemo(() => {
    if (!homePrice || !downAmt || homePrice <= 0 || downAmt < 0) return null;
    if (downAmt >= homePrice) return null;

    const principal_  = homePrice - downAmt;
    const cmhcRate    = getCMHCRate(downPct);
    const cmhcPremium = cmhcRate > 0 ? principal_ * cmhcRate : 0;
    const totalPrincipal = principal_ + cmhcPremium;

    const monthly        = calcMonthlyPayment(totalPrincipal, rate, amortYears);
    const extra          = extraPayment ?? 0;
    const totalMonthly   = monthly + extra;

    // Stress test
    const stressRate     = rate + 2;
    const stressPayment  = calcMonthlyPayment(totalPrincipal, stressRate, amortYears);

    // Total cost
    const { schedule, actualMonths } = buildSchedule(totalPrincipal, rate, amortYears, extra);
    const totalInterest  = schedule.reduce((s, y) => s + y.interestPaid, 0);
    const totalPaid      = totalPrincipal + totalInterest;

    // Without extra payments for comparison
    const { schedule: scheduleBase, actualMonths: baseMonths } = buildSchedule(totalPrincipal, rate, amortYears, 0);
    const baseInterest   = scheduleBase.reduce((s, y) => s + y.interestPaid, 0);
    const interestSaved  = baseInterest - totalInterest;
    const monthsSaved    = baseMonths - actualMonths;

    // Term summary (5yr default)
    const termMonths     = termYears * 12;
    const termSchedule   = schedule.slice(0, termYears);
    const termInterest   = termSchedule.reduce((s, y) => s + y.interestPaid, 0);
    const termPrincipal  = termSchedule.reduce((s, y) => s + y.principalPaid, 0);
    const balanceAtTerm  = schedule[termYears - 1]?.closingBalance ?? totalPrincipal;

    // Monthly costs breakdown
    const monthlyTax     = (propTax ?? 0) / 12;
    const monthlyCondo   = condoFee ?? 0;
    const monthlyIns     = insurance ?? 0;
    const totalMonthlyCost = monthly + monthlyTax + monthlyCondo + monthlyIns;

    return {
      principal: principal_,
      cmhcPremium,
      cmhcRate,
      totalPrincipal,
      monthly,
      stressPayment,
      stressRate,
      extra,
      totalMonthly,
      totalInterest,
      totalPaid,
      actualMonths,
      baseInterest,
      interestSaved,
      monthsSaved,
      termInterest,
      termPrincipal,
      balanceAtTerm,
      monthlyTax,
      monthlyCondo,
      monthlyIns,
      totalMonthlyCost,
      schedule,
      downPct,
      requiresCMHC: cmhcRate > 0,
    };
  }, [homePrice, downAmt, downPct, rate, amortYears, termYears, extraPayment, propTax, condoFee, insurance]);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-gray-900">Mortgage Payment Calculator</h1>
          <p className="text-gray-500 mt-1">
            Calculate your monthly mortgage payment, total interest, CMHC insurance, stress test, and full amortization schedule.
          </p>
        </div>

        {/* Inputs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-800">Mortgage Details</h2>

          {/* Home price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Home Purchase Price</label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$650,000"
              onValueChange={(v) => setHomePrice(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right"
            />
          </div>

          {/* Down payment */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Down Payment</label>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden text-xs font-semibold">
                {(["amount", "percent"] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setDownType(t); setDownPayment(null); }}
                    className={`px-3 py-1.5 transition-colors ${downType === t ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                  >
                    {t === "amount" ? "$ Amount" : "% Percent"}
                  </button>
                ))}
              </div>
            </div>
            <NumericFormat
              thousandSeparator={downType === "amount"}
              prefix={downType === "amount" ? "$" : undefined}
              suffix={downType === "percent" ? "%" : undefined}
              decimalScale={downType === "percent" ? 1 : 0}
              allowNegative={false}
              placeholder={downType === "amount" ? "$130,000" : "20%"}
              onValueChange={(v) => setDownPayment(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right"
            />
            {homePrice && downAmt !== null && (
              <p className={`text-xs mt-1 ${downPct < 0.2 ? "text-amber-600" : "text-gray-400"}`}>
                {(downPct * 100).toFixed(1)}% down
                {downPct < 0.05 ? " — minimum 5% required" :
                 downPct < 0.20 ? " — CMHC insurance required" :
                 " — no CMHC insurance required"}
              </p>
            )}
          </div>

          {/* Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Annual Interest Rate (%)</label>
            <input
              type="number" min="0.5" max="20" step="0.05"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value) || 5)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right"
            />
          </div>

          {/* Amortization + term */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amortization Period</label>
              <div className="flex flex-wrap gap-2">
                {AMORT_OPTIONS.map(y => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setAmortYears(y)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition-colors ${
                      amortYears === y ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                    }`}
                  >
                    {y}yr
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mortgage Term</label>
              <div className="flex flex-wrap gap-2">
                {TERM_OPTIONS.map(y => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setTermYears(y)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition-colors ${
                      termYears === y ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                    }`}
                  >
                    {y}yr
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Extra payment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Extra Monthly Payment
              <span className="text-gray-400 font-normal ml-1">(applied directly to principal)</span>
            </label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$0"
              onValueChange={(v) => setExtraPayment(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right"
            />
          </div>

          {/* Optional costs */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Monthly Cost Add-ons <span className="text-gray-400 font-normal">(optional)</span></p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Annual Property Tax</label>
                <NumericFormat
                  thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
                  placeholder="$6,000"
                  onValueChange={(v) => setPropTax(v.floatValue ?? null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Monthly Condo Fee</label>
                <NumericFormat
                  thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
                  placeholder="$0"
                  onValueChange={(v) => setCondoFee(v.floatValue ?? null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Monthly Insurance</label>
                <NumericFormat
                  thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
                  placeholder="$150"
                  onValueChange={(v) => setInsurance(v.floatValue ?? null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        {result === null ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">🏠</div>
            <p className="text-xl font-semibold text-gray-700">Enter your mortgage details above</p>
            <p className="text-gray-500 mt-2">Your payment breakdown will appear here instantly.</p>
          </div>
        ) : (
          <>
            {/* CMHC notice */}
            {result.requiresCMHC && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <p className="text-sm font-semibold text-amber-800 mb-1">
                  ⚠️ CMHC Mortgage Insurance Required — {(result.cmhcRate * 100).toFixed(2)}% Premium
                </p>
                <p className="text-sm text-amber-700">
                  Down payment under 20% requires CMHC insurance. Premium of <strong>${fmt(result.cmhcPremium)}</strong> added to your mortgage principal.
                  Total insured mortgage: <strong>${fmt(result.totalPrincipal)}</strong>.
                </p>
              </div>
            )}

            {/* Hero */}
            <div className="bg-blue-600 text-white rounded-xl p-6 text-center shadow-sm">
              <p className="text-sm font-medium text-blue-200 uppercase tracking-wide">Monthly Mortgage Payment</p>
              <p className="text-6xl font-black mt-2">${fmt(result.monthly)}</p>
              <p className="text-blue-200 text-sm mt-1">
                {(result.rate)}% · {amortYears}yr amortization · {termYears}yr term
              </p>
            </div>

            {/* Key stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Mortgage Principal",  value: `$${fmt(result.totalPrincipal)}`, sub: result.requiresCMHC ? `incl. $${fmt(result.cmhcPremium)} CMHC` : `${(result.downPct * 100).toFixed(1)}% down` },
                { label: "Total Interest",      value: `$${fmt(result.totalInterest)}`,  sub: `over ${amortYears} years`           },
                { label: "Total Cost",          value: `$${fmt(result.totalPaid)}`,      sub: "principal + interest"               },
                { label: "Stress Test Rate",    value: `${result.stressRate.toFixed(2)}%`, sub: `$${fmt(result.stressPayment)}/mo` },
              ].map(s => (
                <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{s.label}</p>
                  <p className="text-xl font-bold text-gray-800">{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Total monthly cost breakdown */}
            {result.totalMonthlyCost > result.monthly && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Total Monthly Housing Cost</h3>
                <div className="space-y-3">
                  {[
                    { label: "Mortgage Payment", value: result.monthly,      color: "bg-blue-500"   },
                    { label: "Property Tax",      value: result.monthlyTax,   color: "bg-purple-500" },
                    { label: "Condo Fee",         value: result.monthlyCondo, color: "bg-orange-400" },
                    { label: "Insurance",         value: result.monthlyIns,   color: "bg-gray-400"   },
                  ].filter(r => r.value > 0).map(row => (
                    <div key={row.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{row.label}</span>
                        <span className="font-medium text-gray-800">${fmt(row.value)}</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${row.color} rounded-full transition-all duration-500`}
                          style={{ width: `${(row.value / result.totalMonthlyCost) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <span className="text-sm font-bold text-gray-800">Total Monthly</span>
                    <span className="text-lg font-black text-blue-700">${fmt(result.totalMonthlyCost)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Principal vs interest visual */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Where Your Money Goes</h3>
              <div className="space-y-3">
                {[
                  { label: `Principal (${(result.totalPrincipal / result.totalPaid * 100).toFixed(0)}%)`, value: result.totalPrincipal, color: "bg-blue-500"  },
                  { label: `Interest (${(result.totalInterest   / result.totalPaid * 100).toFixed(0)}%)`, value: result.totalInterest,  color: "bg-red-400"   },
                ].map(row => (
                  <div key={row.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{row.label}</span>
                      <span className="font-medium text-gray-800">${fmt(row.value)}</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${row.color} rounded-full`}
                        style={{ width: `${(row.value / result.totalPaid) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Term summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">At End of {termYears}-Year Term</h2>
                <p className="text-sm text-gray-500 mt-0.5">What you'll owe when it's time to renew</p>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  { label: "Interest paid this term",    value: result.termInterest,   color: "text-red-500",  bold: false },
                  { label: "Principal paid this term",   value: result.termPrincipal,  color: "text-green-600", bold: false },
                  { label: "Balance remaining at renewal", value: result.balanceAtTerm, color: "text-blue-700", bold: true  },
                ].map(row => (
                  <div key={row.label} className={`flex justify-between items-center px-6 py-3.5 ${row.bold ? "bg-gray-50" : "hover:bg-gray-50"}`}>
                    <span className={`text-sm ${row.bold ? "font-semibold text-gray-800" : "text-gray-600"}`}>{row.label}</span>
                    <span className={`text-sm font-${row.bold ? "bold" : "medium"} ${row.color}`}>${fmt(row.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Extra payment savings */}
            {(extraPayment ?? 0) > 0 && result.interestSaved > 0 && (
              <div className="bg-green-600 text-white rounded-xl p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-green-200 uppercase tracking-wide">Interest Saved with Extra Payments</p>
                <p className="text-5xl font-black mt-2">${fmt(result.interestSaved)}</p>
                <p className="text-green-200 text-sm mt-1">
                  Paid off {Math.floor(result.monthsSaved / 12)}yr {result.monthsSaved % 12}mo sooner by paying ${fmt(extraPayment!)} extra/month
                </p>
              </div>
            )}

            {/* Amortization schedule */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowSchedule(!showSchedule)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Full Amortization Schedule</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Year-by-year breakdown of principal, interest, and balance</p>
                </div>
                <span className="text-gray-400 text-sm">{showSchedule ? "▲ Hide" : "▼ Show"}</span>
              </button>
              {showSchedule && (
                <div className="overflow-x-auto border-t border-gray-100">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                      <tr>
                        <th className="px-4 py-3 text-left">Year</th>
                        <th className="px-4 py-3 text-right">Principal</th>
                        <th className="px-4 py-3 text-right">Interest</th>
                        <th className="px-4 py-3 text-right">Total Paid</th>
                        <th className="px-4 py-3 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {result.schedule.map((y) => (
                        <tr key={y.year} className={`hover:bg-gray-50 transition-colors ${y.year === termYears ? "bg-blue-50" : ""}`}>
                          <td className="px-4 py-2.5 font-medium text-gray-700">
                            {y.year}
                            {y.year === termYears && <span className="ml-1 text-xs text-blue-600 font-semibold">↑ renewal</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right text-green-600">${fmt(y.principalPaid)}</td>
                          <td className="px-4 py-2.5 text-right text-red-500">${fmt(y.interestPaid)}</td>
                          <td className="px-4 py-2.5 text-right text-gray-700">${fmt(y.totalPaid)}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-gray-800">${fmt(y.closingBalance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* SEO / FAQ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 prose prose-gray max-w-none">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Canadian Mortgage Payment — What You Need to Know</h2>
          <p className="text-gray-600">
            Your mortgage payment depends on four factors: the principal (purchase price minus down payment), the interest rate, the amortization period, and the payment frequency. In Canada, mortgages are compounded semi-annually by law — unlike the US where monthly compounding is standard.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">CMHC Mortgage Insurance</h3>
          <p className="text-gray-600">
            Any down payment under 20% requires CMHC (Canada Mortgage and Housing Corporation) insurance. The premium ranges from 2.80% to 4.00% of the mortgage amount and is added to your principal — meaning you pay interest on it too. On a $600,000 home with 5% down, CMHC adds $22,800 to your mortgage.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">The Mortgage Stress Test</h3>
          <p className="text-gray-600">
            Canadian lenders must qualify you at your contract rate plus 2% (minimum 5.25%). If your rate is 5%, you must qualify at 7%. This reduces the maximum mortgage you can get — and the payment shown in the stress test section is what you'd need to afford even if rates rise.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Term vs Amortization</h3>
          <p className="text-gray-600">
            The <strong>amortization period</strong> (typically 25 years) is the total time to pay off the mortgage. The <strong>term</strong> (typically 5 years) is how long your rate is locked in. At the end of each term you renew at current rates — which is why the balance at renewal matters so much.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">The Power of Extra Payments</h3>
          <p className="text-gray-600">
            Extra payments go directly to principal, reducing the balance on which interest is calculated. Even $200/month extra on a typical Canadian mortgage saves $30,000–$60,000 in interest and cuts 3–5 years off your amortization. Most Canadian mortgages allow 10–20% annual lump sum prepayments without penalty.
          </p>

          <p className="text-sm text-gray-400 mt-6">
            Calculations assume Canadian semi-annual compounding converted to monthly equivalent. CMHC premium rates are current as of 2025. Actual payment may differ slightly due to rounding and lender-specific terms. Not financial advice.
          </p>
        </div>

      </div>
    </div>
  );
}
