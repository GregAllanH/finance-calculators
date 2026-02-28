"use client";

import { useState, useMemo } from "react";
import { NumericFormat } from "react-number-format";
import PrintButton from "@/components/PrintButton";
import Link from "next/link";

// ─── 2025 Tax Data ────────────────────────────────────────────────────────────

const FEDERAL_BRACKETS = [
  { min: 0, max: 57375, rate: 0.15 },
  { min: 57375, max: 114750, rate: 0.205 },
  { min: 114750, max: 158519, rate: 0.26 },
  { min: 158519, max: 220000, rate: 0.29 },
  { min: 220000, max: Infinity, rate: 0.33 },
];
const FED_BASIC_PERSONAL = 16129;
const GST_CREDIT_BASE = 519;       // single, full year
const GST_CREDIT_SPOUSE = 519;
const GST_CREDIT_PER_CHILD = 137;
const CCB_MAX_UNDER6 = 7437;       // per child under 6
const CCB_MAX_6TO17 = 6275;        // per child 6–17

const PROV_BRACKETS: Record<string, {
  name: string;
  brackets: { min: number; max: number; rate: number }[];
  basic: number;
  healthPremium?: (income: number) => number;
}> = {
  AB: { name: "Alberta", basic: 21003, brackets: [{ min: 0, max: 148269, rate: 0.10 }, { min: 148269, max: 177922, rate: 0.12 }, { min: 177922, max: 237230, rate: 0.13 }, { min: 237230, max: 355845, rate: 0.14 }, { min: 355845, max: Infinity, rate: 0.15 }] },
  BC: { name: "British Columbia", basic: 11981, brackets: [{ min: 0, max: 45654, rate: 0.0506 }, { min: 45654, max: 91310, rate: 0.077 }, { min: 91310, max: 104835, rate: 0.105 }, { min: 104835, max: 127299, rate: 0.1229 }, { min: 127299, max: 172602, rate: 0.147 }, { min: 172602, max: 240716, rate: 0.168 }, { min: 240716, max: Infinity, rate: 0.205 }] },
  MB: { name: "Manitoba", basic: 15780, brackets: [{ min: 0, max: 47000, rate: 0.108 }, { min: 47000, max: 100000, rate: 0.1275 }, { min: 100000, max: Infinity, rate: 0.174 }] },
  NB: { name: "New Brunswick", basic: 12458, brackets: [{ min: 0, max: 49958, rate: 0.094 }, { min: 49958, max: 99916, rate: 0.14 }, { min: 99916, max: 185064, rate: 0.16 }, { min: 185064, max: Infinity, rate: 0.195 }] },
  NL: { name: "Newfoundland & Labrador", basic: 10818, brackets: [{ min: 0, max: 43198, rate: 0.087 }, { min: 43198, max: 86395, rate: 0.145 }, { min: 86395, max: 154244, rate: 0.158 }, { min: 154244, max: 215943, rate: 0.178 }, { min: 215943, max: Infinity, rate: 0.198 }] },
  NS: { name: "Nova Scotia", basic: 8481, brackets: [{ min: 0, max: 29590, rate: 0.0879 }, { min: 29590, max: 59180, rate: 0.1495 }, { min: 59180, max: 93000, rate: 0.1667 }, { min: 93000, max: 150000, rate: 0.175 }, { min: 150000, max: Infinity, rate: 0.21 }] },
  ON: {
    name: "Ontario", basic: 11865,
    brackets: [{ min: 0, max: 51446, rate: 0.0505 }, { min: 51446, max: 102894, rate: 0.0915 }, { min: 102894, max: 150000, rate: 0.1116 }, { min: 150000, max: 220000, rate: 0.1216 }, { min: 220000, max: Infinity, rate: 0.1316 }],
    healthPremium: (income: number) => {
      if (income <= 20000) return 0;
      if (income <= 36000) return Math.min(300, (income - 20000) * 0.06);
      if (income <= 48000) return Math.min(450, 300 + (income - 36000) * 0.025);
      if (income <= 72000) return Math.min(600, 450 + (income - 48000) * 0.025);
      if (income <= 200000) return Math.min(750, 600 + (income - 72000) * 0.025);
      return 900;
    },
  },
  PE: { name: "Prince Edward Island", basic: 12000, brackets: [{ min: 0, max: 32656, rate: 0.096 }, { min: 32656, max: 64313, rate: 0.1337 }, { min: 64313, max: 105000, rate: 0.167 }, { min: 105000, max: Infinity, rate: 0.18 }] },
  QC: { name: "Quebec", basic: 17183, brackets: [{ min: 0, max: 53255, rate: 0.14 }, { min: 53255, max: 106495, rate: 0.19 }, { min: 106495, max: 129590, rate: 0.24 }, { min: 129590, max: Infinity, rate: 0.2575 }] },
  SK: { name: "Saskatchewan", basic: 17661, brackets: [{ min: 0, max: 49720, rate: 0.105 }, { min: 49720, max: 142058, rate: 0.125 }, { min: 142058, max: Infinity, rate: 0.145 }] },
  NT: { name: "Northwest Territories", basic: 16593, brackets: [{ min: 0, max: 50597, rate: 0.059 }, { min: 50597, max: 101198, rate: 0.086 }, { min: 101198, max: 164525, rate: 0.122 }, { min: 164525, max: Infinity, rate: 0.1405 }] },
  NU: { name: "Nunavut", basic: 17925, brackets: [{ min: 0, max: 53268, rate: 0.04 }, { min: 53268, max: 106537, rate: 0.07 }, { min: 106537, max: 173205, rate: 0.09 }, { min: 173205, max: Infinity, rate: 0.115 }] },
  YT: { name: "Yukon", basic: 15705, brackets: [{ min: 0, max: 57375, rate: 0.064 }, { min: 57375, max: 114750, rate: 0.09 }, { min: 114750, max: 500000, rate: 0.109 }, { min: 500000, max: Infinity, rate: 0.128 }] },
};

const MONTHS_LABELS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcBracketTax(income: number, brackets: { min: number; max: number; rate: number }[]): number {
  let tax = 0;
  for (const b of brackets) {
    if (income <= b.min) break;
    tax += (Math.min(income, b.max) - b.min) * b.rate;
  }
  return tax;
}

function proRate(amount: number, monthsInCanada: number): number {
  return amount * (monthsInCanada / 12);
}

function fmt(n: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
}
function fmtFull(n: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

// ─── Component ────────────────────────────────────────────────────────────────

type VisaType = "pr" | "work_permit" | "study_permit" | "refugee" | "citizen";
type FilingStatus = "single" | "married" | "commonlaw";

interface ChecklistItem {
  done: boolean;
  label: string;
  detail: string;
  urgent: boolean;
  link?: { href: string; label: string };
}

export default function NewcomerTaxClient() {
  // Status
  const [arrivalMonth, setArrivalMonth] = useState(0); // 0 = select
  const [arrivalYear, setArrivalYear] = useState(2024);
  const [visaType, setVisaType] = useState<VisaType>("pr");
  const [province, setProvince] = useState("ON");
  const [filingStatus, setFilingStatus] = useState<FilingStatus>("single");
  const [childrenUnder6, setChildrenUnder6] = useState(0);
  const [children6to17, setChildren6to17] = useState(0);

  // Income
  const [canadianIncome, setCanadianIncome] = useState(0);
  const [foreignIncome, setForeignIncome] = useState(0);
  const [foreignTaxPaid, setForeignTaxPaid] = useState(0);
  const [taxWithheld, setTaxWithheld] = useState(0);

  // Assets
  const [foreignAssets, setForeignAssets] = useState(0); // T1135 threshold $100k

  // RRSP/TFSA
  const [hasRRSP, setHasRRSP] = useState(false);
  const [hasTFSA, setHasTFSA] = useState(false);

  const [showInfo, setShowInfo] = useState(false);

  const monthsInCanada = arrivalMonth > 0
    ? Math.max(1, 13 - arrivalMonth) // months remaining in arrival year
    : 12;

  const isPartialYear = arrivalYear >= 2024 && arrivalMonth > 1;
  const prov = PROV_BRACKETS[province];

  const hasResults = canadianIncome > 0 || foreignIncome > 0;

  const results = useMemo(() => {
    if (!hasResults) return null;

    // Total world income for tax purposes
    const totalIncome = canadianIncome + foreignIncome;

    // Pro-rate personal amounts if partial year
    const basicPersonalFed = isPartialYear ? proRate(FED_BASIC_PERSONAL, monthsInCanada) : FED_BASIC_PERSONAL;
    const basicPersonalProv = isPartialYear ? proRate(prov.basic, monthsInCanada) : prov.basic;

    // Federal tax
    const fedBracketTax = calcBracketTax(totalIncome, FEDERAL_BRACKETS);
    const fedBasicCredit = basicPersonalFed * 0.15;
    const federalTax = Math.max(0, fedBracketTax - fedBasicCredit);

    // Provincial tax
    const provBracketTax = calcBracketTax(totalIncome, prov.brackets);
    const provBasicCredit = basicPersonalProv * prov.brackets[0].rate;
    const provincialTax = Math.max(0, provBracketTax - provBasicCredit);
    const healthPremium = prov.healthPremium ? prov.healthPremium(totalIncome) : 0;

    // Foreign tax credit (reduces Canadian tax on foreign income)
    const foreignTaxCredit = Math.min(foreignTaxPaid, federalTax * (foreignIncome / Math.max(1, totalIncome)));

    const totalTax = federalTax + provincialTax + healthPremium - foreignTaxCredit;
    const netOwing = Math.max(0, totalTax - taxWithheld);
    const refund = Math.max(0, taxWithheld - totalTax);

    // Benefits — pro-rated for partial year
    const gstCreditAnnual = GST_CREDIT_BASE +
      (filingStatus !== "single" ? GST_CREDIT_SPOUSE : 0) +
      (childrenUnder6 + children6to17) * GST_CREDIT_PER_CHILD;
    const gstCredit = isPartialYear ? proRate(gstCreditAnnual, monthsInCanada) : gstCreditAnnual;

    const ccbAnnual = childrenUnder6 * CCB_MAX_UNDER6 + children6to17 * CCB_MAX_6TO17;
    const ccb = isPartialYear ? proRate(ccbAnnual, monthsInCanada) : ccbAnnual;

    // RRSP room for next year (18% of earned income, max $32,490)
    const rrspRoom = Math.min(32490, canadianIncome * 0.18);

    // T1135 required?
    const t1135Required = foreignAssets >= 100000;

    // Marginal rate
    let marginalFed = 0.33;
    for (const b of FEDERAL_BRACKETS) {
      if (totalIncome <= b.max) { marginalFed = b.rate; break; }
    }
    let marginalProv = prov.brackets[prov.brackets.length - 1].rate;
    for (const b of prov.brackets) {
      if (totalIncome <= b.max) { marginalProv = b.rate; break; }
    }
    const marginalRate = marginalFed + marginalProv;

    // Effective rate
    const effectiveRate = totalIncome > 0 ? (totalTax / totalIncome) * 100 : 0;

    return {
      totalIncome, federalTax, provincialTax, healthPremium,
      foreignTaxCredit, totalTax, netOwing, refund,
      gstCredit, ccb, rrspRoom, t1135Required,
      marginalRate, effectiveRate,
      basicPersonalFed, basicPersonalProv,
    };
  }, [canadianIncome, foreignIncome, foreignTaxPaid, taxWithheld, province,
    filingStatus, childrenUnder6, children6to17, isPartialYear, monthsInCanada,
    prov, hasResults]);

  // Checklist
  const checklist: ChecklistItem[] = [
    {
      done: true,
      label: "Get your Social Insurance Number (SIN)",
      detail: "Apply at a Service Canada centre with your immigration documents. Required before working or filing taxes.",
      urgent: true,
    },
    {
      done: true,
      label: "Open a Canadian bank account",
      detail: "Most major banks offer newcomer packages with free banking for 1 year. Needed to receive tax refunds and benefits via direct deposit.",
      urgent: true,
      link: { href: "#banking", label: "Compare newcomer banking packages" },
    },
    {
      done: false,
      label: "Register for CRA My Account",
      detail: "Create your CRA My Account at canada.ca/my-cra-account. Lets you view your RRSP room, benefits, and file online.",
      urgent: true,
    },
    {
      done: false,
      label: "Collect all income slips",
      detail: "T4 (employment), T4A (other income), T5 (investment), NR4 (non-resident income). Employers must issue by end of February.",
      urgent: true,
    },
    {
      done: false,
      label: "Report world income for your arrival year",
      detail: "Canada taxes residents on worldwide income from the date you became a resident. You must report all income earned globally from that date.",
      urgent: true,
    },
    {
      done: foreignAssets < 100000,
      label: foreignAssets >= 100000 ? "⚠️ File T1135 Foreign Income Verification" : "Check T1135 foreign asset reporting threshold",
      detail: foreignAssets >= 100000
        ? `Your foreign assets of ${fmt(foreignAssets)} exceed the $100,000 threshold. You MUST file Form T1135 with your return. Failure to file carries penalties of $25/day up to $2,500 plus potential gross negligence penalties.`
        : "If you hold foreign property (bank accounts, investments, real estate not used personally) worth more than CAD $100,000 at any point in the year, you must file Form T1135.",
      urgent: foreignAssets >= 100000,
    },
    {
      done: false,
      label: "Apply for GST/HST credit",
      detail: "Apply by filing your tax return. New residents can also apply using Form RC151 before filing their first return.",
      urgent: false,
      link: { href: "/calculators/income-tax", label: "Estimate your GST credit" },
    },
    {
      done: (childrenUnder6 + children6to17) === 0,
      label: "Apply for Canada Child Benefit (CCB)",
      detail: "Apply using Form RC66 or through CRA My Account. One of the most generous child benefits in the world — tax-free monthly payments.",
      urgent: (childrenUnder6 + children6to17) > 0,
    },
    {
      done: false,
      label: "Open a TFSA",
      detail: "As a new resident, you earn $7,000 in TFSA contribution room starting the year you arrive (if you're 18+). Growth is completely tax-free.",
      urgent: false,
      link: { href: "/calculators/tfsa-growth", label: "TFSA Growth Calculator" },
    },
    {
      done: false,
      label: "Understand RRSP contribution room",
      detail: "You earn RRSP room from your first year of filing in Canada (18% of earned income). Start building for retirement immediately.",
      urgent: false,
      link: { href: "/calculators/rrsp-contribution", label: "RRSP Contribution Calculator" },
    },
    {
      done: false,
      label: "Check provincial health insurance waiting period",
      detail: "BC, Ontario, and New Brunswick have a 3-month waiting period for provincial health coverage. Get private insurance to bridge the gap.",
      urgent: true,
    },
  ];

  const visaTypes: { key: VisaType; label: string; icon: string }[] = [
    { key: "pr", label: "Permanent Resident", icon: "🍁" },
    { key: "work_permit", label: "Work Permit", icon: "💼" },
    { key: "study_permit", label: "Study Permit", icon: "📚" },
    { key: "refugee", label: "Refugee / Protected", icon: "🏠" },
    { key: "citizen", label: "New Citizen", icon: "🇨🇦" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* Info Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl overflow-hidden">
        <button onClick={() => setShowInfo(!showInfo)}
          className="w-full flex items-center justify-between px-5 py-3 text-blue-800 font-semibold text-sm">
          <span>💡 Your first Canadian tax return — what you need to know</span>
          <span>{showInfo ? "▲ Hide" : "▼ Show"}</span>
        </button>
        {showInfo && (
          <div className="px-5 pb-4 text-blue-900 text-sm space-y-2">
            <p>Canada taxes residents on their <strong>worldwide income</strong> from the date they become a Canadian tax resident — typically your arrival date. Your first return covers only the portion of the year you lived in Canada.</p>
            <p>Personal tax credits (basic personal amount, spousal amount, etc.) are <strong>pro-rated</strong> based on how many days you were a resident. This is automatic — your tax software handles it.</p>
            <p>Filing your first return is important even if you owe nothing — it activates the <strong>GST/HST credit</strong>, <strong>Canada Child Benefit</strong>, and builds your <strong>RRSP contribution room</strong>. Many newcomers leave thousands of dollars in benefits unclaimed by not filing.</p>
            <p>Quebec residents file <strong>two returns</strong> — one federal (T1) and one provincial (Revenu Québec). All other provinces file only the federal T1 which includes provincial tax.</p>
          </div>
        )}
      </div>

      {/* Inputs */}
      <div className="print:hidden bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <h2 className="text-lg font-bold text-gray-800">Your Information</h2>

        {/* Visa Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Immigration Status</label>
          <div className="flex flex-wrap gap-2">
            {visaTypes.map(v => (
              <button key={v.key} onClick={() => setVisaType(v.key)}
                className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${visaType === v.key ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"}`}>
                {v.icon} {v.label}
              </button>
            ))}
          </div>
          {visaType === "study_permit" && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
              ⚠️ Study permit holders are generally considered residents for tax purposes if Canada is their primary place of residence. If you spend less than 183 days in Canada, your status may differ — consult a tax professional.
            </p>
          )}
        </div>

        {/* Arrival */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month You Arrived in Canada</label>
            <select value={arrivalMonth} onChange={e => setArrivalMonth(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none">
              <option value={0}>Already resident (full year)</option>
              {MONTHS_LABELS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year of Arrival</label>
            <select value={arrivalYear} onChange={e => setArrivalYear(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none">
              {[2022, 2023, 2024, 2025].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Province of Residence (Dec 31)</label>
            <select value={province} onChange={e => setProvince(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none">
              {Object.entries(PROV_BRACKETS).sort((a, b) => a[1].name.localeCompare(b[1].name)).map(([code, p]) => (
                <option key={code} value={code}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filing Status & Children */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filing Status</label>
            <select value={filingStatus} onChange={e => setFilingStatus(e.target.value as FilingStatus)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="commonlaw">Common-law</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Children Under 6</label>
            <select value={childrenUnder6} onChange={e => setChildrenUnder6(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none">
              {[0,1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Children Age 6–17</label>
            <select value={children6to17} onChange={e => setChildren6to17(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none">
              {[0,1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* Income */}
        <div className="pt-4 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Income</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Canadian Income {isPartialYear && `(${monthsInCanada} months in Canada)`}
              </label>
              <NumericFormat value={canadianIncome || ""} onValueChange={v => setCanadianIncome(v.floatValue ?? 0)}
                thousandSeparator prefix="$" placeholder="$0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
              <p className="text-xs text-gray-400 mt-1">Employment, self-employment, and other Canadian-source income</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Foreign Income (converted to CAD)</label>
              <NumericFormat value={foreignIncome || ""} onValueChange={v => setForeignIncome(v.floatValue ?? 0)}
                thousandSeparator prefix="$" placeholder="$0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
              <p className="text-xs text-gray-400 mt-1">Income earned after your arrival date from any country</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Foreign Tax Already Paid (CAD)</label>
              <NumericFormat value={foreignTaxPaid || ""} onValueChange={v => setForeignTaxPaid(v.floatValue ?? 0)}
                thousandSeparator prefix="$" placeholder="$0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
              <p className="text-xs text-gray-400 mt-1">Tax paid to another country on income also taxed by Canada — creates a foreign tax credit</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Canadian Tax Withheld at Source</label>
              <NumericFormat value={taxWithheld || ""} onValueChange={v => setTaxWithheld(v.floatValue ?? 0)}
                thousandSeparator prefix="$" placeholder="$0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
              <p className="text-xs text-gray-400 mt-1">From your T4 slip (box 22)</p>
            </div>
          </div>
        </div>

        {/* Foreign Assets */}
        <div className="pt-4 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Foreign Assets</h3>
          <div className="max-w-sm">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Foreign Property Value (CAD)
            </label>
            <NumericFormat value={foreignAssets || ""} onValueChange={v => setForeignAssets(v.floatValue ?? 0)}
              thousandSeparator prefix="$" placeholder="$0"
              className={`w-full border rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 outline-none ${foreignAssets >= 100000 ? "border-red-400 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"}`} />
            <p className="text-xs text-gray-400 mt-1">
              Bank accounts, investments, real estate (not personal use) held outside Canada. T1135 required above $100,000.
            </p>
            {foreignAssets >= 100000 && (
              <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 font-semibold">
                ⚠️ T1135 Foreign Income Verification Statement required — file with your tax return
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Gate */}
      {!hasResults && (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-400">
          <div className="text-3xl mb-2">🍁</div>
          <div className="font-medium">Enter your Canadian income above to see your first-year tax estimate</div>
        </div>
      )}

      {hasResults && results && <>

      {/* Hero */}
      <div className={`text-white rounded-xl p-6 text-center ${results.refund > 0 ? "bg-green-600" : "bg-blue-600"}`}>
        <div className={`text-sm font-medium mb-1 ${results.refund > 0 ? "text-green-200" : "text-blue-200"}`}>
          {results.refund > 0 ? "Estimated Tax Refund" : "Estimated Tax Owing"}
        </div>
        <div className="text-5xl font-black mb-1">
          {results.refund > 0 ? fmt(results.refund) : fmt(results.netOwing)}
        </div>
        <div className={`text-sm ${results.refund > 0 ? "text-green-200" : "text-blue-200"}`}>
          Total tax: {fmt(results.totalTax)} · Effective rate: {results.effectiveRate.toFixed(1)}% · Marginal rate: {(results.marginalRate * 100).toFixed(1)}%
        </div>
        {isPartialYear && (
          <div className={`text-xs mt-2 ${results.refund > 0 ? "text-green-300" : "text-blue-300"}`}>
            Partial year: {monthsInCanada} months in Canada — personal amounts pro-rated
          </div>
        )}
      </div>

      <PrintButton />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Total World Income</div>
          <div className="text-xl font-bold text-gray-800">{fmt(results.totalIncome)}</div>
          <div className="text-xs text-gray-400 mt-0.5">Canadian + foreign</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">GST/HST Credit</div>
          <div className="text-xl font-bold text-green-700">{fmt(results.gstCredit)}</div>
          <div className="text-xs text-gray-400 mt-0.5">quarterly payments</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Canada Child Benefit</div>
          <div className="text-xl font-bold text-green-700">
            {(childrenUnder6 + children6to17) > 0 ? fmt(results.ccb) : "N/A"}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">tax-free, monthly</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">RRSP Room Earned</div>
          <div className="text-xl font-bold text-blue-700">{fmt(results.rrspRoom)}</div>
          <div className="text-xs text-gray-400 mt-0.5">for next year</div>
        </div>
      </div>

      {/* T1135 Warning */}
      {results.t1135Required && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-5 flex items-start gap-3">
          <span className="text-2xl">🚨</span>
          <div>
            <div className="font-bold text-red-800">T1135 Foreign Income Verification Required</div>
            <div className="text-red-700 text-sm mt-1">
              Your foreign assets of {fmt(foreignAssets)} exceed the $100,000 CAD threshold. You must file Form T1135 with your return.
              The penalty for failing to file is <strong>$25/day up to $2,500</strong> — plus potential gross negligence penalties of up to $12,000 or 5% of the cost amount of the property, whichever is greater.
              This form is complex — consider a tax professional for your first filing.
            </div>
          </div>
        </div>
      )}

      {/* Tax Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Tax Breakdown</h2>
        <div className="space-y-2 text-sm">
          {[
            { label: "Total income (world income)", value: results.totalIncome, bold: false },
            { label: `Federal basic personal amount${isPartialYear ? ` (${monthsInCanada}/12 months)` : ""}`, value: -results.basicPersonalFed, bold: false },
            { label: "Federal income tax", value: results.federalTax, bold: false },
            { label: `${prov.name} provincial tax`, value: results.provincialTax, bold: false },
            ...(results.healthPremium > 0 ? [{ label: "Ontario Health Premium", value: results.healthPremium, bold: false }] : []),
            ...(results.foreignTaxCredit > 0 ? [{ label: "Foreign tax credit", value: -results.foreignTaxCredit, bold: false }] : []),
            { label: "Total tax", value: results.totalTax, bold: true },
            { label: "Tax withheld at source (T4 box 22)", value: -taxWithheld, bold: false },
          ].map((row, i) => (
            <div key={i} className={`flex justify-between py-1.5 ${i > 0 ? "border-t border-gray-50" : ""} ${row.bold ? "font-bold text-gray-900 border-t-2 border-gray-200 pt-2 mt-1" : "text-gray-600"}`}>
              <span>{row.label}</span>
              <span className={row.value < 0 ? "text-green-600" : ""}>{row.value < 0 ? `−${fmt(-row.value)}` : fmt(row.value)}</span>
            </div>
          ))}
          <div className={`flex justify-between py-2 border-t-2 border-gray-300 font-black text-base ${results.refund > 0 ? "text-green-700" : "text-blue-700"}`}>
            <span>{results.refund > 0 ? "Refund" : "Balance Owing"}</span>
            <span>{fmt(results.refund > 0 ? results.refund : results.netOwing)}</span>
          </div>
        </div>
      </div>

      {/* Benefits Summary */}
      {(results.gstCredit > 0 || results.ccb > 0) && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-green-900 mb-3">💰 Benefits You're Entitled To</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-white rounded-lg p-4">
              <div className="font-bold text-gray-800 mb-1">GST/HST Credit</div>
              <div className="text-2xl font-black text-green-700 mb-1">{fmt(results.gstCredit)}</div>
              <div className="text-xs text-gray-500">Paid quarterly (Jan, Apr, Jul, Oct). Apply by filing your return or using Form RC151.</div>
            </div>
            {(childrenUnder6 + children6to17) > 0 && (
              <div className="bg-white rounded-lg p-4">
                <div className="font-bold text-gray-800 mb-1">Canada Child Benefit</div>
                <div className="text-2xl font-black text-green-700 mb-1">{fmt(results.ccb)}</div>
                <div className="text-xs text-gray-500">Tax-free monthly payments. Apply using Form RC66 or through CRA My Account.</div>
              </div>
            )}
          </div>
          <p className="text-xs text-green-700 mt-3">
            ℹ️ Actual benefit amounts are income-tested and may differ. These are estimates based on maximum amounts pro-rated for your time in Canada.
          </p>
        </div>
      )}

      {/* Related Calculators */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Explore More Canadian Financial Tools</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { slug: "income-tax", label: "Income Tax Calculator", desc: "Full 2025 tax calculation" },
            { slug: "rrsp-contribution", label: "RRSP Calculator", desc: "Plan your retirement savings" },
            { slug: "tfsa-growth", label: "TFSA Growth", desc: "Tax-free savings projections" },
            { slug: "tfsa-vs-rrsp", label: "TFSA vs RRSP", desc: "Which is better for you?" },
            { slug: "fhsa", label: "FHSA Calculator", desc: "Save for your first home" },
            { slug: "cra-instalments", label: "CRA Instalments", desc: "Quarterly tax payments" },
          ].map(c => (
            <Link key={c.slug} href={`/calculators/${c.slug}`}
              className="bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg p-3 transition-colors">
              <div className="font-semibold text-gray-800 text-sm">{c.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{c.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      </>}

      {/* Newcomer Checklist — always visible */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-[#0d1f3c]">
          <h2 className="text-lg font-bold text-white">🍁 New to Canada Financial Checklist</h2>
          <p className="text-blue-300 text-sm mt-0.5">Essential steps for every newcomer — in order of priority</p>
        </div>
        <div className="divide-y divide-gray-100">
          {checklist.map((item, i) => (
            <div key={i} className={`px-5 py-4 flex items-start gap-3 ${item.urgent && !item.done ? "bg-amber-50" : ""}`}>
              <span className="text-lg mt-0.5 shrink-0">{item.done ? "✅" : item.urgent ? "⚠️" : "📋"}</span>
              <div className="flex-1">
                <div className={`font-semibold text-sm ${item.done ? "text-gray-500 line-through" : "text-gray-800"}`}>
                  {item.label}
                </div>
                <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.detail}</div>
                {item.link && (
                  <Link href={item.link.href}
                    className="inline-block mt-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium">
                    {item.link.label} →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Newcomer Banking CTA */}
      <div id="banking" className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h2 className="text-base font-bold text-blue-900 mb-1">🏦 Newcomer Banking Packages</h2>
        <p className="text-sm text-blue-800 mb-3">All major Canadian banks offer free newcomer banking packages — typically 1 year of free chequing, a no-fee credit card to start building credit, and free international transfers.</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "RBC Newcomer Advantage", href: "https://www.rbc.com/newcomers" },
            { label: "TD New to Canada", href: "https://www.td.com/ca/en/personal-banking/new-to-canada" },
            { label: "Scotiabank StartRight", href: "https://www.scotiabank.com/startright" },
            { label: "BMO NewStart", href: "https://www.bmo.com/en-ca/main/personal/newcomers-to-canada" },
          ].map(b => (
            <a key={b.label} href={b.href} target="_blank" rel="noopener sponsored"
              className="text-xs bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 px-3 py-2 rounded-lg font-medium transition-colors">
              {b.label} →
            </a>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">Advertising disclosure: we may receive a commission if you open an account through these links, at no cost to you.</p>
      </div>

      {/* SEO / FAQ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5 text-sm text-gray-600 leading-relaxed">
        <h2 className="text-xl font-bold text-gray-900">Filing Your First Canadian Tax Return</h2>

        <p>Every newcomer to Canada who earns income, wants to receive government benefits, or holds foreign assets must file a Canadian tax return. For most people, the first return covers a partial year — from your arrival date to December 31.</p>

        <h3 className="text-base font-bold text-gray-800">When Did You Become a Canadian Tax Resident?</h3>
        <p>You become a Canadian tax resident when you establish significant residential ties to Canada — typically your arrival date as a permanent resident or when you begin living in Canada on a work or study permit. From that date, Canada taxes you on your worldwide income.</p>

        <h3 className="text-base font-bold text-gray-800">The Foreign Tax Credit — Avoiding Double Taxation</h3>
        <p>Canada has tax treaties with over 90 countries. If you paid tax on income in another country that is also taxable in Canada, you can claim a Foreign Tax Credit to reduce your Canadian tax. This prevents you from being taxed twice on the same income. Keep records of all foreign taxes paid.</p>

        <h3 className="text-base font-bold text-gray-800">Foreign Asset Reporting — T1135</h3>
        <p>If you hold foreign property worth more than CAD $100,000 at any point during the year — including bank accounts, investment portfolios, or rental real estate outside Canada — you must file Form T1135. This is separate from your tax return and has strict deadlines. Penalties for non-filing are severe. Many newcomers are unaware of this requirement.</p>

        <h3 className="text-base font-bold text-gray-800">TFSA — Available Immediately</h3>
        <p>As a Canadian resident aged 18 or over, you earn $7,000 in TFSA contribution room for each calendar year you are a resident. You do not need to be a citizen or permanent resident — a work or study permit is sufficient. Growth inside a TFSA is completely tax-free.</p>

        <h3 className="text-base font-bold text-gray-800">Free Tax Filing for Newcomers</h3>
        <p>The Community Volunteer Income Tax Program (CVITP) offers free tax filing assistance for newcomers with modest income. Many settlement agencies offer this service. Eligible free software options include Wealthsimple Tax, TurboTax Free, and UFile Free for simple returns.</p>

        <h3 className="text-base font-bold text-gray-800">Quebec Residents File Two Returns</h3>
        <p>If you lived in Quebec on December 31, you file both a federal T1 return (with the CRA) and a provincial TP-1 return (with Revenu Québec). Both are required. Tax software like Wealthsimple Tax handles both simultaneously.</p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-xs">
          <strong>Disclaimer:</strong> This calculator provides general estimates for newcomers to Canada using 2025 tax rates. Individual circumstances vary significantly. Foreign income, treaty provisions, part-year residency rules, and provincial variations can significantly affect your actual tax. Consider consulting a Canadian tax professional for your first return, especially if you have foreign assets or complex income sources.
        </div>
      </div>
    </div>
  );
}
