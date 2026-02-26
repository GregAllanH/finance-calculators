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

const PROV_TOP_RATES: Record<string, { name: string; rate: number }> = {
  AB: { name: "Alberta", rate: 0.15 },
  BC: { name: "British Columbia", rate: 0.205 },
  MB: { name: "Manitoba", rate: 0.174 },
  NB: { name: "New Brunswick", rate: 0.195 },
  NL: { name: "Newfoundland & Labrador", rate: 0.218 },
  NS: { name: "Nova Scotia", rate: 0.21 },
  ON: { name: "Ontario", rate: 0.1316 },
  PE: { name: "Prince Edward Island", rate: 0.1875 },
  QC: { name: "Quebec", rate: 0.2575 },
  SK: { name: "Saskatchewan", rate: 0.145 },
  NT: { name: "Northwest Territories", rate: 0.1405 },
  NU: { name: "Nunavut", rate: 0.115 },
  YT: { name: "Yukon", rate: 0.128 },
};

function getMarginalRate(income: number, province: string): number {
  let fedRate = 0.33;
  for (const b of FEDERAL_BRACKETS) {
    if (income <= b.max) { fedRate = b.rate; break; }
  }
  const provRate = PROV_TOP_RATES[province]?.rate ?? 0.13;
  return fedRate + provRate;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type AccountType = "tfsa" | "rrsp" | "taxable";
type ReturnType = "growth" | "dividends" | "interest" | "mixed";

interface YearRow {
  year: number;
  balance: number;
  contributions: number;
  growth: number;
  tax: number;
  realBalance: number;
  totalContributed: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, digits = 0): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency", currency: "CAD",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(n);
}
function fmtK(n: number): string {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1000) return "$" + (n / 1000).toFixed(0) + "K";
  return fmt(n);
}

function calcAnnualTaxDrag(
  balance: number,
  annualReturn: number,
  returnType: ReturnType,
  marginalRate: number
): number {
  const growth = balance * (annualReturn / 100);
  switch (returnType) {
    case "growth":      return growth * 0.5 * marginalRate * 0.3; // deferred cap gains, small drag
    case "dividends":   return growth * (marginalRate * 0.55);    // eligible dividend effective rate ~55% of marginal
    case "interest":    return growth * marginalRate;              // fully taxable
    case "mixed":       return growth * (marginalRate * 0.6);     // blended
    default:            return 0;
  }
}

function project(
  lumpSum: number,
  monthlyContrib: number,
  annualReturn: number,
  years: number,
  inflation: number,
  accountType: AccountType,
  returnType: ReturnType,
  marginalRate: number,
  rrspRefundReinvested: boolean
): YearRow[] {
  const rows: YearRow[] = [];
  let balance = lumpSum;
  let totalContrib = lumpSum;

  // RRSP: add refund to lump sum if reinvested
  if (accountType === "rrsp" && rrspRefundReinvested) {
    balance += lumpSum * marginalRate;
    totalContrib += lumpSum * marginalRate;
  }

  for (let y = 1; y <= years; y++) {
    const annualContrib = monthlyContrib * 12;
    const startBalance = balance;
    balance += annualContrib;
    totalContrib += annualContrib;

    const grossGrowth = balance * (annualReturn / 100);
    let taxDrag = 0;

    if (accountType === "taxable") {
      taxDrag = calcAnnualTaxDrag(balance, annualReturn, returnType, marginalRate);
    }

    balance += grossGrowth - taxDrag;
    const inflFactor = Math.pow(1 + inflation / 100, y);
    const realBalance = balance / inflFactor;

    rows.push({
      year: y,
      balance,
      contributions: annualContrib,
      growth: grossGrowth - taxDrag,
      tax: taxDrag,
      realBalance,
      totalContributed: totalContrib,
    });
  }

  // RRSP: apply withdrawal tax at end
  if (accountType === "rrsp") {
    const lastRow = rows[rows.length - 1];
    const taxOnWithdrawal = lastRow.balance * marginalRate * 0.75; // simplified: assume lower rate in retirement
    rows.forEach(r => {
      // Mark the final withdrawal tax on last row only in display
    });
    rows[rows.length - 1] = {
      ...lastRow,
      tax: lastRow.tax + taxOnWithdrawal,
    };
  }

  return rows;
}

// ─── Chart Component ──────────────────────────────────────────────────────────

function BarChart({
  rows,
  compareRows,
  compareLabel,
  inflation,
}: {
  rows: YearRow[];
  compareRows?: YearRow[];
  compareLabel?: string;
  inflation: number;
}) {
  const maxVal = Math.max(
    ...rows.map(r => r.balance),
    ...(compareRows ?? []).map(r => r.balance)
  );

  const ticks = [0, 25, 50, 75, 100].map(p => (maxVal * p) / 100);

  // Show every 5 years for readability
  const displayed = rows.filter((_, i) => (i + 1) % 5 === 0 || i === 0 || i === rows.length - 1);

  return (
    <div className="relative">
      {/* Y-axis labels */}
      <div className="flex">
        <div className="w-16 shrink-0 relative h-48">
          {ticks.reverse().map((t, i) => (
            <div key={i} className="absolute right-2 text-xs text-gray-400" style={{ top: `${(i / 4) * 100}%`, transform: "translateY(-50%)" }}>
              {fmtK(t)}
            </div>
          ))}
        </div>

        {/* Chart area */}
        <div className="flex-1 h-48 relative border-l border-b border-gray-200">
          {/* Grid lines */}
          {[0, 25, 50, 75].map(p => (
            <div key={p} className="absolute w-full border-t border-gray-100" style={{ top: `${p}%` }} />
          ))}

          {/* Bars */}
          <div className="absolute inset-0 flex items-end gap-0.5 px-1">
            {displayed.map((row, i) => {
              const cRow = compareRows?.find(r => r.year === row.year);
              const h = maxVal > 0 ? (row.balance / maxVal) * 100 : 0;
              const hContrib = maxVal > 0 ? (row.totalContributed / maxVal) * 100 : 0;
              const hCompare = cRow && maxVal > 0 ? (cRow.balance / maxVal) * 100 : 0;
              const hReal = maxVal > 0 ? (row.realBalance / maxVal) * 100 : 0;

              return (
                <div key={row.year} className="flex-1 flex items-end gap-0.5 group relative">
                  {/* Main bar */}
                  <div className="flex-1 flex flex-col justify-end" style={{ height: "100%" }}>
                    <div className="relative w-full" style={{ height: `${h}%` }}>
                      {/* Contribution portion */}
                      <div className="absolute bottom-0 w-full bg-blue-200 rounded-t-sm" style={{ height: `${Math.min(hContrib, h) / h * 100}%` }} />
                      {/* Growth portion */}
                      <div className="absolute bottom-0 w-full bg-blue-500 rounded-t-sm opacity-80" style={{ height: "100%" }} />
                      {/* Real value line */}
                      <div className="absolute w-full border-t-2 border-dashed border-orange-400" style={{ bottom: `${(hReal / h) * 100}%` }} />
                    </div>
                  </div>
                  {/* Compare bar */}
                  {cRow && (
                    <div className="flex-1 flex flex-col justify-end" style={{ height: "100%" }}>
                      <div className="w-full bg-purple-400 rounded-t-sm opacity-70" style={{ height: `${hCompare}%` }} />
                    </div>
                  )}
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                    <div>Year {row.year}: {fmtK(row.balance)}</div>
                    {cRow && <div>{compareLabel}: {fmtK(cRow.balance)}</div>}
                    <div className="text-orange-300">Real: {fmtK(row.realBalance)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex ml-16 mt-1">
        {displayed.map(row => (
          <div key={row.year} className="flex-1 text-center text-xs text-gray-400">
            Yr {row.year}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-3 ml-16 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" />Nominal Balance</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-200 inline-block" />Contributions</span>
        <span className="flex items-center gap-1"><span className="w-3 border-t-2 border-dashed border-orange-400 inline-block" />Real ({inflation}% inflation)</span>
        {compareRows && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-purple-400 inline-block" />{compareLabel}</span>}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InvestmentReturnClient() {
  const [lumpSum, setLumpSum] = useState(25000);
  const [monthlyContrib, setMonthlyContrib] = useState(500);
  const [annualReturn, setAnnualReturn] = useState(7.0);
  const [years, setYears] = useState(25);
  const [inflation, setInflation] = useState(2.5);
  const [accountType, setAccountType] = useState<AccountType>("tfsa");
  const [returnType, setReturnType] = useState<ReturnType>("growth");
  const [province, setProvince] = useState("ON");
  const [personalIncome, setPersonalIncome] = useState(85000);
  const [rrspRefundReinvested, setRrspRefundReinvested] = useState(true);
  const [compareMode, setCompareMode] = useState<"none" | "account" | "rate" | "lumpvsdca">("none");
  const [compareRate, setCompareRate] = useState(5.0);
  const [showTable, setShowTable] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const marginalRate = useMemo(() => getMarginalRate(personalIncome, province), [personalIncome, province]);

  const mainRows = useMemo(() => project(
    lumpSum, monthlyContrib, annualReturn, years,
    inflation, accountType, returnType, marginalRate, rrspRefundReinvested
  ), [lumpSum, monthlyContrib, annualReturn, years, inflation, accountType, returnType, marginalRate, rrspRefundReinvested]);

  // Compare projections
  const compareRows = useMemo(() => {
    if (compareMode === "none") return undefined;
    if (compareMode === "rate") {
      return project(lumpSum, monthlyContrib, compareRate, years, inflation, accountType, returnType, marginalRate, rrspRefundReinvested);
    }
    if (compareMode === "account") {
      const altAccount: AccountType = accountType === "tfsa" ? "rrsp" : accountType === "rrsp" ? "taxable" : "tfsa";
      return project(lumpSum, monthlyContrib, annualReturn, years, inflation, altAccount, returnType, marginalRate, rrspRefundReinvested);
    }
    if (compareMode === "lumpvsdca") {
      // Same total money as lump sum, but contributed monthly instead
      const totalMoney = lumpSum + monthlyContrib * 12 * years;
      const monthlyEquiv = totalMoney / (years * 12);
      return project(0, monthlyEquiv, annualReturn, years, inflation, accountType, returnType, marginalRate, false);
    }
    return undefined;
  }, [compareMode, lumpSum, monthlyContrib, annualReturn, compareRate, years, inflation, accountType, returnType, marginalRate, rrspRefundReinvested]);

  const compareLabel = useMemo(() => {
    if (compareMode === "rate") return `${compareRate}% Return`;
    if (compareMode === "account") {
      const alt: AccountType = accountType === "tfsa" ? "rrsp" : accountType === "rrsp" ? "taxable" : "tfsa";
      return alt.toUpperCase();
    }
    if (compareMode === "lumpvsdca") return "DCA Only";
    return "";
  }, [compareMode, compareRate, accountType]);

  const last = mainRows[mainRows.length - 1];
  const totalContributed = last?.totalContributed ?? 0;
  const totalGrowth = (last?.balance ?? 0) - totalContributed;
  const effectiveReturn = totalContributed > 0 ? ((last?.balance ?? 0) / totalContributed - 1) * 100 : 0;
  const cagr = totalContributed > 0 && years > 0
    ? (Math.pow((last?.balance ?? 1) / (lumpSum || 1), 1 / years) - 1) * 100
    : annualReturn;

  // Scenario rows for rate comparison table
  const scenarios = [
    { label: "Conservative (4%)", rows: project(lumpSum, monthlyContrib, 4, years, inflation, accountType, returnType, marginalRate, rrspRefundReinvested) },
    { label: `Your Rate (${annualReturn}%)`, rows: mainRows },
    { label: "Optimistic (10%)", rows: project(lumpSum, monthlyContrib, 10, years, inflation, accountType, returnType, marginalRate, rrspRefundReinvested) },
  ];

  // Account type comparison
  const accountComparison = useMemo(() => [
    { label: "TFSA", rows: project(lumpSum, monthlyContrib, annualReturn, years, inflation, "tfsa", returnType, marginalRate, false) },
    { label: "RRSP", rows: project(lumpSum, monthlyContrib, annualReturn, years, inflation, "rrsp", returnType, marginalRate, true) },
    { label: "Taxable", rows: project(lumpSum, monthlyContrib, annualReturn, years, inflation, "taxable", returnType, marginalRate, false) },
  ], [lumpSum, monthlyContrib, annualReturn, years, inflation, returnType, marginalRate]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* Info Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl overflow-hidden">
        <button onClick={() => setShowInfo(!showInfo)}
          className="w-full flex items-center justify-between px-5 py-3 text-blue-800 font-semibold text-sm">
          <span>💡 How this calculator works</span>
          <span>{showInfo ? "▲ Hide" : "▼ Show"}</span>
        </button>
        {showInfo && (
          <div className="px-5 pb-4 text-blue-900 text-sm space-y-2">
            <p>Enter your lump sum investment and/or regular monthly contributions. The calculator projects growth at your chosen return rate, adjusted for taxes and inflation.</p>
            <p><strong>TFSA:</strong> No tax drag — all growth is tax-free. <strong>RRSP:</strong> Tax-deferred growth; refund reinvested if selected; withdrawal tax applied at end. <strong>Taxable:</strong> Annual tax drag applied based on your investment type and marginal rate.</p>
            <p>Use the <strong>Compare</strong> section to run side-by-side scenarios — different rates, account types, or lump sum vs DCA.</p>
          </div>
        )}
      </div>

      {/* Hero */}
      <div className="bg-blue-600 text-white rounded-xl p-6 text-center">
        <div className="text-sm font-medium text-blue-200 mb-1">
          Portfolio Value in {years} Years ({accountType.toUpperCase()})
        </div>
        <div className="text-5xl font-black mb-1">{fmt(last?.balance ?? 0)}</div>
        <div className="text-blue-200 text-sm">
          Real value: {fmt(last?.realBalance ?? 0)} · Total contributed: {fmt(totalContributed)} · Growth: {fmt(totalGrowth)}
        </div>
      </div>

      <PrintButton />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Total Contributed</div>
          <div className="text-xl font-bold text-gray-800">{fmt(totalContributed)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Investment Growth</div>
          <div className="text-xl font-bold text-green-600">+{fmt(totalGrowth)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Total Return</div>
          <div className="text-xl font-bold text-gray-800">{effectiveReturn.toFixed(0)}%</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Inflation-Adj. Value</div>
          <div className="text-xl font-bold text-gray-800">{fmt(last?.realBalance ?? 0)}</div>
        </div>
      </div>

      {/* Inputs */}
      <div className="print:hidden bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <h2 className="text-lg font-bold text-gray-800">Investment Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Initial Lump Sum</label>
            <NumericFormat value={lumpSum} onValueChange={v => setLumpSum(v.floatValue ?? 0)}
              thousandSeparator prefix="$"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Contribution</label>
            <NumericFormat value={monthlyContrib} onValueChange={v => setMonthlyContrib(v.floatValue ?? 0)}
              thousandSeparator prefix="$"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Annual Return Rate: <span className="text-blue-600 font-bold">{annualReturn}%</span>
            </label>
            <input type="range" min={1} max={15} step={0.5} value={annualReturn}
              onChange={e => setAnnualReturn(Number(e.target.value))}
              className="w-full accent-blue-600" />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1% (GIC)</span><span>5% (Balanced)</span><span>8% (Equities)</span><span>15%</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Horizon: <span className="text-blue-600 font-bold">{years} years</span>
            </label>
            <input type="range" min={1} max={40} step={1} value={years}
              onChange={e => setYears(Number(e.target.value))}
              className="w-full accent-blue-600" />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1 yr</span><span>10</span><span>20</span><span>30</span><span>40 yrs</span>
            </div>
          </div>
        </div>

        {/* Account Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
          <div className="grid grid-cols-3 gap-2">
            {(["tfsa", "rrsp", "taxable"] as AccountType[]).map(a => (
              <button key={a} onClick={() => setAccountType(a)}
                className={`py-2.5 rounded-lg text-sm font-semibold border transition-colors ${accountType === a ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"}`}>
                {a === "tfsa" ? "TFSA" : a === "rrsp" ? "RRSP" : "Taxable"}
              </button>
            ))}
          </div>
          {accountType === "rrsp" && (
            <label className="flex items-center gap-2 mt-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={rrspRefundReinvested} onChange={e => setRrspRefundReinvested(e.target.checked)}
                className="rounded" />
              Reinvest RRSP refund back into RRSP
            </label>
          )}
          {accountType === "taxable" && (
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">Investment Type (affects tax drag)</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(["growth", "dividends", "interest", "mixed"] as ReturnType[]).map(r => (
                  <button key={r} onClick={() => setReturnType(r)}
                    className={`py-2 rounded-lg text-xs font-medium border transition-colors capitalize ${returnType === r ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-700 border-gray-300 hover:border-orange-400"}`}>
                    {r === "growth" ? "Capital Growth" : r === "dividends" ? "Dividends" : r === "interest" ? "Interest/GIC" : "Mixed"}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tax Settings */}
        {accountType === "taxable" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-gray-100">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
              <select value={province} onChange={e => setProvince(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none">
                {Object.entries(PROV_TOP_RATES).sort((a, b) => a[1].name.localeCompare(b[1].name)).map(([code, p]) => (
                  <option key={code} value={code}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Annual Income</label>
              <NumericFormat value={personalIncome} onValueChange={v => setPersonalIncome(v.floatValue ?? 0)}
                thousandSeparator prefix="$"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="flex flex-col justify-end">
              <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm">
                <span className="text-gray-500">Marginal rate: </span>
                <span className="font-bold text-gray-800">{(marginalRate * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Inflation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-100">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Inflation Rate: <span className="text-blue-600 font-bold">{inflation}%</span>
            </label>
            <input type="range" min={0} max={8} step={0.5} value={inflation}
              onChange={e => setInflation(Number(e.target.value))}
              className="w-full accent-blue-600" />
          </div>
        </div>
      </div>

      {/* Growth Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Portfolio Growth Over Time</h2>
        <BarChart rows={mainRows} compareRows={compareRows} compareLabel={compareLabel} inflation={inflation} />
      </div>

      {/* Compare Panel */}
      <div className="print:hidden bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-800">Compare Scenarios</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {([
            { key: "none", label: "No Compare" },
            { key: "rate", label: "Different Rate" },
            { key: "account", label: "Account Type" },
            { key: "lumpvsdca", label: "Lump Sum vs DCA" },
          ] as { key: typeof compareMode; label: string }[]).map(opt => (
            <button key={opt.key} onClick={() => setCompareMode(opt.key)}
              className={`py-2 rounded-lg text-sm font-medium border transition-colors ${compareMode === opt.key ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"}`}>
              {opt.label}
            </button>
          ))}
        </div>
        {compareMode === "rate" && (
          <div className="max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Compare Rate: <span className="text-purple-600 font-bold">{compareRate}%</span>
            </label>
            <input type="range" min={1} max={15} step={0.5} value={compareRate}
              onChange={e => setCompareRate(Number(e.target.value))}
              className="w-full accent-purple-600" />
          </div>
        )}
      </div>

      {/* Return Rate Scenarios */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Return Rate Scenarios</h2>
          <p className="text-sm text-gray-500 mt-0.5">Same contributions, different annual return rates</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Scenario</th>
                <th className="px-4 py-3 text-right text-gray-500 font-medium">Final Value</th>
                <th className="px-4 py-3 text-right text-gray-500 font-medium">Total Growth</th>
                <th className="px-4 py-3 text-right text-gray-500 font-medium">Real Value</th>
                <th className="px-4 py-3 text-right text-gray-500 font-medium">Multiple</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {scenarios.map((s, i) => {
                const sLast = s.rows[s.rows.length - 1];
                const multiple = totalContributed > 0 ? sLast.balance / totalContributed : 0;
                return (
                  <tr key={i} className={i === 1 ? "bg-blue-50" : "hover:bg-gray-50"}>
                    <td className={`px-6 py-3 font-medium ${i === 1 ? "text-blue-700" : "text-gray-700"}`}>{s.label}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-800">{fmt(sLast.balance)}</td>
                    <td className="px-4 py-3 text-right text-green-600">+{fmt(sLast.balance - totalContributed)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmt(sLast.realBalance)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{multiple.toFixed(1)}×</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Account Type Comparison */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Account Type Comparison</h2>
          <p className="text-sm text-gray-500 mt-0.5">Same investments, different account wrapper — {years} year horizon</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Account</th>
                <th className="px-4 py-3 text-right text-gray-500 font-medium">Final Value</th>
                <th className="px-4 py-3 text-right text-gray-500 font-medium">Tax Drag</th>
                <th className="px-4 py-3 text-right text-gray-500 font-medium">vs TFSA</th>
                <th className="px-4 py-3 text-left px-4 py-3 text-gray-500 font-medium">Best For</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {accountComparison.map((a, i) => {
                const aLast = a.rows[a.rows.length - 1];
                const tfsaLast = accountComparison[0].rows[accountComparison[0].rows.length - 1];
                const diff = aLast.balance - tfsaLast.balance;
                const totalTax = a.rows.reduce((sum, r) => sum + r.tax, 0);
                const bestFor = a.label === "TFSA" ? "Tax-free growth; flexible withdrawals"
                  : a.label === "RRSP" ? "High earners; retirement savings; refund reinvestment"
                  : "Investments beyond TFSA/RRSP room";
                return (
                  <tr key={i} className={a.label === accountType.toUpperCase() ? "bg-blue-50" : "hover:bg-gray-50"}>
                    <td className="px-6 py-3 font-semibold text-gray-800">{a.label}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-800">{fmt(aLast.balance)}</td>
                    <td className="px-4 py-3 text-right text-red-500">{totalTax > 0 ? `−${fmt(totalTax)}` : "None"}</td>
                    <td className={`px-4 py-3 text-right font-medium ${diff < 0 ? "text-red-500" : diff > 0 ? "text-green-600" : "text-gray-500"}`}>
                      {diff === 0 ? "—" : diff > 0 ? `+${fmt(diff)}` : fmt(diff)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{bestFor}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Year-by-Year Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <button onClick={() => setShowTable(!showTable)}
          className="w-full flex items-center justify-between px-6 py-4 text-gray-800 font-semibold">
          <span>Year-by-Year Growth Table</span>
          <span className="text-gray-400 text-sm">{showTable ? "▲ Hide" : "▼ Show"}</span>
        </button>
        {showTable && (
          <div className="overflow-x-auto border-t border-gray-100">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left text-gray-500">Year</th>
                  <th className="px-4 py-2 text-right text-gray-500">Contributions</th>
                  <th className="px-4 py-2 text-right text-gray-500">Total Contributed</th>
                  <th className="px-4 py-2 text-right text-gray-500">Growth</th>
                  <th className="px-4 py-2 text-right text-gray-500">Tax Drag</th>
                  <th className="px-4 py-2 text-right text-gray-500 font-bold">Balance</th>
                  <th className="px-4 py-2 text-right text-gray-500">Real Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {mainRows.map(row => (
                  <tr key={row.year} className="hover:bg-gray-50">
                    <td className="px-4 py-1.5 font-medium text-gray-700">{row.year}</td>
                    <td className="px-4 py-1.5 text-right text-gray-600">{fmt(row.contributions)}</td>
                    <td className="px-4 py-1.5 text-right text-gray-600">{fmt(row.totalContributed)}</td>
                    <td className="px-4 py-1.5 text-right text-green-600">+{fmt(row.growth)}</td>
                    <td className="px-4 py-1.5 text-right text-red-500">{row.tax > 0 ? `−${fmt(row.tax)}` : "—"}</td>
                    <td className="px-4 py-1.5 text-right font-bold text-blue-700">{fmt(row.balance)}</td>
                    <td className="px-4 py-1.5 text-right text-orange-500">{fmt(row.realBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Doubling Rule / Quick Facts */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Quick Reference</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">Rule of 72</div>
            <div className="text-2xl font-black text-blue-800">{(72 / annualReturn).toFixed(1)} years</div>
            <div className="text-xs text-blue-600 mt-1">to double your money at {annualReturn}%</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-xs text-green-600 font-semibold uppercase tracking-wide mb-1">Inflation Halving</div>
            <div className="text-2xl font-black text-green-800">{(72 / inflation).toFixed(1)} years</div>
            <div className="text-xs text-green-600 mt-1">for purchasing power to halve at {inflation}% inflation</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-xs text-purple-600 font-semibold uppercase tracking-wide mb-1">Real Return</div>
            <div className="text-2xl font-black text-purple-800">{Math.max(0, annualReturn - inflation).toFixed(1)}%</div>
            <div className="text-xs text-purple-600 mt-1">after inflation ({annualReturn}% − {inflation}%)</div>
          </div>
        </div>
      </div>

      {/* SEO / FAQ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5 text-sm text-gray-600 leading-relaxed">
        <h2 className="text-xl font-bold text-gray-900">Investment Returns in Canada: What You Need to Know</h2>

        <p>Understanding how your investments grow over time — and how taxes, inflation, and account type affect real returns — is fundamental to building wealth in Canada.</p>

        <h3 className="text-base font-bold text-gray-800">TFSA vs RRSP vs Taxable Accounts</h3>
        <p>The account you invest in matters as much as what you invest in. <strong>TFSAs</strong> provide completely tax-free growth and flexible withdrawals with no impact on income-tested benefits. <strong>RRSPs</strong> give an upfront tax deduction (and refund) but withdrawals are fully taxable — ideal for those who expect a lower tax rate in retirement. <strong>Taxable accounts</strong> have no contribution limits but growth is subject to annual tax drag depending on the investment type.</p>

        <h3 className="text-base font-bold text-gray-800">The Power of Compound Growth</h3>
        <p>Albert Einstein reportedly called compound interest the eighth wonder of the world. At 7% annual return, money doubles roughly every 10 years (Rule of 72). The difference between starting to invest at 25 vs 35 can mean hundreds of thousands of dollars by retirement — the extra decade of compounding is irreplaceable.</p>

        <h3 className="text-base font-bold text-gray-800">Lump Sum vs Dollar Cost Averaging</h3>
        <p>Studies consistently show that investing a lump sum immediately outperforms dollar-cost averaging (DCA) roughly two-thirds of the time — because markets trend upward over time. However, DCA reduces the emotional difficulty of investing and protects against investing at a market peak. For most Canadians investing from regular paycheques, DCA is the practical reality.</p>

        <h3 className="text-base font-bold text-gray-800">Inflation and Real Returns</h3>
        <p>A 7% nominal return with 2.5% inflation delivers only a ~4.5% real return. Over 25 years, inflation can cut the purchasing power of your portfolio nearly in half. Always focus on real returns — what your money can actually buy — not just nominal numbers.</p>

        <h3 className="text-base font-bold text-gray-800">Typical Canadian Investment Return Benchmarks (2025)</h3>
        <p>High-interest savings accounts: 3–5%. GICs: 3.5–5%. Canadian bonds: 3–5%. Balanced funds: 5–7%. Canadian equities: 6–8%. Global equities: 7–10%. These are historical averages — past performance does not guarantee future results.</p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-xs">
          <strong>Disclaimer:</strong> This calculator provides estimates for educational purposes only. Actual investment returns vary and are not guaranteed. Tax calculations are simplified approximations. This is not financial advice — consult a registered financial advisor before making investment decisions.
        </div>
      </div>
    </div>
  );
}
