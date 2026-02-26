"use client";

// app/calculators/rrif/RRIFClient.tsx

import { useState, useMemo } from "react";
import { NumericFormat } from "react-number-format";

// ─── 2025 RRIF Minimum Withdrawal Factors ─────────────────────────────────────
// Source: CRA — Income Tax Act Schedule III
// Note: 2025 budget reduced minimums by 25% for ages 71–94 (made permanent)

const RRIF_FACTORS: Record<number, number> = {
  55: 0.0270, 56: 0.0278, 57: 0.0286, 58: 0.0294, 59: 0.0303,
  60: 0.0313, 61: 0.0323, 62: 0.0333, 63: 0.0345, 64: 0.0357,
  65: 0.0400, 66: 0.0417, 67: 0.0435, 68: 0.0454, 69: 0.0476,
  70: 0.0500, 71: 0.0528, 72: 0.0540, 73: 0.0553, 74: 0.0567,
  75: 0.0582, 76: 0.0598, 77: 0.0617, 78: 0.0636, 79: 0.0658,
  80: 0.0682, 81: 0.0708, 82: 0.0738, 83: 0.0771, 84: 0.0808,
  85: 0.0851, 86: 0.0899, 87: 0.0955, 88: 0.1021, 89: 0.1099,
  90: 0.1192, 91: 0.1306, 92: 0.1449, 93: 0.1634, 94: 0.1879,
  95: 0.2000,
};

function getMinFactor(age: number): number {
  if (age < 55) return 1 / (90 - age); // formula-based under 55
  if (age >= 95) return 0.20;
  return RRIF_FACTORS[age] ?? 0.20;
}

// ─── Provincial tax data (same as other calculators) ─────────────────────────

const PROVINCES: Record<string, {
  name: string;
  brackets: Array<{ max: number; rate: number }>;
  bpa: number;
}> = {
  AB: { name: "Alberta",       bpa: 21003, brackets: [
    { max: 148269, rate: 0.10 }, { max: 177922, rate: 0.12 },
    { max: 237230, rate: 0.13 }, { max: 355845, rate: 0.14 }, { max: Infinity, rate: 0.15 },
  ]},
  BC: { name: "British Columbia", bpa: 11981, brackets: [
    { max: 45654,  rate: 0.0506 }, { max: 91310,  rate: 0.077  },
    { max: 104835, rate: 0.105  }, { max: 127299, rate: 0.1229 },
    { max: 172602, rate: 0.147  }, { max: 240716, rate: 0.168  }, { max: Infinity, rate: 0.205 },
  ]},
  MB: { name: "Manitoba",      bpa: 15780, brackets: [
    { max: 47000,  rate: 0.108 }, { max: 100000, rate: 0.1275 }, { max: Infinity, rate: 0.174 },
  ]},
  NB: { name: "New Brunswick", bpa: 12458, brackets: [
    { max: 49958,  rate: 0.094 }, { max: 99916,  rate: 0.14   },
    { max: 185064, rate: 0.16  }, { max: Infinity, rate: 0.195 },
  ]},
  NL: { name: "Newfoundland",  bpa: 10818, brackets: [
    { max: 43198,  rate: 0.087 }, { max: 86395,  rate: 0.145  },
    { max: 154244, rate: 0.158 }, { max: 215943, rate: 0.178  },
    { max: 275870, rate: 0.198 }, { max: Infinity, rate: 0.218 },
  ]},
  NS: { name: "Nova Scotia",   bpa: 8481,  brackets: [
    { max: 29590,  rate: 0.0879 }, { max: 59180, rate: 0.1495 },
    { max: 93000,  rate: 0.1667 }, { max: 150000, rate: 0.175 }, { max: Infinity, rate: 0.21 },
  ]},
  NT: { name: "Northwest Territories", bpa: 16593, brackets: [
    { max: 50597,  rate: 0.059 }, { max: 101198, rate: 0.086  },
    { max: 164525, rate: 0.122 }, { max: Infinity, rate: 0.1405 },
  ]},
  NU: { name: "Nunavut",       bpa: 17925, brackets: [
    { max: 53268,  rate: 0.04  }, { max: 106537, rate: 0.07   },
    { max: 173205, rate: 0.09  }, { max: Infinity, rate: 0.115 },
  ]},
  ON: { name: "Ontario",       bpa: 11865, brackets: [
    { max: 51446,  rate: 0.0505 }, { max: 102894, rate: 0.0915 },
    { max: 150000, rate: 0.1116 }, { max: 220000, rate: 0.1216 }, { max: Infinity, rate: 0.1316 },
  ]},
  PE: { name: "Prince Edward Island", bpa: 12000, brackets: [
    { max: 32656,  rate: 0.098 }, { max: 64313,  rate: 0.138  },
    { max: 105000, rate: 0.167 }, { max: 140000, rate: 0.18   }, { max: Infinity, rate: 0.185 },
  ]},
  QC: { name: "Quebec",        bpa: 17183, brackets: [
    { max: 51780,  rate: 0.14  }, { max: 103545, rate: 0.19   },
    { max: 126000, rate: 0.24  }, { max: Infinity, rate: 0.2575 },
  ]},
  SK: { name: "Saskatchewan",  bpa: 17661, brackets: [
    { max: 49720,  rate: 0.105 }, { max: 142058, rate: 0.125  }, { max: Infinity, rate: 0.145 },
  ]},
  YT: { name: "Yukon",         bpa: 16129, brackets: [
    { max: 57375,  rate: 0.064 }, { max: 114750, rate: 0.09   },
    { max: 158519, rate: 0.109 }, { max: 500000, rate: 0.1279 }, { max: Infinity, rate: 0.1502 },
  ]},
};

const FED_BRACKETS = [
  { max: 57375,    rate: 0.15   },
  { max: 114750,   rate: 0.205  },
  { max: 158519,   rate: 0.26   },
  { max: 220000,   rate: 0.29   },
  { max: Infinity, rate: 0.33   },
];
const FED_BPA        = 16129;
const OAS_CLAWBACK   = 90997;
const OAS_MONTHLY    = 727.67;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt    = (n: number) => Math.round(n).toLocaleString("en-CA");
const fmtDec = (n: number) => n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function calcTax(income: number, brackets: Array<{ max: number; rate: number }>, bpa: number): number {
  const taxable = Math.max(0, income - bpa);
  let tax = 0, prev = 0;
  for (const b of brackets) {
    if (taxable <= prev) break;
    tax += (Math.min(taxable, b.max) - prev) * b.rate;
    prev = b.max;
    if (b.max === Infinity) break;
  }
  return tax;
}

function getMarginalRate(income: number, provBrackets: Array<{ max: number; rate: number }>): number {
  let fedMarg = 0.15, provMarg = provBrackets[0].rate;
  let prev = 0;
  for (const b of FED_BRACKETS) {
    if (income > prev) fedMarg = b.rate;
    if (income <= b.max) break;
    prev = b.max;
  }
  prev = 0;
  for (const b of provBrackets) {
    if (income > prev) provMarg = b.rate;
    if (income <= b.max) break;
    prev = b.max;
  }
  return fedMarg + provMarg;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RRIFClient() {
  const [province,       setProvince]       = useState("ON");
  const [currentAge,     setCurrentAge]     = useState<number | null>(null);
  const [rrifBalance,    setRrifBalance]    = useState<number | null>(null);
  const [returnRate,     setReturnRate]     = useState<number>(5);
  const [extraWithdraw,  setExtraWithdraw]  = useState<number | null>(null);
  const [otherIncome,    setOtherIncome]    = useState<number | null>(null);
  const [oasIncome,      setOasIncome]      = useState<number | null>(null);
  const [cppIncome,      setCppIncome]      = useState<number | null>(null);
  const [useSpouseAge,   setUseSpouseAge]   = useState(false);
  const [spouseAge,      setSpouseAge]      = useState<number | null>(null);
  const [showSchedule,   setShowSchedule]   = useState(false);
  const [showInfo,       setShowInfo]       = useState(false);
  const [projectionAge,  setProjectionAge]  = useState<90 | 95 | 100>(90);

  const provData = PROVINCES[province];
  const provinceList = Object.entries(PROVINCES).sort((a, b) => a[1].name.localeCompare(b[1].name));

  const result = useMemo(() => {
    if (!currentAge || currentAge < 55 || !rrifBalance || rrifBalance <= 0) return null;

    const startAge     = currentAge;
    const balance0     = rrifBalance;
    const r            = returnRate / 100;
    const extra        = extraWithdraw ?? 0;
    const otherAnnual  = (otherIncome ?? 0) + (oasIncome ?? 0) * 12 + (cppIncome ?? 0) * 12;

    // Use spouse age for minimum if lower (reduces mandatory withdrawals)
    const ageForFactor = useSpouseAge && spouseAge && spouseAge < currentAge
      ? spouseAge : currentAge;

    const yearlyData: Array<{
      age:             number;
      startBalance:    number;
      growth:          number;
      minWithdrawal:   number;
      totalWithdrawal: number;
      tax:             number;
      afterTaxIncome:  number;
      endBalance:      number;
      oasClawback:     number;
      totalIncome:     number;
      marginalRate:    number;
    }> = [];

    let balance       = balance0;
    let totalWithdrawn = 0;
    let totalTaxPaid  = 0;
    let depleteAge    = null;

    const endAge = projectionAge;

    for (let age = startAge; age <= endAge; age++) {
      if (balance <= 0) {
        yearlyData.push({
          age, startBalance: 0, growth: 0, minWithdrawal: 0,
          totalWithdrawal: 0, tax: 0, afterTaxIncome: 0,
          endBalance: 0, oasClawback: 0, totalIncome: otherAnnual, marginalRate: 0,
        });
        continue;
      }

      const factorAge  = useSpouseAge && spouseAge ? Math.min(age, age + (spouseAge - currentAge)) : age;
      const factor     = getMinFactor(Math.max(55, factorAge));
      const minWithdraw = balance * factor;
      const totalWithdraw = Math.min(balance, minWithdraw + extra);

      // Growth on remaining balance
      const growth     = (balance - totalWithdraw) * r;
      const endBalance = Math.max(0, balance - totalWithdraw + growth);

      // Tax calculation
      const totalIncome = totalWithdraw + otherAnnual;
      const fedTax      = calcTax(totalIncome, FED_BRACKETS, FED_BPA);
      const provTax     = calcTax(totalIncome, provData.brackets, provData.bpa);

      // OAS clawback
      const oasAnnual   = (oasIncome ?? 0) * 12;
      const clawbackIncome = Math.max(0, totalIncome - OAS_CLAWBACK);
      const oasClawback = Math.min(clawbackIncome * 0.15, oasAnnual);

      const totalTax    = fedTax + provTax + oasClawback;
      const afterTax    = totalWithdraw - (totalTax - calcTax(otherAnnual, FED_BRACKETS, FED_BPA) - calcTax(otherAnnual, provData.brackets, provData.bpa));
      const marginal    = getMarginalRate(totalIncome, provData.brackets);

      totalWithdrawn   += totalWithdraw;
      totalTaxPaid     += totalTax;

      if (endBalance <= 0 && depleteAge === null) depleteAge = age;

      yearlyData.push({
        age,
        startBalance:    Math.round(balance),
        growth:          Math.round(growth),
        minWithdrawal:   Math.round(minWithdraw),
        totalWithdrawal: Math.round(totalWithdraw),
        tax:             Math.round(totalTax),
        afterTaxIncome:  Math.round(Math.max(0, afterTax)),
        endBalance:      Math.round(endBalance),
        oasClawback:     Math.round(oasClawback),
        totalIncome:     Math.round(totalIncome),
        marginalRate:    marginal,
      });

      balance = endBalance;
    }

    // First year stats
    const firstYear    = yearlyData[0];
    const minFactor    = getMinFactor(ageForFactor);
    const minAnnual    = balance0 * minFactor;
    const firstIncome  = minAnnual + otherAnnual;
    const firstFedTax  = calcTax(firstIncome, FED_BRACKETS, FED_BPA);
    const firstProvTax = calcTax(firstIncome, provData.brackets, provData.bpa);
    const firstTotalTax = firstFedTax + firstProvTax;
    const firstMarginal = getMarginalRate(firstIncome, provData.brackets);
    const firstAfterTax = firstIncome - firstTotalTax;

    // OAS clawback check
    const oasClawbackTriggered = firstIncome > OAS_CLAWBACK && (oasIncome ?? 0) > 0;

    // Balance at ages 80, 85, 90
    const balanceAt = (targetAge: number) => yearlyData.find(y => y.age === targetAge)?.endBalance ?? 0;

    return {
      minFactor,
      minAnnual,
      minMonthly:      minAnnual / 12,
      firstIncome,
      firstTotalTax,
      firstMarginal,
      firstAfterTax,
      oasClawbackTriggered,
      depleteAge,
      totalWithdrawn,
      totalTaxPaid,
      yearlyData,
      balanceAt80:     balanceAt(80),
      balanceAt85:     balanceAt(85),
      balanceAt90:     balanceAt(90),
      otherAnnual,
      extra,
    };
  }, [currentAge, rrifBalance, returnRate, extraWithdraw, otherIncome,
      oasIncome, cppIncome, province, provData, useSpouseAge, spouseAge, projectionAge]);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-gray-900">RRIF Withdrawal Calculator</h1>
          <p className="text-gray-500 mt-1">
            Calculate mandatory minimum withdrawals, tax impact, OAS clawback risk, and how long your RRIF will last — 2025 rates.
          </p>
        </div>

        {/* Key facts banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "RRSP Deadline",    value: "Dec 31, 71",  sub: "Must convert to RRIF"       },
            { label: "Min at Age 71",    value: "5.28%",       sub: "of Jan 1 balance"            },
            { label: "Min at Age 80",    value: "6.82%",       sub: "rising each year"            },
            { label: "Min at Age 90",    value: "11.92%",      sub: "accelerates significantly"   },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{s.label}</p>
              <p className="text-lg font-bold text-blue-600">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Info panel */}
        <button
          type="button"
          onClick={() => setShowInfo(!showInfo)}
          className="w-full bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-center justify-between text-left hover:bg-blue-100 transition-colors"
        >
          <div>
            <p className="text-sm font-semibold text-blue-800">💡 RRIF Rules, Strategies & Tax Tips</p>
            <p className="text-xs text-blue-600 mt-0.5">Conversion deadline, minimum factors, spouse age election, OAS clawback</p>
          </div>
          <span className="text-blue-500 text-lg">{showInfo ? "▲" : "▼"}</span>
        </button>

        {showInfo && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            {[
              {
                icon: "📅", title: "RRSP Must Be Converted by December 31 of Your 71st Year",
                body: "You have three options: convert to a RRIF, purchase an annuity, or take a lump-sum withdrawal (fully taxable). Most Canadians convert to a RRIF. You can convert earlier — some people convert a portion at 65 to access the $2,000 pension income tax credit.",
              },
              {
                icon: "📉", title: "Minimum Withdrawals Are Mandatory",
                body: "Each year you must withdraw at least the minimum percentage of your January 1st RRIF balance. The percentage starts at 5.28% at age 71 and rises every year, reaching 20% at age 95+. You cannot skip or defer minimums — but you can always withdraw more.",
              },
              {
                icon: "👫", title: "Spouse Age Election — Reduce Your Minimums",
                body: "If your spouse is younger, you can elect to base your minimum withdrawal on their age instead of yours. This reduces mandatory withdrawals (since younger age = lower factor), leaving more in the RRIF to grow tax-deferred. This election is made once and is irrevocable.",
              },
              {
                icon: "🏦", title: "Pension Income Tax Credit",
                body: "RRIF withdrawals qualify for the $2,000 federal pension income tax credit at age 65+, saving up to $300 in federal tax per year. This is a reason some Canadians convert a small portion of their RRSP to a RRIF at 65, even if they don't need the income.",
              },
              {
                icon: "⚠️", title: "OAS Clawback Risk",
                body: "RRIF withdrawals are fully taxable income and count toward the OAS clawback threshold ($90,997 in 2025). Every dollar above this threshold costs you 15 cents of OAS. Consider spreading withdrawals strategically, contributing to a TFSA to hold withdrawn funds, or taking early meltdown withdrawals in lower-income years before 71.",
              },
              {
                icon: "💡", title: "RRSP Meltdown Strategy",
                body: "If you have TFSA room, consider making extra RRSP/RRIF withdrawals before mandatory minimums kick in at 71. Paying tax now at a potentially lower rate (if income is lower pre-71) and moving funds to your TFSA can reduce future mandatory taxable withdrawals — and the estate tax hit.",
              },
              {
                icon: "🕊️", title: "Death & Spousal Rollover",
                body: "On death, the entire RRIF balance is included in income in the final tax return — potentially taxed at the highest marginal rate. However, a spouse or common-law partner can receive the balance as a tax-free rollover into their own RRSP or RRIF.",
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
          <h2 className="text-base font-semibold text-gray-800">Your RRIF Details</h2>

          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Current Age</label>
              <input
                type="number" min="55" max="100" step="1"
                placeholder="71"
                onChange={(e) => setCurrentAge(Number(e.target.value) || null)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Current RRIF Balance</label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$500,000"
              onValueChange={(v) => setRrifBalance(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Expected Annual Return (%)</label>
            <input
              type="number" min="0" max="12" step="0.5"
              value={returnRate}
              onChange={(e) => setReturnRate(Number(e.target.value) || 0)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
            />
            <p className="text-xs text-gray-400 mt-1">Conservative: 3–4% · Balanced: 5–6% · Growth: 7–8%</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Extra Annual Withdrawal
              <span className="text-gray-400 font-normal ml-1">(above minimum — optional)</span>
            </label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$0"
              onValueChange={(v) => setExtraWithdraw(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
            />
          </div>

          {/* Other income sources */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Other Annual Income Sources
              <span className="text-gray-400 font-normal ml-1">(for tax & OAS clawback calculation)</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: "OAS (monthly)",  placeholder: "$728", setter: setOasIncome,   hint: "Monthly OAS amount" },
                { label: "CPP (monthly)",  placeholder: "$800", setter: setCppIncome,   hint: "Monthly CPP amount" },
                { label: "Other (annual)", placeholder: "$0",   setter: setOtherIncome, hint: "Pension, employment, etc." },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <NumericFormat
                    thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
                    placeholder={f.placeholder}
                    onValueChange={(v) => f.setter(v.floatValue ?? null)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-0.5">{f.hint}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Spouse age election */}
          <div className="border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Use Spouse's Age for Minimum Withdrawal?</p>
                <p className="text-xs text-gray-400 mt-0.5">If your spouse is younger, this reduces mandatory minimums</p>
              </div>
              <button
                type="button"
                onClick={() => setUseSpouseAge(!useSpouseAge)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ml-4 ${useSpouseAge ? "bg-blue-600" : "bg-gray-300"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useSpouseAge ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
            {useSpouseAge && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Spouse's Current Age</label>
                <input
                  type="number" min="18" max="95" step="1"
                  placeholder="68"
                  onChange={(e) => setSpouseAge(Number(e.target.value) || null)}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right text-sm"
                />
              </div>
            )}
          </div>

          {/* Projection horizon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Project To Age</label>
            <div className="flex gap-2">
              {([90, 95, 100] as const).map(a => (
                <button key={a} type="button" onClick={() => setProjectionAge(a)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${projectionAge === a ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"}`}>
                  Age {a}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        {!result ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">📊</div>
            <p className="text-xl font-semibold text-gray-700">Enter your age and RRIF balance above</p>
            <p className="text-gray-500 mt-2">Your withdrawal schedule and tax breakdown will appear here.</p>
          </div>
        ) : (
          <>
            {/* OAS clawback warning */}
            {result.oasClawbackTriggered && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                <p className="text-sm font-semibold text-red-700 mb-1">⚠️ OAS Clawback Triggered</p>
                <p className="text-sm text-red-600">
                  Your total income of ${fmt(result.firstIncome)} exceeds the ${fmt(OAS_CLAWBACK)} OAS clawback threshold.
                  You'll lose 15 cents of OAS per dollar above this threshold. Consider a TFSA meltdown strategy before age 71 to reduce future RRIF balances.
                </p>
              </div>
            )}

            {/* Depletion warning */}
            {result.depleteAge && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <p className="text-sm font-semibold text-amber-800 mb-1">
                  📉 RRIF Depletes at Age {result.depleteAge}
                </p>
                <p className="text-sm text-amber-700">
                  With your current withdrawal rate and {returnRate}% return, your RRIF will be exhausted at age {result.depleteAge}.
                  Consider reducing extra withdrawals or increasing your investment return assumption.
                </p>
              </div>
            )}

            {/* Hero */}
            <div className="bg-blue-600 text-white rounded-xl p-6 text-center shadow-sm">
              <p className="text-sm font-medium text-blue-200 uppercase tracking-wide">
                Minimum Annual Withdrawal — Age {currentAge}
              </p>
              <p className="text-6xl font-black mt-2">${fmt(result.minAnnual)}</p>
              <p className="text-blue-200 text-sm mt-1">
                ${fmt(result.minMonthly)}/month · {(result.minFactor * 100).toFixed(2)}% of balance · after-tax ~${fmt(result.firstAfterTax - result.otherAnnual)}
              </p>
            </div>

            {/* Key stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Withdrawal Factor",  value: `${(result.minFactor * 100).toFixed(2)}%`, sub: `age ${currentAge} minimum`,        color: "text-blue-600"   },
                { label: "Total Income",        value: `$${fmt(result.firstIncome)}`,             sub: "RRIF + all other sources",          color: "text-gray-800"   },
                { label: "Tax This Year",        value: `$${fmt(result.firstTotalTax)}`,           sub: `${(result.firstMarginal * 100).toFixed(1)}% marginal rate`, color: "text-red-500"    },
                { label: "Balance at Age 85",   value: result.balanceAt85 > 0 ? `$${fmt(result.balanceAt85)}` : "Depleted", sub: `at ${returnRate}% return`, color: result.balanceAt85 > 0 ? "text-green-600" : "text-red-500" },
              ].map(s => (
                <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Balance milestones */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Projected Balance Milestones</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { label: "Age 80", value: result.balanceAt80 },
                  { label: "Age 85", value: result.balanceAt85 },
                  { label: "Age 90", value: result.balanceAt90 },
                ].map(m => (
                  <div key={m.label} className="border border-gray-100 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-1">{m.label}</p>
                    <p className={`text-xl font-bold ${m.value > 0 ? "text-gray-800" : "text-red-400"}`}>
                      {m.value > 0 ? `$${fmt(m.value)}` : "Depleted"}
                    </p>
                    {m.value > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {((m.value / (rrifBalance ?? 1)) * 100).toFixed(0)}% of original
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Balance decay bar chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                RRIF Balance Over Time
              </h3>
              <div className="space-y-2">
                {result.yearlyData
                  .filter((_, i) => i % 5 === 0 || result.yearlyData[i].age === currentAge)
                  .slice(0, 8)
                  .map(row => (
                    <div key={row.age}>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Age {row.age}</span>
                        <span>${fmt(row.endBalance)}</span>
                      </div>
                      <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            row.endBalance / (rrifBalance ?? 1) > 0.5 ? "bg-blue-500" :
                            row.endBalance / (rrifBalance ?? 1) > 0.25 ? "bg-amber-400" : "bg-red-400"
                          }`}
                          style={{ width: `${Math.max(0, (row.endBalance / (rrifBalance ?? 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Spouse age savings callout */}
            {useSpouseAge && spouseAge && spouseAge < (currentAge ?? 0) && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                <p className="text-sm font-semibold text-green-800 mb-1">
                  👫 Spouse Age Election Saves You Money
                </p>
                <p className="text-sm text-green-700">
                  Using your spouse's age ({spouseAge}) instead of yours ({currentAge}) reduces your mandatory withdrawal factor,
                  leaving more money in your RRIF to grow tax-deferred. This election is made once and cannot be reversed.
                </p>
              </div>
            )}

            {/* Year-by-year schedule */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowSchedule(!showSchedule)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Year-by-Year Withdrawal Schedule</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Minimum withdrawal, tax, and balance each year to age {projectionAge}</p>
                </div>
                <span className="text-gray-400 text-sm">{showSchedule ? "▲ Hide" : "▼ Show"}</span>
              </button>
              {showSchedule && (
                <div className="border-t border-gray-100 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                      <tr>
                        <th className="px-4 py-3 text-left">Age</th>
                        <th className="px-4 py-3 text-right">Factor</th>
                        <th className="px-4 py-3 text-right">Min Withdrawal</th>
                        <th className="px-4 py-3 text-right">Total Withdrawn</th>
                        <th className="px-4 py-3 text-right">Tax</th>
                        <th className="px-4 py-3 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {result.yearlyData.map(row => (
                        <tr key={row.age} className={`hover:bg-gray-50 ${row.age === currentAge ? "bg-blue-50" : ""}`}>
                          <td className="px-4 py-2.5 font-medium text-gray-700">
                            {row.age}
                            {row.age === currentAge && <span className="ml-1.5 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Now</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right text-gray-500">{(getMinFactor(row.age) * 100).toFixed(2)}%</td>
                          <td className="px-4 py-2.5 text-right text-blue-600">${fmt(row.minWithdrawal)}</td>
                          <td className="px-4 py-2.5 text-right text-gray-700">${fmt(row.totalWithdrawal)}</td>
                          <td className="px-4 py-2.5 text-right text-red-500">${fmt(row.tax)}</td>
                          <td className={`px-4 py-2.5 text-right font-bold ${row.endBalance > 0 ? "text-gray-800" : "text-red-400"}`}>
                            {row.endBalance > 0 ? `$${fmt(row.endBalance)}` : "Depleted"}
                          </td>
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
          <h2 className="text-xl font-bold text-gray-900 mb-4">RRIF Withdrawals — Complete Canadian Guide for 2025</h2>
          <p className="text-gray-600">
            A Registered Retirement Income Fund (RRIF) is the primary vehicle Canadians use to draw down their RRSP savings in retirement. Unlike an RRSP where you accumulate savings, a RRIF requires you to withdraw a minimum amount each year — and those withdrawals are fully taxable as income.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">When Must You Convert Your RRSP to a RRIF?</h3>
          <p className="text-gray-600">
            You must convert your RRSP to a RRIF, annuity, or lump-sum by December 31st of the year you turn 71. The first mandatory minimum withdrawal must be made in the year following conversion. Most Canadians convert to a RRIF because it offers the most flexibility.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">How Are Minimum Withdrawals Calculated?</h3>
          <p className="text-gray-600">
            Each year, your minimum withdrawal equals your January 1st RRIF balance multiplied by the prescribed factor for your age. The factor starts at 5.28% at age 71 and increases each year, reaching 20% at age 95+. Withdrawals above the minimum are always permitted.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">The OAS Clawback Risk</h3>
          <p className="text-gray-600">
            RRIF withdrawals are fully included in net income for tax purposes — including for the OAS clawback calculation. If your total income exceeds $90,997 (2025), you repay 15 cents of OAS per dollar above that threshold. A $500,000 RRIF at age 71 generates a mandatory withdrawal of about $26,400 — which, combined with CPP and OAS, can easily trigger a partial clawback.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">RRSP Meltdown Strategy</h3>
          <p className="text-gray-600">
            If you expect to have a large RRSP/RRIF balance and significant other retirement income, consider withdrawing from your RRSP between ages 65–71 at a lower tax rate and shifting those funds into your TFSA. This reduces future mandatory RRIF withdrawals and the associated OAS clawback and estate tax exposure.
          </p>

          <p className="text-sm text-gray-400 mt-6">
            Minimum withdrawal factors are current as of 2025. Tax calculations use 2025 federal and provincial rates. Actual tax owing depends on all sources of income, credits, and deductions. Not financial advice — consult a financial planner or accountant for personalized RRIF drawdown strategy.
          </p>
        </div>

      </div>
    </div>
  );
}
