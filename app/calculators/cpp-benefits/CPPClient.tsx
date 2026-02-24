"use client";

// app/calculators/cpp-benefits/CPPClient.tsx

import { useState, useMemo } from "react";
import { NumericFormat } from "react-number-format";

// ─── CPP Constants ────────────────────────────────────────────────────────────

// 2025 CPP figures
const CPP_MAX_MONTHLY_2025 = 1364.60; // max CPP at 65 (2025)
const CPP_YMPE_2025 = 71300;          // Year's Maximum Pensionable Earnings
const CPP_EXEMPTION = 3500;           // basic exemption

// Adjustment factors
const EARLY_REDUCTION_PER_MONTH  = 0.006;  // 0.6% per month before 65 (max 36% at 60)
const LATE_INCREASE_PER_MONTH    = 0.007;  // 0.7% per month after 65  (max 42% at 70)

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtInt = (n: number) =>
  Math.round(n).toLocaleString("en-CA");

// ─── Types ────────────────────────────────────────────────────────────────────

interface CPPResult {
  baseMonthly: number;        // estimated CPP at 65
  at60Monthly: number;        // if taken at 60
  at65Monthly: number;        // standard
  at70Monthly: number;        // if deferred to 70
  breakeven6065: number;      // age where 65 overtakes 60
  breakeven6570: number;      // age where 70 overtakes 65
  lifetime60to85: number;
  lifetime65to85: number;
  lifetime70to85: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CPPClient() {
  const [avgIncome, setAvgIncome]     = useState<number | null>(null);
  const [yearsContrib, setYearsContrib] = useState<number | null>(null);
  const [currentAge, setCurrentAge]   = useState<number | null>(null);

  const result = useMemo<CPPResult | null>(() => {
    if (!avgIncome || !yearsContrib || !currentAge) return null;
    if (avgIncome <= 0 || yearsContrib <= 0 || currentAge < 18) return null;

    // Pensionable earnings ratio (capped at YMPE)
    const pensionableIncome = Math.min(avgIncome, CPP_YMPE_2025) - CPP_EXEMPTION;
    const earningsRatio     = Math.max(0, pensionableIncome / (CPP_YMPE_2025 - CPP_EXEMPTION));

    // Years factor: CPP is based on best 39 years (out of ~47 contributory years)
    // We estimate using actual years contributed, max credit at 39 years
    const yearsFactor = Math.min(yearsContrib, 39) / 39;

    // Base monthly at 65
    const baseMonthly = CPP_MAX_MONTHLY_2025 * earningsRatio * yearsFactor;

    // Adjustments for start age
    const monthsEarly = (65 - 60) * 12; // 60 months
    const monthsLate  = (70 - 65) * 12; // 60 months

    const at60Monthly = baseMonthly * (1 - EARLY_REDUCTION_PER_MONTH * monthsEarly);
    const at65Monthly = baseMonthly;
    const at70Monthly = baseMonthly * (1 + LATE_INCREASE_PER_MONTH  * monthsLate);

    // Breakeven: age where cumulative 65 > cumulative 60
    // at60 * (age-60)*12 = at65 * (age-65)*12
    // breakeven = (at65*65 - at60*60) / (at65 - at60)
    const breakeven6065 = at65Monthly !== at60Monthly
      ? (at65Monthly * 65 - at60Monthly * 60) / (at65Monthly - at60Monthly)
      : 999;

    const breakeven6570 = at70Monthly !== at65Monthly
      ? (at70Monthly * 70 - at65Monthly * 65) / (at70Monthly - at65Monthly)
      : 999;

    // Lifetime totals to age 85
    const lifetime60to85 = at60Monthly * (85 - 60) * 12;
    const lifetime65to85 = at65Monthly * (85 - 65) * 12;
    const lifetime70to85 = at70Monthly * (85 - 70) * 12;

    return {
      baseMonthly,
      at60Monthly,
      at65Monthly,
      at70Monthly,
      breakeven6065,
      breakeven6570,
      lifetime60to85,
      lifetime65to85,
      lifetime70to85,
    };
  }, [avgIncome, yearsContrib, currentAge]);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-gray-900">CPP Benefits Estimator</h1>
          <p className="text-gray-500 mt-1">
            Estimate your Canada Pension Plan monthly payments and find your optimal start age.
          </p>
        </div>

        {/* Inputs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-800">Your Details</h2>

          {/* Average Income */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Average Annual Employment Income
              <span className="text-gray-400 font-normal ml-1">(over your career)</span>
            </label>
            <NumericFormat
              thousandSeparator
              prefix="$"
              decimalScale={0}
              allowNegative={false}
              placeholder="$55,000"
              onValueChange={(v) => setAvgIncome(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-right"
            />
            <p className="text-xs text-gray-400 mt-1">
              2025 maximum pensionable earnings: $71,300
            </p>
          </div>

          {/* Years Contributing */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Years Contributing to CPP
              <span className="text-gray-400 font-normal ml-1">(expected total)</span>
            </label>
            <input
              type="number"
              min="1"
              max="47"
              placeholder="35"
              onChange={(e) => setYearsContrib(Number(e.target.value) || null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-right"
            />
            <p className="text-xs text-gray-400 mt-1">
              Maximum counted years: 39 (CPP uses your best years)
            </p>
          </div>

          {/* Current Age */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Age
            </label>
            <input
              type="number"
              min="18"
              max="69"
              placeholder="45"
              onChange={(e) => setCurrentAge(Number(e.target.value) || null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-right"
            />
          </div>
        </div>

        {/* Results */}
        {result === null ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">🍁</div>
            <p className="text-xl font-semibold text-gray-700">Enter your details above</p>
            <p className="text-gray-500 mt-2">Your CPP estimate will appear here instantly.</p>
          </div>
        ) : (
          <>
            {/* Monthly at 65 hero */}
            <div className="bg-blue-600 text-white rounded-xl p-6 text-center shadow-sm">
              <p className="text-sm font-medium text-blue-200 uppercase tracking-wide">
                Estimated Monthly CPP at Age 65
              </p>
              <p className="text-5xl font-black mt-2">${fmt(result.at65Monthly)}</p>
              <p className="text-blue-200 text-sm mt-1">
                ${fmtInt(result.at65Monthly * 12)} per year
              </p>
            </div>

            {/* Start age comparison */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1">
                  Take Early — Age 60
                </p>
                <p className="text-3xl font-bold text-gray-900">${fmt(result.at60Monthly)}</p>
                <p className="text-gray-400 text-sm mt-1">per month</p>
                <p className="text-red-400 text-xs mt-2 font-medium">
                  −36% reduction
                </p>
              </div>
              <div className="bg-blue-50 border-2 border-blue-500 rounded-xl p-6 text-center shadow-sm">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                  Standard — Age 65
                </p>
                <p className="text-3xl font-bold text-blue-700">${fmt(result.at65Monthly)}</p>
                <p className="text-gray-400 text-sm mt-1">per month</p>
                <p className="text-blue-500 text-xs mt-2 font-medium">
                  Base amount
                </p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">
                  Defer — Age 70
                </p>
                <p className="text-3xl font-bold text-gray-900">${fmt(result.at70Monthly)}</p>
                <p className="text-gray-400 text-sm mt-1">per month</p>
                <p className="text-green-500 text-xs mt-2 font-medium">
                  +42% increase
                </p>
              </div>
            </div>

            {/* Breakeven ages */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Breakeven: Age 60 vs 65
                </p>
                <p className="text-4xl font-bold text-orange-500">
                  Age {result.breakeven6065.toFixed(1)}
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  If you live past this age, waiting until 65 pays more in total.
                </p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Breakeven: Age 65 vs 70
                </p>
                <p className="text-4xl font-bold text-purple-600">
                  Age {result.breakeven6570.toFixed(1)}
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  If you live past this age, deferring to 70 pays more in total.
                </p>
              </div>
            </div>

            {/* Lifetime totals */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">
                  Estimated Lifetime CPP to Age 85
                </h2>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  { label: "Starting at 60", value: result.lifetime60to85, color: "text-red-500",   bar: "bg-red-400",   pct: result.lifetime60to85 },
                  { label: "Starting at 65", value: result.lifetime65to85, color: "text-blue-600",  bar: "bg-blue-500",  pct: result.lifetime65to85 },
                  { label: "Starting at 70", value: result.lifetime70to85, color: "text-green-600", bar: "bg-green-500", pct: result.lifetime70to85 },
                ].map((row) => {
                  const max = Math.max(result.lifetime60to85, result.lifetime65to85, result.lifetime70to85);
                  return (
                    <div key={row.label} className="px-6 py-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">{row.label}</span>
                        <span className={`font-bold text-sm ${row.color}`}>${fmtInt(row.value)}</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${row.bar} rounded-full transition-all duration-500`}
                          style={{ width: `${(row.pct / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Visual bar — where income goes */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Monthly CPP Comparison
              </h3>
              <div className="space-y-3">
                {[
                  { label: "Age 60 (early)", value: result.at60Monthly, color: "bg-red-400"   },
                  { label: "Age 65 (standard)", value: result.at65Monthly, color: "bg-blue-500"  },
                  { label: "Age 70 (deferred)", value: result.at70Monthly, color: "bg-green-500" },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{row.label}</span>
                      <span className="font-medium text-gray-800">${fmt(row.value)}/mo</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${row.color} rounded-full transition-all duration-500`}
                        style={{ width: `${(row.value / result.at70Monthly) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* SEO / FAQ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 prose prose-gray max-w-none">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            How CPP Benefits Are Calculated
          </h2>
          <p className="text-gray-600">
            The Canada Pension Plan (CPP) retirement pension is a monthly, taxable benefit that replaces part of your income when you retire. The amount you receive depends on how much you contributed and for how long.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">When Should You Start CPP?</h3>
          <p className="text-gray-600">
            You can start CPP as early as age 60 or as late as age 70. Starting early means a <strong>0.6% reduction for each month before 65</strong> (up to 36% less at 60). Deferring past 65 earns a <strong>0.7% increase for each month after 65</strong> (up to 42% more at 70). The breakeven age — where waiting pays off — is typically around age 74–75 when comparing 65 vs 70.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">What is the Maximum CPP in 2025?</h3>
          <p className="text-gray-600">
            The maximum monthly CPP retirement pension at age 65 in 2025 is <strong>$1,364.60</strong>. Most Canadians receive less than the maximum because it requires contributing at the maximum level for at least 39 years.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">CPP and Your RRSP/TFSA Strategy</h3>
          <p className="text-gray-600">
            Knowing your expected CPP income helps you plan how much to save in your RRSP and TFSA. If you plan to defer CPP to 70, you may need to draw down savings in your early retirement years — making a larger TFSA or RRSP balance important as a bridge.
          </p>

          <p className="text-sm text-gray-400 mt-6">
            This calculator provides estimates based on 2025 CPP rates and contribution rules. Actual CPP amounts may differ based on your complete contribution history, dropout provisions, and other factors. For your exact CPP entitlement, log in to My Service Canada Account.
          </p>
        </div>

      </div>
    </div>
  );
}
