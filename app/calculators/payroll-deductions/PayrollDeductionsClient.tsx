"use client";

// app/calculators/payroll-deductions/PayrollDeductionsClient.tsx

import { useState, useMemo } from "react";
import { NumericFormat } from "react-number-format";

// ─── 2025 Constants ───────────────────────────────────────────────────────────

// CPP
const CPP_RATE           = 0.0595;
const CPP_EXEMPTION      = 3500;
const CPP_MAX_EARNINGS   = 71300;
const CPP_MAX_CONTRIB    = 4034.10;

// CPP2
const CPP2_RATE          = 0.04;
const CPP2_MIN_EARNINGS  = 71300;
const CPP2_MAX_EARNINGS  = 81900;
const CPP2_MAX_CONTRIB   = 424.00;

// EI
const EI_RATE            = 0.01049;
const EI_RATE_QC         = 0.00882;  // Quebec — provincial plan covers some EI
const EI_MAX_INSURABLE   = 65700;
const EI_MAX_PREMIUM     = 689.00;
const EI_MAX_PREMIUM_QC  = 579.36;

// Federal brackets 2025
const FED_BRACKETS = [
  { min: 0,       max: 57375,   rate: 0.15   },
  { min: 57375,   max: 114750,  rate: 0.205  },
  { min: 114750,  max: 158519,  rate: 0.26   },
  { min: 158519,  max: 220000,  rate: 0.29   },
  { min: 220000,  max: Infinity,rate: 0.33   },
];
const FED_BPA = 16129;

// Provincial data
const PROVINCES: Record<string, {
  name:     string;
  brackets: Array<{ max: number; rate: number }>;
  bpa:      number;
  hasQPP:   boolean;  // Quebec uses QPP instead of CPP
}> = {
  AB: { name: "Alberta",                  hasQPP: false, bpa: 21003, brackets: [
    { max: 148269, rate: 0.10 }, { max: 177922, rate: 0.12 },
    { max: 237230, rate: 0.13 }, { max: 355845, rate: 0.14 }, { max: Infinity, rate: 0.15 },
  ]},
  BC: { name: "British Columbia",         hasQPP: false, bpa: 11981, brackets: [
    { max: 45654,  rate: 0.0506 }, { max: 91310,  rate: 0.077  },
    { max: 104835, rate: 0.105  }, { max: 127299, rate: 0.1229 },
    { max: 172602, rate: 0.147  }, { max: 240716, rate: 0.168  }, { max: Infinity, rate: 0.205 },
  ]},
  MB: { name: "Manitoba",                 hasQPP: false, bpa: 15780, brackets: [
    { max: 47000,  rate: 0.108 }, { max: 100000, rate: 0.1275 }, { max: Infinity, rate: 0.174 },
  ]},
  NB: { name: "New Brunswick",            hasQPP: false, bpa: 12458, brackets: [
    { max: 49958,  rate: 0.094 }, { max: 99916,  rate: 0.14   },
    { max: 185064, rate: 0.16  }, { max: Infinity, rate: 0.195 },
  ]},
  NL: { name: "Newfoundland & Labrador",  hasQPP: false, bpa: 10818, brackets: [
    { max: 43198,  rate: 0.087 }, { max: 86395,  rate: 0.145  },
    { max: 154244, rate: 0.158 }, { max: 215943, rate: 0.178  },
    { max: 275870, rate: 0.198 }, { max: Infinity, rate: 0.218 },
  ]},
  NS: { name: "Nova Scotia",              hasQPP: false, bpa: 8481,  brackets: [
    { max: 29590,  rate: 0.0879 }, { max: 59180, rate: 0.1495 },
    { max: 93000,  rate: 0.1667 }, { max: 150000, rate: 0.175 }, { max: Infinity, rate: 0.21 },
  ]},
  NT: { name: "Northwest Territories",    hasQPP: false, bpa: 16593, brackets: [
    { max: 50597,  rate: 0.059 }, { max: 101198, rate: 0.086  },
    { max: 164525, rate: 0.122 }, { max: Infinity, rate: 0.1405 },
  ]},
  NU: { name: "Nunavut",                  hasQPP: false, bpa: 17925, brackets: [
    { max: 53268,  rate: 0.04  }, { max: 106537, rate: 0.07   },
    { max: 173205, rate: 0.09  }, { max: Infinity, rate: 0.115 },
  ]},
  ON: { name: "Ontario",                  hasQPP: false, bpa: 11865, brackets: [
    { max: 51446,  rate: 0.0505 }, { max: 102894, rate: 0.0915 },
    { max: 150000, rate: 0.1116 }, { max: 220000, rate: 0.1216 }, { max: Infinity, rate: 0.1316 },
  ]},
  PE: { name: "Prince Edward Island",     hasQPP: false, bpa: 12000, brackets: [
    { max: 32656,  rate: 0.098 }, { max: 64313,  rate: 0.138  },
    { max: 105000, rate: 0.167 }, { max: 140000, rate: 0.18   }, { max: Infinity, rate: 0.185 },
  ]},
  QC: { name: "Quebec",                   hasQPP: true,  bpa: 17183, brackets: [
    { max: 51780,  rate: 0.14  }, { max: 103545, rate: 0.19   },
    { max: 126000, rate: 0.24  }, { max: Infinity, rate: 0.2575 },
  ]},
  SK: { name: "Saskatchewan",             hasQPP: false, bpa: 17661, brackets: [
    { max: 49720,  rate: 0.105 }, { max: 142058, rate: 0.125  }, { max: Infinity, rate: 0.145 },
  ]},
  YT: { name: "Yukon",                    hasQPP: false, bpa: 16129, brackets: [
    { max: 57375,  rate: 0.064 }, { max: 114750, rate: 0.09   },
    { max: 158519, rate: 0.109 }, { max: 500000, rate: 0.1279 }, { max: Infinity, rate: 0.1502 },
  ]},
};

// QPP (Quebec Pension Plan) — slightly different from CPP
const QPP_RATE         = 0.0640;
const QPP_MAX_CONTRIB  = 4463.40;
const QPP2_RATE        = 0.04;
const QPP2_MAX_CONTRIB = 424.00;

// Pay frequencies
const PAY_FREQUENCIES = [
  { label: "Weekly",       value: "weekly",       periods: 52  },
  { label: "Bi-Weekly",    value: "biweekly",     periods: 26  },
  { label: "Semi-Monthly", value: "semimonthly",  periods: 24  },
  { label: "Monthly",      value: "monthly",      periods: 12  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt    = (n: number) => n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n: number) => Math.round(n).toLocaleString("en-CA");
const fmtPct = (n: number) => (n * 100).toFixed(2);

function calcProvTax(income: number, brackets: Array<{ max: number; rate: number }>, bpa: number): number {
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

function calcFedTax(income: number): number {
  const taxable = Math.max(0, income - FED_BPA);
  let tax = 0, prev = 0;
  for (const b of FED_BRACKETS) {
    if (taxable <= prev) break;
    tax += (Math.min(taxable, b.max) - prev) * b.rate;
    prev = b.max;
    if (b.max === Infinity) break;
  }
  return tax;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PayrollDeductionsClient() {
  const [province,       setProvince]       = useState("ON");
  const [grossSalary,    setGrossSalary]    = useState<number | null>(null);
  const [payFrequency,   setPayFrequency]   = useState("biweekly");
  const [rrspContrib,    setRrspContrib]    = useState<number | null>(null);
  const [otherDeductions,setOtherDeductions]= useState<number | null>(null);
  const [unionDues,      setUnionDues]      = useState<number | null>(null);
  const [benefitsPremium,setBenefitsPremium]= useState<number | null>(null);
  const [pensionContrib, setPensionContrib] = useState<number | null>(null);
  const [claimCode,      setClaimCode]      = useState<1 | 2>(1); // TD1 basic or married

  const provData      = PROVINCES[province];
  const isQC          = province === "QC";
  const freqData      = PAY_FREQUENCIES.find(f => f.value === payFrequency)!;
  const periods       = freqData.periods;

  const provinceList  = Object.entries(PROVINCES).sort((a, b) => a[1].name.localeCompare(b[1].name));

  const result = useMemo(() => {
    if (!grossSalary || grossSalary <= 0) return null;

    const annual         = grossSalary;
    const rrsp           = (rrspContrib ?? 0) * periods;  // annual RRSP
    const otherAnnual    = (otherDeductions ?? 0) * periods;
    const unionAnnual    = (unionDues ?? 0) * periods;
    const benefitsAnnual = (benefitsPremium ?? 0) * periods;
    const pensionAnnual  = (pensionContrib ?? 0) * periods;

    // Total pre-tax deductions that reduce taxable income
    const preTaxDeductions = rrsp + pensionAnnual;
    const taxableIncome    = Math.max(0, annual - preTaxDeductions);

    // ── CPP / QPP ─────────────────────────────────────────────────────────
    let cppAnnual  = 0;
    let cpp2Annual = 0;

    if (!isQC) {
      const cppEarnings  = Math.min(Math.max(0, annual - CPP_EXEMPTION), CPP_MAX_EARNINGS - CPP_EXEMPTION);
      cppAnnual          = Math.min(cppEarnings * CPP_RATE, CPP_MAX_CONTRIB);
      const cpp2Earnings = Math.max(0, Math.min(annual, CPP2_MAX_EARNINGS) - CPP2_MIN_EARNINGS);
      cpp2Annual         = Math.min(cpp2Earnings * CPP2_RATE, CPP2_MAX_CONTRIB);
    } else {
      // QPP
      const qppEarnings  = Math.min(Math.max(0, annual - CPP_EXEMPTION), CPP_MAX_EARNINGS - CPP_EXEMPTION);
      cppAnnual          = Math.min(qppEarnings * QPP_RATE, QPP_MAX_CONTRIB);
      const qpp2Earnings = Math.max(0, Math.min(annual, CPP2_MAX_EARNINGS) - CPP2_MIN_EARNINGS);
      cpp2Annual         = Math.min(qpp2Earnings * QPP2_RATE, QPP2_MAX_CONTRIB);
    }
    const totalCPP       = cppAnnual + cpp2Annual;

    // ── EI ────────────────────────────────────────────────────────────────
    const eiRate         = isQC ? EI_RATE_QC : EI_RATE;
    const eiMax          = isQC ? EI_MAX_PREMIUM_QC : EI_MAX_PREMIUM;
    const eiAnnual       = Math.min(Math.min(annual, EI_MAX_INSURABLE) * eiRate, eiMax);

    // ── Federal Tax ───────────────────────────────────────────────────────
    // CPP/EI credits reduce federal tax
    const fedTaxGross    = calcFedTax(taxableIncome);
    const fedCPPCredit   = cppAnnual * 0.15;
    const fedEICredit    = eiAnnual * 0.15;
    // TD1 — claim code 2 adds spousal amount (~$15k)
    const spouseCredit   = claimCode === 2 ? 16129 * 0.15 : 0;
    const fedTax         = Math.max(0, fedTaxGross - fedCPPCredit - fedEICredit - spouseCredit);

    // ── Provincial Tax ────────────────────────────────────────────────────
    const provTaxGross   = calcProvTax(taxableIncome, provData.brackets, provData.bpa);
    const provCPPCredit  = cppAnnual * (provData.brackets[0]?.rate ?? 0.05);
    const provTax        = Math.max(0, provTaxGross - provCPPCredit);

    // ── Other after-tax deductions ────────────────────────────────────────
    const totalTax       = fedTax + provTax;
    const totalDeductions= totalCPP + eiAnnual + totalTax + rrsp + benefitsAnnual + unionAnnual + pensionAnnual;
    const netAnnual      = annual - totalDeductions;

    // ── Per-period breakdown ──────────────────────────────────────────────
    const perPeriod = (v: number) => v / periods;

    // ── Marginal rate ─────────────────────────────────────────────────────
    const fedMarginal    = FED_BRACKETS.find(b => taxableIncome <= b.max)?.rate ?? 0.33;
    let   provMarginal   = provData.brackets[provData.brackets.length - 1].rate;
    let   prev           = 0;
    for (const b of provData.brackets) {
      if (taxableIncome <= b.max) { provMarginal = b.rate; break; }
      prev = b.max;
    }
    const combinedMarginal = fedMarginal + provMarginal;
    const effectiveRate    = annual > 0 ? (totalTax + totalCPP + eiAnnual) / annual : 0;

    return {
      annual,
      taxableIncome,
      // Annual
      fedTax,
      provTax,
      totalTax,
      cppAnnual,
      cpp2Annual,
      totalCPP,
      eiAnnual,
      rrspAnnual:    rrsp,
      benefitsAnnual,
      unionAnnual,
      pensionAnnual,
      preTaxDeductions,
      totalDeductions,
      netAnnual,
      // Per period
      grossPerPeriod:     perPeriod(annual),
      fedTaxPerPeriod:    perPeriod(fedTax),
      provTaxPerPeriod:   perPeriod(provTax),
      cppPerPeriod:       perPeriod(totalCPP),
      eiPerPeriod:        perPeriod(eiAnnual),
      rrspPerPeriod:      perPeriod(rrsp),
      benefitsPerPeriod:  perPeriod(benefitsAnnual),
      unionPerPeriod:     perPeriod(unionAnnual),
      pensionPerPeriod:   perPeriod(pensionAnnual),
      netPerPeriod:       perPeriod(netAnnual),
      // Rates
      fedMarginal,
      provMarginal,
      combinedMarginal,
      effectiveRate,
      periods,
      isQC,
    };
  }, [grossSalary, province, payFrequency, rrspContrib, otherDeductions,
      unionDues, benefitsPremium, pensionContrib, claimCode, provData, isQC, periods]);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-gray-900">Payroll Deductions Calculator</h1>
          <p className="text-gray-500 mt-1">
            Calculate your exact take-home pay after income tax, CPP, EI, and other deductions — all provinces, 2025 rates.
          </p>
        </div>

        {/* Inputs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-800">Your Employment Details</h2>

          {/* Province */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Province of Employment</label>
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
            >
              {provinceList.map(([code, data]) => (
                <option key={code} value={code}>{data.name}</option>
              ))}
            </select>
            {isQC && (
              <p className="text-xs text-blue-600 mt-1 font-medium">
                Quebec uses QPP instead of CPP, and has a reduced EI rate.
              </p>
            )}
          </div>

          {/* Gross salary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Annual Gross Salary</label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$75,000"
              onValueChange={(v) => setGrossSalary(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right"
            />
          </div>

          {/* Pay frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pay Frequency</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PAY_FREQUENCIES.map(f => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setPayFrequency(f.value)}
                  className={`px-3 py-2.5 rounded-lg text-sm font-semibold border-2 transition-colors text-center ${
                    payFrequency === f.value
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                  }`}
                >
                  <p>{f.label}</p>
                  <p className={`text-xs font-normal mt-0.5 ${payFrequency === f.value ? "text-blue-200" : "text-gray-400"}`}>
                    {f.periods}×/yr
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* TD1 Claim Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">TD1 Claim</label>
            <div className="flex gap-3">
              {[
                { code: 1 as const, label: "Code 1 — Single / Basic Personal Amount" },
                { code: 2 as const, label: "Code 2 — Married / Spouse Credit" },
              ].map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setClaimCode(c.code)}
                  className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium border-2 text-left transition-colors ${
                    claimCode === c.code
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Optional deductions */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">
              Additional Deductions Per Pay Period
              <span className="text-gray-400 font-normal ml-1">(optional)</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "RRSP Contribution",    setter: setRrspContrib,      hint: "Pre-tax, reduces taxable income", icon: "📊" },
                { label: "Pension Contribution",  setter: setPensionContrib,   hint: "RPP/DPSP — pre-tax",             icon: "🏦" },
                { label: "Benefits Premium",      setter: setBenefitsPremium,  hint: "Health/dental — after-tax",      icon: "🏥" },
                { label: "Union Dues",            setter: setUnionDues,        hint: "After-tax deduction",            icon: "🤝" },
              ].map(d => (
                <div key={d.label} className="flex items-start gap-3 p-3 border border-gray-100 rounded-lg">
                  <span className="text-lg mt-0.5">{d.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-700">{d.label}</p>
                    <p className="text-xs text-gray-400 mb-1.5">{d.hint}</p>
                    <NumericFormat
                      thousandSeparator prefix="$" decimalScale={2} allowNegative={false}
                      placeholder="$0.00"
                      onValueChange={(v) => d.setter(v.floatValue ?? null)}
                      className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        {!result ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">💰</div>
            <p className="text-xl font-semibold text-gray-700">Enter your salary above</p>
            <p className="text-gray-500 mt-2">Your take-home pay breakdown will appear here instantly.</p>
          </div>
        ) : (
          <>
            {/* Hero */}
            <div className="bg-blue-600 text-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 text-center">
                <p className="text-sm font-medium text-blue-200 uppercase tracking-wide">
                  {freqData.label} Take-Home Pay
                </p>
                <p className="text-6xl font-black mt-2">${fmt(result.netPerPeriod)}</p>
                <p className="text-blue-200 text-sm mt-1">
                  ${fmtInt(result.netAnnual)}/year · {(result.effectiveRate * 100).toFixed(1)}% effective rate
                </p>
              </div>
              {/* Mini breakdown strip */}
              <div className="grid grid-cols-3 border-t border-blue-500 divide-x divide-blue-500">
                {[
                  { label: "Gross",    value: `$${fmt(result.grossPerPeriod)}`  },
                  { label: "Deducted", value: `-$${fmt(result.grossPerPeriod - result.netPerPeriod)}` },
                  { label: "Net",      value: `$${fmt(result.netPerPeriod)}`    },
                ].map(s => (
                  <div key={s.label} className="px-4 py-3 text-center">
                    <p className="text-xs text-blue-300 uppercase tracking-wide">{s.label}</p>
                    <p className="text-sm font-bold text-white mt-0.5">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Key stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Marginal Rate",   value: `${(result.combinedMarginal * 100).toFixed(1)}%`, sub: `${(result.fedMarginal * 100).toFixed(1)}% fed + ${(result.provMarginal * 100).toFixed(1)}% prov`, color: "text-gray-800" },
                { label: "Income Tax",      value: `$${fmt(result.fedTaxPerPeriod + result.provTaxPerPeriod)}`, sub: `${freqData.label.toLowerCase()} / $${fmtInt(result.totalTax)}/yr`, color: "text-red-500"   },
                { label: isQC ? "QPP" : "CPP",  value: `$${fmt(result.cppPerPeriod)}`, sub: `${freqData.label.toLowerCase()} / $${fmtInt(result.totalCPP)}/yr`, color: "text-orange-500" },
                { label: "EI Premium",      value: `$${fmt(result.eiPerPeriod)}`,  sub: `${freqData.label.toLowerCase()} / $${fmtInt(result.eiAnnual)}/yr`,  color: "text-purple-500" },
              ].map(s => (
                <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Per-period pay stub */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Pay Stub — {freqData.label}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Per-period deduction breakdown</p>
                </div>
                <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
                  {periods}× per year
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                <div className="px-6 py-3 bg-gray-50 flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-700">Gross Pay</span>
                  <span className="text-sm font-bold text-gray-900">${fmt(result.grossPerPeriod)}</span>
                </div>

                <div className="px-6 py-2 bg-red-50">
                  <p className="text-xs font-semibold text-red-400 uppercase tracking-wide pt-1 pb-1">Statutory Deductions</p>
                </div>
                {[
                  { label: "Federal Income Tax",    value: result.fedTaxPerPeriod,   annual: result.fedTax   },
                  { label: `Provincial Tax (${provData.name})`, value: result.provTaxPerPeriod, annual: result.provTax },
                  { label: isQC ? "QPP" : "CPP",    value: result.cppPerPeriod,      annual: result.totalCPP },
                  { label: "EI Premium",             value: result.eiPerPeriod,       annual: result.eiAnnual },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center px-6 py-2.5 hover:bg-gray-50">
                    <span className="text-sm text-gray-600">{row.label}</span>
                    <div className="text-right">
                      <span className="text-sm font-medium text-red-500">−${fmt(row.value)}</span>
                      <span className="text-xs text-gray-300 ml-2">${fmtInt(row.annual)}/yr</span>
                    </div>
                  </div>
                ))}

                {(result.rrspPerPeriod > 0 || result.pensionPerPeriod > 0 || result.benefitsPerPeriod > 0 || result.unionPerPeriod > 0) && (
                  <>
                    <div className="px-6 py-2 bg-blue-50">
                      <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide pt-1 pb-1">Other Deductions</p>
                    </div>
                    {[
                      { label: "RRSP Contribution", value: result.rrspPerPeriod,     show: result.rrspPerPeriod > 0,     note: "pre-tax"  },
                      { label: "Pension (RPP)",      value: result.pensionPerPeriod,  show: result.pensionPerPeriod > 0,  note: "pre-tax"  },
                      { label: "Benefits Premium",   value: result.benefitsPerPeriod, show: result.benefitsPerPeriod > 0, note: "after-tax"},
                      { label: "Union Dues",         value: result.unionPerPeriod,    show: result.unionPerPeriod > 0,    note: "after-tax"},
                    ].filter(r => r.show).map(row => (
                      <div key={row.label} className="flex justify-between items-center px-6 py-2.5 hover:bg-gray-50">
                        <div>
                          <span className="text-sm text-gray-600">{row.label}</span>
                          <span className="text-xs text-gray-400 ml-1.5">({row.note})</span>
                        </div>
                        <span className="text-sm font-medium text-blue-600">−${fmt(row.value)}</span>
                      </div>
                    ))}
                  </>
                )}

                <div className="flex justify-between items-center px-6 py-4 bg-green-50">
                  <span className="text-base font-bold text-gray-800">Net Pay ({freqData.label})</span>
                  <span className="text-xl font-black text-green-700">${fmt(result.netPerPeriod)}</span>
                </div>
              </div>
            </div>

            {/* Annual summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">Annual Summary</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  { label: "Gross Income",          value: result.annual,            color: "text-gray-800",   bold: true,  sign: ""  },
                  { label: "Federal Income Tax",     value: result.fedTax,            color: "text-red-500",    bold: false, sign: "−" },
                  { label: `Provincial Tax`,         value: result.provTax,           color: "text-red-400",    bold: false, sign: "−" },
                  { label: isQC ? "QPP" : "CPP",    value: result.totalCPP,          color: "text-orange-500", bold: false, sign: "−" },
                  { label: "EI Premiums",            value: result.eiAnnual,          color: "text-purple-500", bold: false, sign: "−" },
                  { label: "RRSP Contributions",     value: result.rrspAnnual,        color: "text-blue-500",   bold: false, sign: "−", hide: result.rrspAnnual === 0 },
                  { label: "Benefits / Pension",     value: result.benefitsAnnual + result.pensionAnnual, color: "text-blue-400", bold: false, sign: "−", hide: result.benefitsAnnual + result.pensionAnnual === 0 },
                  { label: "Total Deductions",       value: result.totalDeductions,   color: "text-gray-700",   bold: true,  sign: "−" },
                  { label: "Annual Net Income",      value: result.netAnnual,         color: "text-green-700",  bold: true,  sign: ""  },
                ].filter(r => !r.hide).map(row => (
                  <div key={row.label} className={`flex justify-between items-center px-6 py-3 ${row.bold ? "bg-gray-50" : "hover:bg-gray-50"}`}>
                    <span className={`text-sm ${row.bold ? "font-semibold text-gray-800" : "text-gray-600"}`}>{row.label}</span>
                    <span className={`text-sm font-${row.bold ? "bold" : "medium"} ${row.color}`}>
                      {row.sign}${fmtInt(row.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Where your money goes bars */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Where Your Salary Goes</h3>
              <div className="space-y-3">
                {[
                  { label: `Take-Home (${((result.netAnnual / result.annual) * 100).toFixed(0)}%)`,      value: result.netAnnual,   color: "bg-green-500" },
                  { label: `Federal Tax (${((result.fedTax / result.annual) * 100).toFixed(0)}%)`,       value: result.fedTax,      color: "bg-red-400"   },
                  { label: `Provincial Tax (${((result.provTax / result.annual) * 100).toFixed(0)}%)`,   value: result.provTax,     color: "bg-red-300"   },
                  { label: `${isQC ? "QPP" : "CPP"} (${((result.totalCPP / result.annual) * 100).toFixed(0)}%)`,  value: result.totalCPP,    color: "bg-orange-400"},
                  { label: `EI (${((result.eiAnnual / result.annual) * 100).toFixed(0)}%)`,              value: result.eiAnnual,    color: "bg-purple-400"},
                ].filter(r => r.value > 0).map(row => (
                  <div key={row.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{row.label}</span>
                      <span className="font-medium text-gray-800">${fmtInt(row.value)}</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${row.color} rounded-full transition-all duration-500`}
                        style={{ width: `${(row.value / result.annual) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Raise impact calculator */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <p className="text-sm font-semibold text-blue-800 mb-1">
                💡 Raise Impact — Your Marginal Rate is {(result.combinedMarginal * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-blue-700">
                Every $1,000 raise increases your take-home by approximately{" "}
                <strong>${fmtInt(1000 * (1 - result.combinedMarginal))}</strong> after tax.
                A $5,000 raise adds about <strong>${fmtInt(5000 * (1 - result.combinedMarginal))}</strong> to your annual net pay
                — or <strong>${fmt((5000 * (1 - result.combinedMarginal)) / periods)}</strong> per {freqData.label.toLowerCase()} paycheque.
              </p>
            </div>
          </>
        )}

        {/* SEO / FAQ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 prose prose-gray max-w-none">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Canadian Payroll Deductions — 2025 Guide</h2>
          <p className="text-gray-600">
            Every Canadian employee has several mandatory deductions taken off each paycheque: federal and provincial income tax, CPP (or QPP in Quebec), and EI premiums. Understanding what's being deducted and why helps you plan your finances and verify your pay stub is correct.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">How Income Tax Withholding Works</h3>
          <p className="text-gray-600">
            Your employer uses your TD1 form (federal) and TD1 provincial form to estimate how much tax to withhold each pay period. The withholding is designed so that your total deductions for the year approximately equal your actual tax owing. If too much is withheld, you get a refund; too little means you owe at tax time.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">CPP Contributions in 2025</h3>
          <p className="text-gray-600">
            Employees contribute 5.95% of earnings between $3,500 and $71,300 — up to $4,034. Employers match this amount. CPP2 applies to earnings between $71,300 and $81,900 at 4%, adding up to $424. Quebec employees contribute to QPP (6.40%) instead of CPP, with their employer also matching.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">EI Premiums in 2025</h3>
          <p className="text-gray-600">
            EI premiums are 1.049% of insurable earnings up to $65,700 — maximum $689/year. Employers pay 1.4× the employee rate. Quebec residents have a lower EI rate (0.882%) because the Quebec Parental Insurance Plan (QPIP) covers parental benefits separately.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">RRSP Contributions Reduce Your Tax</h3>
          <p className="text-gray-600">
            If your employer offers a group RRSP or pension plan (RPP), contributions are deducted before tax is calculated — immediately reducing your taxable income. This is one of the most tax-efficient ways to save, as you effectively receive an instant tax refund through reduced withholding.
          </p>

          <p className="text-sm text-gray-400 mt-6">
            Calculations use 2025 federal and provincial tax brackets, CPP/QPP and EI rates. Ontario surtax not included. Quebec abatement included via lower federal rate adjustment. Actual withholding may vary based on other credits and circumstances. Not tax advice.
          </p>
        </div>

      </div>
    </div>
  );
}
