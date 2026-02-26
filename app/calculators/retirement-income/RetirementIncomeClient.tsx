"use client";

import { useState, useMemo } from "react";
import { NumericFormat } from "react-number-format";
import PrintButton from "@/components/PrintButton";

// ─── 2025 Tax Data ────────────────────────────────────────────────────────────

const FEDERAL_BRACKETS = [
  { min: 0, max: 57375, rate: 0.15 },
  { min: 57375, max: 114750, rate: 0.205 },
  { min: 114750, max: 158519, rate: 0.26 },
  { min: 158519, max: 220000, rate: 0.29 },
  { min: 220000, max: Infinity, rate: 0.33 },
];
const FED_BASIC_PERSONAL = 16129;
const OAS_CLAWBACK_THRESHOLD = 93454;
const OAS_CLAWBACK_RATE = 0.15;
const OAS_MAX_ANNUAL = 8618; // ~$718/mo at 65

const PROV_BRACKETS: Record<string, { brackets: { min: number; max: number; rate: number }[]; basic: number; name: string }> = {
  AB: { name: "Alberta", basic: 21003, brackets: [{ min: 0, max: 148269, rate: 0.10 }, { min: 148269, max: 177922, rate: 0.12 }, { min: 177922, max: 237230, rate: 0.13 }, { min: 237230, max: 355845, rate: 0.14 }, { min: 355845, max: Infinity, rate: 0.15 }] },
  BC: { name: "British Columbia", basic: 11981, brackets: [{ min: 0, max: 45654, rate: 0.0506 }, { min: 45654, max: 91310, rate: 0.077 }, { min: 91310, max: 104835, rate: 0.105 }, { min: 104835, max: 127299, rate: 0.1229 }, { min: 127299, max: 172602, rate: 0.147 }, { min: 172602, max: 240716, rate: 0.168 }, { min: 240716, max: Infinity, rate: 0.205 }] },
  MB: { name: "Manitoba", basic: 15780, brackets: [{ min: 0, max: 47000, rate: 0.108 }, { min: 47000, max: 100000, rate: 0.1275 }, { min: 100000, max: Infinity, rate: 0.174 }] },
  NB: { name: "New Brunswick", basic: 12458, brackets: [{ min: 0, max: 49958, rate: 0.094 }, { min: 49958, max: 99916, rate: 0.14 }, { min: 99916, max: 185064, rate: 0.16 }, { min: 185064, max: Infinity, rate: 0.195 }] },
  NL: { name: "Newfoundland & Labrador", basic: 10818, brackets: [{ min: 0, max: 43198, rate: 0.087 }, { min: 43198, max: 86395, rate: 0.145 }, { min: 86395, max: 154244, rate: 0.158 }, { min: 154244, max: 215943, rate: 0.178 }, { min: 215943, max: Infinity, rate: 0.198 }] },
  NS: { name: "Nova Scotia", basic: 8481, brackets: [{ min: 0, max: 29590, rate: 0.0879 }, { min: 29590, max: 59180, rate: 0.1495 }, { min: 59180, max: 93000, rate: 0.1667 }, { min: 93000, max: 150000, rate: 0.175 }, { min: 150000, max: Infinity, rate: 0.21 }] },
  ON: { name: "Ontario", basic: 11865, brackets: [{ min: 0, max: 51446, rate: 0.0505 }, { min: 51446, max: 102894, rate: 0.0915 }, { min: 102894, max: 150000, rate: 0.1116 }, { min: 150000, max: 220000, rate: 0.1216 }, { min: 220000, max: Infinity, rate: 0.1316 }] },
  PE: { name: "Prince Edward Island", basic: 12000, brackets: [{ min: 0, max: 32656, rate: 0.096 }, { min: 32656, max: 64313, rate: 0.1337 }, { min: 64313, max: 105000, rate: 0.167 }, { min: 105000, max: Infinity, rate: 0.18 }] },
  QC: { name: "Quebec", basic: 17183, brackets: [{ min: 0, max: 53255, rate: 0.14 }, { min: 53255, max: 106495, rate: 0.19 }, { min: 106495, max: 129590, rate: 0.24 }, { min: 129590, max: Infinity, rate: 0.2575 }] },
  SK: { name: "Saskatchewan", basic: 17661, brackets: [{ min: 0, max: 49720, rate: 0.105 }, { min: 49720, max: 142058, rate: 0.125 }, { min: 142058, max: Infinity, rate: 0.145 }] },
  NT: { name: "Northwest Territories", basic: 16593, brackets: [{ min: 0, max: 50597, rate: 0.059 }, { min: 50597, max: 101198, rate: 0.086 }, { min: 101198, max: 164525, rate: 0.122 }, { min: 164525, max: Infinity, rate: 0.1405 }] },
  NU: { name: "Nunavut", basic: 17925, brackets: [{ min: 0, max: 53268, rate: 0.04 }, { min: 53268, max: 106537, rate: 0.07 }, { min: 106537, max: 173205, rate: 0.09 }, { min: 173205, max: Infinity, rate: 0.115 }] },
  YT: { name: "Yukon", basic: 15705, brackets: [{ min: 0, max: 57375, rate: 0.064 }, { min: 57375, max: 114750, rate: 0.09 }, { min: 114750, max: 500000, rate: 0.109 }, { min: 500000, max: Infinity, rate: 0.128 }] },
};

// RRIF minimum withdrawal rates by age
const RRIF_MIN_RATES: Record<number, number> = {
  55: 0.0270, 56: 0.0278, 57: 0.0286, 58: 0.0294, 59: 0.0303,
  60: 0.0313, 61: 0.0323, 62: 0.0333, 63: 0.0345, 64: 0.0357,
  65: 0.0400, 66: 0.0417, 67: 0.0435, 68: 0.0453, 69: 0.0473,
  70: 0.0500, 71: 0.0528, 72: 0.0553, 73: 0.0581, 74: 0.0612,
  75: 0.0645, 76: 0.0682, 77: 0.0721, 78: 0.0763, 79: 0.0810,
  80: 0.0862, 81: 0.0919, 82: 0.0982, 83: 0.1050, 84: 0.1127,
  85: 0.1210, 86: 0.1301, 87: 0.1401, 88: 0.1510, 89: 0.1630,
  90: 0.1762, 91: 0.1911, 92: 0.2000, 93: 0.2000, 94: 0.2000, 95: 0.2000,
};

// ─── Tax Helpers ──────────────────────────────────────────────────────────────

function calcBracketTax(income: number, brackets: { min: number; max: number; rate: number }[]): number {
  let tax = 0;
  for (const b of brackets) {
    if (income <= b.min) break;
    tax += (Math.min(income, b.max) - b.min) * b.rate;
  }
  return tax;
}

function calcIncomeTax(income: number, province: string): number {
  const fedBasic = FED_BASIC_PERSONAL * 0.15;
  const fedAge = 8790 * 0.15; // age credit (65+)
  const fedPension = Math.min(income, 2000) * 0.15; // pension income credit
  const fedTax = Math.max(0, calcBracketTax(income, FEDERAL_BRACKETS) - fedBasic - fedAge - fedPension);

  const prov = PROV_BRACKETS[province];
  const provBasic = prov.basic * prov.brackets[0].rate;
  const provTax = Math.max(0, calcBracketTax(income, prov.brackets) - provBasic);

  return fedTax + provTax;
}

function calcOASClawback(income: number): number {
  if (income <= OAS_CLAWBACK_THRESHOLD) return 0;
  return Math.min((income - OAS_CLAWBACK_THRESHOLD) * OAS_CLAWBACK_RATE, OAS_MAX_ANNUAL);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface YearRow {
  age: number;
  spouseAge: number | null;
  rrifBalance: number;
  tfsaBalance: number;
  rrifWithdrawal: number;
  tfsaWithdrawal: number;
  cpp: number;
  oas: number;
  pension: number;
  other: number;
  grossIncome: number;
  incomeTax: number;
  oasClawback: number;
  netIncome: number;
  inflationFactor: number;
  depleted: boolean;
}

// ─── Formatting ───────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
}
function fmtPct(n: number): string {
  return (n * 100).toFixed(1) + "%";
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RetirementIncomeClient() {
  // Personal
  const [currentAge, setCurrentAge] = useState(55);
  const [retirementAge, setRetirementAge] = useState(65);
  const [province, setProvince] = useState("ON");

  // RRSP/RRIF
  const [rrifBalance, setRrifBalance] = useState(500000);
  const [rrifReturn, setRrifReturn] = useState(5.0);

  // TFSA
  const [tfsaBalance, setTfsaBalance] = useState(100000);
  const [tfsaReturn, setTfsaReturn] = useState(5.0);
  const [tfsaMonthly, setTfsaMonthly] = useState(0);

  // Government benefits
  const [cppMonthly, setCppMonthly] = useState(900);
  const [oasMonthly, setOasMonthly] = useState(718);
  const [cppStartAge, setCppStartAge] = useState(65);
  const [oasStartAge, setOasStartAge] = useState(65);

  // Other income
  const [pensionMonthly, setPensionMonthly] = useState(0);
  const [otherMonthly, setOtherMonthly] = useState(0);

  // Spouse
  const [hasSpouse, setHasSpouse] = useState(false);
  const [spouseAge, setSpouseAge] = useState(55);
  const [spouseCpp, setSpouseCpp] = useState(600);
  const [spouseOas, setSpouseOas] = useState(718);
  const [spouseCppAge, setSpouseCppAge] = useState(65);
  const [spouseOasAge, setSpouseOasAge] = useState(65);
  const [spouseRrif, setSpouseRrif] = useState(200000);
  const [spousePension, setSpousePension] = useState(0);

  // Settings
  const [inflation, setInflation] = useState(2.5);
  const [showTable, setShowTable] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // ─── Projection ─────────────────────────────────────────────────────────────

  const projection = useMemo(() => {
    const rows: YearRow[] = [];
    let rrif = rrifBalance;
    let tfsa = tfsaBalance;
    let spouseRrifBal = spouseRrif;
    let depleted = false;
    const yearsToRetirement = Math.max(0, retirementAge - currentAge);

    // Grow balances to retirement
    const rrifAtRetirement = rrif * Math.pow(1 + rrifReturn / 100, yearsToRetirement);
    const tfsaAtRetirement = tfsa * Math.pow(1 + tfsaReturn / 100, yearsToRetirement);
    const spouseRrifAtRetirement = spouseRrif * Math.pow(1 + rrifReturn / 100, yearsToRetirement);

    rrif = rrifAtRetirement;
    tfsa = tfsaAtRetirement;
    spouseRrifBal = spouseRrifAtRetirement;

    for (let i = 0; i <= 95 - retirementAge; i++) {
      const age = retirementAge + i;
      const sAge = hasSpouse ? spouseAge + (age - retirementAge) : null;
      const inflFactor = Math.pow(1 + inflation / 100, i);

      // RRIF minimum withdrawal
      const rrifRate = RRIF_MIN_RATES[Math.min(age, 95)] ?? 0.2;
      const spouseRrifRate = sAge ? (RRIF_MIN_RATES[Math.min(sAge, 95)] ?? 0.2) : 0;

      const rrifMin = rrif * rrifRate;
      const spouseRrifMin = spouseRrifBal * spouseRrifRate;

      // TFSA voluntary withdrawal
      const tfsaW = Math.min(tfsa, tfsaMonthly * 12);

      // Government income
      const cpp = age >= cppStartAge ? cppMonthly * 12 : 0;
      const oas = age >= oasStartAge ? oasMonthly * 12 : 0;
      const sCpp = (hasSpouse && sAge && sAge >= spouseCppAge) ? spouseCpp * 12 : 0;
      const sOas = (hasSpouse && sAge && sAge >= spouseOasAge) ? spouseOas * 12 : 0;
      const pension = pensionMonthly * 12;
      const sPension = spousePension * 12;
      const other = otherMonthly * 12;

      // Combined household income for splitting purposes
      const primaryIncome = rrifMin + cpp + oas + pension + other;
      const spouseIncome = spouseRrifMin + sCpp + sOas + sPension;

      // Pension income splitting — split up to 50% of eligible pension income
      let primaryTaxable = primaryIncome;
      let spouseTaxable = spouseIncome;
      if (hasSpouse) {
        const eligibleToSplit = rrifMin * 0.5; // simplified: split RRIF income
        const optimalSplit = Math.max(0, (primaryIncome - spouseIncome) / 2);
        const actualSplit = Math.min(eligibleToSplit, optimalSplit);
        primaryTaxable = primaryIncome - actualSplit;
        spouseTaxable = spouseIncome + actualSplit;
      }

      const primaryTax = calcIncomeTax(primaryTaxable, province);
      const spouseTax = hasSpouse ? calcIncomeTax(spouseTaxable, province) : 0;
      const totalTax = primaryTax + spouseTax;

      const oasClawback = calcOASClawback(primaryTaxable) + (hasSpouse ? calcOASClawback(spouseTaxable) : 0);

      const grossIncome = primaryIncome + spouseIncome + tfsaW; // TFSA is tax-free
      const netIncome = grossIncome - totalTax - oasClawback;

      rows.push({
        age,
        spouseAge: sAge,
        rrifBalance: rrif,
        tfsaBalance: tfsa,
        rrifWithdrawal: rrifMin + spouseRrifMin,
        tfsaWithdrawal: tfsaW,
        cpp: cpp + sCpp,
        oas: oas + sOas,
        pension: pension + sPension,
        other,
        grossIncome,
        incomeTax: totalTax,
        oasClawback,
        netIncome,
        inflationFactor: inflFactor,
        depleted,
      });

      // Update balances
      rrif = Math.max(0, (rrif - rrifMin) * (1 + rrifReturn / 100));
      tfsa = Math.max(0, (tfsa - tfsaW) * (1 + tfsaReturn / 100));
      spouseRrifBal = Math.max(0, (spouseRrifBal - spouseRrifMin) * (1 + rrifReturn / 100));

      if (rrif === 0 && tfsa === 0 && !depleted) {
        depleted = true;
      }
    }

    return rows;
  }, [
    currentAge, retirementAge, province, rrifBalance, rrifReturn,
    tfsaBalance, tfsaReturn, tfsaMonthly, cppMonthly, oasMonthly,
    cppStartAge, oasStartAge, pensionMonthly, otherMonthly, inflation,
    hasSpouse, spouseAge, spouseCpp, spouseOas, spouseCppAge, spouseOasAge,
    spouseRrif, spousePension,
  ]);

  const firstYear = projection[0];
  const age75Row = projection.find(r => r.age === 75);
  const age85Row = projection.find(r => r.age === 85);
  const depletionRow = projection.find(r => r.rrifBalance < 1000 && r.tfsaBalance < 1000);
  const age95Row = projection[projection.length - 1];

  const rrifAtRetirement = rrifBalance * Math.pow(1 + rrifReturn / 100, Math.max(0, retirementAge - currentAge));
  const tfsaAtRetirement = tfsaBalance * Math.pow(1 + tfsaReturn / 100, Math.max(0, retirementAge - currentAge));

  const hasClawbackRisk = projection.some(r => r.oasClawback > 0);
  const oasClawbackYear = projection.find(r => r.oasClawback > 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* Info Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="w-full flex items-center justify-between px-5 py-3 text-blue-800 font-semibold text-sm"
        >
          <span>💡 How this calculator works</span>
          <span>{showInfo ? "▲ Hide" : "▼ Show"}</span>
        </button>
        {showInfo && (
          <div className="px-5 pb-4 text-blue-900 text-sm space-y-2">
            <p>This calculator projects your combined retirement income from all sources — RRIF/RRSP, TFSA, CPP, OAS, pension, and other income — from retirement to age 95.</p>
            <p>It applies <strong>2025 federal and provincial tax rates</strong>, mandatory RRIF minimum withdrawals by age, OAS clawback thresholds, and optional <strong>pension income splitting</strong> between spouses.</p>
            <p>RRSP/RRIF and TFSA balances are grown at your specified return rate from today to your retirement date, then drawn down through retirement.</p>
          </div>
        )}
      </div>

      {/* Hero */}
      <div className="bg-blue-600 text-white rounded-xl p-6 text-center">
        <div className="text-sm font-medium text-blue-200 mb-1">First Year Net Retirement Income</div>
        <div className="text-5xl font-black mb-1">{fmt(firstYear?.netIncome ?? 0)}</div>
        <div className="text-blue-200 text-sm">
          {fmt((firstYear?.netIncome ?? 0) / 12)}/month · Gross {fmt(firstYear?.grossIncome ?? 0)} · Tax {fmt(firstYear?.incomeTax ?? 0)}
        </div>
      </div>

      <PrintButton />

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">RRIF at Retirement</div>
          <div className="text-xl font-bold text-gray-800">{fmt(rrifAtRetirement)}</div>
          <div className="text-xs text-gray-400 mt-0.5">at age {retirementAge}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">TFSA at Retirement</div>
          <div className="text-xl font-bold text-gray-800">{fmt(tfsaAtRetirement)}</div>
          <div className="text-xs text-gray-400 mt-0.5">at age {retirementAge}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Net Income at 75</div>
          <div className="text-xl font-bold text-gray-800">{fmt(age75Row?.netIncome ?? 0)}</div>
          <div className="text-xs text-gray-400 mt-0.5">{fmt((age75Row?.netIncome ?? 0) / 12)}/mo</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">RRIF Balance at 85</div>
          <div className="text-xl font-bold text-gray-800">{fmt(age85Row?.rrifBalance ?? 0)}</div>
          <div className="text-xs text-gray-400 mt-0.5">combined</div>
        </div>
      </div>

      {/* OAS Clawback Warning */}
      {hasClawbackRisk && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <div className="font-semibold text-amber-800 text-sm">OAS Clawback Risk Detected</div>
            <div className="text-amber-700 text-sm mt-0.5">
              Starting at age {oasClawbackYear?.age}, your income exceeds the {fmt(OAS_CLAWBACK_THRESHOLD)} OAS clawback threshold. You may lose up to {fmt(oasClawbackYear?.oasClawback ?? 0)}/year in OAS benefits. Consider drawing down RRIF faster in early retirement or using TFSA withdrawals to manage taxable income.
            </div>
          </div>
        </div>
      )}

      {/* Inputs */}
      <div className="print:hidden bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <h2 className="text-lg font-bold text-gray-800">Your Information</h2>

        {/* Personal */}
        <div>
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Personal</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Age</label>
              <input type="number" min={40} max={80} value={currentAge}
                onChange={e => setCurrentAge(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Retirement Age</label>
              <input type="number" min={55} max={75} value={retirementAge}
                onChange={e => setRetirementAge(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
              <select value={province} onChange={e => setProvince(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none">
                {Object.entries(PROV_BRACKETS).sort((a, b) => a[1].name.localeCompare(b[1].name)).map(([code, p]) => (
                  <option key={code} value={code}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* RRSP / RRIF */}
        <div>
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">RRSP / RRIF</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current RRSP/RRIF Balance</label>
              <NumericFormat value={rrifBalance} onValueChange={v => setRrifBalance(v.floatValue ?? 0)}
                thousandSeparator prefix="$"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Annual Return</label>
              <div className="relative">
                <input type="number" min={0} max={12} step={0.5} value={rrifReturn}
                  onChange={e => setRrifReturn(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
                <span className="absolute right-3 top-2 text-gray-400 text-sm">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* TFSA */}
        <div>
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">TFSA</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current TFSA Balance</label>
              <NumericFormat value={tfsaBalance} onValueChange={v => setTfsaBalance(v.floatValue ?? 0)}
                thousandSeparator prefix="$"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">TFSA Annual Return</label>
              <div className="relative">
                <input type="number" min={0} max={12} step={0.5} value={tfsaReturn}
                  onChange={e => setTfsaReturn(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
                <span className="absolute right-3 top-2 text-gray-400 text-sm">%</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">TFSA Monthly Withdrawal</label>
              <NumericFormat value={tfsaMonthly} onValueChange={v => setTfsaMonthly(v.floatValue ?? 0)}
                thousandSeparator prefix="$"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
        </div>

        {/* Government Benefits */}
        <div>
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Government Benefits</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPP Monthly</label>
              <NumericFormat value={cppMonthly} onValueChange={v => setCppMonthly(v.floatValue ?? 0)}
                thousandSeparator prefix="$"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPP Start Age</label>
              <select value={cppStartAge} onChange={e => setCppStartAge(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none">
                {[60,61,62,63,64,65,66,67,68,69,70].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">OAS Monthly</label>
              <NumericFormat value={oasMonthly} onValueChange={v => setOasMonthly(v.floatValue ?? 0)}
                thousandSeparator prefix="$"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">OAS Start Age</label>
              <select value={oasStartAge} onChange={e => setOasStartAge(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none">
                {[65,66,67,68,69,70].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">2025 max CPP at 65: $1,364/mo · Max OAS at 65: $718/mo · Deferring to 70 increases CPP by 42%, OAS by 36%</p>
        </div>

        {/* Other Income */}
        <div>
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Other Income</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Defined Benefit Pension</label>
              <NumericFormat value={pensionMonthly} onValueChange={v => setPensionMonthly(v.floatValue ?? 0)}
                thousandSeparator prefix="$"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Other Monthly Income</label>
              <NumericFormat value={otherMonthly} onValueChange={v => setOtherMonthly(v.floatValue ?? 0)}
                thousandSeparator prefix="$"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Inflation Rate</label>
              <div className="relative">
                <input type="number" min={0} max={8} step={0.5} value={inflation}
                  onChange={e => setInflation(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
                <span className="absolute right-3 top-2 text-gray-400 text-sm">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Spouse */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => setHasSpouse(!hasSpouse)}
              className={`relative w-11 h-6 rounded-full transition-colors ${hasSpouse ? "bg-blue-600" : "bg-gray-300"}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${hasSpouse ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
            <span className="text-sm font-semibold text-gray-700">Include Spouse / Partner</span>
          </div>

          {hasSpouse && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Spouse Current Age</label>
                <input type="number" min={40} max={80} value={spouseAge}
                  onChange={e => setSpouseAge(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Spouse RRSP/RRIF Balance</label>
                <NumericFormat value={spouseRrif} onValueChange={v => setSpouseRrif(v.floatValue ?? 0)}
                  thousandSeparator prefix="$"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Spouse Pension Monthly</label>
                <NumericFormat value={spousePension} onValueChange={v => setSpousePension(v.floatValue ?? 0)}
                  thousandSeparator prefix="$"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Spouse CPP Monthly</label>
                <NumericFormat value={spouseCpp} onValueChange={v => setSpouseCpp(v.floatValue ?? 0)}
                  thousandSeparator prefix="$"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Spouse CPP Start Age</label>
                <select value={spouseCppAge} onChange={e => setSpouseCppAge(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none">
                  {[60,61,62,63,64,65,66,67,68,69,70].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Spouse OAS Monthly</label>
                <NumericFormat value={spouseOas} onValueChange={v => setSpouseOas(v.floatValue ?? 0)}
                  thousandSeparator prefix="$"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Income Breakdown — First Year */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">First Year Income Breakdown (Age {retirementAge})</h2>
        <div className="space-y-3">
          {[
            { label: "RRIF Mandatory Withdrawal", value: firstYear?.rrifWithdrawal ?? 0, color: "bg-blue-500" },
            { label: "TFSA Withdrawal (tax-free)", value: firstYear?.tfsaWithdrawal ?? 0, color: "bg-green-500" },
            { label: "CPP Benefits", value: firstYear?.cpp ?? 0, color: "bg-purple-500" },
            { label: "OAS Benefits", value: firstYear?.oas ?? 0, color: "bg-orange-400" },
            { label: "Pension Income", value: firstYear?.pension ?? 0, color: "bg-teal-500" },
            { label: "Other Income", value: firstYear?.other ?? 0, color: "bg-gray-400" },
          ].filter(item => item.value > 0).map(item => {
            const pct = firstYear ? (item.value / firstYear.grossIncome) * 100 : 0;
            return (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{item.label}</span>
                  <span className="font-semibold text-gray-800">{fmt(item.value)} <span className="text-gray-400 font-normal">({pct.toFixed(0)}%)</span></span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full">
                  <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          <div className="border-t border-gray-200 pt-3 flex justify-between text-sm font-bold text-gray-800">
            <span>Gross Income</span><span>{fmt(firstYear?.grossIncome ?? 0)}</span>
          </div>
          <div className="flex justify-between text-sm text-red-600">
            <span>Income Tax</span><span>−{fmt(firstYear?.incomeTax ?? 0)}</span>
          </div>
          {(firstYear?.oasClawback ?? 0) > 0 && (
            <div className="flex justify-between text-sm text-amber-600">
              <span>OAS Clawback</span><span>−{fmt(firstYear.oasClawback)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-black text-blue-700 pt-1">
            <span>Net Income</span><span>{fmt(firstYear?.netIncome ?? 0)}</span>
          </div>
        </div>
      </div>

      {/* Key Milestones */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Key Milestones</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">Age 75 Net Income</div>
            <div className="text-2xl font-black text-blue-800">{fmt(age75Row?.netIncome ?? 0)}</div>
            <div className="text-xs text-blue-600 mt-1">RRIF balance: {fmt(age75Row?.rrifBalance ?? 0)}</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-xs text-purple-600 font-semibold uppercase tracking-wide mb-1">Age 85 Net Income</div>
            <div className="text-2xl font-black text-purple-800">{fmt(age85Row?.netIncome ?? 0)}</div>
            <div className="text-xs text-purple-600 mt-1">RRIF balance: {fmt(age85Row?.rrifBalance ?? 0)}</div>
          </div>
          <div className={`rounded-lg p-4 ${depletionRow ? "bg-red-50" : "bg-green-50"}`}>
            <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${depletionRow ? "text-red-600" : "text-green-600"}`}>
              {depletionRow ? "RRIF/TFSA Depleted" : "Funds at Age 95"}
            </div>
            <div className={`text-2xl font-black ${depletionRow ? "text-red-800" : "text-green-800"}`}>
              {depletionRow ? `Age ${depletionRow.age}` : fmt((age95Row?.rrifBalance ?? 0) + (age95Row?.tfsaBalance ?? 0))}
            </div>
            <div className={`text-xs mt-1 ${depletionRow ? "text-red-600" : "text-green-600"}`}>
              {depletionRow ? "Consider reducing withdrawals or deferring CPP/OAS" : "Remaining RRIF + TFSA combined"}
            </div>
          </div>
        </div>
      </div>

      {/* Year-by-Year Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowTable(!showTable)}
          className="w-full flex items-center justify-between px-6 py-4 text-gray-800 font-semibold"
        >
          <span>Year-by-Year Drawdown Table (Age {retirementAge}–95)</span>
          <span className="text-gray-400 text-sm">{showTable ? "▲ Hide" : "▼ Show"}</span>
        </button>
        {showTable && (
          <div className="overflow-x-auto border-t border-gray-100">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left text-gray-500 font-medium">Age</th>
                  {hasSpouse && <th className="px-3 py-2 text-center text-gray-500 font-medium">Spouse</th>}
                  <th className="px-3 py-2 text-right text-gray-500 font-medium">RRIF Bal.</th>
                  <th className="px-3 py-2 text-right text-gray-500 font-medium">TFSA Bal.</th>
                  <th className="px-3 py-2 text-right text-gray-500 font-medium">RRIF W/D</th>
                  <th className="px-3 py-2 text-right text-gray-500 font-medium">CPP+OAS</th>
                  <th className="px-3 py-2 text-right text-gray-500 font-medium">Tax</th>
                  <th className="px-3 py-2 text-right text-gray-500 font-medium font-bold">Net Income</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {projection.map(row => (
                  <tr key={row.age} className={`hover:bg-gray-50 ${row.rrifBalance < 10000 && row.tfsaBalance < 10000 ? "bg-red-50" : ""}`}>
                    <td className="px-3 py-1.5 font-medium text-gray-800">{row.age}</td>
                    {hasSpouse && <td className="px-3 py-1.5 text-center text-gray-500">{row.spouseAge}</td>}
                    <td className="px-3 py-1.5 text-right text-gray-600">{fmt(row.rrifBalance)}</td>
                    <td className="px-3 py-1.5 text-right text-gray-600">{fmt(row.tfsaBalance)}</td>
                    <td className="px-3 py-1.5 text-right text-gray-600">{fmt(row.rrifWithdrawal)}</td>
                    <td className="px-3 py-1.5 text-right text-gray-600">{fmt(row.cpp + row.oas)}</td>
                    <td className="px-3 py-1.5 text-right text-red-600">{fmt(row.incomeTax)}</td>
                    <td className="px-3 py-1.5 text-right font-bold text-blue-700">{fmt(row.netIncome)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Strategy Tips */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-800">Retirement Income Strategies</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: "RRSP Meltdown Strategy", desc: "Draw down your RRSP/RRIF faster in your 60s, before CPP and OAS kick in at 65+. This keeps total taxable income lower in later years when mandatory RRIF withdrawals are larger." },
            { title: "Defer CPP to 70", desc: "Deferring CPP from 65 to 70 increases your benefit by 42%. If you have other income sources, this is often the best guaranteed-return investment available." },
            { title: "Defer OAS to 70", desc: "Deferring OAS from 65 to 70 increases monthly payments by 36%. Particularly valuable if you're at risk of the OAS clawback threshold in early retirement." },
            { title: "Pension Income Splitting", desc: "Couples can split up to 50% of eligible pension income (including RRIF withdrawals after age 65). This can dramatically reduce total household tax by shifting income to the lower-earning spouse." },
            { title: "TFSA as Tax Management Tool", desc: "Use TFSA withdrawals to top up income in lower-tax years. TFSA income doesn't count toward OAS clawback thresholds, making it ideal when your RRIF forces large taxable withdrawals." },
            { title: "Watch the OAS Clawback", desc: `OAS benefits are clawed back at 15% of net income above $${OAS_CLAWBACK_THRESHOLD.toLocaleString()}. Plan withdrawals carefully around this threshold to preserve benefits.` },
          ].map(tip => (
            <div key={tip.title} className="bg-gray-50 rounded-lg p-4">
              <div className="font-semibold text-gray-800 text-sm mb-1">{tip.title}</div>
              <div className="text-gray-600 text-xs leading-relaxed">{tip.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ / SEO */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5 text-sm text-gray-600 leading-relaxed">
        <h2 className="text-xl font-bold text-gray-900">Planning Your Canadian Retirement Income</h2>

        <p>Retirement income planning in Canada involves coordinating multiple income streams — RRIF mandatory withdrawals, CPP benefits, OAS, defined benefit pensions, and TFSA savings — while managing taxes across potentially 30+ years of retirement.</p>

        <h3 className="text-base font-bold text-gray-800">How RRIF Withdrawals Work</h3>
        <p>At age 71 (or earlier if you choose), your RRSP must be converted to a RRIF. The government sets <strong>mandatory minimum withdrawal rates</strong> that increase with age — from 5.28% at 71 to 20% at 95+. These withdrawals are fully taxable as income. The key challenge is managing withdrawal amounts to avoid OAS clawback and unnecessary tax.</p>

        <h3 className="text-base font-bold text-gray-800">CPP and OAS Timing</h3>
        <p>You can start CPP as early as age 60 (at a 36% reduction) or defer to age 70 (for a 42% increase over the age-65 amount). OAS can start at 65 or be deferred to 70 for a 36% increase. The optimal timing depends on your health, other income sources, and how much you need to draw from taxable accounts in early retirement.</p>

        <h3 className="text-base font-bold text-gray-800">The OAS Clawback</h3>
        <p>The OAS Recovery Tax (clawback) reduces your OAS benefit by 15 cents for every dollar of net income above ${OAS_CLAWBACK_THRESHOLD.toLocaleString()} (2025). At incomes above approximately $151,000, OAS is fully clawed back. Careful withdrawal sequencing — drawing TFSA instead of RRIF in high-income years — can preserve OAS benefits.</p>

        <h3 className="text-base font-bold text-gray-800">Pension Income Splitting</h3>
        <p>Since 2007, Canadian couples can split up to 50% of eligible pension income on their tax returns. RRIF withdrawals made after age 65 qualify. This is one of the most powerful tax planning tools for retired couples — shifting income to the lower-earning spouse can save thousands annually.</p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-xs">
          <strong>Disclaimer:</strong> This calculator provides estimates for planning purposes only. It uses 2025 tax rates and simplified assumptions. Actual investment returns, inflation, government benefit amounts, and tax rules will vary. Consult a certified financial planner (CFP) or tax professional before making retirement income decisions.
        </div>
      </div>
    </div>
  );
}
