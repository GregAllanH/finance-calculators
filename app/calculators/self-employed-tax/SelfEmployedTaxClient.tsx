"use client";

// app/calculators/self-employed-tax/SelfEmployedTaxClient.tsx

import PrintButton from "@/components/PrintButton";
import { useState, useMemo } from "react";
import { NumericFormat } from "react-number-format";

// ─── 2025 Constants ───────────────────────────────────────────────────────────

// CPP2 rates 2025
const CPP_RATE           = 0.0595;   // employee rate
const CPP_RATE_SE        = 0.1190;   // self-employed pays both sides
const CPP_EXEMPTION      = 3500;
const CPP_MAX_EARNINGS   = 71300;    // Year's Maximum Pensionable Earnings
const CPP_MAX_CONTRIB_EE = 4034.10;  // employee max
const CPP_MAX_CONTRIB_SE = 8068.20;  // self-employed max (both sides)

// CPP2 (second additional plan)
const CPP2_RATE_SE       = 0.08;     // both sides
const CPP2_MIN_EARNINGS  = 71300;    // starts above YMPE
const CPP2_MAX_EARNINGS  = 81900;    // Year's Additional Maximum Pensionable Earnings
const CPP2_MAX_CONTRIB_SE= 848.00;   // approx SE max 2025

// EI — self-employed opt-in only
const EI_RATE_SE         = 0.01049;  // reduced rate for SE (no employer contribution)
const EI_MAX_INSURABLE   = 65700;
const EI_MAX_PREMIUM_SE  = 689.00;

// Federal brackets 2025
const FED_BRACKETS = [
  { max: 57375,   rate: 0.15   },
  { max: 114750,  rate: 0.205  },
  { max: 158519,  rate: 0.26   },
  { max: 220000,  rate: 0.29   },
  { max: Infinity,rate: 0.33   },
];

// Basic personal amount 2025
const FED_BPA = 16129;

// Provincial tax rates + BPA (approximate, for common income range)
const PROVINCES: Record<string, {
  name: string;
  brackets: Array<{ max: number; rate: number }>;
  bpa: number;
}> = {
  AB: { name: "Alberta",       bpa: 21003, brackets: [
    { max: 148269, rate: 0.10 }, { max: 177922, rate: 0.12 },
    { max: 237230, rate: 0.13 }, { max: 355845, rate: 0.14 }, { max: Infinity, rate: 0.15 }
  ]},
  BC: { name: "British Columbia", bpa: 11981, brackets: [
    { max: 45654,  rate: 0.0506 }, { max: 91310,  rate: 0.077  },
    { max: 104835, rate: 0.105  }, { max: 127299, rate: 0.1229 },
    { max: 172602, rate: 0.147  }, { max: 240716, rate: 0.168  }, { max: Infinity, rate: 0.205 }
  ]},
  MB: { name: "Manitoba",      bpa: 15780, brackets: [
    { max: 47000,  rate: 0.108 }, { max: 100000, rate: 0.1275 }, { max: Infinity, rate: 0.174 }
  ]},
  NB: { name: "New Brunswick", bpa: 12458, brackets: [
    { max: 49958,  rate: 0.094 }, { max: 99916,  rate: 0.14   },
    { max: 185064, rate: 0.16  }, { max: Infinity, rate: 0.195 }
  ]},
  NL: { name: "Newfoundland",  bpa: 10818, brackets: [
    { max: 43198,  rate: 0.087 }, { max: 86395,  rate: 0.145  },
    { max: 154244, rate: 0.158 }, { max: 215943, rate: 0.178  },
    { max: 275870, rate: 0.198 }, { max: Infinity, rate: 0.218 }
  ]},
  NS: { name: "Nova Scotia",   bpa: 8481,  brackets: [
    { max: 29590,  rate: 0.0879 }, { max: 59180, rate: 0.1495 },
    { max: 93000,  rate: 0.1667 }, { max: 150000, rate: 0.175 }, { max: Infinity, rate: 0.21 }
  ]},
  NT: { name: "Northwest Territories", bpa: 16593, brackets: [
    { max: 50597,  rate: 0.059 }, { max: 101198, rate: 0.086  },
    { max: 164525, rate: 0.122 }, { max: Infinity, rate: 0.1405 }
  ]},
  NU: { name: "Nunavut",       bpa: 17925, brackets: [
    { max: 53268,  rate: 0.04  }, { max: 106537, rate: 0.07   },
    { max: 173205, rate: 0.09  }, { max: Infinity, rate: 0.115 }
  ]},
  ON: { name: "Ontario",       bpa: 11865, brackets: [
    { max: 51446,  rate: 0.0505 }, { max: 102894, rate: 0.0915 },
    { max: 150000, rate: 0.1116 }, { max: 220000, rate: 0.1216 }, { max: Infinity, rate: 0.1316 }
  ]},
  PE: { name: "PEI",           bpa: 12000, brackets: [
    { max: 32656,  rate: 0.098 }, { max: 64313,  rate: 0.138  },
    { max: 105000, rate: 0.167 }, { max: 140000, rate: 0.18   }, { max: Infinity, rate: 0.185 }
  ]},
  QC: { name: "Quebec",        bpa: 17183, brackets: [
    { max: 51780,  rate: 0.14  }, { max: 103545, rate: 0.19   },
    { max: 126000, rate: 0.24  }, { max: Infinity, rate: 0.2575 }
  ]},
  SK: { name: "Saskatchewan",  bpa: 17661, brackets: [
    { max: 49720,  rate: 0.105 }, { max: 142058, rate: 0.125  }, { max: Infinity, rate: 0.145 }
  ]},
  YT: { name: "Yukon",         bpa: 16129, brackets: [
    { max: 57375,  rate: 0.064 }, { max: 114750, rate: 0.09   },
    { max: 158519, rate: 0.109 }, { max: 500000, rate: 0.1279 }, { max: Infinity, rate: 0.1502 }
  ]},
};

// Common self-employed deductions
const DEDUCTION_PRESETS = [
  { key: "homeOffice",     label: "Home Office",           icon: "🏠", hint: "% of home expenses × business use"     },
  { key: "vehicle",        label: "Vehicle (business %)",  icon: "🚗", hint: "Business km ÷ total km × vehicle costs" },
  { key: "phone",          label: "Phone & Internet",      icon: "📱", hint: "Business portion only"                  },
  { key: "supplies",       label: "Office Supplies",       icon: "📦", hint: "Directly used in earning income"        },
  { key: "software",       label: "Software & Tools",      icon: "💻", hint: "Subscriptions, apps, equipment"         },
  { key: "marketing",      label: "Advertising & Marketing",icon: "📢", hint: "Website, ads, business cards"          },
  { key: "professional",   label: "Professional Fees",     icon: "⚖️", hint: "Accountant, lawyer, consultant"        },
  { key: "insurance",      label: "Business Insurance",    icon: "🛡", hint: "Liability, E&O, commercial"            },
  { key: "travel",         label: "Business Travel",       icon: "✈️", hint: "Flights, hotels for business"          },
  { key: "meals",          label: "Meals & Entertainment", icon: "🍽", hint: "50% deductible for business meals"      },
  { key: "education",      label: "Training & Education",  icon: "📚", hint: "Courses, books, conferences"            },
  { key: "other",          label: "Other Expenses",        icon: "📋", hint: "Any other allowable business expense"  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt    = (n: number) => Math.round(n).toLocaleString("en-CA");
const fmtPct = (n: number) => (n * 100).toFixed(1);

function calcTax(income: number, brackets: Array<{ max: number; rate: number }>, bpa: number): number {
  const taxableIncome = Math.max(0, income - bpa);
  let tax = 0;
  let prev = 0;
  for (const b of brackets) {
    if (taxableIncome <= prev) break;
    const taxable = Math.min(taxableIncome, b.max) - prev;
    tax += taxable * b.rate;
    prev = b.max;
    if (b.max === Infinity) break;
  }
  return tax;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SelfEmployedTaxClient() {
  const [province,      setProvince]      = useState("ON");
  const [grossRevenue,  setGrossRevenue]  = useState<number | null>(null);
  const [deductions,    setDeductions]    = useState<Record<string, number | null>>({});
  const [otherIncome,   setOtherIncome]   = useState<number | null>(null);
  const [optInEI,       setOptInEI]       = useState(false);
  const [hasRRSP,       setHasRRSP]       = useState<number | null>(null);
  const [showTips,      setShowTips]      = useState(false);
  const [showQuarterly, setShowQuarterly] = useState(false);

  const provData = PROVINCES[province];
  const provinceList = Object.entries(PROVINCES).sort((a, b) => a[1].name.localeCompare(b[1].name));

  const totalDeductions = Object.values(deductions).reduce((s: number, v) => s + (v ?? 0), 0);

  const result = useMemo(() => {
    if (!grossRevenue || grossRevenue <= 0) return null;

    const revenue      = grossRevenue;
    const deductTotal  = totalDeductions;
    const rrsp         = hasRRSP ?? 0;
    const other        = otherIncome ?? 0;

    // Net business income
    const netBusiness  = Math.max(0, revenue - deductTotal);
    const totalIncome  = netBusiness + other;

    // ── CPP Contributions ─────────────────────────────────────────────────
    const cppEarnings  = Math.min(Math.max(0, netBusiness - CPP_EXEMPTION), CPP_MAX_EARNINGS - CPP_EXEMPTION);
    const cppContrib   = Math.min(cppEarnings * CPP_RATE_SE, CPP_MAX_CONTRIB_SE);

    // CPP2
    const cpp2Earnings = Math.max(0, Math.min(netBusiness, CPP2_MAX_EARNINGS) - CPP2_MIN_EARNINGS);
    const cpp2Contrib  = Math.min(cpp2Earnings * CPP2_RATE_SE, CPP2_MAX_CONTRIB_SE);

    const totalCPP     = cppContrib + cpp2Contrib;

    // CPP deduction (employee half is deductible against income)
    const cppDeduction = cppContrib / 2;

    // ── EI ────────────────────────────────────────────────────────────────
    const eiPremium    = optInEI
      ? Math.min(Math.min(netBusiness, EI_MAX_INSURABLE) * EI_RATE_SE, EI_MAX_PREMIUM_SE)
      : 0;

    // ── Taxable Income ────────────────────────────────────────────────────
    const taxableIncome = Math.max(0, totalIncome - cppDeduction - rrsp);

    // ── Federal Tax ───────────────────────────────────────────────────────
    const fedTax       = calcTax(taxableIncome, FED_BRACKETS, FED_BPA);

    // Federal CPP credit (employee half × 15%)
    const fedCPPCredit = (cppContrib / 2) * 0.15;
    const fedEICredit  = eiPremium * 0.15;
    const fedNetTax    = Math.max(0, fedTax - fedCPPCredit - fedEICredit);

    // ── Provincial Tax ────────────────────────────────────────────────────
    const provTax      = calcTax(taxableIncome, provData.brackets, provData.bpa);
    const provCPPCredit = (cppContrib / 2) * (provData.brackets[0]?.rate ?? 0.05);
    const provNetTax   = Math.max(0, provTax - provCPPCredit);

    // ── Totals ────────────────────────────────────────────────────────────
    const totalTax     = fedNetTax + provNetTax;
    const totalOwing   = totalTax + totalCPP + eiPremium;
    const takeHome     = totalIncome - totalOwing - rrsp;
    const effectiveRate = totalIncome > 0 ? (totalOwing / totalIncome) * 100 : 0;
    const marginalRate  = taxableIncome > 0
      ? (() => {
          // Find fed marginal
          let fedMarg = 0.15;
          let prev = 0;
          for (const b of FED_BRACKETS) {
            if (taxableIncome > prev) fedMarg = b.rate;
            if (taxableIncome <= b.max) break;
            prev = b.max;
          }
          // Find prov marginal
          let provMarg = provData.brackets[0].rate;
          prev = 0;
          for (const b of provData.brackets) {
            if (taxableIncome > prev) provMarg = b.rate;
            if (taxableIncome <= b.max) break;
            prev = b.max;
          }
          return (fedMarg + provMarg) * 100;
        })()
      : 0;

    // ── Quarterly instalments ─────────────────────────────────────────────
    const quarterlyInstalment = totalOwing / 4;

    // ── Compare vs employee ───────────────────────────────────────────────
    // Employee would pay half CPP only
    const employeeCPP  = Math.min(cppEarnings * CPP_RATE, CPP_MAX_CONTRIB_EE);
    const selfEmpPenalty = totalCPP - employeeCPP; // extra CPP burden

    // ── RRSP impact ───────────────────────────────────────────────────────
    const rrspTaxSaving = rrsp * (marginalRate / 100);

    return {
      revenue,
      deductTotal,
      netBusiness,
      other,
      totalIncome,
      cppContrib,
      cpp2Contrib,
      totalCPP,
      cppDeduction,
      eiPremium,
      rrsp,
      taxableIncome,
      fedTax,
      fedNetTax,
      provTax: provNetTax,
      totalTax,
      totalOwing,
      takeHome,
      effectiveRate,
      marginalRate,
      quarterlyInstalment,
      employeeCPP,
      selfEmpPenalty,
      rrspTaxSaving,
    };
  }, [grossRevenue, totalDeductions, otherIncome, optInEI, hasRRSP, province, provData]);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-gray-900">Self-Employed Tax Calculator</h1>
          <p className="text-gray-500 mt-1">
            Calculate income tax, CPP (both sides), deductions, and quarterly instalments for Canadian freelancers and business owners — 2025.
          </p>
        </div>

        {/* Tips panel */}
        <button
          type="button"
          onClick={() => setShowTips(!showTips)}
          className="w-full bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-center justify-between text-left hover:bg-blue-100 transition-colors"
        >
          <div>
            <p className="text-sm font-semibold text-blue-800">💡 Self-Employment Tax Tips for Canadians</p>
            <p className="text-xs text-blue-600 mt-0.5">CPP double-contribution, HST thresholds, quarterly instalments, deductions</p>
          </div>
          <span className="text-blue-500 text-lg">{showTips ? "▲" : "▼"}</span>
        </button>

        {showTips && (
          <div className="print:hidden bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            {[
              {
                icon: "⚠️", title: "You Pay Both Sides of CPP",
                body: "Employees split CPP with their employer (5.95% each). Self-employed pay both sides — 11.9% of net business income, up to $8,068/year in 2025. The employer half is deductible from income; the employee half generates a tax credit.",
              },
              {
                icon: "📅", title: "Quarterly Tax Instalments",
                body: "If you owe more than $3,000 in federal tax (or $1,800 in Quebec) in two consecutive years, CRA requires quarterly instalments due March 15, June 15, September 15, and December 15. Missing instalments triggers interest charges.",
              },
              {
                icon: "🏦", title: "HST/GST Registration",
                body: "You must register for HST/GST once your revenue exceeds $30,000 in any 12-month period. Register early — input tax credits let you reclaim HST/GST paid on business expenses. Consider the Quick Method if your business is under $400,000.",
              },
              {
                icon: "📊", title: "RRSP is Your Best Tax Tool",
                body: "Unlike employees, self-employed have no pension plan — so RRSP contributions are critical. Contributing reduces your taxable income dollar for dollar. If you earn $100k net and contribute $15k to RRSP, you could save $6,500+ in tax.",
              },
              {
                icon: "🏠", title: "Home Office Deduction",
                body: "If you work from home, you can deduct a proportional share of rent/mortgage interest, utilities, maintenance, and insurance. Calculate as: business-use area ÷ total home area × annual home expenses. Keep records of floor plans and expense receipts.",
              },
              {
                icon: "🚗", title: "Vehicle Expenses",
                body: "Track every business km with a mileage log. You can deduct: business km ÷ total annual km × (gas, insurance, maintenance, lease/CCA). A dedicated business vehicle makes record-keeping simpler. Capital Cost Allowance (CCA) on purchased vehicles uses Class 10 or 10.1.",
              },
              {
                icon: "💼", title: "Incorporate When Income Exceeds ~$100k",
                body: "The small business corporate tax rate is 9% federal (vs 26–33% personal). If you're retaining profits in the business, incorporation can save significant tax. The decision depends on personal income needs, province, and whether you qualify for the Small Business Deduction.",
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
          <h2 className="text-base font-semibold text-gray-800">Income & Province</h2>

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

          {/* Gross revenue */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gross Business Revenue
              <span className="text-gray-400 font-normal ml-1">(before any expenses)</span>
            </label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$85,000"
              onValueChange={(v) => setGrossRevenue(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
            />
          </div>

          {/* Other income */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Other Income
              <span className="text-gray-400 font-normal ml-1">(employment, rental, investment — optional)</span>
            </label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$0"
              onValueChange={(v) => setOtherIncome(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
            />
          </div>

          {/* RRSP */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              RRSP Contribution
              <span className="text-gray-400 font-normal ml-1">(reduces taxable income)</span>
            </label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$0"
              onValueChange={(v) => setHasRRSP(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
            />
          </div>

          {/* EI opt-in */}
          <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Opt Into EI (Employment Insurance)?</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Self-employed can opt in for maternity/parental/sickness benefits — ${fmt(EI_MAX_PREMIUM_SE)}/yr max premium
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOptInEI(!optInEI)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ml-4 ${optInEI ? "bg-blue-600" : "bg-gray-300"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${optInEI ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        </div>

        {/* Deductions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-800">Business Deductions</h2>
              <p className="text-xs text-gray-400 mt-0.5">All deductions reduce your net business income and tax owing</p>
            </div>
            {totalDeductions > 0 && (
              <span className="text-sm font-bold text-green-600">−${fmt(totalDeductions)}</span>
            )}
          </div>

          <div className="space-y-3">
            {DEDUCTION_PRESETS.map(d => (
              <div key={d.key} className="flex items-center gap-3">
                <span className="text-base w-6 text-center shrink-0">{d.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">{d.label}</p>
                  <p className="text-xs text-gray-400">{d.hint}</p>
                </div>
                <NumericFormat
                  thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
                  placeholder="$0"
                  value={deductions[d.key] ?? ""}
                  onValueChange={(v) => setDeductions(prev => ({ ...prev, [d.key]: v.floatValue ?? null }))}
                  className="w-28 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Results */}
        {!result ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">💼</div>
            <p className="text-xl font-semibold text-gray-700">Enter your revenue above</p>
            <p className="text-gray-500 mt-2">Your full self-employment tax breakdown will appear here.</p>
          </div>
        ) : (
          <>
            {/* GST/HST warning */}
            {result.revenue >= 30000 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <p className="text-sm font-semibold text-amber-800 mb-1">
                  ⚠️ HST/GST Registration Required
                </p>
                <p className="text-sm text-amber-700">
                  Revenue of ${fmt(result.revenue)} exceeds the $30,000 threshold — you must be registered for HST/GST. If not registered, contact CRA immediately to avoid penalties on unremitted tax.
                </p>
              </div>
            )}

            {/* Hero */}
            <div className="bg-blue-600 text-white rounded-xl p-6 text-center shadow-sm">
              <p className="text-sm font-medium text-blue-200 uppercase tracking-wide">Estimated Tax + CPP Owing</p>
              <p className="text-6xl font-black mt-2">${fmt(result.totalOwing)}</p>
              <p className="text-blue-200 text-sm mt-1">
                {result.effectiveRate.toFixed(1)}% effective rate · ${fmt(result.takeHome)} take-home
              </p>
            </div>

            {/* Key stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Net Business Income", value: `$${fmt(result.netBusiness)}`,  sub: `after $${fmt(result.deductTotal)} deductions`, color: "text-gray-800" },
                { label: "Income Tax",           value: `$${fmt(result.totalTax)}`,     sub: `${result.marginalRate.toFixed(1)}% marginal rate`,    color: "text-red-500"  },
                { label: "CPP Contributions",    value: `$${fmt(result.totalCPP)}`,     sub: "both sides — employer + employee",  color: "text-orange-500"},
                { label: "Quarterly Instalment", value: `$${fmt(result.quarterlyInstalment)}`, sub: "Mar/Jun/Sep/Dec 15", color: "text-blue-600"  },
              ].map(s => (
                <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Full breakdown table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">Full Tax Breakdown</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  { label: "Gross Revenue",             value: result.revenue,         color: "text-gray-800",  bold: false, negative: false  },
                  { label: "Business Deductions",        value: result.deductTotal,     color: "text-green-600", bold: false, negative: true   },
                  { label: "Net Business Income",        value: result.netBusiness,     color: "text-gray-900",  bold: true,  negative: false  },
                  { label: "Other Income",               value: result.other,           color: "text-gray-600",  bold: false, negative: false, hide: result.other === 0 },
                  { label: "CPP Deduction (½ employer)", value: result.cppDeduction,   color: "text-green-600", bold: false, negative: true   },
                  { label: "RRSP Contribution",          value: result.rrsp,            color: "text-green-600", bold: false, negative: true, hide: result.rrsp === 0 },
                  { label: "Taxable Income",             value: result.taxableIncome,   color: "text-gray-900",  bold: true,  negative: false  },
                  { label: "Federal Income Tax",         value: result.fedNetTax,       color: "text-red-500",   bold: false, negative: false  },
                  { label: "Provincial Income Tax",      value: result.provTax,         color: "text-red-400",   bold: false, negative: false  },
                  { label: "CPP Contributions (both)",   value: result.totalCPP,        color: "text-orange-500",bold: false, negative: false  },
                  { label: "EI Premiums",                value: result.eiPremium,       color: "text-orange-400",bold: false, negative: false, hide: result.eiPremium === 0 },
                  { label: "Total Owing",                value: result.totalOwing,      color: "text-blue-700",  bold: true,  negative: false  },
                  { label: "Take-Home Pay",              value: result.takeHome,        color: "text-green-700", bold: true,  negative: false  },
                ].filter(r => !r.hide).map(row => (
                  <div key={row.label} className={`flex justify-between items-center px-6 py-3 ${row.bold ? "bg-gray-50" : "hover:bg-gray-50"}`}>
                    <span className={`text-sm ${row.bold ? "font-semibold text-gray-800" : "text-gray-600"}`}>{row.label}</span>
                    <span className={`text-sm font-${row.bold ? "bold" : "medium"} ${row.color}`}>
                      {row.negative && row.value > 0 ? "−" : ""}${fmt(row.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {/* Print button */}
            <div className="print:hidden flex justify-end">
              <PrintButton label="Print Report" />
            </div>

            {/* CPP extra burden */}
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
              <p className="text-sm font-semibold text-orange-800 mb-1">
                💼 Self-Employment CPP Premium vs Employee
              </p>
              <div className="grid grid-cols-3 gap-4 text-center mt-3">
                {[
                  { label: "Employee CPP", value: result.employeeCPP, color: "text-gray-700" },
                  { label: "Self-Employed CPP", value: result.totalCPP, color: "text-orange-600" },
                  { label: "Extra Cost", value: result.selfEmpPenalty, color: "text-red-600" },
                ].map(c => (
                  <div key={c.label}>
                    <p className="text-xs text-gray-500 mb-0.5">{c.label}</p>
                    <p className={`text-lg font-bold ${c.color}`}>${fmt(c.value)}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-orange-700 mt-3">
                The employer half of CPP (${fmt(result.cppDeduction)}) is deductible from income, partially offsetting the cost.
                The employee half generates a federal tax credit.
              </p>
            </div>

            {/* RRSP impact */}
            {result.rrsp > 0 && (
              <div className="bg-green-600 text-white rounded-xl p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-green-200 uppercase tracking-wide">RRSP Tax Savings</p>
                <p className="text-4xl font-black mt-2">${fmt(result.rrspTaxSaving)}</p>
                <p className="text-green-200 text-sm mt-1">
                  ${fmt(result.rrsp)} RRSP contribution at {result.marginalRate.toFixed(1)}% marginal rate
                </p>
              </div>
            )}

            {/* Where money goes bars */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Where Your Revenue Goes</h3>
              <div className="space-y-3">
                {[
                  { label: `Business Deductions (${((result.deductTotal / result.revenue) * 100).toFixed(0)}%)`, value: result.deductTotal,   color: "bg-green-400" },
                  { label: `Income Tax (${((result.totalTax / result.revenue) * 100).toFixed(0)}%)`,             value: result.totalTax,      color: "bg-red-400"   },
                  { label: `CPP (${((result.totalCPP / result.revenue) * 100).toFixed(0)}%)`,                    value: result.totalCPP,      color: "bg-orange-400"},
                  { label: `Take-Home (${((result.takeHome / result.revenue) * 100).toFixed(0)}%)`,              value: result.takeHome,      color: "bg-blue-500"  },
                ].filter(r => r.value > 0).map(row => (
                  <div key={row.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{row.label}</span>
                      <span className="font-medium text-gray-800">${fmt(row.value)}</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${row.color} rounded-full transition-all duration-500`}
                        style={{ width: `${(row.value / result.revenue) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quarterly instalments */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowQuarterly(!showQuarterly)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Quarterly Instalment Schedule</h2>
                  <p className="text-sm text-gray-500 mt-0.5">${fmt(result.quarterlyInstalment)}/quarter · ${fmt(result.totalOwing)}/year</p>
                </div>
                <span className="text-gray-400 text-sm">{showQuarterly ? "▲ Hide" : "▼ Show"}</span>
              </button>
              {showQuarterly && (
                <div className="border-t border-gray-100">
                  <div className="divide-y divide-gray-50">
                    {[
                      { label: "Q1 — March 15",    period: "Jan–Mar income"  },
                      { label: "Q2 — June 15",     period: "Apr–Jun income"  },
                      { label: "Q3 — September 15",period: "Jul–Sep income"  },
                      { label: "Q4 — December 15", period: "Oct–Dec income"  },
                    ].map(q => (
                      <div key={q.label} className="flex justify-between items-center px-6 py-3.5">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{q.label}</p>
                          <p className="text-xs text-gray-400">{q.period}</p>
                        </div>
                        <p className="text-sm font-bold text-blue-600">${fmt(result.quarterlyInstalment)}</p>
                      </div>
                    ))}
                    <div className="flex justify-between items-center px-6 py-3.5 bg-gray-50">
                      <p className="text-sm font-bold text-gray-800">Total Annual</p>
                      <p className="text-sm font-bold text-blue-700">${fmt(result.totalOwing)}</p>
                    </div>
                  </div>
                  <div className="px-6 py-3 bg-amber-50 border-t border-amber-100">
                    <p className="text-xs text-amber-700">
                      ⚠️ Instalments required if tax owing exceeds $3,000 in 2025 and either 2024 or 2023. Late instalments accrue interest at the prescribed rate.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* SEO / FAQ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 prose prose-gray max-w-none">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Self-Employment Taxes in Canada — 2025 Guide</h2>
          <p className="text-gray-600">
            Self-employed Canadians face a unique tax situation: you pay income tax like everyone else, but you also pay <strong>both the employee and employer portions of CPP</strong> — nearly double what an employee pays. Planning ahead and understanding your deductions is essential.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">CPP for the Self-Employed</h3>
          <p className="text-gray-600">
            In 2025, the self-employed CPP contribution is 11.9% of net business income between $3,500 and $71,300 — up to $8,068. Additionally, CPP2 applies to income between $71,300 and $81,900 at 8%, adding up to $848. The employer half of CPP is deductible from income; the employee half generates a 15% federal tax credit.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">What Can You Deduct?</h3>
          <p className="text-gray-600">
            CRA allows deductions for expenses incurred to earn business income: home office, vehicle (business portion), phone and internet, software, supplies, marketing, professional fees, business insurance, travel, and 50% of business meals. Keep all receipts and maintain a mileage log for vehicle claims.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">GST/HST Registration Threshold</h3>
          <p className="text-gray-600">
            Once your revenue exceeds <strong>$30,000</strong> in any 12-month rolling period, you must register for GST/HST. After registration, you collect tax from clients and remit it to CRA — but you can also claim input tax credits for GST/HST paid on business expenses, which often results in net refunds.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">When to Incorporate</h3>
          <p className="text-gray-600">
            The federal small business tax rate is 9% (vs 26%+ personal). If you're consistently earning more than you personally need, incorporation lets you leave profits in the corporation at a low rate and draw income as needed. The decision is complex and depends on your province, personal income needs, and plans for the business.
          </p>

          <p className="text-sm text-gray-400 mt-6">
            This calculator uses 2025 federal and provincial tax brackets, CPP rates, and EI premiums. Actual tax owing may differ based on other credits, deductions, and circumstances. HST/GST is not included in this calculation. Consult a CPA for self-employment tax planning. Not tax advice.
          </p>
        </div>

      </div>
    </div>
  );
}
