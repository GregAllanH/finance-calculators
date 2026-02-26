"use client";

// app/calculators/max-affordability/MaxAffordabilityClient.tsx

import PrintButton from "@/components/PrintButton";
import { useState, useMemo } from "react";
import { NumericFormat } from "react-number-format";

// ─── Constants ────────────────────────────────────────────────────────────────

const GDS_LIMIT      = 0.39;  // Gross Debt Service ratio max
const TDS_LIMIT      = 0.44;  // Total Debt Service ratio max
const STRESS_BUFFER  = 2.0;   // Stress test adds 2%
const MIN_STRESS     = 5.25;  // Minimum stress test rate
const CMHC_TIERS     = [
  { minDown: 0.05, maxDown: 0.0999, rate: 0.0400 },
  { minDown: 0.10, maxDown: 0.1499, rate: 0.0310 },
  { minDown: 0.15, maxDown: 0.1999, rate: 0.0280 },
];
const AMORT_OPTIONS  = [25, 20, 15, 30];
const HEATING_DEFAULT = 150;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => Math.round(n).toLocaleString("en-CA");

function getCMHCRate(downPct: number): number {
  for (const t of CMHC_TIERS) {
    if (downPct >= t.minDown && downPct <= t.maxDown) return t.rate;
  }
  return 0;
}

function calcMonthlyPayment(principal: number, annualRate: number, amortYears: number): number {
  const r = annualRate / 100 / 12;
  const n = amortYears * 12;
  if (r === 0) return principal / n;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

// Binary search for max home price given income constraints
function findMaxPrice(
  grossMonthlyIncome: number,
  downPayment: number,
  rate: number,
  amortYears: number,
  monthlyDebts: number,
  monthlyHeating: number,
  monthlyCondoFee: number,
  propTaxRate: number
): {
  maxPriceGDS: number;
  maxPriceTDS: number;
  maxPrice: number;
  limitingFactor: "GDS" | "TDS";
} {
  const stressRate = Math.max(rate + STRESS_BUFFER, MIN_STRESS);

  function calcGDS(price: number): number {
    const down       = Math.min(downPayment, price);
    const principal_ = price - down;
    const downPct    = down / price;
    const cmhc       = getCMHCRate(downPct) * principal_;
    const totalPrinc = principal_ + cmhc;
    const mortgage   = calcMonthlyPayment(totalPrinc, stressRate, amortYears);
    const propTax    = (price * propTaxRate) / 12;
    return (mortgage + propTax + monthlyHeating + monthlyCondoFee * 0.5) / grossMonthlyIncome;
  }

  function calcTDS(price: number): number {
    const down       = Math.min(downPayment, price);
    const principal_ = price - down;
    const downPct    = down / price;
    const cmhc       = getCMHCRate(downPct) * principal_;
    const totalPrinc = principal_ + cmhc;
    const mortgage   = calcMonthlyPayment(totalPrinc, stressRate, amortYears);
    const propTax    = (price * propTaxRate) / 12;
    return (mortgage + propTax + monthlyHeating + monthlyCondoFee * 0.5 + monthlyDebts) / grossMonthlyIncome;
  }

  // Binary search for GDS limit
  let loGDS = downPayment, hiGDS = 5000000, maxPriceGDS = downPayment;
  for (let i = 0; i < 50; i++) {
    const mid = (loGDS + hiGDS) / 2;
    if (calcGDS(mid) < GDS_LIMIT) { maxPriceGDS = mid; loGDS = mid; }
    else hiGDS = mid;
  }

  // Binary search for TDS limit
  let loTDS = downPayment, hiTDS = 5000000, maxPriceTDS = downPayment;
  for (let i = 0; i < 50; i++) {
    const mid = (loTDS + hiTDS) / 2;
    if (calcTDS(mid) < TDS_LIMIT) { maxPriceTDS = mid; loTDS = mid; }
    else hiTDS = mid;
  }

  const maxPrice = Math.min(maxPriceGDS, maxPriceTDS);
  return {
    maxPriceGDS: Math.round(maxPriceGDS),
    maxPriceTDS: Math.round(maxPriceTDS),
    maxPrice:    Math.round(maxPrice),
    limitingFactor: maxPriceGDS < maxPriceTDS ? "GDS" : "TDS",
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MaxAffordabilityClient() {
  const [annualIncome,   setAnnualIncome]   = useState<number | null>(null);
  const [coIncome,       setCoIncome]       = useState<number | null>(null);
  const [downPayment,    setDownPayment]     = useState<number | null>(null);
  const [rate,           setRate]           = useState<number>(5.0);
  const [amortYears,     setAmortYears]     = useState<number>(25);
  const [carPayment,     setCarPayment]     = useState<number | null>(null);
  const [creditCard,     setCreditCard]     = useState<number | null>(null);
  const [studentLoan,    setStudentLoan]    = useState<number | null>(null);
  const [otherDebt,      setOtherDebt]      = useState<number | null>(null);
  const [heating,        setHeating]        = useState<number | null>(null);
  const [condoFee,       setCondoFee]       = useState<number | null>(null);
  const [propTaxRate,    setPropTaxRate]    = useState<number>(1.0);
  const [showAdvanced,   setShowAdvanced]   = useState(false);

  const result = useMemo(() => {
    const income = (annualIncome ?? 0) + (coIncome ?? 0);
    if (income <= 0 || !downPayment || downPayment < 0) return null;

    const grossMonthly   = income / 12;
    const monthlyDebts   = (carPayment ?? 0) + (creditCard ?? 0) + (studentLoan ?? 0) + (otherDebt ?? 0);
    const monthlyHeating = heating ?? HEATING_DEFAULT;
    const monthlyCondoFee = condoFee ?? 0;
    const taxRate        = propTaxRate / 100;

    const { maxPrice, maxPriceGDS, maxPriceTDS, limitingFactor } = findMaxPrice(
      grossMonthly, downPayment, rate, amortYears,
      monthlyDebts, monthlyHeating, monthlyCondoFee, taxRate
    );

    // Actual payment on max price
    const down_       = Math.min(downPayment, maxPrice);
    const principal_  = maxPrice - down_;
    const downPct     = down_ / maxPrice;
    const cmhcRate    = getCMHCRate(downPct);
    const cmhcPremium = cmhcRate * principal_;
    const totalPrinc  = principal_ + cmhcPremium;
    const stressRate  = Math.max(rate + STRESS_BUFFER, MIN_STRESS);
    const monthlyPayment    = calcMonthlyPayment(totalPrinc, rate, amortYears);
    const stressPayment     = calcMonthlyPayment(totalPrinc, stressRate, amortYears);
    const propTax           = (maxPrice * taxRate) / 12;
    const totalMonthly      = monthlyPayment + propTax + monthlyHeating + monthlyCondoFee;
    const totalMonthlyDebts = totalMonthly + monthlyDebts;

    // GDS / TDS ratios at max price (using stress rate for qualification)
    const stressMortgage = stressPayment;
    const gdsRatio = (stressMortgage + propTax + monthlyHeating + monthlyCondoFee * 0.5) / grossMonthly;
    const tdsRatio = (stressMortgage + propTax + monthlyHeating + monthlyCondoFee * 0.5 + monthlyDebts) / grossMonthly;

    // Scenarios: conservative (80%), moderate (90%), max (100%)
    const scenarios = [
      { label: "Conservative",  pct: 0.80, desc: "20% below max — comfortable buffer" },
      { label: "Moderate",      pct: 0.90, desc: "10% below max — some breathing room" },
      { label: "Maximum",       pct: 1.00, desc: "Lender maximum — no buffer"          },
    ].map(s => {
      const price    = Math.round(maxPrice * s.pct);
      const dn       = Math.min(downPayment, price);
      const prin     = price - dn;
      const dPct     = dn / price;
      const cmhc     = getCMHCRate(dPct) * prin;
      const payment  = calcMonthlyPayment(prin + cmhc, rate, amortYears);
      const pTax     = (price * taxRate) / 12;
      return { ...s, price, payment, propTax: pTax, totalMonthly: payment + pTax + monthlyHeating + monthlyCondoFee };
    });

    // Total interest over amortization
    const totalInterest = (monthlyPayment * amortYears * 12) - totalPrinc;

    return {
      grossMonthly,
      monthlyDebts,
      maxPrice,
      maxPriceGDS,
      maxPriceTDS,
      limitingFactor,
      downPayment: down_,
      downPct,
      cmhcRate,
      cmhcPremium,
      totalPrinc,
      monthlyPayment,
      stressRate,
      stressPayment,
      propTax,
      totalMonthly,
      totalMonthlyDebts,
      gdsRatio,
      tdsRatio,
      scenarios,
      totalInterest,
      requiresCMHC: cmhcRate > 0,
      monthlyHeating,
      monthlyCondoFee,
    };
  }, [annualIncome, coIncome, downPayment, rate, amortYears, carPayment,
      creditCard, studentLoan, otherDebt, heating, condoFee, propTaxRate]);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-gray-900">Maximum Home Affordability Calculator</h1>
          <p className="text-gray-500 mt-1">
            Find the maximum home price a Canadian lender will approve — based on GDS/TDS ratios and the mortgage stress test.
          </p>
        </div>

        {/* Inputs */}
        <div className="print:hidden bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-800">Income & Down Payment</h2>

          {/* Income */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Annual Gross Income
              </label>
              <NumericFormat
                thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
                placeholder="$90,000"
                onValueChange={(v) => setAnnualIncome(v.floatValue ?? null)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Co-Applicant Income
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <NumericFormat
                thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
                placeholder="$0"
                onValueChange={(v) => setCoIncome(v.floatValue ?? null)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
              />
            </div>
          </div>

          {/* Down payment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Down Payment</label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$100,000"
              onValueChange={(v) => setDownPayment(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
            />
          </div>

          {/* Rate + amortization */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Interest Rate (%)</label>
              <input
                type="number" min="0.5" max="20" step="0.05"
                value={rate}
                onChange={(e) => setRate(Number(e.target.value) || 5)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amortization</label>
              <div className="flex gap-2 flex-wrap">
                {AMORT_OPTIONS.map(y => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setAmortYears(y)}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                      amortYears === y ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                    }`}
                  >
                    {y}yr
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Monthly debts */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Monthly Debt Payments
              <span className="text-gray-400 font-normal ml-1">(reduces how much you can borrow)</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Car Payment",    setter: setCarPayment,   placeholder: "$500"  },
                { label: "Credit Cards",   setter: setCreditCard,   placeholder: "$150"  },
                { label: "Student Loan",   setter: setStudentLoan,  placeholder: "$300"  },
                { label: "Other Debts",    setter: setOtherDebt,    placeholder: "$0"    },
              ].map(d => (
                <div key={d.label}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{d.label}</label>
                  <NumericFormat
                    thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
                    placeholder={d.placeholder}
                    onValueChange={(v) => d.setter(v.floatValue ?? null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Advanced toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {showAdvanced ? "▲ Hide" : "▼ Show"} advanced options (heating, condo fees, property tax rate)
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Monthly Heating</label>
                <NumericFormat
                  thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
                  placeholder="$150"
                  onValueChange={(v) => setHeating(v.floatValue ?? null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right text-sm"
                />
                <p className="text-xs text-gray-400 mt-0.5">Default: $150</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Monthly Condo Fee</label>
                <NumericFormat
                  thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
                  placeholder="$0"
                  onValueChange={(v) => setCondoFee(v.floatValue ?? null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right text-sm"
                />
                <p className="text-xs text-gray-400 mt-0.5">50% counted by lenders</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Property Tax Rate (%)</label>
                <input
                  type="number" min="0.1" max="5" step="0.05"
                  defaultValue={1.0}
                  onChange={(e) => setPropTaxRate(Number(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right text-sm"
                />
                <p className="text-xs text-gray-400 mt-0.5">Typical: 0.5–2%</p>
              </div>
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
            <p className="text-xl font-semibold text-gray-700">Enter your income and down payment above</p>
            <p className="text-gray-500 mt-2">Your maximum home price will appear here instantly.</p>
          </div>
        ) : (
          <>
            {/* CMHC notice */}
            {result.requiresCMHC && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <p className="text-sm font-semibold text-amber-800 mb-1">
                  ⚠️ CMHC Insurance Required — {(result.cmhcRate * 100).toFixed(2)}% Premium
                </p>
                <p className="text-sm text-amber-700">
                  Down payment is under 20% of the maximum home price. CMHC premium of <strong>${fmt(result.cmhcPremium)}</strong> added to your mortgage.
                </p>
              </div>
            )}

            {/* Hero */}
            <div className="bg-blue-600 text-white rounded-xl p-6 text-center shadow-sm">
              <p className="text-sm font-medium text-blue-200 uppercase tracking-wide">Maximum Home Price</p>
              <p className="text-6xl font-black mt-2">${fmt(result.maxPrice)}</p>
              <p className="text-blue-200 text-sm mt-1">
                Limited by {result.limitingFactor === "GDS" ? "GDS ratio (housing costs)" : "TDS ratio (total debts)"} · stress tested at {result.stressRate.toFixed(2)}%
              </p>
            </div>

            {/* Key stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Monthly Payment",  value: `$${fmt(result.monthlyPayment)}`, sub: `at ${rate}%`              },
                { label: "Stress Test Pmt",  value: `$${fmt(result.stressPayment)}`,  sub: `at ${result.stressRate.toFixed(2)}%` },
                { label: "Total Monthly",    value: `$${fmt(result.totalMonthly)}`,   sub: "mortgage + tax + heat"    },
                { label: "Total Interest",   value: `$${fmt(result.totalInterest)}`,  sub: `over ${amortYears} years` },
              ].map(s => (
                <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{s.label}</p>
                  <p className="text-xl font-bold text-gray-800">{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* GDS / TDS ratio bars */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Debt Service Ratios at Maximum Price
              </h3>
              <div className="space-y-4">
                {[
                  {
                    label:  "GDS — Gross Debt Service",
                    value:  result.gdsRatio,
                    limit:  GDS_LIMIT,
                    desc:   "Housing costs ÷ gross income",
                    color:  result.gdsRatio >= GDS_LIMIT * 0.95 ? "bg-red-400" : "bg-blue-500",
                  },
                  {
                    label:  "TDS — Total Debt Service",
                    value:  result.tdsRatio,
                    limit:  TDS_LIMIT,
                    desc:   "All debts ÷ gross income",
                    color:  result.tdsRatio >= TDS_LIMIT * 0.95 ? "bg-red-400" : "bg-purple-500",
                  },
                ].map(row => (
                  <div key={row.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <div>
                        <span className="font-semibold text-gray-800">{row.label}</span>
                        <span className="text-gray-400 text-xs ml-2">{row.desc}</span>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold ${row.value >= row.limit * 0.95 ? "text-red-500" : "text-gray-800"}`}>
                          {(row.value * 100).toFixed(1)}%
                        </span>
                        <span className="text-gray-400 text-xs ml-1">/ {(row.limit * 100).toFixed(0)}% max</span>
                      </div>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden relative">
                      <div
                        className={`h-full ${row.color} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min((row.value / row.limit) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                GDS max: 39% · TDS max: 44% · Calculated using stress test rate of {result.stressRate.toFixed(2)}%
              </p>
            </div>

            {/* Monthly breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">Monthly Cost Breakdown</h2>
                <p className="text-sm text-gray-500 mt-0.5">At maximum purchase price of ${fmt(result.maxPrice)}</p>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  { label: "Mortgage Payment",    value: result.monthlyPayment,  color: "text-blue-600",  bold: false },
                  { label: "Property Tax",         value: result.propTax,         color: "text-gray-700",  bold: false },
                  { label: "Heating",              value: result.monthlyHeating,  color: "text-gray-700",  bold: false },
                  ...(result.monthlyCondoFee > 0 ? [{ label: "Condo Fee", value: result.monthlyCondoFee, color: "text-gray-700", bold: false }] : []),
                  { label: "Total Housing",        value: result.totalMonthly,    color: "text-blue-700",  bold: true  },
                  ...(result.monthlyDebts > 0 ? [{ label: "Other Debt Payments", value: result.monthlyDebts, color: "text-red-500", bold: false }] : []),
                  ...(result.monthlyDebts > 0 ? [{ label: "Total All Obligations", value: result.totalMonthlyDebts, color: "text-gray-900", bold: true }] : []),
                ].map(row => (
                  <div key={row.label} className={`flex justify-between items-center px-6 py-3.5 ${row.bold ? "bg-gray-50" : "hover:bg-gray-50"}`}>
                    <span className={`text-sm ${row.bold ? "font-semibold text-gray-800" : "text-gray-600"}`}>{row.label}</span>
                    <span className={`text-sm font-${row.bold ? "bold" : "medium"} ${row.color}`}>${fmt(row.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Three scenarios */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">Conservative vs Maximum</h2>
                <p className="text-sm text-gray-500 mt-0.5">Just because you qualify for the max doesn't mean you should spend it</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                {result.scenarios.map((s, i) => (
                  <div key={s.label} className={`p-6 ${i === 2 ? "bg-blue-50" : ""}`}>
                    <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${i === 2 ? "text-blue-500" : "text-gray-400"}`}>
                      {s.label}
                    </p>
                    <p className="text-xs text-gray-500 mb-3">{s.desc}</p>
                    <p className={`text-3xl font-black ${i === 2 ? "text-blue-700" : "text-gray-800"}`}>${fmt(s.price)}</p>
                    <p className="text-gray-500 text-sm mt-2">
                      ${fmt(s.payment)}<span className="text-gray-400">/mo mortgage</span>
                    </p>
                    <p className="text-gray-400 text-xs mt-1">${fmt(s.totalMonthly)}/mo total housing</p>
                  </div>
                ))}
              </div>
            </div>

            {/* What reduces affordability */}
            {result.monthlyDebts > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <p className="text-sm font-semibold text-amber-800 mb-1">
                  💡 Your debts reduced affordability by ~${fmt(result.monthlyDebts * 12 * 4.5)}
                </p>
                <p className="text-sm text-amber-700">
                  Every $100/month in debt payments reduces your maximum home price by approximately $20,000–$25,000. 
                  Paying off debts before applying for a mortgage significantly increases what you qualify for.
                </p>
              </div>
            )}
          </>
        )}

        {/* SEO / FAQ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 prose prose-gray max-w-none">
          <h2 className="text-xl font-bold text-gray-900 mb-4">How Canadian Lenders Calculate Maximum Affordability</h2>
          <p className="text-gray-600">
            Canadian mortgage lenders use two ratios to determine the maximum mortgage you qualify for: the <strong>Gross Debt Service (GDS) ratio</strong> and the <strong>Total Debt Service (TDS) ratio</strong>. Both are calculated using the mortgage stress test rate — not your actual rate.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">GDS Ratio (Max 39%)</h3>
          <p className="text-gray-600">
            GDS measures your housing costs as a percentage of gross income. It includes: mortgage payment (at stress test rate), property taxes, heating costs, and 50% of condo fees. Your GDS must not exceed 39% to qualify for a mortgage.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">TDS Ratio (Max 44%)</h3>
          <p className="text-gray-600">
            TDS adds all other monthly debt obligations (car loans, credit cards, student loans, lines of credit) to your housing costs and divides by gross income. TDS must not exceed 44%. Even if your GDS is fine, high consumer debt can disqualify you.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">The Mortgage Stress Test</h3>
          <p className="text-gray-600">
            Since January 2018, all Canadian mortgages — insured and uninsured — must be stress tested at the higher of your contract rate + 2% or 5.25%. This means if your rate is 5%, you must qualify as if your rate were 7%, significantly reducing maximum affordability.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">How to Maximize What You Qualify For</h3>
          <p className="text-gray-600">
            The most effective levers are: paying off consumer debt before applying (every $100/month freed up adds $20–25k in home price), adding a co-applicant's income, increasing your down payment to avoid CMHC and reduce the principal, and extending amortization to 30 years (reduces monthly payment used in ratio calculation).
          </p>

          <p className="text-sm text-gray-400 mt-6">
            This calculator uses standard Canadian GDS (39%) and TDS (44%) limits and the 2025 stress test rules. Individual lenders may apply different criteria. CMHC premiums are current as of 2025. Not financial or mortgage advice — consult a licensed mortgage broker for personalized qualification.
          </p>
        </div>

      </div>
    </div>
  );
}
