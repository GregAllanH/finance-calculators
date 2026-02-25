"use client";

// app/calculators/oas-gis/OASGISClient.tsx

import { useState, useMemo } from "react";
import { NumericFormat } from "react-number-format";

// ─── 2025 Rates (quarterly indexed) ──────────────────────────────────────────

const OAS_FULL_MONTHLY        = 727.67;  // age 65–74, Q1 2025
const OAS_FULL_MONTHLY_75     = 800.44;  // age 75+, 10% supplement
const OAS_CLAWBACK_THRESHOLD  = 90997;   // 2025 net income threshold
const OAS_CLAWBACK_RATE       = 0.15;    // 15 cents per dollar above threshold
const OAS_CLAWBACK_FULL_65    = 148179;  // approx income where OAS fully clawed back (65–74)
const OAS_CLAWBACK_FULL_75    = 154196;  // approx income where OAS fully clawed back (75+)

// GIS rates (single / couple) — monthly maximums Q1 2025
const GIS_SINGLE_MAX          = 1057.01;
const GIS_COUPLE_BOTH_OAS_MAX = 636.26;  // each, when both receive OAS
const GIS_COUPLE_ONE_OAS_MAX  = 1010.53; // for OAS recipient when partner doesn't get OAS
const GIS_ALLOWANCE_MAX       = 1381.90; // for 60–64 low-income spouse of GIS recipient
const GIS_ALLOWANCE_SURVIVOR  = 1647.34; // for 60–64 survivor

// GIS income thresholds (annual net income, excluding OAS)
// Below these thresholds you receive maximum GIS; phases out above
const GIS_SINGLE_THRESHOLD    = 22056;
const GIS_COUPLE_THRESHOLD    = 29136;  // combined income both OAS
const GIS_PHASE_RATE          = 0.50;   // 50 cents per dollar of income

// Deferral boost — 0.6% per month deferred past 65 (max 36% at 70)
const OAS_DEFERRAL_RATE       = 0.006;
const OAS_MAX_DEFERRAL_AGE    = 70;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt    = (n: number) => Math.round(n).toLocaleString("en-CA");
const fmtDec = (n: number) => n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (n: number) => (n * 100).toFixed(1);

// ─── Component ────────────────────────────────────────────────────────────────

type MaritalStatus = "single" | "couple_both_oas" | "couple_one_oas" | "widowed";

export default function OASGISClient() {
  const [currentAge,      setCurrentAge]      = useState<number | null>(null);
  const [startAge,        setStartAge]        = useState<65 | 66 | 67 | 68 | 69 | 70>(65);
  const [yearsInCanada,   setYearsInCanada]   = useState<number | null>(null);
  const [netIncome,       setNetIncome]       = useState<number | null>(null);
  const [maritalStatus,   setMaritalStatus]   = useState<MaritalStatus>("single");
  const [partnerIncome,   setPartnerIncome]   = useState<number | null>(null);
  const [partnerAge,      setPartnerAge]      = useState<number | null>(null);
  const [cppIncome,       setCppIncome]       = useState<number | null>(null);
  const [otherIncome,     setOtherIncome]     = useState<number | null>(null);
  const [showDeferral,    setShowDeferral]    = useState(false);
  const [showGISInfo,     setShowGISInfo]     = useState(false);

  const result = useMemo(() => {
    if (!currentAge || currentAge < 55 || currentAge > 85) return null;
    if (!netIncome && netIncome !== 0) return null;

    const income         = netIncome ?? 0;
    const cpp            = cppIncome ?? 0;
    const other          = otherIncome ?? 0;

    // ── OAS Eligibility & Proration ─────────────────────────────────────────
    const residencyYears = yearsInCanada ?? 40;
    const prorationPct   = Math.min(residencyYears / 40, 1);
    const isFullOAS      = residencyYears >= 40;
    const is75Plus       = startAge >= 65 && currentAge >= 75;
    const baseMonthly    = startAge >= 75 || (currentAge >= 75 && startAge === 65)
      ? OAS_FULL_MONTHLY_75
      : OAS_FULL_MONTHLY;

    // Deferral boost
    const deferralMonths = (startAge - 65) * 12;
    const deferralBoost  = Math.min(deferralMonths * OAS_DEFERRAL_RATE, 0.36);
    const boostedMonthly = baseMonthly * (1 + deferralBoost) * prorationPct;

    // ── Clawback (OAS Recovery Tax) ──────────────────────────────────────────
    const clawbackBase = startAge >= 75 ? OAS_CLAWBACK_FULL_75 : OAS_CLAWBACK_FULL_65;
    const clawbackIncome = Math.max(0, income - OAS_CLAWBACK_THRESHOLD);
    const clawbackAnnual = Math.min(clawbackIncome * OAS_CLAWBACK_RATE, boostedMonthly * 12);
    const clawbackMonthly = clawbackAnnual / 12;
    const netOASMonthly  = Math.max(0, boostedMonthly - clawbackMonthly);
    const isFullyClawedBack = income >= clawbackBase;

    // ── GIS Eligibility ──────────────────────────────────────────────────────
    // GIS income test: net income EXCLUDING OAS (but including CPP, private pensions, etc.)
    // Use income - any OAS received (for new applicants, OAS not yet received)
    const gisIncomeTest  = Math.max(0, income - (netOASMonthly * 12));
    const partnerInc     = partnerIncome ?? 0;
    const combinedIncome = gisIncomeTest + partnerInc;

    let gisMonthly = 0;
    let allowanceMonthly = 0;
    let gisEligible = false;

    if (maritalStatus === "single" || maritalStatus === "widowed") {
      if (gisIncomeTest < GIS_SINGLE_THRESHOLD) {
        gisEligible  = true;
        const reduction = (gisIncomeTest / 12) * GIS_PHASE_RATE;
        gisMonthly   = Math.max(0, GIS_SINGLE_MAX - reduction);
      }
    } else if (maritalStatus === "couple_both_oas") {
      if (combinedIncome < GIS_COUPLE_THRESHOLD) {
        gisEligible  = true;
        const reduction = (combinedIncome / 12) * GIS_PHASE_RATE * 0.5;
        gisMonthly   = Math.max(0, GIS_COUPLE_BOTH_OAS_MAX - reduction);
      }
      // Partner allowance check (60-64)
      if (partnerAge && partnerAge >= 60 && partnerAge < 65) {
        const allowReduction = (combinedIncome / 12) * GIS_PHASE_RATE * 0.5;
        allowanceMonthly = Math.max(0, GIS_ALLOWANCE_MAX - allowReduction);
      }
    } else if (maritalStatus === "couple_one_oas") {
      if (combinedIncome < GIS_COUPLE_THRESHOLD) {
        gisEligible  = true;
        const reduction = (combinedIncome / 12) * GIS_PHASE_RATE * 0.5;
        gisMonthly   = Math.max(0, GIS_COUPLE_ONE_OAS_MAX - reduction);
      }
    }

    // Survivor's allowance
    if (maritalStatus === "widowed" && currentAge >= 60 && currentAge < 65) {
      gisEligible = false; // OAS not yet, but survivor allowance
      const reduction = (gisIncomeTest / 12) * GIS_PHASE_RATE;
      allowanceMonthly = Math.max(0, GIS_ALLOWANCE_SURVIVOR - reduction);
    }

    // ── Totals ───────────────────────────────────────────────────────────────
    const totalMonthly = netOASMonthly + gisMonthly + allowanceMonthly + cpp;
    const totalAnnual  = totalMonthly * 12;

    // ── Deferral comparison ───────────────────────────────────────────────────
    const deferralScenarios = [65, 66, 67, 68, 69, 70].map(age => {
      const months   = (age - 65) * 12;
      const boost    = Math.min(months * OAS_DEFERRAL_RATE, 0.36);
      const monthly  = baseMonthly * (1 + boost) * prorationPct;
      const clawback = Math.min(
        Math.max(0, income - OAS_CLAWBACK_THRESHOLD) * OAS_CLAWBACK_RATE,
        monthly * 12
      ) / 12;
      const net      = Math.max(0, monthly - clawback);
      // Break-even vs starting at 65
      const baseNet  = Math.max(0, baseMonthly * prorationPct - clawback);
      const monthlyGain = net - baseNet;
      const missedMonths = (age - 65) * 12;
      const missedAmount = baseNet * missedMonths;
      const breakEvenMonths = monthlyGain > 0 ? Math.ceil(missedAmount / monthlyGain) : Infinity;
      const breakEvenAge = age + breakEvenMonths / 12;
      return {
        age,
        boost:       (boost * 100).toFixed(0),
        monthly:     Math.round(net),
        annual:      Math.round(net * 12),
        breakEvenAge: breakEvenAge < 100 ? breakEvenAge.toFixed(1) : "Never",
      };
    });

    // ── Lifetime value (to age 90) ────────────────────────────────────────────
    const lifetimeScenarios = deferralScenarios.map(s => ({
      ...s,
      lifetime: s.age <= 90
        ? Math.round(s.monthly * 12 * Math.max(0, 90 - s.age))
        : 0,
    }));

    return {
      prorationPct,
      isFullOAS,
      residencyYears,
      deferralBoost,
      boostedMonthly:  Math.round(boostedMonthly * 100) / 100,
      clawbackMonthly: Math.round(clawbackMonthly * 100) / 100,
      clawbackAnnual:  Math.round(clawbackAnnual),
      isFullyClawedBack,
      netOASMonthly:   Math.round(netOASMonthly * 100) / 100,
      gisMonthly:      Math.round(gisMonthly * 100) / 100,
      gisEligible,
      allowanceMonthly: Math.round(allowanceMonthly * 100) / 100,
      totalMonthly:    Math.round(totalMonthly * 100) / 100,
      totalAnnual:     Math.round(totalAnnual),
      deferralScenarios,
      lifetimeScenarios,
      income,
      gisIncomeTest,
    };
  }, [currentAge, startAge, yearsInCanada, netIncome, maritalStatus,
      partnerIncome, partnerAge, cppIncome, otherIncome]);

  const provinceList = [
    ["single", "Single"],
    ["couple_both_oas", "Married / Common-Law (both receive OAS)"],
    ["couple_one_oas", "Married / Common-Law (only I receive OAS)"],
    ["widowed", "Widowed"],
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-gray-900">OAS & GIS Estimator</h1>
          <p className="text-gray-500 mt-1">
            Estimate your Old Age Security, Guaranteed Income Supplement, and total government retirement income for 2025.
          </p>
        </div>

        {/* 2025 rates banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "OAS (age 65–74)",  value: `$${fmtDec(OAS_FULL_MONTHLY)}/mo`  },
            { label: "OAS (age 75+)",    value: `$${fmtDec(OAS_FULL_MONTHLY_75)}/mo` },
            { label: "GIS Max (single)", value: `$${fmtDec(GIS_SINGLE_MAX)}/mo`    },
            { label: "Clawback starts",  value: `$${fmt(OAS_CLAWBACK_THRESHOLD)}/yr` },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{s.label}</p>
              <p className="text-base font-bold text-blue-600">{s.value}</p>
            </div>
          ))}
        </div>

        {/* GIS info panel */}
        <button
          type="button"
          onClick={() => setShowGISInfo(!showGISInfo)}
          className="w-full bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-center justify-between text-left hover:bg-blue-100 transition-colors"
        >
          <div>
            <p className="text-sm font-semibold text-blue-800">💡 OAS, GIS & Allowance — What's the Difference?</p>
            <p className="text-xs text-blue-600 mt-0.5">Many Canadians leave GIS money on the table by not applying</p>
          </div>
          <span className="text-blue-500 text-lg">{showGISInfo ? "▲" : "▼"}</span>
        </button>

        {showGISInfo && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            {[
              {
                icon: "🇨🇦", title: "Old Age Security (OAS)",
                body: "A monthly payment available to most Canadians 65+. You don't need to have worked — eligibility is based on years of residence in Canada. Full OAS requires 40 years of residence after age 18. You receive 1/40th for each year (minimum 10 years to qualify). OAS is taxable income.",
              },
              {
                icon: "🆘", title: "Guaranteed Income Supplement (GIS)",
                body: "A non-taxable monthly benefit for low-income OAS recipients. It's based on your net income from the previous year, excluding OAS. Single seniors can receive up to $1,057/month on top of OAS. GIS is NOT automatic — you must apply, and many eligible Canadians don't. Income from TFSA withdrawals does NOT affect GIS eligibility.",
              },
              {
                icon: "💑", title: "Allowance (age 60–64)",
                body: "If your spouse or common-law partner receives OAS and GIS and you are 60–64, you may qualify for the Allowance — up to $1,381/month. This is also not automatic — you must apply to Service Canada.",
              },
              {
                icon: "🕊️", title: "Survivor's Allowance",
                body: "If you are a low-income widow/widower aged 60–64, you may qualify for the Allowance for the Survivor — up to $1,647/month. You do not need to be receiving OAS to qualify.",
              },
              {
                icon: "⏰", title: "OAS Deferral",
                body: "You can delay OAS from 65 up to age 70 and receive 0.6% more per month deferred (7.2%/year). At age 70, you receive 36% more than at 65. This makes sense if you're still working, have other income, or expect a long life.",
              },
              {
                icon: "💰", title: "OAS Clawback (Recovery Tax)",
                body: "If your net income exceeds $90,997 (2025), OAS is clawed back at 15 cents per dollar above that threshold. OAS is fully eliminated at around $148,179–$154,196 depending on age. TFSA withdrawals and tax-free income do NOT trigger the clawback.",
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
          <h2 className="text-base font-semibold text-gray-800">Your Details</h2>

          {/* Age */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Age</label>
              <input
                type="number" min="55" max="85" step="1"
                placeholder="65"
                onChange={(e) => setCurrentAge(Number(e.target.value) || null)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">OAS Start Age</label>
              <div className="flex gap-1.5 flex-wrap">
                {([65, 66, 67, 68, 69, 70] as const).map(age => (
                  <button
                    key={age}
                    type="button"
                    onClick={() => setStartAge(age)}
                    className={`px-2.5 py-1.5 rounded-lg text-sm font-semibold border-2 transition-colors ${
                      startAge === age ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                    }`}
                  >
                    {age}
                  </button>
                ))}
              </div>
              {startAge > 65 && (
                <p className="text-xs text-green-600 font-medium mt-1">
                  +{((startAge - 65) * 12 * OAS_DEFERRAL_RATE * 100).toFixed(0)}% boost for deferring {startAge - 65} year{startAge - 65 > 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>

          {/* Years in Canada */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Years Living in Canada After Age 18
              <span className="text-gray-400 font-normal ml-1">(40 years = full OAS)</span>
            </label>
            <input
              type="number" min="10" max="50" step="1"
              defaultValue={40}
              onChange={(e) => setYearsInCanada(Number(e.target.value) || null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right"
            />
            {yearsInCanada && yearsInCanada < 40 && (
              <p className="text-xs text-amber-600 mt-1">
                Partial OAS: {yearsInCanada}/40 = {(yearsInCanada / 40 * 100).toFixed(1)}% of full amount
              </p>
            )}
          </div>

          {/* Marital status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Marital Status</label>
            <select
              value={maritalStatus}
              onChange={(e) => setMaritalStatus(e.target.value as MaritalStatus)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
            >
              {provinceList.map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {/* Income */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Annual Net Income
              <span className="text-gray-400 font-normal ml-1">(Line 23600, excluding OAS)</span>
            </label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$25,000"
              onValueChange={(v) => setNetIncome(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right"
            />
            {netIncome && netIncome > OAS_CLAWBACK_THRESHOLD && (
              <p className="text-xs text-red-500 mt-1">
                ⚠️ Income exceeds ${fmt(OAS_CLAWBACK_THRESHOLD)} — OAS clawback applies
              </p>
            )}
          </div>

          {/* CPP */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monthly CPP Income
              <span className="text-gray-400 font-normal ml-1">(optional — adds to total)</span>
            </label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$800"
              onValueChange={(v) => setCppIncome(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right"
            />
            <p className="text-xs text-gray-400 mt-1">
              Don't know your CPP? Use our <a href="/calculators/cpp-benefits" className="text-blue-500 hover:underline">CPP Benefits Calculator</a>
            </p>
          </div>

          {/* Partner income (if couple) */}
          {(maritalStatus === "couple_both_oas" || maritalStatus === "couple_one_oas") && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Partner's Annual Income</label>
                <NumericFormat
                  thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
                  placeholder="$20,000"
                  onValueChange={(v) => setPartnerIncome(v.floatValue ?? null)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Partner's Age</label>
                <input
                  type="number" min="55" max="85" step="1"
                  placeholder="63"
                  onChange={(e) => setPartnerAge(Number(e.target.value) || null)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right"
                />
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {!result ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">🇨🇦</div>
            <p className="text-xl font-semibold text-gray-700">Enter your age and income above</p>
            <p className="text-gray-500 mt-2">Your OAS, GIS, and total retirement income will appear here.</p>
          </div>
        ) : (
          <>
            {/* Clawback warning */}
            {result.isFullyClawedBack && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                <p className="text-sm font-semibold text-red-700 mb-1">🚨 OAS Fully Recovered (Clawed Back)</p>
                <p className="text-sm text-red-600">
                  Your income of ${fmt(result.income)} exceeds the threshold where OAS is fully recovered by CRA. Consider TFSA withdrawals (tax-free, no clawback) instead of RRIF/RRSP withdrawals to stay below the clawback threshold.
                </p>
              </div>
            )}

            {/* Partial OAS notice */}
            {!result.isFullOAS && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <p className="text-sm font-semibold text-amber-800 mb-1">
                  ⚠️ Partial OAS — {result.residencyYears}/40 years ({(result.prorationPct * 100).toFixed(1)}%)
                </p>
                <p className="text-sm text-amber-700">
                  You receive {(result.prorationPct * 100).toFixed(1)}% of full OAS based on {result.residencyYears} years of Canadian residence. Each additional year adds another 2.5%.
                </p>
              </div>
            )}

            {/* Hero */}
            <div className="bg-blue-600 text-white rounded-xl p-6 text-center shadow-sm">
              <p className="text-sm font-medium text-blue-200 uppercase tracking-wide">
                Total Monthly Government Retirement Income
              </p>
              <p className="text-6xl font-black mt-2">${fmt(result.totalMonthly)}</p>
              <p className="text-blue-200 text-sm mt-1">
                ${fmt(result.totalAnnual)}/year · starting at age {startAge}
              </p>
            </div>

            {/* Breakdown cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  label:   "Net OAS",
                  value:   result.netOASMonthly,
                  sub:     result.clawbackMonthly > 0
                    ? `After $${fmt(result.clawbackMonthly)}/mo clawback`
                    : result.deferralBoost > 0
                    ? `+${(result.deferralBoost * 100).toFixed(0)}% deferral boost`
                    : "No clawback",
                  color:   "text-blue-600",
                  show:    true,
                },
                {
                  label:   "GIS",
                  value:   result.gisMonthly,
                  sub:     result.gisEligible ? "Non-taxable supplement" : "Not eligible (income too high)",
                  color:   "text-green-600",
                  show:    true,
                },
                {
                  label:   "CPP",
                  value:   cppIncome ?? 0,
                  sub:     "From CPP calculator",
                  color:   "text-purple-600",
                  show:    (cppIncome ?? 0) > 0,
                },
                {
                  label:   "Allowance",
                  value:   result.allowanceMonthly,
                  sub:     "For 60–64 partner/survivor",
                  color:   "text-orange-500",
                  show:    result.allowanceMonthly > 0,
                },
              ].filter(c => c.show).map(card => (
                <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{card.label}</p>
                  <p className={`text-3xl font-bold ${card.color}`}>${fmt(card.value)}<span className="text-sm text-gray-400 font-normal">/mo</span></p>
                  <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
                </div>
              ))}
            </div>

            {/* Income breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Monthly Income Breakdown</h3>
              <div className="space-y-3">
                {[
                  { label: "OAS (gross)",        value: result.boostedMonthly, color: "bg-blue-400"   },
                  { label: "OAS Clawback",        value: -result.clawbackMonthly, color: "bg-red-400" },
                  { label: "GIS",                 value: result.gisMonthly,    color: "bg-green-500"  },
                  { label: "CPP",                 value: cppIncome ?? 0,       color: "bg-purple-500" },
                  { label: "Allowance",           value: result.allowanceMonthly, color: "bg-orange-400" },
                ].filter(r => r.value !== 0).map(row => {
                  const isNegative = row.value < 0;
                  const absVal     = Math.abs(row.value);
                  const maxVal     = result.totalMonthly;
                  return (
                    <div key={row.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{row.label}</span>
                        <span className={`font-medium ${isNegative ? "text-red-500" : "text-gray-800"}`}>
                          {isNegative ? "−" : ""}${fmt(absVal)}/mo
                        </span>
                      </div>
                      {!isNegative && (
                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${row.color} rounded-full transition-all duration-500`}
                            style={{ width: `${Math.min((absVal / (maxVal || 1)) * 100, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                  <span className="text-sm font-bold text-gray-800">Total Monthly</span>
                  <span className="text-xl font-black text-blue-700">${fmt(result.totalMonthly)}</span>
                </div>
              </div>
            </div>

            {/* GIS eligible callout */}
            {result.gisEligible && result.gisMonthly > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                <p className="text-sm font-semibold text-green-800 mb-1">
                  ✅ You likely qualify for GIS — ${fmt(result.gisMonthly)}/month (${fmt(result.gisMonthly * 12)}/year)
                </p>
                <p className="text-sm text-green-700">
                  GIS is not automatic. Apply through <strong>Service Canada</strong> when you apply for OAS, or at 1-800-277-9914.
                  You must reapply each year (or file your taxes to auto-renew). GIS is non-taxable and does not affect other benefits.
                </p>
              </div>
            )}

            {!result.gisEligible && result.gisMonthly === 0 && result.income < 60000 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                <p className="text-sm font-semibold text-blue-800 mb-1">💡 GIS Strategy Tip</p>
                <p className="text-sm text-blue-700">
                  If you have flexibility in timing RRSP/RRIF withdrawals, withdrawing before age 65 (when GIS income test begins) could help qualify you for GIS later. TFSA withdrawals never count against GIS income.
                </p>
              </div>
            )}

            {/* Deferral table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowDeferral(!showDeferral)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">OAS Deferral Comparison</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Monthly benefit and break-even age for each start age</p>
                </div>
                <span className="text-gray-400 text-sm">{showDeferral ? "▲ Hide" : "▼ Show"}</span>
              </button>
              {showDeferral && (
                <div className="border-t border-gray-100 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                      <tr>
                        <th className="px-5 py-3 text-left">Start Age</th>
                        <th className="px-5 py-3 text-right">Boost</th>
                        <th className="px-5 py-3 text-right">Monthly OAS</th>
                        <th className="px-5 py-3 text-right">Annual OAS</th>
                        <th className="px-5 py-3 text-right">Break-Even Age</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {result.deferralScenarios.map(s => (
                        <tr key={s.age} className={`hover:bg-gray-50 transition-colors ${s.age === startAge ? "bg-blue-50" : ""}`}>
                          <td className="px-5 py-3 font-medium text-gray-700">
                            {s.age}
                            {s.age === startAge && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">Selected</span>}
                          </td>
                          <td className="px-5 py-3 text-right text-green-600 font-medium">+{s.boost}%</td>
                          <td className="px-5 py-3 text-right font-semibold text-gray-800">${fmt(s.monthly)}</td>
                          <td className="px-5 py-3 text-right text-gray-600">${fmt(s.annual)}</td>
                          <td className="px-5 py-3 text-right text-gray-600">{s.age === 65 ? "—" : s.breakEvenAge}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      Break-even age = when total lifetime OAS from deferring exceeds total from taking at 65. Deferring to 70 typically breaks even around age 82–84.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* SEO / FAQ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 prose prose-gray max-w-none">
          <h2 className="text-xl font-bold text-gray-900 mb-4">OAS & GIS — Complete Canadian Guide for 2025</h2>
          <p className="text-gray-600">
            Old Age Security (OAS) and the Guaranteed Income Supplement (GIS) are the two main federal retirement income programs available to Canadian seniors. Together with CPP, they form the foundation of retirement income for most Canadians.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">OAS Eligibility Rules</h3>
          <p className="text-gray-600">
            OAS is available to Canadians 65+ who have lived in Canada for at least 10 years after age 18. Full OAS requires 40 years of residence — you receive 1/40th of the full amount for each qualifying year. If you lived outside Canada, international social security agreements may count foreign residence toward your eligibility.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">The OAS Clawback</h3>
          <p className="text-gray-600">
            If your net income exceeds <strong>$90,997</strong> (2025), CRA recovers 15 cents of OAS for every dollar above that threshold. OAS is fully eliminated at around $148,179 (ages 65–74) or $154,196 (75+). TFSA withdrawals and non-taxable income do not trigger the clawback — making TFSA an essential planning tool for high-income seniors.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Should You Defer OAS?</h3>
          <p className="text-gray-600">
            Deferring OAS to age 70 increases your monthly benefit by 36%. The break-even point versus taking OAS at 65 is typically around age 82–84. Deferral makes sense if you're still working (and would face clawback anyway), have other income sources, are in good health, or want to maximize lifetime benefits given a long life expectancy.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">GIS — The Most Overlooked Benefit in Canada</h3>
          <p className="text-gray-600">
            The Guaranteed Income Supplement adds up to <strong>$1,057/month</strong> for eligible single seniors — completely tax-free. Despite this, many low-income seniors don't apply. GIS is income-tested based on the prior year's net income, excluding OAS. TFSA withdrawals, inheritances, and non-taxable amounts don't count. Apply at Service Canada or call 1-800-277-9914.
          </p>

          <p className="text-sm text-gray-400 mt-6">
            OAS and GIS amounts are indexed quarterly to inflation. Rates shown are Q1 2025. Actual amounts depend on complete income and residency history. Not financial advice — consult Service Canada or a financial planner for your exact entitlement.
          </p>
        </div>

      </div>
    </div>
  );
}
