"use client";

// app/calculators/resp/RESPClient.tsx

import { useState, useMemo } from "react";
import { NumericFormat } from "react-number-format";

// ─── 2025 Constants ───────────────────────────────────────────────────────────

// CESG — Canada Education Savings Grant
const CESG_RATE            = 0.20;    // 20% on first $2,500/year
const CESG_MAX_ANNUAL      = 500;     // max $500/year
const CESG_LIFETIME        = 7200;    // lifetime max per beneficiary
const CESG_CARRY_FORWARD   = 500;     // can carry forward 1 year of unused room ($500 extra)

// Additional CESG for lower income families
const ACESG_INCOME_LOW     = 55867;   // 2025 threshold for 20% extra
const ACESG_INCOME_MID     = 111733;  // 2025 threshold for 10% extra
const ACESG_EXTRA_LOW      = 100;     // extra $100/year (on first $500 contrib)
const ACESG_EXTRA_MID      = 50;      // extra $50/year (on first $500 contrib)

// CLB — Canada Learning Bond (low income, no contribution required)
const CLB_INITIAL          = 500;     // first year
const CLB_ANNUAL           = 100;     // each subsequent year to age 15
const CLB_INCOME_THRESHOLD = 55867;   // family income threshold (2025)
const CLB_LIFETIME         = 2000;    // lifetime max

// Alberta ACES (Alberta Centennial Education Savings)
// Quebec QESI handled separately
const QESI_RATE            = 0.10;    // Quebec 10% on first $2,500
const QESI_MAX_ANNUAL      = 250;
const QESI_LIFETIME        = 3600;

// Contribution limits
const RESP_LIFETIME_LIMIT  = 50000;   // lifetime contribution limit per beneficiary
const RESP_YEARS           = 18;      // typically contribute to age 18

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt    = (n: number) => Math.round(n).toLocaleString("en-CA");
const fmtDec = (n: number) => n.toLocaleString("en-CA", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// ─── Component ────────────────────────────────────────────────────────────────

type PlanType = "individual" | "family" | "group";

export default function RESPClient() {
  const [childAge,        setChildAge]        = useState<number | null>(null);
  const [currentBalance,  setCurrentBalance]  = useState<number | null>(null);
  const [annualContrib,   setAnnualContrib]   = useState<number | null>(null);
  const [monthlyContrib,  setMonthlyContrib]  = useState<number | null>(null);
  const [useMonthly,      setUseMonthly]      = useState(false);
  const [returnRate,      setReturnRate]      = useState<number>(6);
  const [familyIncome,    setFamilyIncome]    = useState<number | null>(null);
  const [province,        setProvince]        = useState("ON");
  const [planType,        setPlanType]        = useState<PlanType>("individual");
  const [numChildren,     setNumChildren]     = useState<1 | 2 | 3>(1);
  const [showInfo,        setShowInfo]        = useState(false);
  const [showSchedule,    setShowSchedule]    = useState(false);

  const isQuebec = province === "QC";

  const result = useMemo(() => {
    if (!childAge && childAge !== 0) return null;
    if (childAge > 17) return null;

    const age          = childAge;
    const yearsLeft    = Math.max(0, 18 - age);
    const balance      = currentBalance ?? 0;
    const annualAmt    = useMonthly
      ? (monthlyContrib ?? 0) * 12
      : (annualContrib ?? 0);
    const r            = returnRate / 100;
    const income       = familyIncome ?? 0;

    if (annualAmt <= 0 && balance <= 0) return null;

    // ── CESG calculation ──────────────────────────────────────────────────
    let totalCESG       = 0;
    let totalACESG      = 0;
    let totalCLB        = 0;
    let totalQESI       = 0;
    let totalContrib    = balance;
    let respBalance     = balance;
    let cumulativeCESG  = 0;

    const yearlyData: Array<{
      age:          number;
      year:         number;
      contribution: number;
      cesg:         number;
      acesg:        number;
      clb:          number;
      qesi:         number;
      growth:       number;
      endBalance:   number;
      totalContrib: number;
      totalGrants:  number;
    }> = [];

    for (let y = 0; y < yearsLeft; y++) {
      const currentAge_ = age + y;
      const contrib     = annualAmt;

      // CESG — 20% on first $2,500, max $500/yr, lifetime $7,200
      const cesgEligible = Math.min(contrib, 2500);
      const cesgRoom     = CESG_LIFETIME - cumulativeCESG;
      const cesg         = Math.min(cesgEligible * CESG_RATE, CESG_MAX_ANNUAL, cesgRoom);
      cumulativeCESG    += cesg;
      totalCESG         += cesg;

      // Additional CESG
      let acesg = 0;
      if (income > 0 && income <= ACESG_INCOME_LOW) {
        acesg = Math.min(contrib >= 500 ? ACESG_EXTRA_LOW : contrib * 0.20, ACESG_EXTRA_LOW);
      } else if (income > ACESG_INCOME_LOW && income <= ACESG_INCOME_MID) {
        acesg = Math.min(contrib >= 500 ? ACESG_EXTRA_MID : contrib * 0.10, ACESG_EXTRA_MID);
      }
      totalACESG += acesg;

      // CLB — only for low-income, no contribution required, age 0–15
      let clb = 0;
      if (income > 0 && income <= CLB_INCOME_THRESHOLD && totalCLB < CLB_LIFETIME) {
        clb = currentAge_ === 0 ? CLB_INITIAL : (currentAge_ <= 15 ? CLB_ANNUAL : 0);
        clb = Math.min(clb, CLB_LIFETIME - totalCLB);
        totalCLB += clb;
      }

      // QESI (Quebec)
      let qesi = 0;
      if (isQuebec && income > 0) {
        const qesiEligible = Math.min(contrib, 2500);
        const qesiRoom     = QESI_LIFETIME - totalQESI;
        qesi = Math.min(qesiEligible * QESI_RATE, QESI_MAX_ANNUAL, qesiRoom);
        totalQESI += qesi;
      }

      // Growth on (opening balance + contributions + grants)
      const startBal  = respBalance;
      const grants    = cesg + acesg + clb + qesi;
      const growth    = (startBal + contrib + grants) * r;
      respBalance     = startBal + contrib + grants + growth;
      totalContrib   += contrib;

      yearlyData.push({
        age:          currentAge_,
        year:         y + 1,
        contribution: contrib,
        cesg,
        acesg,
        clb,
        qesi,
        growth:       Math.round(growth),
        endBalance:   Math.round(respBalance),
        totalContrib: Math.round(totalContrib),
        totalGrants:  Math.round(totalCESG + totalACESG + totalCLB + totalQESI),
      });
    }

    const finalBalance    = Math.round(respBalance);
    const totalGrants     = totalCESG + totalACESG + totalCLB + totalQESI;
    const totalInvested   = totalContrib;
    const totalGrowth     = finalBalance - totalInvested - totalGrants;
    const grantBoost      = totalInvested > 0 ? (totalGrants / totalInvested) * 100 : 0;

    // Tuition estimates (4 years)
    const tuitionPerYear  = 8000;   // avg Canadian university tuition 2025
    const livingPerYear   = 12000;  // avg living costs
    const totalUniversity = (tuitionPerYear + livingPerYear) * 4;

    // How many years of university funded
    const yearsFunded     = finalBalance / (tuitionPerYear + livingPerYear);

    // Max contribution scenario (max CESG each year)
    let maxBalance    = balance;
    let maxCESG       = 0;
    for (let y = 0; y < yearsLeft; y++) {
      const cesgRoom  = CESG_LIFETIME - maxCESG;
      const cesg_     = Math.min(CESG_MAX_ANNUAL, cesgRoom);
      maxCESG        += cesg_;
      maxBalance      = (maxBalance + 2500 + cesg_) * (1 + r);
    }

    // Lifetime limit check
    const remainingLifetime = Math.max(0, RESP_LIFETIME_LIMIT - (totalInvested - balance));

    return {
      yearsLeft,
      annualAmt,
      finalBalance,
      totalContrib:   Math.round(totalContrib),
      totalGrants:    Math.round(totalGrants),
      totalCESG:      Math.round(totalCESG),
      totalACESG:     Math.round(totalACESG),
      totalCLB:       Math.round(totalCLB),
      totalQESI:      Math.round(totalQESI),
      totalGrowth:    Math.round(totalGrowth),
      grantBoost,
      yearsFunded,
      totalUniversity,
      maxBalance:     Math.round(maxBalance),
      remainingLifetime,
      yearlyData,
      income,
    };
  }, [childAge, currentBalance, annualContrib, monthlyContrib, useMonthly,
      returnRate, familyIncome, province, isQuebec]);

  const provinceList = [
    ["AB", "Alberta"], ["BC", "British Columbia"], ["MB", "Manitoba"],
    ["NB", "New Brunswick"], ["NL", "Newfoundland & Labrador"], ["NS", "Nova Scotia"],
    ["NT", "Northwest Territories"], ["NU", "Nunavut"], ["ON", "Ontario"],
    ["PE", "Prince Edward Island"], ["QC", "Quebec"], ["SK", "Saskatchewan"], ["YT", "Yukon"],
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-gray-900">RESP Calculator</h1>
          <p className="text-gray-500 mt-1">
            Project your child's RESP growth with CESG grants, Additional CESG, Canada Learning Bond, and Quebec QESI — 2025.
          </p>
        </div>

        {/* Grant rates banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "CESG Rate",         value: "20%",      sub: "on first $2,500/yr"    },
            { label: "CESG Max/Year",      value: "$500",     sub: "$7,200 lifetime"        },
            { label: "CLB (low income)",   value: "$2,000",   sub: "no contribution needed" },
            { label: "Lifetime Limit",     value: "$50,000",  sub: "per beneficiary"        },
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
            <p className="text-sm font-semibold text-blue-800">🎓 RESP Grants — What Every Canadian Parent Should Know</p>
            <p className="text-xs text-blue-600 mt-0.5">CESG, Additional CESG, CLB, QESI — free money for education</p>
          </div>
          <span className="text-blue-500 text-lg">{showInfo ? "▲" : "▼"}</span>
        </button>

        {showInfo && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            {[
              {
                icon: "🇨🇦", title: "Canada Education Savings Grant (CESG)",
                body: "The federal government adds 20% on your first $2,500 contributed per year — up to $500/year and $7,200 lifetime per child. You can carry forward one year of unused room, meaning if you missed last year you can contribute $5,000 and get $1,000 in CESG. CESG is available until the end of the calendar year the child turns 17.",
              },
              {
                icon: "➕", title: "Additional CESG (for lower-income families)",
                body: "Families with net income under $55,867 receive an extra 20% on the first $500 contributed (+$100/year). Families between $55,867–$111,733 receive an extra 10% (+$50/year). These amounts are in addition to the base CESG.",
              },
              {
                icon: "🆘", title: "Canada Learning Bond (CLB)",
                body: "For families with income under $55,867, the government deposits $500 in the first year and $100/year until age 15 — with NO contribution required. That's up to $2,000 of free money. Many eligible families don't open an RESP and miss this entirely.",
              },
              {
                icon: "🏦", title: "Quebec Education Savings Incentive (QESI)",
                body: "Quebec residents receive an additional 10% on the first $2,500 contributed per year (up to $250/year, $3,600 lifetime). This stacks on top of federal CESG.",
              },
              {
                icon: "📋", title: "RESP Rules to Know",
                body: "Lifetime contribution limit is $50,000 per beneficiary. Over-contributions are penalized at 1%/month. Family plans allow multiple children. If the child doesn't pursue post-secondary, grants must be returned; contributions can be withdrawn tax-free; accumulated income can be transferred to your RRSP (up to $50,000) or withdrawn as income.",
              },
              {
                icon: "🎓", title: "What Counts as Post-Secondary?",
                body: "RESP funds can be used at universities, colleges, trade schools, apprenticeship programs, and some foreign institutions. Education Assistance Payments (EAPs) are taxed in the student's hands — at a much lower rate than yours.",
              },
            ].map(item => (
              <div key={item.title} className="border border-gray-100 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-800 mb-1">{item.icon} {item.title}</p>
                <p className="text-xs text-gray-500">{item.body}</p>
              </div>
            ))}
          </div>
        )}

        {/* Inputs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-800">Your RESP Details</h2>

          {/* Province */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Province</label>
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 bg-white text-gray-900"
            >
              {provinceList.map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
            {isQuebec && (
              <p className="text-xs text-green-600 mt-1 font-medium">
                ✅ Quebec QESI (+10%) included in calculation
              </p>
            )}
          </div>

          {/* Child age */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Child's Current Age</label>
            <input
              type="number" min="0" max="17" step="1"
              placeholder="0"
              onChange={(e) => setChildAge(e.target.value !== "" ? Number(e.target.value) : null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
            />
            {childAge !== null && (
              <p className="text-xs text-gray-400 mt-1">
                {18 - childAge} years to contribute · CESG available until age 17
              </p>
            )}
          </div>

          {/* Current balance */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Current RESP Balance</label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$0"
              onValueChange={(v) => setCurrentBalance(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
            />
          </div>

          {/* Contribution toggle */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Contribution Amount</label>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden text-xs font-semibold">
                {(["annual", "monthly"] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setUseMonthly(t === "monthly")}
                    className={`px-3 py-1.5 transition-colors ${!useMonthly && t === "annual" || useMonthly && t === "monthly" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {!useMonthly ? (
              <NumericFormat
                thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
                placeholder="$2,500"
                onValueChange={(v) => setAnnualContrib(v.floatValue ?? null)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
              />
            ) : (
              <NumericFormat
                thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
                placeholder="$208"
                onValueChange={(v) => setMonthlyContrib(v.floatValue ?? null)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
              />
            )}
            <p className="text-xs text-gray-400 mt-1">
              Contribute $2,500/yr to maximize the $500 CESG — that's just $208/month
            </p>
          </div>

          {/* Return rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Expected Annual Return (%)</label>
            <input
              type="number" min="0" max="15" step="0.5"
              value={returnRate}
              onChange={(e) => setReturnRate(Number(e.target.value) || 6)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
            />
            <p className="text-xs text-gray-400 mt-1">Typical range: 4–5% (conservative) to 7–9% (growth ETF)</p>
          </div>

          {/* Family income */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Family Net Income
              <span className="text-gray-400 font-normal ml-1">(for Additional CESG & CLB eligibility)</span>
            </label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$90,000"
              onValueChange={(v) => setFamilyIncome(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
            />
            {familyIncome !== null && familyIncome <= CLB_INCOME_THRESHOLD && (
              <p className="text-xs text-green-600 mt-1 font-medium">
                ✅ Eligible for CLB ($2,000 lifetime) + Additional CESG (+$100/yr)
              </p>
            )}
            {familyIncome !== null && familyIncome > CLB_INCOME_THRESHOLD && familyIncome <= ACESG_INCOME_MID && (
              <p className="text-xs text-green-600 mt-1 font-medium">
                ✅ Eligible for Additional CESG (+$50/yr)
              </p>
            )}
          </div>
        </div>

        {/* Results */}
        {!result ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">🎓</div>
            <p className="text-xl font-semibold text-gray-700">Enter your child's age and contribution above</p>
            <p className="text-gray-500 mt-2">Your RESP projection will appear here instantly.</p>
          </div>
        ) : (
          <>
            {/* Lifetime limit warning */}
            {result.totalContrib > RESP_LIFETIME_LIMIT && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                <p className="text-sm font-semibold text-red-700 mb-1">🚨 Lifetime Contribution Limit Exceeded</p>
                <p className="text-sm text-red-600">
                  Total contributions would exceed the $50,000 lifetime limit. Reduce annual contributions or contributions will need to stop when the limit is reached.
                </p>
              </div>
            )}

            {/* Hero */}
            <div className="bg-blue-600 text-white rounded-xl p-6 text-center shadow-sm">
              <p className="text-sm font-medium text-blue-200 uppercase tracking-wide">
                RESP Balance at Age 18
              </p>
              <p className="text-6xl font-black mt-2">${fmt(result.finalBalance)}</p>
              <p className="text-blue-200 text-sm mt-1">
                {result.yearsLeft} years · ${fmt(result.annualAmt)}/yr · {returnRate}% return
              </p>
            </div>

            {/* Key stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Your Contributions", value: `$${fmt(result.totalContrib)}`,  color: "text-gray-800",   sub: `over ${result.yearsLeft} years`  },
                { label: "Total Grants",        value: `$${fmt(result.totalGrants)}`,  color: "text-green-600",  sub: `${result.grantBoost.toFixed(0)}% of contributions` },
                { label: "Tax-Free Growth",     value: `$${fmt(result.totalGrowth)}`,  color: "text-blue-600",   sub: `at ${returnRate}%/yr`             },
                { label: "University Funded",   value: `${result.yearsFunded.toFixed(1)} yrs`, color: "text-purple-600", sub: "at avg $20k/yr cost"    },
              ].map(s => (
                <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Grant breakdown */}
            {result.totalGrants > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                <p className="text-sm font-semibold text-green-800 mb-3">
                  🎉 Free Government Grants — ${fmt(result.totalGrants)} over {result.yearsLeft} years
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "CESG",          value: result.totalCESG,  show: result.totalCESG > 0  },
                    { label: "Add'l CESG",    value: result.totalACESG, show: result.totalACESG > 0 },
                    { label: "CLB",           value: result.totalCLB,   show: result.totalCLB > 0   },
                    { label: "QESI (QC)",     value: result.totalQESI,  show: result.totalQESI > 0  },
                  ].filter(g => g.show).map(g => (
                    <div key={g.label} className="bg-white rounded-lg p-3 text-center border border-green-200">
                      <p className="text-xs text-gray-500 mb-0.5">{g.label}</p>
                      <p className="text-lg font-bold text-green-700">${fmt(g.value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CLB notice for eligible */}
            {result.income > 0 && result.income <= CLB_INCOME_THRESHOLD && result.totalCLB > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                <p className="text-sm font-semibold text-blue-800 mb-1">
                  💡 CLB Tip — No Contribution Required
                </p>
                <p className="text-sm text-blue-700">
                  The Canada Learning Bond deposits up to <strong>$2,000</strong> in your child's RESP with <strong>zero contribution required</strong>.
                  Just open an RESP account and apply through your financial institution. Many eligible families miss this entirely.
                </p>
              </div>
            )}

            {/* Where balance comes from */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Where the Balance Comes From</h3>
              <div className="space-y-3">
                {[
                  { label: `Your Contributions (${((result.totalContrib / result.finalBalance) * 100).toFixed(0)}%)`, value: result.totalContrib, color: "bg-blue-500"   },
                  { label: `Government Grants (${((result.totalGrants / result.finalBalance) * 100).toFixed(0)}%)`,   value: result.totalGrants,  color: "bg-green-500"  },
                  { label: `Investment Growth (${((result.totalGrowth / result.finalBalance) * 100).toFixed(0)}%)`,   value: result.totalGrowth,  color: "bg-purple-500" },
                ].filter(r => r.value > 0).map(row => (
                  <div key={row.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{row.label}</span>
                      <span className="font-medium text-gray-800">${fmt(row.value)}</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${row.color} rounded-full transition-all duration-500`}
                        style={{ width: `${(row.value / result.finalBalance) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* University cost comparison */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                University Cost Coverage
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                {[
                  { label: "Avg Tuition (4yr)",     value: `$${fmt(8000 * 4)}`,  sub: "~$8,000/yr Canada avg"   },
                  { label: "Tuition + Living (4yr)", value: `$${fmt(result.totalUniversity)}`, sub: "~$20,000/yr combined" },
                  { label: "Your RESP Covers",       value: `${((result.finalBalance / result.totalUniversity) * 100).toFixed(0)}%`, sub: `of 4-year total cost`, color: result.finalBalance >= result.totalUniversity ? "text-green-600" : "text-amber-600" },
                ].map(s => (
                  <div key={s.label} className="border border-gray-100 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                    <p className={`text-2xl font-bold ${(s as any).color ?? "text-gray-800"}`}>{s.value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Max CESG scenario */}
            {result.annualAmt < 2500 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <p className="text-sm font-semibold text-amber-800 mb-1">
                  💡 Contribute $2,500/yr to Maximize CESG
                </p>
                <p className="text-sm text-amber-700">
                  Contributing $2,500/year maximizes the $500 CESG. At this rate your RESP would reach <strong>${fmt(result.maxBalance)}</strong> by age 18 — ${fmt(result.maxBalance - result.finalBalance)} more than your current plan.
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
                  <h2 className="text-lg font-semibold text-gray-800">Year-by-Year Schedule</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Contributions, grants, and balance each year</p>
                </div>
                <span className="text-gray-400 text-sm">{showSchedule ? "▲ Hide" : "▼ Show"}</span>
              </button>
              {showSchedule && (
                <div className="border-t border-gray-100 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                      <tr>
                        <th className="px-4 py-3 text-left">Age</th>
                        <th className="px-4 py-3 text-right">Contrib</th>
                        <th className="px-4 py-3 text-right">CESG</th>
                        {result.totalACESG > 0 && <th className="px-4 py-3 text-right">Add'l</th>}
                        {result.totalCLB > 0   && <th className="px-4 py-3 text-right">CLB</th>}
                        {result.totalQESI > 0  && <th className="px-4 py-3 text-right">QESI</th>}
                        <th className="px-4 py-3 text-right">Growth</th>
                        <th className="px-4 py-3 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {result.yearlyData.map(row => (
                        <tr key={row.age} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-medium text-gray-700">Age {row.age}</td>
                          <td className="px-4 py-2.5 text-right text-blue-600">${fmt(row.contribution)}</td>
                          <td className="px-4 py-2.5 text-right text-green-600">${fmt(row.cesg)}</td>
                          {result.totalACESG > 0 && <td className="px-4 py-2.5 text-right text-green-500">${fmt(row.acesg)}</td>}
                          {result.totalCLB > 0   && <td className="px-4 py-2.5 text-right text-green-500">${fmt(row.clb)}</td>}
                          {result.totalQESI > 0  && <td className="px-4 py-2.5 text-right text-green-500">${fmt(row.qesi)}</td>}
                          <td className="px-4 py-2.5 text-right text-purple-500">${fmt(row.growth)}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-gray-800">${fmt(row.endBalance)}</td>
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
          <h2 className="text-xl font-bold text-gray-900 mb-4">RESP — The Complete Canadian Guide for 2025</h2>
          <p className="text-gray-600">
            The Registered Education Savings Plan is Canada's most powerful tool for saving for a child's education. The federal government adds a 20% grant on top of your contributions — free money that compounds for years before your child heads to university or college.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Start Early — The CESG Carry-Forward Trap</h3>
          <p className="text-gray-600">
            You can only carry forward one year of unused CESG room. If you open an RESP late (say at age 10), you can't go back and claim grants for years 0–9. Starting at birth and contributing $2,500/year captures the full $7,200 lifetime CESG. Starting at age 10 caps you at roughly $4,000 in CESG.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">What Happens if the Child Doesn't Go to Post-Secondary?</h3>
          <p className="text-gray-600">
            Grants (CESG, CLB, QESI) must be returned to the government. Your original contributions can be withdrawn tax-free. The accumulated investment income (growth) can be transferred to your RRSP (up to $50,000 if you have room), or withdrawn as income — taxed plus a 20% penalty. Family RESP plans let you redirect funds to a sibling who does attend.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">EAPs are Taxed in the Student's Hands</h3>
          <p className="text-gray-600">
            Education Assistance Payments (EAPs) — the growth and grants portion of withdrawals — are taxable income to the student, not the subscriber. Since most full-time students have little other income, they pay little or no tax on these withdrawals, making the RESP extremely tax-efficient.
          </p>

          <p className="text-sm text-gray-400 mt-6">
            Grant amounts and income thresholds are for 2025 and subject to annual adjustment. QESI rates are current as of 2025. CLB eligibility is based on family net income and number of children — thresholds shown are for families with 1–3 children. Not financial advice — consult a financial advisor for a personalized plan.
          </p>
        </div>

      </div>
    </div>
  );
}
