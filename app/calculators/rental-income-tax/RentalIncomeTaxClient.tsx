"use client";

// app/calculators/rental-income-tax/RentalIncomeTaxClient.tsx

import PrintButton from "@/components/PrintButton";
import { useState, useMemo } from "react";
import { NumericFormat } from "react-number-format";

// ─── 2025 Tax Data ────────────────────────────────────────────────────────────

const PROVINCES: Record<string, {
  name: string;
  brackets: Array<{ max: number; rate: number }>;
  bpa: number;
}> = {
  AB: { name: "Alberta",       bpa: 21003, brackets: [
    { max: 148269, rate: 0.10 }, { max: 177922, rate: 0.12 },
    { max: 237230, rate: 0.13 }, { max: 355845, rate: 0.14 }, { max: Infinity, rate: 0.15 },
  ]},
  BC: { name: "British Columbia", bpa: 11981, brackets: [
    { max: 45654,  rate: 0.0506 }, { max: 91310,  rate: 0.077  },
    { max: 104835, rate: 0.105  }, { max: 127299, rate: 0.1229 },
    { max: 172602, rate: 0.147  }, { max: 240716, rate: 0.168  }, { max: Infinity, rate: 0.205 },
  ]},
  MB: { name: "Manitoba",      bpa: 15780, brackets: [
    { max: 47000,  rate: 0.108 }, { max: 100000, rate: 0.1275 }, { max: Infinity, rate: 0.174 },
  ]},
  NB: { name: "New Brunswick", bpa: 12458, brackets: [
    { max: 49958,  rate: 0.094 }, { max: 99916,  rate: 0.14   },
    { max: 185064, rate: 0.16  }, { max: Infinity, rate: 0.195 },
  ]},
  NL: { name: "Newfoundland",  bpa: 10818, brackets: [
    { max: 43198,  rate: 0.087 }, { max: 86395,  rate: 0.145  },
    { max: 154244, rate: 0.158 }, { max: 215943, rate: 0.178  },
    { max: 275870, rate: 0.198 }, { max: Infinity, rate: 0.218 },
  ]},
  NS: { name: "Nova Scotia",   bpa: 8481,  brackets: [
    { max: 29590,  rate: 0.0879 }, { max: 59180, rate: 0.1495 },
    { max: 93000,  rate: 0.1667 }, { max: 150000, rate: 0.175 }, { max: Infinity, rate: 0.21 },
  ]},
  NT: { name: "Northwest Territories", bpa: 16593, brackets: [
    { max: 50597,  rate: 0.059 }, { max: 101198, rate: 0.086  },
    { max: 164525, rate: 0.122 }, { max: Infinity, rate: 0.1405 },
  ]},
  NU: { name: "Nunavut",       bpa: 17925, brackets: [
    { max: 53268,  rate: 0.04  }, { max: 106537, rate: 0.07   },
    { max: 173205, rate: 0.09  }, { max: Infinity, rate: 0.115 },
  ]},
  ON: { name: "Ontario",       bpa: 11865, brackets: [
    { max: 51446,  rate: 0.0505 }, { max: 102894, rate: 0.0915 },
    { max: 150000, rate: 0.1116 }, { max: 220000, rate: 0.1216 }, { max: Infinity, rate: 0.1316 },
  ]},
  PE: { name: "Prince Edward Island", bpa: 12000, brackets: [
    { max: 32656,  rate: 0.098 }, { max: 64313,  rate: 0.138  },
    { max: 105000, rate: 0.167 }, { max: 140000, rate: 0.18   }, { max: Infinity, rate: 0.185 },
  ]},
  QC: { name: "Quebec",        bpa: 17183, brackets: [
    { max: 51780,  rate: 0.14  }, { max: 103545, rate: 0.19   },
    { max: 126000, rate: 0.24  }, { max: Infinity, rate: 0.2575 },
  ]},
  SK: { name: "Saskatchewan",  bpa: 17661, brackets: [
    { max: 49720,  rate: 0.105 }, { max: 142058, rate: 0.125  }, { max: Infinity, rate: 0.145 },
  ]},
  YT: { name: "Yukon",         bpa: 16129, brackets: [
    { max: 57375,  rate: 0.064 }, { max: 114750, rate: 0.09   },
    { max: 158519, rate: 0.109 }, { max: 500000, rate: 0.1279 }, { max: Infinity, rate: 0.1502 },
  ]},
};

const FED_BRACKETS = [
  { max: 57375,    rate: 0.15   },
  { max: 114750,   rate: 0.205  },
  { max: 158519,   rate: 0.26   },
  { max: 220000,   rate: 0.29   },
  { max: Infinity, rate: 0.33   },
];
const FED_BPA = 16129;

// CCA Classes for rental property
const CCA_CLASSES = [
  { value: "class1",   label: "Class 1 — Brick/Concrete Building (4%)",      rate: 0.04  },
  { value: "class3",   label: "Class 3 — Brick/Stone Building, pre-1988 (5%)", rate: 0.05 },
  { value: "class6",   label: "Class 6 — Frame Building (10%)",               rate: 0.10  },
  { value: "class8",   label: "Class 8 — Appliances & Equipment (20%)",       rate: 0.20  },
  { value: "class10",  label: "Class 10 — Vehicles (30%)",                    rate: 0.30  },
  { value: "class12",  label: "Class 12 — Small Tools, Carpets (100%)",       rate: 1.00  },
  { value: "none",     label: "Don't claim CCA",                              rate: 0     },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt    = (n: number) => Math.round(n).toLocaleString("en-CA");
const fmtDec = (n: number) => n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function calcTax(income: number, brackets: Array<{ max: number; rate: number }>, bpa: number): number {
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

function getMarginalRate(income: number, provBrackets: Array<{ max: number; rate: number }>): number {
  let fedMarg = 0.15, provMarg = provBrackets[0].rate;
  let prev = 0;
  for (const b of FED_BRACKETS) {
    if (income > prev) fedMarg = b.rate;
    if (income <= b.max) break;
    prev = b.max;
  }
  prev = 0;
  for (const b of provBrackets) {
    if (income > prev) provMarg = b.rate;
    if (income <= b.max) break;
    prev = b.max;
  }
  return fedMarg + provMarg;
}

// ─── Deduction row type ───────────────────────────────────────────────────────

type DeductionKey =
  | "mortgageInterest" | "propertyTax" | "insurance" | "maintenance"
  | "utilities" | "managementFees" | "advertising" | "legal"
  | "accounting" | "landscaping" | "condo" | "travel" | "other";

const DEDUCTIONS: Array<{ key: DeductionKey; label: string; icon: string; hint: string; pctAllowed: number }> = [
  { key: "mortgageInterest", label: "Mortgage Interest",    icon: "🏦", hint: "Interest portion only — not principal",         pctAllowed: 1.00 },
  { key: "propertyTax",      label: "Property Tax",         icon: "🏛️", hint: "Annual municipal property tax",                 pctAllowed: 1.00 },
  { key: "insurance",        label: "Insurance Premiums",   icon: "🛡️", hint: "Landlord/rental property insurance",            pctAllowed: 1.00 },
  { key: "maintenance",      label: "Repairs & Maintenance",icon: "🔧", hint: "Must be to restore, not improve",               pctAllowed: 1.00 },
  { key: "utilities",        label: "Utilities",            icon: "💡", hint: "If paid by landlord (heat, hydro, water)",      pctAllowed: 1.00 },
  { key: "managementFees",   label: "Property Mgmt Fees",   icon: "🏢", hint: "Professional management company fees",         pctAllowed: 1.00 },
  { key: "advertising",      label: "Advertising",          icon: "📢", hint: "Rental listings, signage, etc.",                pctAllowed: 1.00 },
  { key: "legal",            label: "Legal Fees",           icon: "⚖️", hint: "Lease preparation, tenant disputes",           pctAllowed: 1.00 },
  { key: "accounting",       label: "Accounting Fees",      icon: "📊", hint: "Bookkeeping, tax preparation",                 pctAllowed: 1.00 },
  { key: "landscaping",      label: "Landscaping / Snow",   icon: "🌿", hint: "Yard maintenance, snow removal",               pctAllowed: 1.00 },
  { key: "condo",            label: "Condo Fees",           icon: "🏙️", hint: "Monthly strata/condo maintenance fees",        pctAllowed: 1.00 },
  { key: "travel",           label: "Travel Expenses",      icon: "🚗", hint: "To collect rent or manage property",           pctAllowed: 1.00 },
  { key: "other",            label: "Other Expenses",       icon: "📋", hint: "Any other eligible rental expenses",           pctAllowed: 1.00 },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function RentalIncomeTaxClient() {
  const [province,        setProvince]        = useState("ON");
  const [otherIncome,     setOtherIncome]     = useState<number | null>(null);
  const [numUnits,        setNumUnits]        = useState<number>(1);

  // Income
  const [monthlyRent,     setMonthlyRent]     = useState<number | null>(null);
  const [vacancyPct,      setVacancyPct]      = useState<number>(5);
  const [otherRentalIncome, setOtherRentalIncome] = useState<number | null>(null);

  // Deductions
  const [deductions, setDeductions] = useState<Record<DeductionKey, number | null>>(
    Object.fromEntries(DEDUCTIONS.map(d => [d.key, null])) as Record<DeductionKey, number | null>
  );

  // CCA
  const [ccaClass,        setCcaClass]        = useState("none");
  const [buildingCost,    setBuildingCost]    = useState<number | null>(null);
  const [existingUcc,     setExistingUcc]     = useState<number | null>(null);

  // Partial use
  const [rentalPct,       setRentalPct]       = useState<number>(100);

  const [showInfo,        setShowInfo]        = useState(false);
  const [showSchedule,    setShowSchedule]    = useState(false);

  const provData    = PROVINCES[province];
  const provinceList = Object.entries(PROVINCES).sort((a, b) => a[1].name.localeCompare(b[1].name));
  const ccaData     = CCA_CLASSES.find(c => c.value === ccaClass)!;

  const setDeduction = (key: DeductionKey, value: number | null) => {
    setDeductions(prev => ({ ...prev, [key]: value }));
  };

  const result = useMemo(() => {
    if (!monthlyRent || monthlyRent <= 0) return null;

    const pct         = rentalPct / 100;
    const grossRent   = monthlyRent * 12 * numUnits * (1 - vacancyPct / 100);
    const otherRental = otherRentalIncome ?? 0;
    const totalGrossIncome = grossRent + otherRental;

    // Total deductions
    const deductionItems = DEDUCTIONS.map(d => {
      const raw    = deductions[d.key] ?? 0;
      const allowed = raw * pct;
      return { ...d, raw, allowed };
    });
    const totalDeductionsBeforeCCA = deductionItems.reduce((sum, d) => sum + d.allowed, 0);

    // CCA calculation (half-year rule in year 1)
    let ccaAmount = 0;
    let ucc       = 0;
    if (ccaClass !== "none" && buildingCost && buildingCost > 0) {
      const existingUccVal = existingUcc ?? buildingCost;
      ucc       = existingUccVal * pct;
      ccaAmount = ucc * ccaData.rate;
      // CCA cannot create or increase a rental loss
    }

    // Net rental income before CCA
    const netBeforeCCA = totalGrossIncome - totalDeductionsBeforeCCA;

    // CCA limited to net income (cannot create loss)
    const ccaAllowed  = Math.min(ccaAmount, Math.max(0, netBeforeCCA));
    const netRentalIncome = netBeforeCCA - ccaAllowed;

    // Tax calculation
    const otherAnnual = otherIncome ?? 0;
    const totalIncome = Math.max(0, netRentalIncome) + otherAnnual;
    const baseIncome  = otherAnnual;

    const fedTaxTotal  = calcTax(totalIncome, FED_BRACKETS, FED_BPA);
    const fedTaxBase   = calcTax(baseIncome,  FED_BRACKETS, FED_BPA);
    const provTaxTotal = calcTax(totalIncome, provData.brackets, provData.bpa);
    const provTaxBase  = calcTax(baseIncome,  provData.brackets, provData.bpa);

    const taxOnRental  = (fedTaxTotal - fedTaxBase) + (provTaxTotal - provTaxBase);
    const marginalRate = getMarginalRate(totalIncome, provData.brackets);
    const effectiveRentalRate = netRentalIncome > 0 ? taxOnRental / netRentalIncome : 0;

    // Cash flow
    const totalMortgagePayment = (deductions.mortgageInterest ?? 0) * 1.5; // rough estimate principal = ~50% of payment
    const annualCashFlow = totalGrossIncome - totalDeductionsBeforeCCA - taxOnRental;
    const monthlyCashFlow = annualCashFlow / 12;

    // Cap rate (rough)
    const propertyValue = buildingCost ?? 0;
    const capRate = propertyValue > 0 ? (netBeforeCCA / propertyValue) * 100 : null;

    // Gross yield
    const grossYield = propertyValue > 0 ? (totalGrossIncome / propertyValue) * 100 : null;

    // 5-year projection (assumes 3% rent growth, 2% expense growth)
    const fiveYearData = Array.from({ length: 5 }, (_, i) => {
      const yr       = i + 1;
      const rent_yr  = totalGrossIncome * Math.pow(1.03, yr);
      const exp_yr   = totalDeductionsBeforeCCA * Math.pow(1.02, yr);
      const net_yr   = Math.max(0, rent_yr - exp_yr);
      const tax_yr   = net_yr * marginalRate;
      return {
        year:       yr,
        grossRent:  Math.round(rent_yr),
        expenses:   Math.round(exp_yr),
        netIncome:  Math.round(net_yr),
        tax:        Math.round(tax_yr),
        afterTax:   Math.round(net_yr - tax_yr),
      };
    });

    return {
      grossRent,
      otherRental,
      totalGrossIncome,
      deductionItems,
      totalDeductionsBeforeCCA,
      netBeforeCCA,
      ccaAllowed,
      ccaAmount,
      ucc,
      netRentalIncome,
      taxOnRental,
      marginalRate,
      effectiveRentalRate,
      monthlyCashFlow,
      annualCashFlow,
      capRate,
      grossYield,
      fiveYearData,
      isLoss: netRentalIncome < 0,
      netBeforeCCAPositive: netBeforeCCA > 0,
      expenseRatio: totalGrossIncome > 0 ? totalDeductionsBeforeCCA / totalGrossIncome : 0,
    };
  }, [monthlyRent, numUnits, vacancyPct, otherRentalIncome, deductions,
      ccaClass, buildingCost, existingUcc, rentalPct, otherIncome, provData]);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-gray-900">Rental Income Tax Calculator</h1>
          <p className="text-gray-500 mt-1">
            Calculate net rental income, deductible expenses, CCA, and tax owing on your Canadian rental property — 2025 rates.
          </p>
        </div>

        {/* Info panel */}
        <button type="button" onClick={() => setShowInfo(!showInfo)}
          className="w-full bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-center justify-between text-left hover:bg-blue-100 transition-colors">
          <div>
            <p className="text-sm font-semibold text-blue-800">💡 What's Deductible? CCA Rules, Losses & Key Tips</p>
            <p className="text-xs text-blue-600 mt-0.5">Repairs vs improvements, CCA half-year rule, rental losses, partial use</p>
          </div>
          <span className="text-blue-500 text-lg">{showInfo ? "▲" : "▼"}</span>
        </button>

        {showInfo && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            {[
              { icon: "✅", title: "What's Fully Deductible",
                body: "Mortgage interest (not principal), property taxes, insurance, repairs and maintenance, property management fees, advertising for tenants, legal and accounting fees, utilities you pay, condo fees, and reasonable travel to your rental property." },
              { icon: "🔧", title: "Repairs vs Capital Improvements",
                body: "Repairs that restore the property to its original condition are fully deductible (replacing broken window, fixing plumbing). Improvements that add value or extend useful life are capital expenditures — add to the cost base and depreciate via CCA (new roof, kitchen renovation, adding a bathroom)." },
              { icon: "📉", title: "CCA — Capital Cost Allowance",
                body: "CCA is depreciation on the building structure (not land). Most residential rentals use Class 1 at 4% declining balance. The half-year rule applies in the year of acquisition — you can only claim half the normal CCA. CCA cannot create or increase a rental loss." },
              { icon: "🏠", title: "Partial Use (Mixed-Use Properties)",
                body: "If you rent part of your home (basement suite), only the proportional rental area qualifies. Use square footage or number of rooms to calculate the rental percentage. This applies to all expenses — mortgage interest, property tax, utilities, insurance, etc." },
              { icon: "📊", title: "Rental Losses",
                body: "If deductible expenses exceed rental income, you have a rental loss. This can be deducted against other income (employment, business, investment) — reducing your total tax. CCA cannot create or worsen a rental loss, but other expenses can." },
              { icon: "⚠️", title: "Common Mistakes",
                body: "Deducting mortgage principal (not allowed — only interest). Deducting capital improvements as repairs. Forgetting to report rental income from friends or family at below-market rates. Not tracking expenses with receipts. Missing the T776 rental income form on your return." },
            ].map(tip => (
              <div key={tip.title} className="border border-gray-100 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-800 mb-1">{tip.icon} {tip.title}</p>
                <p className="text-xs text-gray-500">{tip.body}</p>
              </div>
            ))}
          </div>
        )}

        {/* Inputs */}
        <div className="print:hidden bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-800">Property & Income Details</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Province</label>
              <select value={province} onChange={e => setProvince(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900">
                {provinceList.map(([code, data]) => (
                  <option key={code} value={code}>{data.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Number of Units</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map(n => (
                  <button key={n} type="button" onClick={() => setNumUnits(n)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold border-2 transition-colors ${numUnits === n ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Rent (per unit)</label>
              <NumericFormat thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
                placeholder="$2,000"
                onValueChange={v => setMonthlyRent(v.floatValue ?? null)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 text-right" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vacancy Rate (%)</label>
              <input type="number" min="0" max="50" step="1" value={vacancyPct}
                onChange={e => setVacancyPct(Number(e.target.value) || 0)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 text-right" />
              <p className="text-xs text-gray-400 mt-1">Industry avg: 3–7%</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Other Employment/Income</label>
              <NumericFormat thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
                placeholder="$85,000"
                onValueChange={v => setOtherIncome(v.floatValue ?? null)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 text-right" />
              <p className="text-xs text-gray-400 mt-1">For accurate marginal rate</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rental % of Property</label>
              <input type="number" min="1" max="100" step="1" value={rentalPct}
                onChange={e => setRentalPct(Number(e.target.value) || 100)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 text-right" />
              <p className="text-xs text-gray-400 mt-1">100% = dedicated rental, 50% = basement suite</p>
            </div>
          </div>
        </div>

        {/* Deductions */}
        <div className="print:hidden bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">Annual Expenses</h2>
            {rentalPct < 100 && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                {rentalPct}% rental use applied
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DEDUCTIONS.map(d => (
              <div key={d.key} className="flex items-start gap-3 p-3 border border-gray-100 rounded-lg">
                <span className="text-lg mt-0.5">{d.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-700">{d.label}</p>
                  <p className="text-xs text-gray-400 mb-1.5">{d.hint}</p>
                  <NumericFormat thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
                    placeholder="$0"
                    onValueChange={v => setDeduction(d.key, v.floatValue ?? null)}
                    className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 text-right text-sm" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CCA */}
        <div className="print:hidden bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Capital Cost Allowance (CCA)</h2>
          <p className="text-xs text-gray-500">Optional — claim depreciation on the building structure. Cannot create a rental loss.</p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CCA Class</label>
            <select value={ccaClass} onChange={e => setCcaClass(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900">
              {CCA_CLASSES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {ccaClass !== "none" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Building Cost (excl. land)</label>
                <NumericFormat thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
                  placeholder="$400,000"
                  onValueChange={v => setBuildingCost(v.floatValue ?? null)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 text-right" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Existing UCC (if not first year)</label>
                <NumericFormat thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
                  placeholder="Same as cost"
                  onValueChange={v => setExistingUcc(v.floatValue ?? null)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 text-right" />
                <p className="text-xs text-gray-400 mt-1">Leave blank if first year of ownership</p>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {!result ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">🏠</div>
            <p className="text-xl font-semibold text-gray-700">Enter your rental income above</p>
            <p className="text-gray-500 mt-2">Your net income, deductions, and tax owing will appear here.</p>
          </div>
        ) : (
          <>
            <div className="print:hidden flex justify-end">
              <PrintButton label="Print Report" />
            </div>

            {/* Rental loss notice */}
            {result.isLoss && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                <p className="text-sm font-semibold text-blue-800 mb-1">📉 Rental Loss — Deductible Against Other Income</p>
                <p className="text-sm text-blue-700">
                  Your expenses exceed rental income by <strong>${fmt(Math.abs(result.netRentalIncome))}</strong>. This rental loss can be deducted against your other income (employment, business), reducing your total tax owing. Keep all receipts — CRA may request documentation.
                </p>
              </div>
            )}

            {/* Hero */}
            <div className={`${result.isLoss ? "bg-blue-600" : "bg-green-700"} text-white rounded-xl p-6 text-center shadow-sm`}>
              <p className="text-sm font-medium opacity-80 uppercase tracking-wide">
                {result.isLoss ? "Rental Loss (deductible)" : "Net Rental Income"}
              </p>
              <p className="text-6xl font-black mt-2">
                {result.isLoss ? "-" : ""}${fmt(Math.abs(result.netRentalIncome))}
              </p>
              <p className="opacity-75 text-sm mt-1">
                ${fmt(result.totalGrossIncome)} gross · ${fmt(result.totalDeductionsBeforeCCA)} expenses
                {result.ccaAllowed > 0 ? ` · $${fmt(result.ccaAllowed)} CCA` : ""}
              </p>
            </div>

            {/* Key stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Tax Owing",        value: result.isLoss ? "Loss offset" : `$${fmt(result.taxOnRental)}`,  sub: result.isLoss ? "reduces other tax" : `at ${(result.marginalRate * 100).toFixed(1)}% marginal`, color: result.isLoss ? "text-blue-600" : "text-red-500" },
                { label: "Monthly Cash Flow", value: `$${fmt(result.monthlyCashFlow)}`,   sub: "after expenses & tax",    color: result.monthlyCashFlow >= 0 ? "text-green-600" : "text-red-500" },
                { label: "Expense Ratio",     value: `${(result.expenseRatio * 100).toFixed(0)}%`, sub: "expenses as % of income", color: "text-orange-500" },
                { label: result.capRate ? "Cap Rate" : "Gross Yield", value: result.capRate ? `${result.capRate.toFixed(2)}%` : result.grossYield ? `${result.grossYield.toFixed(2)}%` : "Enter property value", sub: result.capRate ? "net income / property value" : "gross rent / property value", color: "text-purple-600" },
              ].map(s => (
                <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Income & deductions breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">T776 Rental Income Summary</h2>
                <p className="text-sm text-gray-500 mt-0.5">As reported on your tax return</p>
              </div>
              <div className="divide-y divide-gray-50">
                <div className="px-6 py-3 bg-gray-50 flex justify-between">
                  <span className="text-sm font-semibold text-gray-700">Gross Rental Income</span>
                  <span className="text-sm font-bold text-gray-900">${fmt(result.totalGrossIncome)}</span>
                </div>

                <div className="px-6 py-2 bg-red-50">
                  <p className="text-xs font-semibold text-red-400 uppercase tracking-wide pt-1 pb-1">Deductible Expenses</p>
                </div>

                {result.deductionItems.filter(d => d.raw > 0).map(d => (
                  <div key={d.key} className="flex justify-between items-center px-6 py-2.5 hover:bg-gray-50">
                    <div>
                      <span className="text-sm text-gray-600">{d.label}</span>
                      {rentalPct < 100 && (
                        <span className="text-xs text-gray-400 ml-1.5">(${fmt(d.raw)} × {rentalPct}%)</span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-red-500">−${fmt(d.allowed)}</span>
                  </div>
                ))}

                {result.deductionItems.filter(d => d.raw > 0).length === 0 && (
                  <div className="px-6 py-3 text-sm text-gray-400 italic">No expenses entered</div>
                )}

                <div className="flex justify-between items-center px-6 py-3 bg-gray-50">
                  <span className="text-sm font-semibold text-gray-700">Net Income Before CCA</span>
                  <span className={`text-sm font-bold ${result.netBeforeCCA >= 0 ? "text-gray-800" : "text-blue-600"}`}>
                    {result.netBeforeCCA < 0 ? "-" : ""}${fmt(Math.abs(result.netBeforeCCA))}
                  </span>
                </div>

                {result.ccaAllowed > 0 && (
                  <>
                    <div className="flex justify-between items-center px-6 py-2.5 hover:bg-gray-50">
                      <div>
                        <span className="text-sm text-gray-600">CCA ({ccaData.label.split("(")[0].trim()})</span>
                        <span className="text-xs text-gray-400 ml-1.5">(limited to net income)</span>
                      </div>
                      <span className="text-sm font-medium text-red-500">−${fmt(result.ccaAllowed)}</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between items-center px-6 py-4 bg-green-50">
                  <span className="text-base font-bold text-gray-800">Net Rental Income</span>
                  <span className={`text-xl font-black ${result.isLoss ? "text-blue-700" : "text-green-700"}`}>
                    {result.isLoss ? "−" : ""}${fmt(Math.abs(result.netRentalIncome))}
                  </span>
                </div>
              </div>
            </div>

            {/* Tax impact */}
            {!result.isLoss && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Tax Impact</h3>
                <div className="space-y-3">
                  {[
                    { label: `Gross Rental Income (${(result.expenseRatio * 100).toFixed(0)}% expenses)`, value: result.totalGrossIncome, color: "bg-blue-400" },
                    { label: `Total Expenses`,                value: result.totalDeductionsBeforeCCA, color: "bg-red-300"   },
                    { label: `Tax on Net Income`,             value: result.taxOnRental,              color: "bg-orange-400"},
                    { label: `After-Tax Rental Income`,       value: result.netRentalIncome - result.taxOnRental, color: "bg-green-500" },
                  ].map(row => (
                    <div key={row.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{row.label}</span>
                        <span className="font-medium text-gray-800">${fmt(row.value)}</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${row.color} rounded-full`}
                          style={{ width: `${Math.min(100, (row.value / result.totalGrossIncome) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5-year projection */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <button type="button" onClick={() => setShowSchedule(!showSchedule)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">5-Year Projection</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Assumes 3% annual rent growth, 2% expense growth</p>
                </div>
                <span className="text-gray-400 text-sm">{showSchedule ? "▲ Hide" : "▼ Show"}</span>
              </button>
              {showSchedule && (
                <div className="border-t border-gray-100 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                      <tr>
                        <th className="px-5 py-3 text-left">Year</th>
                        <th className="px-5 py-3 text-right">Gross Rent</th>
                        <th className="px-5 py-3 text-right">Expenses</th>
                        <th className="px-5 py-3 text-right">Net Income</th>
                        <th className="px-5 py-3 text-right">Tax</th>
                        <th className="px-5 py-3 text-right">After-Tax</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {result.fiveYearData.map(row => (
                        <tr key={row.year} className="hover:bg-gray-50">
                          <td className="px-5 py-2.5 font-medium text-gray-700">Year {row.year}</td>
                          <td className="px-5 py-2.5 text-right text-blue-600">${fmt(row.grossRent)}</td>
                          <td className="px-5 py-2.5 text-right text-red-500">${fmt(row.expenses)}</td>
                          <td className="px-5 py-2.5 text-right text-gray-800">${fmt(row.netIncome)}</td>
                          <td className="px-5 py-2.5 text-right text-orange-500">${fmt(row.tax)}</td>
                          <td className="px-5 py-2.5 text-right font-bold text-green-600">${fmt(row.afterTax)}</td>
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
          <h2 className="text-xl font-bold text-gray-900 mb-4">Rental Income Tax in Canada — 2025 Guide</h2>
          <p className="text-gray-600">
            Rental income in Canada is fully taxable at your marginal rate — but landlords can deduct a wide range of expenses to significantly reduce the taxable amount. Understanding what's deductible and how to claim CCA can make a major difference in your tax bill.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">How to Report Rental Income (T776)</h3>
          <p className="text-gray-600">
            Rental income is reported on Form T776 (Statement of Real Estate Rentals), attached to your T1 personal tax return. You report gross rental income, then deduct eligible expenses to arrive at net rental income or loss. Net rental income is added to your other income and taxed at your marginal rate.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">CCA and the Half-Year Rule</h3>
          <p className="text-gray-600">
            Capital Cost Allowance (CCA) lets you deduct a portion of the building's cost each year as depreciation. Most residential rental buildings use Class 1 at 4%. In the first year you own the property, the half-year rule limits your CCA to half the normal amount. Importantly, CCA cannot create or increase a rental loss — it can only reduce net income to zero.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Rental Losses</h3>
          <p className="text-gray-600">
            If your allowable expenses exceed your rental income, you have a rental loss. This loss can generally be deducted against your other income sources — reducing your overall tax. However, CRA may challenge losses if the rental operation appears to have no reasonable expectation of profit.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">GST/HST on Residential Rentals</h3>
          <p className="text-gray-600">
            Long-term residential rentals (month-to-month or leases) are exempt from GST/HST — you do not charge HST on rent and cannot claim input tax credits on expenses. Short-term rentals (Airbnb, VRBO — under 30 days) are taxable supplies and may require GST/HST registration if revenues exceed $30,000.
          </p>

          <p className="text-sm text-gray-400 mt-6">
            Calculations use 2025 federal and provincial tax brackets. CCA rates from CRA Schedule II. This is an estimate — actual tax depends on all income sources, credits, and deductions. Consult a tax professional for complex rental situations. Not tax advice.
          </p>
        </div>

      </div>
    </div>
  );
}
