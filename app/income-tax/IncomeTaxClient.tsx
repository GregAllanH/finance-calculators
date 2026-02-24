"use client";

// app/calculators/income-tax/IncomeTaxClient.tsx
// Place this file at: app/calculators/income-tax/IncomeTaxClient.tsx

import { useState, useCallback } from "react";
import { NumericFormat } from "react-number-format";

// ─── Tax Data ─────────────────────────────────────────────────────────────────

const FEDERAL_BRACKETS: Record<number, Array<{ min: number; max: number; rate: number }>> = {
  2024: [
    { min: 0,       max: 55867,   rate: 0.15   },
    { min: 55867,   max: 111733,  rate: 0.205  },
    { min: 111733,  max: 154906,  rate: 0.26   },
    { min: 154906,  max: 220000,  rate: 0.29   },
    { min: 220000,  max: Infinity,rate: 0.33   },
  ],
  2025: [
    { min: 0,       max: 57375,   rate: 0.15   },
    { min: 57375,   max: 114750,  rate: 0.205  },
    { min: 114750,  max: 158519,  rate: 0.26   },
    { min: 158519,  max: 220000,  rate: 0.29   },
    { min: 220000,  max: Infinity,rate: 0.33   },
  ],
};

const FEDERAL_BASIC_PERSONAL: Record<number, number> = { 2024: 15705, 2025: 16129 };

// CPP & EI
const CPP: Record<number, { exemption: number; maxEarnings: number; rate: number }> = {
  2024: { exemption: 3500, maxEarnings: 68500,  rate: 0.0595 },
  2025: { exemption: 3500, maxEarnings: 71300,  rate: 0.0595 },
};
const EI: Record<number, { maxInsurable: number; rate: number }> = {
  2024: { maxInsurable: 63200, rate: 0.0166 },
  2025: { maxInsurable: 65700, rate: 0.0164 },
};

// Provincial brackets & basic personal amounts
type BracketSet = Array<{ min: number; max: number; rate: number }>;
interface ProvData { brackets: Record<number, BracketSet>; basic: Record<number, number>; name: string; }

const PROVINCES: Record<string, ProvData> = {
  AB: {
    name: "Alberta",
    brackets: {
      2024: [
        { min: 0,       max: 148269,  rate: 0.10  },
        { min: 148269,  max: 177922,  rate: 0.12  },
        { min: 177922,  max: 237230,  rate: 0.13  },
        { min: 237230,  max: 355845,  rate: 0.14  },
        { min: 355845,  max: Infinity,rate: 0.15  },
      ],
      2025: [
        { min: 0,       max: 148269,  rate: 0.10  },
        { min: 148269,  max: 177922,  rate: 0.12  },
        { min: 177922,  max: 237230,  rate: 0.13  },
        { min: 237230,  max: 355845,  rate: 0.14  },
        { min: 355845,  max: Infinity,rate: 0.15  },
      ],
    },
    basic: { 2024: 21003, 2025: 21870 },
  },
  BC: {
    name: "British Columbia",
    brackets: {
      2024: [
        { min: 0,       max: 45654,   rate: 0.0506 },
        { min: 45654,   max: 91310,   rate: 0.077  },
        { min: 91310,   max: 104835,  rate: 0.105  },
        { min: 104835,  max: 127299,  rate: 0.1229 },
        { min: 127299,  max: 172602,  rate: 0.147  },
        { min: 172602,  max: 240716,  rate: 0.168  },
        { min: 240716,  max: Infinity,rate: 0.205  },
      ],
      2025: [
        { min: 0,       max: 47937,   rate: 0.0506 },
        { min: 47937,   max: 95875,   rate: 0.077  },
        { min: 95875,   max: 110076,  rate: 0.105  },
        { min: 110076,  max: 133664,  rate: 0.1229 },
        { min: 133664,  max: 181232,  rate: 0.147  },
        { min: 181232,  max: 252752,  rate: 0.168  },
        { min: 252752,  max: Infinity,rate: 0.205  },
      ],
    },
    basic: { 2024: 11981, 2025: 12580 },
  },
  MB: {
    name: "Manitoba",
    brackets: {
      2024: [
        { min: 0,      max: 47000,   rate: 0.108 },
        { min: 47000,  max: 100000,  rate: 0.1275},
        { min: 100000, max: Infinity,rate: 0.174 },
      ],
      2025: [
        { min: 0,      max: 47000,   rate: 0.108 },
        { min: 47000,  max: 100000,  rate: 0.1275},
        { min: 100000, max: Infinity,rate: 0.174 },
      ],
    },
    basic: { 2024: 15780, 2025: 15780 },
  },
  NB: {
    name: "New Brunswick",
    brackets: {
      2024: [
        { min: 0,       max: 49958,   rate: 0.094  },
        { min: 49958,   max: 99916,   rate: 0.14   },
        { min: 99916,   max: 185064,  rate: 0.16   },
        { min: 185064,  max: Infinity,rate: 0.195  },
      ],
      2025: [
        { min: 0,       max: 51306,   rate: 0.094  },
        { min: 51306,   max: 102614,  rate: 0.14   },
        { min: 102614,  max: 190060,  rate: 0.16   },
        { min: 190060,  max: Infinity,rate: 0.195  },
      ],
    },
    basic: { 2024: 12458, 2025: 12792 },
  },
  NL: {
    name: "Newfoundland & Labrador",
    brackets: {
      2024: [
        { min: 0,       max: 43198,   rate: 0.087  },
        { min: 43198,   max: 86395,   rate: 0.145  },
        { min: 86395,   max: 154244,  rate: 0.158  },
        { min: 154244,  max: 215943,  rate: 0.178  },
        { min: 215943,  max: 275870,  rate: 0.198  },
        { min: 275870,  max: 551739,  rate: 0.208  },
        { min: 551739,  max: Infinity,rate: 0.218  },
      ],
      2025: [
        { min: 0,       max: 43198,   rate: 0.087  },
        { min: 43198,   max: 86395,   rate: 0.145  },
        { min: 86395,   max: 154244,  rate: 0.158  },
        { min: 154244,  max: 215943,  rate: 0.178  },
        { min: 215943,  max: 275870,  rate: 0.198  },
        { min: 275870,  max: 551739,  rate: 0.208  },
        { min: 551739,  max: Infinity,rate: 0.218  },
      ],
    },
    basic: { 2024: 10818, 2025: 10818 },
  },
  NS: {
    name: "Nova Scotia",
    brackets: {
      2024: [
        { min: 0,       max: 29590,   rate: 0.0879 },
        { min: 29590,   max: 59180,   rate: 0.1495 },
        { min: 59180,   max: 93000,   rate: 0.1667 },
        { min: 93000,   max: 150000,  rate: 0.175  },
        { min: 150000,  max: Infinity,rate: 0.21   },
      ],
      2025: [
        { min: 0,       max: 29590,   rate: 0.0879 },
        { min: 29590,   max: 59180,   rate: 0.1495 },
        { min: 59180,   max: 93000,   rate: 0.1667 },
        { min: 93000,   max: 150000,  rate: 0.175  },
        { min: 150000,  max: Infinity,rate: 0.21   },
      ],
    },
    basic: { 2024: 8481, 2025: 8481 },
  },
  NT: {
    name: "Northwest Territories",
    brackets: {
      2024: [
        { min: 0,       max: 50597,   rate: 0.059  },
        { min: 50597,   max: 101198,  rate: 0.086  },
        { min: 101198,  max: 164525,  rate: 0.122  },
        { min: 164525,  max: Infinity,rate: 0.1405 },
      ],
      2025: [
        { min: 0,       max: 50597,   rate: 0.059  },
        { min: 50597,   max: 101198,  rate: 0.086  },
        { min: 101198,  max: 164525,  rate: 0.122  },
        { min: 164525,  max: Infinity,rate: 0.1405 },
      ],
    },
    basic: { 2024: 16593, 2025: 16593 },
  },
  NU: {
    name: "Nunavut",
    brackets: {
      2024: [
        { min: 0,       max: 53268,   rate: 0.04   },
        { min: 53268,   max: 106537,  rate: 0.07   },
        { min: 106537,  max: 173205,  rate: 0.09   },
        { min: 173205,  max: Infinity,rate: 0.115  },
      ],
      2025: [
        { min: 0,       max: 53268,   rate: 0.04   },
        { min: 53268,   max: 106537,  rate: 0.07   },
        { min: 106537,  max: 173205,  rate: 0.09   },
        { min: 173205,  max: Infinity,rate: 0.115  },
      ],
    },
    basic: { 2024: 17925, 2025: 17925 },
  },
  ON: {
    name: "Ontario",
    brackets: {
      2024: [
        { min: 0,       max: 51446,   rate: 0.0505 },
        { min: 51446,   max: 102894,  rate: 0.0915 },
        { min: 102894,  max: 150000,  rate: 0.1116 },
        { min: 150000,  max: 220000,  rate: 0.1216 },
        { min: 220000,  max: Infinity,rate: 0.1316 },
      ],
      2025: [
        { min: 0,       max: 52886,   rate: 0.0505 },
        { min: 52886,   max: 105775,  rate: 0.0915 },
        { min: 105775,  max: 150000,  rate: 0.1116 },
        { min: 150000,  max: 220000,  rate: 0.1216 },
        { min: 220000,  max: Infinity,rate: 0.1316 },
      ],
    },
    basic: { 2024: 11141, 2025: 11865 },
  },
  PE: {
    name: "Prince Edward Island",
    brackets: {
      2024: [
        { min: 0,       max: 32656,   rate: 0.096  },
        { min: 32656,   max: 64313,   rate: 0.1337 },
        { min: 64313,   max: 105000,  rate: 0.167  },
        { min: 105000,  max: 140000,  rate: 0.18   },
        { min: 140000,  max: Infinity,rate: 0.1875 },
      ],
      2025: [
        { min: 0,       max: 32656,   rate: 0.096  },
        { min: 32656,   max: 64313,   rate: 0.1337 },
        { min: 64313,   max: 105000,  rate: 0.167  },
        { min: 105000,  max: 140000,  rate: 0.18   },
        { min: 140000,  max: Infinity,rate: 0.1875 },
      ],
    },
    basic: { 2024: 12000, 2025: 12000 },
  },
  QC: {
    name: "Quebec",
    brackets: {
      2024: [
        { min: 0,       max: 51780,   rate: 0.14   },
        { min: 51780,   max: 103545,  rate: 0.19   },
        { min: 103545,  max: 126000,  rate: 0.24   },
        { min: 126000,  max: Infinity,rate: 0.2575 },
      ],
      2025: [
        { min: 0,       max: 53255,   rate: 0.14   },
        { min: 53255,   max: 106495,  rate: 0.19   },
        { min: 106495,  max: 129590,  rate: 0.24   },
        { min: 129590,  max: Infinity,rate: 0.2575 },
      ],
    },
    basic: { 2024: 17183, 2025: 17680 },
  },
  SK: {
    name: "Saskatchewan",
    brackets: {
      2024: [
        { min: 0,      max: 49720,   rate: 0.105 },
        { min: 49720,  max: 142058,  rate: 0.125 },
        { min: 142058, max: Infinity,rate: 0.145 },
      ],
      2025: [
        { min: 0,      max: 49720,   rate: 0.105 },
        { min: 49720,  max: 142058,  rate: 0.125 },
        { min: 142058, max: Infinity,rate: 0.145 },
      ],
    },
    basic: { 2024: 17661, 2025: 17661 },
  },
  YT: {
    name: "Yukon",
    brackets: {
      2024: [
        { min: 0,       max: 55867,   rate: 0.064  },
        { min: 55867,   max: 111733,  rate: 0.09   },
        { min: 111733,  max: 154906,  rate: 0.109  },
        { min: 154906,  max: 500000,  rate: 0.128  },
        { min: 500000,  max: Infinity,rate: 0.15   },
      ],
      2025: [
        { min: 0,       max: 57375,   rate: 0.064  },
        { min: 57375,   max: 114750,  rate: 0.09   },
        { min: 114750,  max: 158519,  rate: 0.109  },
        { min: 158519,  max: 500000,  rate: 0.128  },
        { min: 500000,  max: Infinity,rate: 0.15   },
      ],
    },
    basic: { 2024: 15705, 2025: 16129 },
  },
};

// ─── Tax Calculation Logic ────────────────────────────────────────────────────

function calcBracketTax(income: number, brackets: BracketSet): number {
  let tax = 0;
  for (const b of brackets) {
    if (income <= b.min) break;
    const taxable = Math.min(income, b.max) - b.min;
    tax += taxable * b.rate;
  }
  return tax;
}

function getMarginalRate(income: number, fedBrackets: BracketSet, provBrackets: BracketSet): number {
  const fedRate = [...fedBrackets].reverse().find((b) => income > b.min)?.rate ?? 0;
  const provRate = [...provBrackets].reverse().find((b) => income > b.min)?.rate ?? 0;
  return fedRate + provRate;
}

interface TaxResult {
  grossIncome: number;
  federalTax: number;
  provincialTax: number;
  totalTax: number;
  cpp: number;
  ei: number;
  totalDeductions: number;
  netIncome: number;
  effectiveRate: number;
  marginalRate: number;
  monthlyNet: number;
  biweeklyNet: number;
}

function calculateTax(income: number, province: string, year: number): TaxResult | string {
  if (!income || income <= 0) return "Please enter a valid income";
  if (!province) return "Please select a province";

  const provData = PROVINCES[province];
  if (!provData) return "Invalid province";

  const fedBrackets = FEDERAL_BRACKETS[year];
  const provBrackets = provData.brackets[year];
  const fedBasic = FEDERAL_BASIC_PERSONAL[year];
  const provBasic = provData.basic[year];
  const cppData = CPP[year];
  const eiData = EI[year];

  // CPP
  const cppEarnings = Math.min(Math.max(income - cppData.exemption, 0), cppData.maxEarnings - cppData.exemption);
  const cpp = Math.round(cppEarnings * cppData.rate * 100) / 100;

  // EI
  const ei = Math.round(Math.min(income, eiData.maxInsurable) * eiData.rate * 100) / 100;

  // Federal tax
  const fedTaxBeforeCredit = calcBracketTax(income, fedBrackets);
  const fedBasicCredit = fedBasic * 0.15;
  const cppEiCredit = (cpp + ei) * 0.15;
  const federalTax = Math.max(0, fedTaxBeforeCredit - fedBasicCredit - cppEiCredit);

  // Provincial tax
  const provTaxBeforeCredit = calcBracketTax(income, provBrackets);
  const provRate = provBrackets[0].rate; // lowest bracket = credit rate for most provinces
  const provBasicCredit = provBasic * provRate;
  const provincialTax = Math.max(0, provTaxBeforeCredit - provBasicCredit);

  const totalTax = federalTax + provincialTax;
  const totalDeductions = totalTax + cpp + ei;
  const netIncome = income - totalDeductions;
  const effectiveRate = (totalTax / income) * 100;
  const marginalRate = getMarginalRate(income, fedBrackets, provBrackets) * 100;

  return {
    grossIncome: income,
    federalTax: Math.round(federalTax),
    provincialTax: Math.round(provincialTax),
    totalTax: Math.round(totalTax),
    cpp: Math.round(cpp),
    ei: Math.round(ei),
    totalDeductions: Math.round(totalDeductions),
    netIncome: Math.round(netIncome),
    effectiveRate: Math.round(effectiveRate * 10) / 10,
    marginalRate: Math.round(marginalRate * 10) / 10,
    monthlyNet: Math.round(netIncome / 12),
    biweeklyNet: Math.round(netIncome / 26),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => Math.abs(Math.round(n)).toLocaleString("en-CA");

// ─── Component ────────────────────────────────────────────────────────────────

export default function IncomeTaxClient() {
  const [income, setIncome] = useState<number | null>(null);
  const [province, setProvince] = useState("");
  const [year, setYear] = useState<2024 | 2025>(2025);

  const result = income && province ? calculateTax(income, province, year) : null;

  const provinceList = Object.entries(PROVINCES).sort((a, b) =>
    a[1].name.localeCompare(b[1].name)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <a href="/" className="hover:text-blue-600 transition-colors">Home</a>
            <span>/</span>
            <span>Income Tax Calculator</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Canadian Income Tax Calculator
          </h1>
          <p className="mt-2 text-gray-600 text-lg">
            Calculate your 2024 or 2025 federal and provincial income tax, CPP, EI, and take-home pay.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Input Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Your Income Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tax Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tax Year</label>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                {([2024, 2025] as const).map((y) => (
                  <button
                    key={y}
                    onClick={() => setYear(y)}
                    className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                      year === y
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>

            {/* Province */}
            <div>
              <label htmlFor="province" className="block text-sm font-medium text-gray-700 mb-2">
                Province / Territory
              </label>
              <select
                id="province"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-gray-900"
              >
                <option value="">Select province</option>
                {provinceList.map(([code, data]) => (
                  <option key={code} value={code}>{data.name}</option>
                ))}
              </select>
            </div>

            {/* Income */}
            <div>
              <label htmlFor="income" className="block text-sm font-medium text-gray-700 mb-2">
                Annual Employment Income
              </label>
              <NumericFormat
                id="income"
                thousandSeparator
                prefix="$"
                decimalScale={0}
                allowNegative={false}
                placeholder="$75,000"
                onValueChange={(v) => setIncome(v.floatValue ?? null)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-right"
              />
            </div>
          </div>
        </div>

        {/* Results */}
        {result === null ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">🍁</div>
            <p className="text-xl font-semibold text-gray-700">Enter your income and province above</p>
            <p className="text-gray-500 mt-2">Your full tax breakdown will appear here instantly.</p>
          </div>
        ) : typeof result === "string" ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-700 font-medium">
            {result}
          </div>
        ) : (
          <>
            {/* Take-home hero */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1 bg-blue-600 text-white rounded-xl p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-blue-200 uppercase tracking-wide">Annual Take-Home</p>
                <p className="text-4xl font-black mt-2">${fmt(result.netIncome)}</p>
                <p className="text-blue-200 text-sm mt-1">after all deductions</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Monthly Net</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">${fmt(result.monthlyNet)}</p>
                <p className="text-gray-400 text-sm mt-1">per month</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Bi-weekly Net</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">${fmt(result.biweeklyNet)}</p>
                <p className="text-gray-400 text-sm mt-1">every 2 weeks</p>
              </div>
            </div>

            {/* Tax Rates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Effective Tax Rate</p>
                <p className="text-4xl font-bold text-orange-500">{result.effectiveRate}%</p>
                <p className="text-gray-500 text-sm mt-2">
                  You pay {result.effectiveRate}% of your total income in income tax.
                </p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Marginal Tax Rate</p>
                <p className="text-4xl font-bold text-purple-600">{result.marginalRate}%</p>
                <p className="text-gray-500 text-sm mt-2">
                  Tax rate on each additional dollar of income earned.
                </p>
              </div>
            </div>

            {/* Full Breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">Full Tax Breakdown — {year}</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  { label: "Gross Income",          value: result.grossIncome,    color: "text-gray-900", bold: true  },
                  { label: "Federal Income Tax",     value: -result.federalTax,    color: "text-red-600",  bold: false },
                  { label: `${PROVINCES[province]?.name ?? ""} Provincial Tax`, value: -result.provincialTax, color: "text-red-500", bold: false },
                  { label: "CPP Contributions",      value: -result.cpp,           color: "text-amber-600",bold: false },
                  { label: "EI Premiums",            value: -result.ei,            color: "text-amber-500",bold: false },
                  { label: "Total Deductions",       value: -result.totalDeductions,color: "text-red-700", bold: true  },
                  { label: "Net Take-Home Income",   value: result.netIncome,      color: "text-blue-700", bold: true  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className={`flex justify-between items-center px-6 py-3.5 ${
                      row.bold ? "bg-gray-50" : "hover:bg-gray-50"
                    } transition-colors`}
                  >
                    <span className={`text-sm ${row.bold ? "font-semibold text-gray-800" : "text-gray-600"}`}>
                      {row.label}
                    </span>
                    <span className={`font-${row.bold ? "bold" : "medium"} ${row.color} text-sm`}>
                      {row.value < 0 ? "-" : ""}${fmt(row.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Where Your Income Goes
              </h3>
              <div className="space-y-3">
                {[
                  { label: "Take-Home Pay",    value: result.netIncome,      color: "bg-blue-500",   pct: (result.netIncome / result.grossIncome) * 100 },
                  { label: "Federal Tax",      value: result.federalTax,     color: "bg-red-500",    pct: (result.federalTax / result.grossIncome) * 100 },
                  { label: "Provincial Tax",   value: result.provincialTax,  color: "bg-orange-400", pct: (result.provincialTax / result.grossIncome) * 100 },
                  { label: "CPP",              value: result.cpp,            color: "bg-amber-400",  pct: (result.cpp / result.grossIncome) * 100 },
                  { label: "EI",               value: result.ei,             color: "bg-yellow-300", pct: (result.ei / result.grossIncome) * 100 },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{row.label}</span>
                      <span className="font-medium text-gray-800">
                        ${fmt(row.value)} ({row.pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${row.color} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min(row.pct, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* SEO Content / FAQ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 prose prose-gray max-w-none">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            How Canadian Income Tax Works in {year}
          </h2>
          <p className="text-gray-600">
            Canada uses a <strong>progressive tax system</strong> — you pay a higher rate only on the portion of your income that falls within each bracket, not on your entire income. Your total tax combines federal tax and your provincial or territorial tax.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">What is the Basic Personal Amount?</h3>
          <p className="text-gray-600">
            Every Canadian resident can earn a base amount of income tax-free. For {year}, the federal basic personal amount is <strong>${FEDERAL_BASIC_PERSONAL[year].toLocaleString("en-CA")}</strong>. Each province also has its own basic personal amount applied to provincial tax.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">CPP and EI Deductions</h3>
          <p className="text-gray-600">
            In addition to income tax, most employed Canadians contribute to the <strong>Canada Pension Plan (CPP)</strong> and pay <strong>Employment Insurance (EI)</strong> premiums. For {year}, the CPP contribution rate is {(CPP[year].rate * 100).toFixed(2)}% on earnings between $3,500 and ${CPP[year].maxEarnings.toLocaleString("en-CA")}. The EI premium rate is {(EI[year].rate * 100).toFixed(2)}% on insurable earnings up to ${EI[year].maxInsurable.toLocaleString("en-CA")}.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Marginal vs. Effective Tax Rate</h3>
          <p className="text-gray-600">
            Your <strong>marginal tax rate</strong> is the rate you pay on your next dollar of income — useful for decisions like RRSP contributions or freelance income. Your <strong>effective tax rate</strong> is the actual percentage of your total income paid in tax — a more accurate picture of your overall tax burden.
          </p>

          <p className="text-sm text-gray-400 mt-6">
            This calculator provides estimates based on published {year} federal and provincial tax brackets. It does not account for additional credits, deductions, surtaxes, or other personal circumstances. Consult a tax professional for personalized advice.
          </p>
        </div>
      </div>
    </div>
  );
}
