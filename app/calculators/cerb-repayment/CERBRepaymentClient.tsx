"use client";

import { useState, useMemo } from "react";
import { NumericFormat } from "react-number-format";
import PrintButton from "@/components/PrintButton";

// ─── CERB Program Data ────────────────────────────────────────────────────────

// CERB paid $2,000/4-week period, max 28 weeks = $14,000
const CERB_MAX = 14000;
const CERB_PERIOD_AMOUNT = 2000;
const CERB_PERIODS = 7;
const CERB_INCOME_THRESHOLD = 1000; // Must have earned <$1,000 in any 4-week CERB period to be eligible

// CRA prescribed interest rate for tax debts (2025)
const CRA_INTEREST_RATE = 0.10;

// CERB was paid March 15, 2020 – September 26, 2020
// CRB extended until Oct 2021
const CERB_YEAR = 2020;

// CERB was taxable income — added to 2020 net income
// Repayments made before Dec 31, 2020 reduced 2020 income
// Repayments after Jan 1, 2021 are deductible in the year repaid (line 23200)

// ─── 2020 Tax Data (for CERB year calculations) ───────────────────────────────

const FED_BRACKETS_2020 = [
  { min: 0, max: 48535, rate: 0.15 },
  { min: 48535, max: 97069, rate: 0.205 },
  { min: 97069, max: 150473, rate: 0.26 },
  { min: 150473, max: 214368, rate: 0.29 },
  { min: 214368, max: Infinity, rate: 0.33 },
];
const FED_BASIC_2020 = 13229;

const PROV_BRACKETS_2020: Record<string, {
  name: string;
  brackets: { min: number; max: number; rate: number }[];
  basic: number;
}> = {
  AB: { name: "Alberta", basic: 19369, brackets: [{ min: 0, max: 131220, rate: 0.10 }, { min: 131220, max: 157464, rate: 0.12 }, { min: 157464, max: 209952, rate: 0.13 }, { min: 209952, max: 314928, rate: 0.14 }, { min: 314928, max: Infinity, rate: 0.15 }] },
  BC: { name: "British Columbia", basic: 10949, brackets: [{ min: 0, max: 41725, rate: 0.0506 }, { min: 41725, max: 83451, rate: 0.077 }, { min: 83451, max: 95812, rate: 0.105 }, { min: 95812, max: 116344, rate: 0.1229 }, { min: 116344, max: 157748, rate: 0.147 }, { min: 157748, max: 220000, rate: 0.168 }, { min: 220000, max: Infinity, rate: 0.205 }] },
  MB: { name: "Manitoba", basic: 9134, brackets: [{ min: 0, max: 33389, rate: 0.108 }, { min: 33389, max: 72164, rate: 0.1275 }, { min: 72164, max: Infinity, rate: 0.174 }] },
  NB: { name: "New Brunswick", basic: 10459, brackets: [{ min: 0, max: 41675, rate: 0.094 }, { min: 41675, max: 83351, rate: 0.14 }, { min: 83351, max: 135510, rate: 0.16 }, { min: 135510, max: 154382, rate: 0.195 }, { min: 154382, max: Infinity, rate: 0.203 }] },
  NL: { name: "Newfoundland & Labrador", basic: 9498, brackets: [{ min: 0, max: 37929, rate: 0.087 }, { min: 37929, max: 75858, rate: 0.145 }, { min: 75858, max: 135432, rate: 0.158 }, { min: 135432, max: 189604, rate: 0.178 }, { min: 189604, max: Infinity, rate: 0.198 }] },
  NS: { name: "Nova Scotia", basic: 8481, brackets: [{ min: 0, max: 29590, rate: 0.0879 }, { min: 29590, max: 59180, rate: 0.1495 }, { min: 59180, max: 93000, rate: 0.1667 }, { min: 93000, max: 150000, rate: 0.175 }, { min: 150000, max: Infinity, rate: 0.21 }] },
  ON: { name: "Ontario", basic: 10783, brackets: [{ min: 0, max: 44740, rate: 0.0505 }, { min: 44740, max: 89482, rate: 0.0915 }, { min: 89482, max: 150000, rate: 0.1116 }, { min: 150000, max: 220000, rate: 0.1216 }, { min: 220000, max: Infinity, rate: 0.1316 }] },
  PE: { name: "Prince Edward Island", basic: 8160, brackets: [{ min: 0, max: 31984, rate: 0.098 }, { min: 31984, max: 63969, rate: 0.138 }, { min: 63969, max: Infinity, rate: 0.167 }] },
  QC: { name: "Quebec", basic: 15532, brackets: [{ min: 0, max: 44545, rate: 0.15 }, { min: 44545, max: 89080, rate: 0.20 }, { min: 89080, max: 108390, rate: 0.24 }, { min: 108390, max: Infinity, rate: 0.2575 }] },
  SK: { name: "Saskatchewan", basic: 16065, brackets: [{ min: 0, max: 45225, rate: 0.105 }, { min: 45225, max: 129214, rate: 0.125 }, { min: 129214, max: Infinity, rate: 0.145 }] },
  NT: { name: "Northwest Territories", basic: 15243, brackets: [{ min: 0, max: 43957, rate: 0.059 }, { min: 43957, max: 87916, rate: 0.086 }, { min: 87916, max: 142932, rate: 0.122 }, { min: 142932, max: Infinity, rate: 0.1405 }] },
  NU: { name: "Nunavut", basic: 16467, brackets: [{ min: 0, max: 46277, rate: 0.04 }, { min: 46277, max: 92555, rate: 0.07 }, { min: 92555, max: 150473, rate: 0.09 }, { min: 150473, max: Infinity, rate: 0.115 }] },
  YT: { name: "Yukon", basic: 13229, brackets: [{ min: 0, max: 48535, rate: 0.064 }, { min: 48535, max: 97069, rate: 0.09 }, { min: 97069, max: 500000, rate: 0.109 }, { min: 500000, max: Infinity, rate: 0.128 }] },
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

function calcMarginalRate2020(income: number, province: string): number {
  // Find marginal federal rate
  let fedRate = 0.33;
  for (const b of FED_BRACKETS_2020) {
    if (income <= b.max) { fedRate = b.rate; break; }
  }
  const prov = PROV_BRACKETS_2020[province];
  let provRate = 0;
  for (const b of prov.brackets) {
    if (income <= b.max) { provRate = b.rate; break; }
  }
  return fedRate + provRate;
}

function calcTax2020(income: number, province: string): number {
  const fedBasic = FED_BASIC_2020 * 0.15;
  const federal = Math.max(0, calcBracketTax(income, FED_BRACKETS_2020) - fedBasic);
  const prov = PROV_BRACKETS_2020[province];
  const provBasic = prov.basic * prov.brackets[0].rate;
  const provincial = Math.max(0, calcBracketTax(income, prov.brackets) - provBasic);
  return federal + provincial;
}

function fmt(n: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
}
function fmtFull(n: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

// ─── Component ────────────────────────────────────────────────────────────────

type RepaymentReason = "ineligible" | "overpayment" | "voluntary" | "unsure";

export default function CERBRepaymentClient() {
  const [cerbReceived, setCerbReceived] = useState(0);
  const [alreadyRepaid, setAlreadyRepaid] = useState(0);
  const [income2020, setIncome2020] = useState(0);
  const [province, setProvince] = useState("ON");
  const [repaymentReason, setRepaymentReason] = useState<RepaymentReason>("unsure");
  const [repaymentYear, setRepaymentYear] = useState<"2020" | "2021+" >("2021+");
  const [monthsOverdue, setMonthsOverdue] = useState(0);
  const [showInfo, setShowInfo] = useState(false);

  const hasResults = cerbReceived > 0;

  const results = useMemo(() => {
    if (!hasResults) return null;

    const outstanding = Math.max(0, cerbReceived - alreadyRepaid);
    const periodsReceived = Math.ceil(cerbReceived / CERB_PERIOD_AMOUNT);

    // Tax already paid on CERB (it was taxable income)
    // CERB would have been included in 2020 income
    const incomeWithCERB = income2020; // assume income2020 already includes CERB
    const incomeWithoutCERB = Math.max(0, income2020 - cerbReceived);
    const taxWithCERB = calcTax2020(incomeWithCERB, province);
    const taxWithoutCERB = calcTax2020(incomeWithoutCERB, province);
    const taxPaidOnCERB = taxWithCERB - taxWithoutCERB;

    // Marginal rate at CERB income level
    const marginalRate = calcMarginalRate2020(incomeWithCERB, province);

    // Tax refund from repayment
    // If repaid in 2020: reduces 2020 income → refund at marginal rate
    // If repaid in 2021+: deductible on year of repayment (line 23200)
    //   → refund based on that year's marginal rate (simplified: use 2020 rate)
    const taxRefundFromRepayment = outstanding * marginalRate;

    // Net cost of repayment (repayment minus tax refund)
    const netRepaymentCost = Math.max(0, outstanding - taxRefundFromRepayment);

    // Interest calculation if overdue
    const interestOwing = monthsOverdue > 0
      ? outstanding * CRA_INTEREST_RATE * (monthsOverdue / 12)
      : 0;

    // CERB eligibility check
    // CRA considers you ineligible if you earned >$1,000 in any period
    // or didn't meet other criteria
    const periodsIneligible = repaymentReason === "ineligible" ? periodsReceived : 0;

    // Payment plan options
    const plan12 = outstanding / 12;
    const plan24 = outstanding / 24;
    const plan36 = outstanding / 36;

    // How much tax was withheld — CERB had no withholding at source in 2020
    // Many Canadians were surprised by tax bill
    const estimatedTaxBill = taxPaidOnCERB;

    return {
      outstanding, periodsReceived, taxPaidOnCERB, taxWithCERB,
      taxWithoutCERB, marginalRate, taxRefundFromRepayment,
      netRepaymentCost, interestOwing, estimatedTaxBill,
      plan12, plan24, plan36, incomeWithCERB, incomeWithoutCERB,
    };
  }, [cerbReceived, alreadyRepaid, income2020, province, repaymentReason, monthsOverdue, hasResults]);

  const reasons: { key: RepaymentReason; label: string; desc: string }[] = [
    { key: "ineligible", label: "Was ineligible", desc: "Earned >$1,000 in a CERB period or didn't meet criteria" },
    { key: "overpayment", label: "Overpaid by CRA", desc: "Received more than entitled to (duplicate payment, etc.)" },
    { key: "voluntary", label: "Voluntary repayment", desc: "Choosing to repay to reduce 2020 taxable income" },
    { key: "unsure", label: "Not sure", desc: "Received a CRA letter or notice and need to understand options" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* Info Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl overflow-hidden">
        <button onClick={() => setShowInfo(!showInfo)}
          className="w-full flex items-center justify-between px-5 py-3 text-blue-800 font-semibold text-sm">
          <span>💡 About CERB repayments</span>
          <span>{showInfo ? "▲ Hide" : "▼ Show"}</span>
        </button>
        {showInfo && (
          <div className="px-5 pb-4 text-blue-900 text-sm space-y-2">
            <p>The Canada Emergency Response Benefit (CERB) paid $2,000 every 4 weeks from March–September 2020. CRA has been reviewing eligibility and contacting recipients who may have been ineligible or received overpayments.</p>
            <p><strong>Key rule:</strong> To be eligible, you must not have earned more than $1,000 (gross) in any 4-week period you claimed CERB. Students, seasonal workers, and those who earned exactly $1,000 or less were eligible.</p>
            <p><strong>Tax impact:</strong> CERB was taxable income. If you repay, you get a tax deduction in the year of repayment (or a reduction to your 2020 income if repaid before Dec 31, 2020). You won't pay tax on the repaid amount.</p>
            <p><strong>Payment plans:</strong> CRA offers flexible repayment arrangements. Contact CRA at 1-888-863-8657 to set up a plan if you can't pay in full.</p>
          </div>
        )}
      </div>

      {/* Inputs */}
      <div className="print:hidden bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <h2 className="text-lg font-bold text-gray-800">Your CERB Details</h2>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Why are you repaying?</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {reasons.map(r => (
              <button key={r.key} onClick={() => setRepaymentReason(r.key)}
                className={`py-3 px-4 rounded-lg text-sm border transition-colors text-left ${repaymentReason === r.key ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"}`}>
                <div className="font-medium">{r.label}</div>
                <div className={`text-xs mt-0.5 ${repaymentReason === r.key ? "text-blue-200" : "text-gray-400"}`}>{r.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total CERB Received</label>
            <NumericFormat value={cerbReceived || ""} onValueChange={v => setCerbReceived(v.floatValue ?? 0)}
              thousandSeparator prefix="$" placeholder="$0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
            <p className="text-xs text-gray-400 mt-1">Max $14,000 (7 periods × $2,000). Check your CRA My Account.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount Already Repaid</label>
            <NumericFormat value={alreadyRepaid || ""} onValueChange={v => setAlreadyRepaid(v.floatValue ?? 0)}
              thousandSeparator prefix="$" placeholder="$0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your 2020 Net Income (including CERB)</label>
            <NumericFormat value={income2020 || ""} onValueChange={v => setIncome2020(v.floatValue ?? 0)}
              thousandSeparator prefix="$" placeholder="$0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
            <p className="text-xs text-gray-400 mt-1">From your 2020 Notice of Assessment (line 23600)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Province (in 2020)</label>
            <select value={province} onChange={e => setProvince(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none">
              {Object.entries(PROV_BRACKETS_2020).sort((a, b) => a[1].name.localeCompare(b[1].name)).map(([code, p]) => (
                <option key={code} value={code}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">When are you repaying?</label>
            <div className="flex gap-2">
              {(["2020", "2021+"] as const).map(y => (
                <button key={y} onClick={() => setRepaymentYear(y)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${repaymentYear === y ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"}`}>
                  {y === "2020" ? "Before Dec 31, 2020" : "2021 or later"}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {repaymentYear === "2020"
                ? "Repayment reduces your 2020 income directly — refund at filing"
                : "Repayment is deductible in year paid (line 23200 of that year's return)"}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Months Overdue (for interest estimate)</label>
            <select value={monthsOverdue} onChange={e => setMonthsOverdue(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none">
              {[0, 3, 6, 12, 18, 24, 36, 48].map(m => (
                <option key={m} value={m}>{m === 0 ? "Not overdue" : `${m} months`}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Gate */}
      {!hasResults && (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-400">
          <div className="text-3xl mb-2">🇨🇦</div>
          <div className="font-medium">Enter the total CERB you received above to calculate your repayment details</div>
        </div>
      )}

      {hasResults && results && <>

      {/* Hero */}
      <div className="bg-blue-600 text-white rounded-xl p-6 text-center">
        <div className="text-sm font-medium text-blue-200 mb-1">Outstanding CERB Balance</div>
        <div className="text-5xl font-black mb-1">{fmt(results.outstanding)}</div>
        <div className="text-blue-200 text-sm">
          Net cost after tax deduction: {fmt(results.netRepaymentCost)} · Tax refund from repayment: {fmt(results.taxRefundFromRepayment)}
        </div>
      </div>

      <PrintButton />

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">CERB Received</div>
          <div className="text-xl font-bold text-gray-800">{fmt(cerbReceived)}</div>
          <div className="text-xs text-gray-400 mt-0.5">{results.periodsReceived} period{results.periodsReceived !== 1 ? "s" : ""} × $2,000</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Already Repaid</div>
          <div className="text-xl font-bold text-green-700">{fmt(alreadyRepaid)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Outstanding</div>
          <div className="text-xl font-bold text-red-600">{fmt(results.outstanding)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Your Marginal Rate (2020)</div>
          <div className="text-xl font-bold text-gray-800">{(results.marginalRate * 100).toFixed(1)}%</div>
          <div className="text-xs text-gray-400 mt-0.5">{province} fed + prov</div>
        </div>
      </div>

      {/* Interest Warning */}
      {monthsOverdue > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <div className="font-semibold text-red-800 text-sm">Estimated CRA Interest: {fmtFull(results.interestOwing)}</div>
            <div className="text-red-700 text-sm mt-0.5">
              Based on {monthsOverdue} months overdue at {(CRA_INTEREST_RATE * 100).toFixed(0)}% prescribed interest rate, compounded daily. Contact CRA immediately to set up a payment arrangement and stop further interest from accumulating.
              <strong className="block mt-1">CRA Collections: 1-888-863-8657</strong>
            </div>
          </div>
        </div>
      )}

      {/* Tax Impact */}
      {income2020 > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Tax Impact of Repayment</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">2020 Income WITH CERB</div>
              <div className="text-xl font-bold text-gray-800">{fmt(results.incomeWithCERB)}</div>
              <div className="text-xs text-gray-400 mt-0.5">Tax: {fmt(results.taxWithCERB)}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">2020 Income WITHOUT CERB</div>
              <div className="text-xl font-bold text-gray-800">{fmt(results.incomeWithoutCERB)}</div>
              <div className="text-xs text-gray-400 mt-0.5">Tax: {fmt(results.taxWithoutCERB)}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-xs text-green-600 font-semibold mb-1">Tax Refund from Full Repayment</div>
              <div className="text-xl font-bold text-green-700">{fmt(results.taxRefundFromRepayment)}</div>
              <div className="text-xs text-green-600 mt-0.5">at {(results.marginalRate * 100).toFixed(1)}% marginal rate</div>
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-blue-800">
              <strong>Net cost to repay {fmt(results.outstanding)}:</strong> After your tax refund of {fmt(results.taxRefundFromRepayment)}, your true out-of-pocket cost is <strong>{fmt(results.netRepaymentCost)}</strong>.
              {repaymentYear === "2020"
                ? " Since you're repaying in 2020, this reduces your 2020 income directly."
                : " Since you're repaying in 2021 or later, claim the deduction on line 23200 of your return for the year you repay."}
            </div>
          </div>
        </div>
      )}

      {/* Repayment Options */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Repayment Options</h2>
          <p className="text-sm text-gray-500 mt-0.5">Outstanding balance: {fmt(results.outstanding)}</p>
        </div>
        <div className="divide-y divide-gray-100">
          <div className="p-5 flex items-center justify-between">
            <div>
              <div className="font-semibold text-gray-800">Lump Sum</div>
              <div className="text-sm text-gray-500 mt-0.5">Pay in full — stops interest immediately. Can pay online through CRA My Account, My Payment, or bank bill payment (payee: "CRA – tax installments" or "Receiver General").</div>
            </div>
            <div className="text-right ml-6 shrink-0">
              <div className="text-2xl font-black text-blue-700">{fmt(results.outstanding)}</div>
              <div className="text-xs text-gray-400">+ any interest owing</div>
            </div>
          </div>
          {[
            { label: "12-Month Plan", monthly: results.plan12, note: "Recommended if manageable" },
            { label: "24-Month Plan", monthly: results.plan24, note: "Balance: interest continues accruing" },
            { label: "36-Month Plan", monthly: results.plan36, note: "Longest standard plan — call CRA to arrange" },
          ].map(plan => (
            <div key={plan.label} className="p-5 flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-800">{plan.label}</div>
                <div className="text-sm text-gray-500 mt-0.5">{plan.note}</div>
              </div>
              <div className="text-right ml-6 shrink-0">
                <div className="text-2xl font-black text-gray-800">{fmtFull(plan.monthly)}<span className="text-sm font-normal text-gray-400">/mo</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Eligibility Reminder */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h2 className="text-base font-bold text-amber-800 mb-2">⚠️ CERB Eligibility Rules</h2>
        <div className="text-sm text-amber-800 space-y-1.5">
          <p>You were <strong>eligible</strong> for a CERB period if you: stopped working due to COVID-19; earned at least $5,000 in 2019 or in the 12 months before applying; earned <strong>$1,000 or less</strong> (gross) in any 14-day period of the 4-week claim period; and were not receiving EI during that period.</p>
          <p>CRA may have contacted you if: you earned more than $1,000 in a claim period; you received both CERB and EI simultaneously; you received duplicate payments; or your $5,000 earnings threshold wasn't met.</p>
          <p>If you believe you were eligible but CRA is asking for repayment, you can <strong>formally dispute</strong> the decision through CRA My Account or by calling 1-800-959-8281.</p>
        </div>
      </div>

      </>}

      {/* SEO / FAQ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5 text-sm text-gray-600 leading-relaxed">
        <h2 className="text-xl font-bold text-gray-900">CERB Repayment: What Canadians Need to Know</h2>

        <p>The Canada Emergency Response Benefit paid $2,000 every 4 weeks to Canadians who stopped working due to COVID-19. Millions of Canadians received CERB, and CRA has been reviewing eligibility and contacting some recipients who may owe repayment.</p>

        <h3 className="text-base font-bold text-gray-800">Who Has to Repay CERB?</h3>
        <p>You may need to repay CERB if you earned more than $1,000 gross in any 4-week claim period, if you received a duplicate payment, if you didn't meet the $5,000 prior earnings requirement, or if you received both CERB and Employment Insurance simultaneously. CRA has been issuing reassessments and collection notices through 2022–2025.</p>

        <h3 className="text-base font-bold text-gray-800">The Tax Deduction for Repayment</h3>
        <p>CERB was fully taxable when received. When you repay CERB, you're entitled to a deduction for the repaid amount. If you repaid before December 31, 2020, the repayment reduced your 2020 income. Repayments in 2021 or later are claimed on line 23200 ("Other deductions") of your return for the year you repay. This means your net out-of-pocket cost is significantly less than the nominal repayment amount — typically 20–45% less depending on your marginal rate.</p>

        <h3 className="text-base font-bold text-gray-800">Payment Plans and CRA Collections</h3>
        <p>If you can't pay the full amount, call CRA's collections line at 1-888-863-8657 to set up a payment arrangement. CRA generally offers flexible plans and won't take enforcement action (such as garnishing wages) while a payment plan is in place. The sooner you contact CRA, the less interest you'll pay.</p>

        <h3 className="text-base font-bold text-gray-800">How to Pay</h3>
        <p>Pay through CRA My Account (My Payment), your bank's online bill payment (payee: "Receiver General for Canada"), or by mailing a cheque. Always include your SIN and indicate the payment is for "CERB repayment." Keep your payment confirmation.</p>

        <h3 className="text-base font-bold text-gray-800">Disputing a CRA Repayment Request</h3>
        <p>If you believe you were eligible and CRA is incorrectly demanding repayment, you have the right to formally object. File a Notice of Objection within 90 days of the reassessment date, or contact the Taxpayer Advocate Service if you need assistance navigating the process.</p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800 text-xs">
          <strong>CRA Contact Numbers:</strong> General inquiries: 1-800-959-8281 · Collections/payment plans: 1-888-863-8657 · CRA My Account: canada.ca/my-cra-account
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-xs">
          <strong>Disclaimer:</strong> This calculator provides estimates based on 2020 tax rates and general CERB program rules. Individual circumstances vary. This is not legal or tax advice — consult a tax professional or contact CRA directly for your specific situation.
        </div>
      </div>
    </div>
  );
}
