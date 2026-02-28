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
const FED_TUITION_CREDIT_RATE = 0.15;
const FED_MOVING_MIN_DIST = 40; // km
const GST_CREDIT_SINGLE_ANNUAL = 519;

const PROV_BRACKETS: Record<string, {
  name: string;
  brackets: { min: number; max: number; rate: number }[];
  basic: number;
  tuitionCredit?: number;
  healthPremium?: (income: number) => number;
}> = {
  AB: { name: "Alberta", basic: 21003, tuitionCredit: 0.10, brackets: [{ min: 0, max: 148269, rate: 0.10 }, { min: 148269, max: 177922, rate: 0.12 }, { min: 177922, max: 237230, rate: 0.13 }, { min: 237230, max: 355845, rate: 0.14 }, { min: 355845, max: Infinity, rate: 0.15 }] },
  BC: { name: "British Columbia", basic: 11981, tuitionCredit: 0.0506, brackets: [{ min: 0, max: 45654, rate: 0.0506 }, { min: 45654, max: 91310, rate: 0.077 }, { min: 91310, max: 104835, rate: 0.105 }, { min: 104835, max: 127299, rate: 0.1229 }, { min: 127299, max: 172602, rate: 0.147 }, { min: 172602, max: 240716, rate: 0.168 }, { min: 240716, max: Infinity, rate: 0.205 }] },
  MB: { name: "Manitoba", basic: 15780, tuitionCredit: 0.108, brackets: [{ min: 0, max: 47000, rate: 0.108 }, { min: 47000, max: 100000, rate: 0.1275 }, { min: 100000, max: Infinity, rate: 0.174 }] },
  NB: { name: "New Brunswick", basic: 12458, tuitionCredit: 0.094, brackets: [{ min: 0, max: 49958, rate: 0.094 }, { min: 49958, max: 99916, rate: 0.14 }, { min: 99916, max: 185064, rate: 0.16 }, { min: 185064, max: Infinity, rate: 0.195 }] },
  NL: { name: "Newfoundland & Labrador", basic: 10818, tuitionCredit: 0.087, brackets: [{ min: 0, max: 43198, rate: 0.087 }, { min: 43198, max: 86395, rate: 0.145 }, { min: 86395, max: 154244, rate: 0.158 }, { min: 154244, max: 215943, rate: 0.178 }, { min: 215943, max: Infinity, rate: 0.198 }] },
  NS: { name: "Nova Scotia", basic: 8481, tuitionCredit: 0.0879, brackets: [{ min: 0, max: 29590, rate: 0.0879 }, { min: 29590, max: 59180, rate: 0.1495 }, { min: 59180, max: 93000, rate: 0.1667 }, { min: 93000, max: 150000, rate: 0.175 }, { min: 150000, max: Infinity, rate: 0.21 }] },
  ON: {
    name: "Ontario", basic: 11865, tuitionCredit: 0.0505,
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
  PE: { name: "Prince Edward Island", basic: 12000, tuitionCredit: 0.096, brackets: [{ min: 0, max: 32656, rate: 0.096 }, { min: 32656, max: 64313, rate: 0.1337 }, { min: 64313, max: 105000, rate: 0.167 }, { min: 105000, max: Infinity, rate: 0.18 }] },
  QC: { name: "Quebec", basic: 17183, tuitionCredit: 0.14, brackets: [{ min: 0, max: 53255, rate: 0.14 }, { min: 53255, max: 106495, rate: 0.19 }, { min: 106495, max: 129590, rate: 0.24 }, { min: 129590, max: Infinity, rate: 0.2575 }] },
  SK: { name: "Saskatchewan", basic: 17661, tuitionCredit: 0.105, brackets: [{ min: 0, max: 49720, rate: 0.105 }, { min: 49720, max: 142058, rate: 0.125 }, { min: 142058, max: Infinity, rate: 0.145 }] },
  NT: { name: "Northwest Territories", basic: 16593, tuitionCredit: 0.059, brackets: [{ min: 0, max: 50597, rate: 0.059 }, { min: 50597, max: 101198, rate: 0.086 }, { min: 101198, max: 164525, rate: 0.122 }, { min: 164525, max: Infinity, rate: 0.1405 }] },
  NU: { name: "Nunavut", basic: 17925, tuitionCredit: 0.04, brackets: [{ min: 0, max: 53268, rate: 0.04 }, { min: 53268, max: 106537, rate: 0.07 }, { min: 106537, max: 173205, rate: 0.09 }, { min: 173205, max: Infinity, rate: 0.115 }] },
  YT: { name: "Yukon", basic: 15705, tuitionCredit: 0.064, brackets: [{ min: 0, max: 57375, rate: 0.064 }, { min: 57375, max: 114750, rate: 0.09 }, { min: 114750, max: 500000, rate: 0.109 }, { min: 500000, max: Infinity, rate: 0.128 }] },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcBracketTax(income: number, brackets: { min: number; max: number; rate: number }[]): number {
  let tax = 0;
  for (const b of brackets) {
    if (income <= b.min) break;
    tax += (Math.min(income, b.max) - b.min) * b.rate;
  }
  return tax;
}

function fmt(n: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
}

// ─── Types ───────────────────────────────────────────────────────────────────

type FilingReason = "student" | "first_job" | "gig" | "turned18" | "other";

// ─── Component ────────────────────────────────────────────────────────────────

export default function FirstTimeFilingClient() {
  const [filingReason, setFilingReason] = useState<FilingReason | "">("");
  const [province, setProvince] = useState("ON");
  const [age, setAge] = useState(0);

  // Income
  const [employmentIncome, setEmploymentIncome] = useState(0);
  const [selfEmployedIncome, setSelfEmployedIncome] = useState(0);
  const [tipsCash, setTipsCash] = useState(0);
  const [investmentIncome, setInvestmentIncome] = useState(0);
  const [taxWithheld, setTaxWithheld] = useState(0);

  // Deductions / Credits
  const [tuitionT2202, setTuitionT2202] = useState(0);
  const [rrspContribution, setRrspContribution] = useState(0);
  const [movedForWork, setMovedForWork] = useState(false);
  const [movedForSchool, setMovedForSchool] = useState(false);
  const [movingExpenses, setMovingExpenses] = useState(0);
  const [homeOffice, setHomeOffice] = useState(false);
  const [homeOfficeDays, setHomeOfficeDays] = useState(0);
  const [unionDues, setUnionDues] = useState(0);
  const [transitPasses, setTransitPasses] = useState(0); // QC only

  const [showInfo, setShowInfo] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>("income");

  const prov = PROV_BRACKETS[province];
  const isQC = province === "QC";

  const totalIncome = employmentIncome + selfEmployedIncome + tipsCash + investmentIncome;
  const hasResults = totalIncome > 0;

  const results = useMemo(() => {
    if (!hasResults) return null;

    // Deductions
    const rrspDeduction = Math.min(rrspContribution, Math.min(32490, totalIncome * 0.18));
    const movingDeduction = (movedForWork || movedForSchool) ? movingExpenses : 0;
    const homeOfficeDeduction = homeOffice ? homeOfficeDays * 2 : 0; // flat $2/day method
    const taxableIncome = Math.max(0, totalIncome - rrspDeduction - movingDeduction - homeOfficeDeduction - unionDues);

    // Federal tax
    const fedBracketTax = calcBracketTax(taxableIncome, FEDERAL_BRACKETS);
    const fedBasicCredit = FED_BASIC_PERSONAL * 0.15;
    const fedTuitionCredit = tuitionT2202 * FED_TUITION_CREDIT_RATE;
    const federalTax = Math.max(0, fedBracketTax - fedBasicCredit - fedTuitionCredit);

    // CPP & EI (employee portion — first job)
    const cppRate = 0.0595;
    const cppMax = 4034;
    const cppExemption = 3500;
    const cppPremiums = selfEmployedIncome > 0
      ? Math.min(cppMax * 2, Math.max(0, (employmentIncome + selfEmployedIncome - cppExemption) * cppRate * 2))
      : Math.min(cppMax, Math.max(0, (employmentIncome - cppExemption) * cppRate));
    const eiRate = 0.0166;
    const eiMax = 1090;
    const eiPremiums = selfEmployedIncome > 0 ? 0 : Math.min(eiMax, employmentIncome * eiRate);

    // CPP credit (non-refundable, 15% fed)
    const cppCredit = cppPremiums * 0.15;
    const eiCredit = eiPremiums * 0.15;
    const federalTaxAfterCredits = Math.max(0, federalTax - cppCredit - eiCredit);

    // Provincial tax
    const provBracketTax = calcBracketTax(taxableIncome, prov.brackets);
    const provBasicCredit = prov.basic * prov.brackets[0].rate;
    const provTuitionCredit = prov.tuitionCredit ? tuitionT2202 * prov.tuitionCredit : 0;
    const provincialTax = Math.max(0, provBracketTax - provBasicCredit - provTuitionCredit);
    const healthPremium = prov.healthPremium ? prov.healthPremium(taxableIncome) : 0;

    // Self-employed: 15.3% CPP (both sides) — already in cppPremiums above for SE
    const selfEmployedTax = selfEmployedIncome > 0
      ? Math.min(cppMax * 2, Math.max(0, (selfEmployedIncome - cppExemption) * cppRate * 2)) - cppPremiums
      : 0;

    const totalTax = federalTaxAfterCredits + provincialTax + healthPremium + eiPremiums;
    const netOwing = Math.max(0, totalTax - taxWithheld);
    const refund = Math.max(0, taxWithheld - totalTax);

    // RRSP room generated for NEXT year
    const rrspRoomGenerated = Math.min(32490, taxableIncome * 0.18);

    // GST credit eligibility
    const gstCredit = taxableIncome <= 50000 ? GST_CREDIT_SINGLE_ANNUAL : Math.max(0, GST_CREDIT_SINGLE_ANNUAL - (taxableIncome - 50000) * 0.05);

    // TFSA — $7,000 room per year since 18. Estimate accumulated room.
    const tfsa2025 = 7000;
    const tfsaRoomAge = age >= 18 ? tfsa2025 : 0;

    // Effective rate
    const effectiveRate = totalIncome > 0 ? (totalTax / totalIncome) * 100 : 0;

    // Marginal rate
    let marginalFed = 0.15;
    for (const b of FEDERAL_BRACKETS) {
      if (taxableIncome <= b.max) { marginalFed = b.rate; break; }
    }
    let marginalProv = prov.brackets[0].rate;
    for (const b of prov.brackets) {
      if (taxableIncome <= b.max) { marginalProv = b.rate; break; }
    }

    return {
      taxableIncome, rrspDeduction, movingDeduction, homeOfficeDeduction,
      federalTax: federalTaxAfterCredits, provincialTax, healthPremium,
      cppPremiums, eiPremiums, fedTuitionCredit, provTuitionCredit,
      totalTax, netOwing, refund, rrspRoomGenerated, gstCredit, tfsaRoomAge,
      effectiveRate, marginalFed, marginalProv,
      marginalRate: (marginalFed + marginalProv) * 100,
    };
  }, [totalIncome, employmentIncome, selfEmployedIncome, taxWithheld,
    tuitionT2202, rrspContribution, movedForWork, movedForSchool, movingExpenses,
    homeOffice, homeOfficeDays, unionDues, province, prov, age, hasResults]);

  const reasons: { key: FilingReason; label: string; icon: string; desc: string }[] = [
    { key: "student", label: "Student", icon: "🎓", desc: "University, college, or vocational school" },
    { key: "first_job", label: "First Job", icon: "💼", desc: "Just started working full or part time" },
    { key: "gig", label: "Gig / Freelance", icon: "🚗", desc: "Uber, DoorDash, freelancing, side hustle" },
    { key: "turned18", label: "Just Turned 18", icon: "🎂", desc: "Filing to unlock GST credit & TFSA" },
    { key: "other", label: "Other", icon: "📋", desc: "Investments, tips, or other income" },
  ];

  const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpenSection(openSection === id ? null : id)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-gray-50 hover:bg-gray-100 transition-colors">
        <span className="font-semibold text-gray-800 text-sm">{title}</span>
        <span className="text-gray-400 text-xs">{openSection === id ? "▲ Collapse" : "▼ Expand"}</span>
      </button>
      {openSection === id && <div className="p-5 space-y-4 bg-white">{children}</div>}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">

      {/* Info Banner */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl overflow-hidden">
        <button onClick={() => setShowInfo(!showInfo)}
          className="w-full flex items-center justify-between px-5 py-3 text-indigo-800 font-semibold text-sm">
          <span>💡 Why you should file even if you don't owe anything</span>
          <span>{showInfo ? "▲ Hide" : "▼ Show"}</span>
        </button>
        {showInfo && (
          <div className="px-5 pb-4 text-indigo-900 text-sm space-y-2">
            <p>Filing your first return is important even with low income. It <strong>unlocks the GST/HST credit</strong> (up to $519/year), starts your <strong>RRSP contribution room</strong> clock, activates your <strong>TFSA room</strong> (if 18+), and carries forward unused tuition credits to future years when they'll be worth more.</p>
            <p>Students often overpay tax through source deductions because employers don't know about their tuition credits. Filing gets that money back. Many first-time filers are surprised to get a refund of several hundred dollars.</p>
            <p>There's no penalty for filing when you don't owe. But there IS a penalty — 5% of the balance owing + 1%/month — if you owe money and file late.</p>
          </div>
        )}
      </div>

      {/* Filing Reason */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-base font-bold text-gray-800 mb-3">What best describes your situation?</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {reasons.map(r => (
            <button key={r.key} onClick={() => setFilingReason(r.key)}
              className={`flex flex-col items-center text-center p-3 rounded-xl border transition-all text-sm ${filingReason === r.key ? "border-indigo-500 bg-indigo-50 text-indigo-800" : "border-gray-200 hover:border-indigo-300 text-gray-600"}`}>
              <span className="text-2xl mb-1">{r.icon}</span>
              <span className="font-semibold text-xs">{r.label}</span>
              <span className="text-xs text-gray-400 mt-0.5 leading-tight">{r.desc}</span>
            </button>
          ))}
        </div>

        {/* Situation-specific tip */}
        {filingReason === "student" && (
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-sm text-blue-800">
            📚 As a student, your T2202 tuition slip is your most valuable document. Enter it below to claim the tuition credit. If your income is too low to use it, unused credits carry forward indefinitely.
          </div>
        )}
        {filingReason === "gig" && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-800">
            🚗 Gig and freelance income is self-employment income — no tax is withheld, and you pay <strong>both sides of CPP</strong> (employee + employer = ~11.9%). You may need to make quarterly instalment payments if you owe more than $3,000.
            <Link href="/calculators/cra-instalments" className="ml-1 font-semibold underline">Check your instalments →</Link>
          </div>
        )}
        {filingReason === "turned18" && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 text-sm text-green-800">
            🎂 Filing at 18 starts your TFSA room ($7,000 for 2025) and may get you the GST/HST credit even with no income. You get an automatic $7,000 of TFSA room starting the year you turn 18.
          </div>
        )}
      </div>

      {/* Inputs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-1">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
            <select value={province} onChange={e => setProvince(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none">
              {Object.entries(PROV_BRACKETS).sort((a, b) => a[1].name.localeCompare(b[1].name)).map(([code, p]) => (
                <option key={code} value={code}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Age</label>
            <input type="number" min={15} max={30} value={age || ""} onChange={e => setAge(Number(e.target.value))}
              placeholder="e.g. 20"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
        </div>

        <Section id="income" title="💰 Income">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employment Income (T4 box 14)</label>
              <NumericFormat value={employmentIncome || ""} onValueChange={v => setEmploymentIncome(v.floatValue ?? 0)}
                thousandSeparator prefix="$" placeholder="$0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Self-Employment / Gig Income</label>
              <NumericFormat value={selfEmployedIncome || ""} onValueChange={v => setSelfEmployedIncome(v.floatValue ?? 0)}
                thousandSeparator prefix="$" placeholder="$0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
              <p className="text-xs text-gray-400 mt-0.5">Uber, DoorDash, freelancing, Etsy, cash jobs</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cash Tips (not on T4)</label>
              <NumericFormat value={tipsCash || ""} onValueChange={v => setTipsCash(v.floatValue ?? 0)}
                thousandSeparator prefix="$" placeholder="$0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
              <p className="text-xs text-gray-400 mt-0.5">Cash tips are taxable income — must be reported</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Investment Income (T5)</label>
              <NumericFormat value={investmentIncome || ""} onValueChange={v => setInvestmentIncome(v.floatValue ?? 0)}
                thousandSeparator prefix="$" placeholder="$0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax Already Withheld (T4 box 22)</label>
              <NumericFormat value={taxWithheld || ""} onValueChange={v => setTaxWithheld(v.floatValue ?? 0)}
                thousandSeparator prefix="$" placeholder="$0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>
        </Section>

        <Section id="credits" title="🎓 Deductions & Credits">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tuition Fees (T2202 box C)</label>
              <NumericFormat value={tuitionT2202 || ""} onValueChange={v => setTuitionT2202(v.floatValue ?? 0)}
                thousandSeparator prefix="$" placeholder="$0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
              <p className="text-xs text-gray-400 mt-0.5">Eligible tuition fees from your T2202 slip. Unused credits carry forward.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RRSP Contribution</label>
              <NumericFormat value={rrspContribution || ""} onValueChange={v => setRrspContribution(v.floatValue ?? 0)}
                thousandSeparator prefix="$" placeholder="$0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Union / Professional Dues</label>
              <NumericFormat value={unionDues || ""} onValueChange={v => setUnionDues(v.floatValue ?? 0)}
                thousandSeparator prefix="$" placeholder="$0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
              <p className="text-xs text-gray-400 mt-0.5">From your T4 box 44 — fully deductible</p>
            </div>
          </div>

          {/* Home Office */}
          <div className="border border-gray-100 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-800">Home Office Deduction</div>
                <div className="text-xs text-gray-500">Worked from home in 2024? Flat rate: $2/day, max 200 days</div>
              </div>
              <button onClick={() => setHomeOffice(!homeOffice)}
                className={`w-12 h-6 rounded-full transition-colors ${homeOffice ? "bg-indigo-600" : "bg-gray-300"}`}>
                <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${homeOffice ? "translate-x-6" : ""}`} />
              </button>
            </div>
            {homeOffice && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Days worked from home</label>
                <input type="number" min={1} max={200} value={homeOfficeDays || ""}
                  onChange={e => setHomeOfficeDays(Number(e.target.value))} placeholder="e.g. 120"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
                {homeOfficeDays > 0 && <p className="text-xs text-green-700 mt-1">Deduction: {fmt(homeOfficeDays * 2)}</p>}
              </div>
            )}
          </div>

          {/* Moving */}
          <div className="border border-gray-100 rounded-lg p-4 space-y-3">
            <div className="text-sm font-semibold text-gray-800 mb-1">Moving Expenses</div>
            <div className="flex gap-3">
              <button onClick={() => setMovedForWork(!movedForWork)}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${movedForWork ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-700 border-gray-300"}`}>
                Moved for work
              </button>
              <button onClick={() => setMovedForSchool(!movedForSchool)}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${movedForSchool ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-700 border-gray-300"}`}>
                Moved for school
              </button>
            </div>
            {(movedForWork || movedForSchool) && (
              <>
                <div className="text-xs text-gray-500">You must have moved at least 40 km closer to your workplace or school.</div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Eligible Moving Expenses</label>
                  <NumericFormat value={movingExpenses || ""} onValueChange={v => setMovingExpenses(v.floatValue ?? 0)}
                    thousandSeparator prefix="$" placeholder="$0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
                  <p className="text-xs text-gray-400 mt-0.5">Transport, storage, travel, temporary accommodation, connection/disconnection fees</p>
                </div>
              </>
            )}
          </div>
        </Section>
      </div>

      {/* Placeholder */}
      {!hasResults && (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-400">
          <div className="text-3xl mb-2">📄</div>
          <div className="font-medium">Enter your income above to see your first return estimate</div>
          <div className="text-xs mt-1">Your data stays on your device — nothing is sent or stored</div>
        </div>
      )}

      {hasResults && results && <>

      {/* Hero */}
      <div className={`text-white rounded-xl p-6 text-center ${results.refund > 0 ? "bg-emerald-600" : "bg-indigo-600"}`}>
        <div className={`text-sm font-medium mb-1 ${results.refund > 0 ? "text-emerald-200" : "text-indigo-200"}`}>
          {results.refund > 0 ? "🎉 Estimated Refund" : "Estimated Balance Owing"}
        </div>
        <div className="text-5xl font-black mb-1">
          {results.refund > 0 ? fmt(results.refund) : fmt(results.netOwing)}
        </div>
        <div className={`text-sm ${results.refund > 0 ? "text-emerald-200" : "text-indigo-200"}`}>
          Total tax: {fmt(results.totalTax)} · Effective rate: {results.effectiveRate.toFixed(1)}%
          · Marginal rate: {results.marginalRate.toFixed(1)}%
        </div>
      </div>

      <PrintButton />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
          <div className="text-xs text-gray-500 mb-1">Taxable Income</div>
          <div className="text-xl font-bold text-gray-800">{fmt(results.taxableIncome)}</div>
          <div className="text-xs text-gray-400 mt-0.5">after deductions</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
          <div className="text-xs text-gray-500 mb-1">GST/HST Credit</div>
          <div className="text-xl font-bold text-emerald-700">{fmt(results.gstCredit)}</div>
          <div className="text-xs text-gray-400 mt-0.5">unlock by filing</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
          <div className="text-xs text-gray-500 mb-1">RRSP Room Earned</div>
          <div className="text-xl font-bold text-indigo-700">{fmt(results.rrspRoomGenerated)}</div>
          <div className="text-xs text-gray-400 mt-0.5">usable next year</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
          <div className="text-xs text-gray-500 mb-1">TFSA Room (2025)</div>
          <div className="text-xl font-bold text-indigo-700">{age >= 18 ? fmt(results.tfsaRoomAge) : "N/A"}</div>
          <div className="text-xs text-gray-400 mt-0.5">{age >= 18 ? "this year" : "available at 18"}</div>
        </div>
      </div>

      {/* Tuition carry-forward alert */}
      {tuitionT2202 > 0 && results.totalTax === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 text-sm text-blue-800">
          📚 <strong>Tuition carry-forward:</strong> Your income is too low to use all your tuition credits this year — but they carry forward indefinitely. When you start earning more, you can apply {fmt(tuitionT2202)} in tuition credits against future tax owing.
        </div>
      )}

      {/* Self-employed warning */}
      {selfEmployedIncome > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
          🚗 <strong>Gig / Self-employment heads-up:</strong> As a self-employed person, you pay both the employee and employer portions of CPP (~{fmt(results.cppPremiums)} total). No tax is withheld from your income. If you expect to owe more than $3,000 at tax time, CRA may require quarterly instalment payments.
          <Link href="/calculators/cra-instalments" className="ml-1 font-semibold underline">Calculate your instalments →</Link>
        </div>
      )}

      {/* Tax Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Tax Breakdown</h2>
        <div className="space-y-2 text-sm">
          {[
            { label: "Total income", value: totalIncome },
            ...(results.rrspDeduction > 0 ? [{ label: "RRSP deduction", value: -results.rrspDeduction }] : []),
            ...(results.movingDeduction > 0 ? [{ label: "Moving expense deduction", value: -results.movingDeduction }] : []),
            ...(results.homeOfficeDeduction > 0 ? [{ label: "Home office deduction (flat rate)", value: -results.homeOfficeDeduction }] : []),
            ...(unionDues > 0 ? [{ label: "Union / professional dues", value: -unionDues }] : []),
            { label: "Taxable income", value: results.taxableIncome, divider: true },
            { label: "Federal income tax", value: results.federalTax },
            ...(results.fedTuitionCredit > 0 ? [{ label: "Federal tuition credit", value: -results.fedTuitionCredit }] : []),
            { label: `${prov.name} provincial tax`, value: results.provincialTax },
            ...(results.provTuitionCredit > 0 ? [{ label: "Provincial tuition credit", value: -results.provTuitionCredit }] : []),
            ...(results.healthPremium > 0 ? [{ label: "Ontario Health Premium", value: results.healthPremium }] : []),
            ...(results.cppPremiums > 0 ? [{ label: selfEmployedIncome > 0 ? "CPP contributions (both sides)" : "CPP premiums", value: results.cppPremiums }] : []),
            ...(results.eiPremiums > 0 ? [{ label: "EI premiums", value: results.eiPremiums }] : []),
            { label: "Total tax + payroll", value: results.totalTax, bold: true, divider: true },
            ...(taxWithheld > 0 ? [{ label: "Tax withheld at source", value: -taxWithheld }] : []),
          ].map((row, i) => (
            <div key={i} className={`flex justify-between py-1.5 text-sm ${row.divider ? "border-t-2 border-gray-200 mt-1 pt-2 font-semibold" : "border-t border-gray-50"} ${row.bold ? "font-black text-gray-900" : "text-gray-600"}`}>
              <span>{row.label}</span>
              <span className={(row.value ?? 0) < 0 ? "text-emerald-600" : ""}>{(row.value ?? 0) < 0 ? `−${fmt(-(row.value ?? 0))}` : fmt(row.value ?? 0)}</span>
            </div>
          ))}
          <div className={`flex justify-between py-2 border-t-2 border-gray-300 font-black text-base ${results.refund > 0 ? "text-emerald-700" : "text-indigo-700"}`}>
            <span>{results.refund > 0 ? "Refund" : "Balance Owing"}</span>
            <span>{fmt(results.refund > 0 ? results.refund : results.netOwing)}</span>
          </div>
        </div>
      </div>

      {/* Related Calculators */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="font-bold text-gray-800 mb-3">Explore More Canadian Financial Tools</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { slug: "tfsa-growth", label: "TFSA Growth Calculator", desc: "Grow money tax-free" },
            { slug: "rrsp-contribution", label: "RRSP Calculator", desc: "Plan your retirement" },
            { slug: "fhsa", label: "FHSA Calculator", desc: "Save for your first home" },
            { slug: "income-tax", label: "Income Tax Calculator", desc: "Full 2025 tax estimate" },
            { slug: "cra-instalments", label: "CRA Instalments", desc: "For gig & self-employed" },
            { slug: "budget-5030", label: "Budget Calculator", desc: "50/30/20 rule for Canadians" },
          ].map(c => (
            <Link key={c.slug} href={`/calculators/${c.slug}`}
              className="bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-300 rounded-lg p-3 transition-colors">
              <div className="font-semibold text-gray-800 text-sm">{c.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{c.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      </>}

      {/* Checklist — always visible */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-indigo-700">
          <h2 className="text-lg font-bold text-white">📋 First-Time Filer Checklist</h2>
          <p className="text-indigo-200 text-sm mt-0.5">Gather these before you start — takes 30–60 minutes once you have everything</p>
        </div>
        <div className="divide-y divide-gray-100 text-sm">
          {[
            { icon: "📄", step: "Get your SIN", detail: "Your Social Insurance Number is required. If you've never filed, you likely need to apply at Service Canada." },
            { icon: "📬", step: "Collect your slips", detail: "T4 (employment), T4A (scholarships, other), T5 (interest/dividends), T2202 (tuition). Employers must send by end of February." },
            { icon: "💻", step: "Create a CRA My Account", detail: "Go to canada.ca/my-cra-account. You'll use it to view RRSP room, benefit payments, and file online in future years." },
            { icon: "🆓", step: "Choose free filing software", detail: "Wealthsimple Tax, TurboTax Free, UFile Free, and StudioTax are all CRA-certified and free for simple returns." },
            { icon: "🏦", step: "Set up CRA direct deposit", detail: "Link your bank account through CRA My Account to get refunds and GST credit deposited — faster than cheques." },
            { icon: "🎓", step: "Enter your T2202 tuition slip", detail: "Even if your income is zero, entering your tuition generates credits that carry forward to future years. Don't skip this." },
            { icon: "✅", step: "File by April 30", detail: "Even with no income, file on time. If you owe money and file late, penalties start at 5% of the balance + 1%/month." },
            { icon: "💳", step: "Open a TFSA", detail: "Once filed, open a TFSA immediately. $7,000 of contribution room for 2025 — all growth is tax-free forever." },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 px-5 py-4">
              <span className="text-lg shrink-0 mt-0.5">{item.icon}</span>
              <div>
                <div className="font-semibold text-gray-800">{item.step}</div>
                <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Free Software CTA */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
        <h2 className="text-base font-bold text-indigo-900 mb-1">🆓 Free Tax Software (CRA-Certified)</h2>
        <p className="text-sm text-indigo-800 mb-3">Simple first returns can be done in under an hour with any of these free tools. All are certified by the CRA and support NETFILE (direct electronic filing).</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Wealthsimple Tax", href: "https://www.wealthsimple.com/en-ca/tax" },
            { label: "TurboTax Free", href: "https://turbotax.intuit.ca/tax-software/free-tax-return.jsp" },
            { label: "UFile Free", href: "https://www.ufile.ca" },
            { label: "StudioTax", href: "https://www.studiotax.com" },
          ].map(s => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
              className="text-xs bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 px-3 py-2 rounded-lg font-medium transition-colors">
              {s.label} →
            </a>
          ))}
        </div>
      </div>

      {/* FAQ / SEO */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5 text-sm text-gray-600 leading-relaxed">
        <h2 className="text-xl font-bold text-gray-900">Filing Your First Canadian Tax Return</h2>

        <h3 className="text-base font-bold text-gray-800">Do I have to file if I made very little money?</h3>
        <p>Technically, you only have to file if you owe tax. But you should always file anyway. Filing unlocks the GST/HST credit (up to $519/year), starts building your RRSP room, and activates your TFSA room. Students especially often miss hundreds of dollars in refunds by not filing.</p>

        <h3 className="text-base font-bold text-gray-800">What is the tuition tax credit?</h3>
        <p>The tuition credit is 15% federally (and a provincial rate) of your eligible tuition fees from your T2202 slip. If your income is too low to use the full credit, unused amounts carry forward indefinitely. When you start earning more, those credits offset future tax — they never expire.</p>

        <h3 className="text-base font-bold text-gray-800">I did gig work — do I owe more tax?</h3>
        <p>Yes, likely. Gig income is self-employment income and no tax is withheld. Worse, you pay both the employee and employer CPP contributions (~11.9% of net income). Budget roughly 25–30% of your gig income for taxes depending on your province and total income.</p>

        <h3 className="text-base font-bold text-gray-800">What's the difference between a tax deduction and a tax credit?</h3>
        <p>A deduction reduces your taxable income — it saves you your marginal rate on the amount. An RRSP deduction at a 26% marginal rate saves 26 cents per dollar. A credit reduces your tax directly — the basic personal credit saves everyone exactly 15% federally on the basic amount regardless of income.</p>

        <h3 className="text-base font-bold text-gray-800">Can I file online for free?</h3>
        <p>Yes. Wealthsimple Tax, TurboTax Free, UFile, and StudioTax are all CRA-certified, support NETFILE direct filing, and are completely free for simple returns. Most first-time filers are done in under an hour once they have their slips.</p>

        <h3 className="text-base font-bold text-gray-800">What is the filing deadline?</h3>
        <p>April 30, 2025 for most Canadians. If you're self-employed (or your spouse/partner is), you have until June 15 to file — but any balance owing is still due April 30. Filing late when you owe results in a 5% penalty on the balance plus 1% per month.</p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-xs">
          <strong>Disclaimer:</strong> This calculator provides estimates using 2025 federal and provincial tax rates. Individual circumstances vary. This is not tax advice — consult a tax professional or use CRA-certified software to file your actual return.
        </div>
      </div>
    </div>
  );
}
