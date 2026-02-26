"use client";

import { useState, useMemo } from "react";
import { NumericFormat } from "react-number-format";
import PrintButton from "@/components/PrintButton";

// ─── Provincial Sales Tax Data 2025 ──────────────────────────────────────────

const PROVINCES: Record<string, { name: string; gst: number; pst: number; hst: number; label: string }> = {
  AB: { name: "Alberta",                  gst: 0.05, pst: 0.00, hst: 0.00, label: "GST 5%" },
  BC: { name: "British Columbia",         gst: 0.05, pst: 0.07, hst: 0.00, label: "GST 5% + PST 7%" },
  MB: { name: "Manitoba",                 gst: 0.05, pst: 0.07, hst: 0.00, label: "GST 5% + PST 7%" },
  NB: { name: "New Brunswick",            gst: 0.00, pst: 0.00, hst: 0.15, label: "HST 15%" },
  NL: { name: "Newfoundland & Labrador",  gst: 0.00, pst: 0.00, hst: 0.15, label: "HST 15%" },
  NS: { name: "Nova Scotia",              gst: 0.00, pst: 0.00, hst: 0.15, label: "HST 15%" },
  NT: { name: "Northwest Territories",    gst: 0.05, pst: 0.00, hst: 0.00, label: "GST 5%" },
  NU: { name: "Nunavut",                  gst: 0.05, pst: 0.00, hst: 0.00, label: "GST 5%" },
  ON: { name: "Ontario",                  gst: 0.00, pst: 0.00, hst: 0.13, label: "HST 13%" },
  PE: { name: "Prince Edward Island",     gst: 0.00, pst: 0.00, hst: 0.15, label: "HST 15%" },
  QC: { name: "Quebec",                   gst: 0.05, pst: 0.09975, hst: 0.00, label: "GST 5% + QST 9.975%" },
  SK: { name: "Saskatchewan",             gst: 0.05, pst: 0.06, hst: 0.00, label: "GST 5% + PST 6%" },
  YT: { name: "Yukon",                    gst: 0.05, pst: 0.00, hst: 0.00, label: "GST 5%" },
};

function getTaxRate(prov: typeof PROVINCES[string]): number {
  return prov.hst > 0 ? prov.hst : prov.gst + prov.pst;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
}
function fmtFull(n: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(n);
}

function calcMonthlyPayment(principal: number, annualRate: number, months: number): number {
  if (annualRate === 0) return principal / months;
  const r = annualRate / 100 / 12;
  return principal * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

interface AmortRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

function buildAmortization(principal: number, annualRate: number, months: number): AmortRow[] {
  const rows: AmortRow[] = [];
  let balance = principal;
  const r = annualRate / 100 / 12;
  const payment = calcMonthlyPayment(principal, annualRate, months);

  for (let m = 1; m <= months; m++) {
    const interest = balance * r;
    const princ = Math.min(payment - interest, balance);
    balance = Math.max(0, balance - princ);
    rows.push({ month: m, payment, principal: princ, interest, balance });
  }
  return rows;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AutoLoanClient() {
  const [vehiclePrice, setVehiclePrice] = useState(0);
  const [downPayment, setDownPayment] = useState(0);
  const [tradeIn, setTradeIn] = useState(0);
  const [interestRate, setInterestRate] = useState(6.99);
  const [amortMonths, setAmortMonths] = useState(60);
  const [province, setProvince] = useState("ON");
  const [extraMonthly, setExtraMonthly] = useState(0);
  const [isNew, setIsNew] = useState(true);
  const [showTable, setShowTable] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const provData = PROVINCES[province];
  const taxRate = getTaxRate(provData);

  // Results gate
  const hasResults = vehiclePrice > 0 && amortMonths > 0 && interestRate >= 0;

  const results = useMemo(() => {
    if (!hasResults) return null;

    const taxAmount = vehiclePrice * taxRate;
    const totalVehicleCost = vehiclePrice + taxAmount;
    const principal = Math.max(0, totalVehicleCost - downPayment - tradeIn);
    const monthlyPayment = calcMonthlyPayment(principal, interestRate, amortMonths);
    const totalPaid = monthlyPayment * amortMonths;
    const totalInterest = totalPaid - principal;
    const totalCost = downPayment + tradeIn + totalPaid; // effective total outlay

    // Extra payment scenario
    let extraPayoffMonth = amortMonths;
    let extraTotalInterest = totalInterest;
    if (extraMonthly > 0) {
      let bal = principal;
      const r = interestRate / 100 / 12;
      let month = 0;
      let intPaid = 0;
      while (bal > 0 && month < amortMonths) {
        month++;
        const interest = bal * r;
        intPaid += interest;
        const princ = Math.min(monthlyPayment + extraMonthly - interest, bal);
        bal = Math.max(0, bal - princ);
      }
      extraPayoffMonth = month;
      extraTotalInterest = intPaid;
    }

    const interestSaved = extraMonthly > 0 ? totalInterest - extraTotalInterest : 0;
    const monthsSaved = amortMonths - extraPayoffMonth;

    // Amortization table
    const amortTable = buildAmortization(principal, interestRate, amortMonths);

    // Year-by-year summary
    const yearlyRows: { year: number; paid: number; interest: number; principal: number; balance: number }[] = [];
    for (let y = 1; y <= Math.ceil(amortMonths / 12); y++) {
      const monthStart = (y - 1) * 12;
      const monthEnd = Math.min(y * 12, amortMonths);
      const slice = amortTable.slice(monthStart, monthEnd);
      yearlyRows.push({
        year: y,
        paid: slice.reduce((s, r) => s + r.payment, 0),
        interest: slice.reduce((s, r) => s + r.interest, 0),
        principal: slice.reduce((s, r) => s + r.principal, 0),
        balance: slice[slice.length - 1]?.balance ?? 0,
      });
    }

    return {
      taxAmount, totalVehicleCost, principal, monthlyPayment,
      totalPaid, totalInterest, totalCost,
      extraPayoffMonth, extraTotalInterest, interestSaved, monthsSaved,
      amortTable, yearlyRows,
    };
  }, [vehiclePrice, downPayment, tradeIn, interestRate, amortMonths, province, extraMonthly, hasResults, taxRate]);

  const amortOptions = [24, 36, 48, 60, 72, 84, 96];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* Info Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl overflow-hidden">
        <button onClick={() => setShowInfo(!showInfo)}
          className="w-full flex items-center justify-between px-5 py-3 text-blue-800 font-semibold text-sm">
          <span>💡 How auto loans work in Canada</span>
          <span>{showInfo ? "▲ Hide" : "▼ Show"}</span>
        </button>
        {showInfo && (
          <div className="px-5 pb-4 text-blue-900 text-sm space-y-2">
            <p>Your monthly payment is calculated on the <strong>financed amount</strong> — vehicle price plus tax, minus your down payment and trade-in value. Provincial sales tax is applied to the full vehicle price before financing.</p>
            <p>In most provinces, <strong>trade-in value reduces the taxable amount</strong> (you pay tax on the difference). This calculator applies tax to the full price for simplicity — your actual tax owing may be slightly lower if you have a trade-in in ON, BC, and QC.</p>
            <p>Making extra monthly payments reduces your balance faster, saves interest, and shortens your loan term — often significantly.</p>
          </div>
        )}
      </div>

      {/* Inputs */}
      <div className="print:hidden bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Loan Details</h2>
          <div className="flex gap-2">
            <button onClick={() => setIsNew(true)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${isNew ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"}`}>
              New Vehicle
            </button>
            <button onClick={() => setIsNew(false)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${!isNew ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"}`}>
              Used Vehicle
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Price</label>
            <NumericFormat value={vehiclePrice || ""} onValueChange={v => setVehiclePrice(v.floatValue ?? 0)}
              thousandSeparator prefix="$" placeholder="$0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Down Payment</label>
            <NumericFormat value={downPayment || ""} onValueChange={v => setDownPayment(v.floatValue ?? 0)}
              thousandSeparator prefix="$" placeholder="$0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trade-In Value</label>
            <NumericFormat value={tradeIn || ""} onValueChange={v => setTradeIn(v.floatValue ?? 0)}
              thousandSeparator prefix="$" placeholder="$0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Interest Rate: <span className="text-blue-600 font-bold">{interestRate}%</span>
            </label>
            <input type="range" min={0} max={20} step={0.25} value={interestRate}
              onChange={e => setInterestRate(Number(e.target.value))}
              className="w-full accent-blue-600 mt-1" />
            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
              <span>0%</span><span>5%</span><span>10%</span><span>15%</span><span>20%</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {isNew ? "New car avg: 6–9% · Manufacturer 0% promos available" : "Used car avg: 8–14% · Credit union rates often lower"}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Loan Term</label>
            <div className="flex flex-wrap gap-2">
              {amortOptions.map(m => (
                <button key={m} onClick={() => setAmortMonths(m)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${amortMonths === m ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"}`}>
                  {m / 12}yr
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
            <select value={province} onChange={e => setProvince(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none">
              {Object.entries(PROVINCES).sort((a, b) => a[1].name.localeCompare(b[1].name)).map(([code, p]) => (
                <option key={code} value={code}>{p.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">{provData.label}</p>
          </div>
        </div>

        {/* Extra Payment */}
        <div className="pt-3 border-t border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-1">Extra Monthly Payment (optional)</label>
          <div className="flex items-center gap-3">
            <NumericFormat value={extraMonthly || ""} onValueChange={v => setExtraMonthly(v.floatValue ?? 0)}
              thousandSeparator prefix="$" placeholder="$0"
              className="w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
            <span className="text-xs text-gray-500">See how much interest you save by paying more each month</span>
          </div>
        </div>
      </div>

      {/* Results gate */}
      {!hasResults && (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-400">
          <div className="text-3xl mb-2">🚗</div>
          <div className="font-medium">Enter a vehicle price above to see your loan breakdown</div>
        </div>
      )}

      {hasResults && results && <>

      {/* Hero */}
      <div className="bg-blue-600 text-white rounded-xl p-6 text-center">
        <div className="text-sm font-medium text-blue-200 mb-1">Monthly Payment</div>
        <div className="text-5xl font-black mb-1">{fmtFull(results.monthlyPayment)}</div>
        <div className="text-blue-200 text-sm">
          {amortMonths / 12}-year term · {interestRate}% interest · {fmt(results.principal)} financed
        </div>
      </div>

      <PrintButton />

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Vehicle + Tax</div>
          <div className="text-xl font-bold text-gray-800">{fmt(results.totalVehicleCost)}</div>
          <div className="text-xs text-gray-400 mt-0.5">incl. {fmt(results.taxAmount)} tax</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Amount Financed</div>
          <div className="text-xl font-bold text-gray-800">{fmt(results.principal)}</div>
          <div className="text-xs text-gray-400 mt-0.5">after down + trade-in</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Total Interest</div>
          <div className="text-xl font-bold text-red-600">{fmt(results.totalInterest)}</div>
          <div className="text-xs text-gray-400 mt-0.5">{((results.totalInterest / results.principal) * 100).toFixed(1)}% of principal</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Total Cost of Loan</div>
          <div className="text-xl font-bold text-gray-800">{fmt(results.totalPaid)}</div>
          <div className="text-xs text-gray-400 mt-0.5">principal + interest</div>
        </div>
      </div>

      {/* Cost Breakdown Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">True Cost of Ownership</h2>
        <div className="space-y-3">
          {[
            { label: "Vehicle Price", value: vehiclePrice, color: "bg-blue-500" },
            { label: `Sales Tax (${(taxRate * 100).toFixed(2)}%)`, value: results.taxAmount, color: "bg-blue-300" },
            { label: "Total Interest Paid", value: results.totalInterest, color: "bg-red-400" },
          ].map(item => {
            const total = vehiclePrice + results.taxAmount + results.totalInterest;
            const pct = (item.value / total) * 100;
            return (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{item.label}</span>
                  <span className="font-semibold text-gray-800">{fmt(item.value)} <span className="text-gray-400 font-normal">({pct.toFixed(0)}%)</span></span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full">
                  <div className={`h-2.5 rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          <div className="border-t border-gray-200 pt-3 flex justify-between font-bold text-gray-800">
            <span>Total Cost (price + tax + interest)</span>
            <span>{fmt(vehiclePrice + results.taxAmount + results.totalInterest)}</span>
          </div>
        </div>
      </div>

      {/* Extra Payment Savings */}
      {extraMonthly > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <h2 className="text-lg font-bold text-green-800 mb-3">Extra Payment Impact</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-xs text-green-600 font-semibold uppercase tracking-wide mb-1">Interest Saved</div>
              <div className="text-2xl font-black text-green-700">{fmt(results.interestSaved)}</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-xs text-green-600 font-semibold uppercase tracking-wide mb-1">Months Saved</div>
              <div className="text-2xl font-black text-green-700">{results.monthsSaved} months</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-xs text-green-600 font-semibold uppercase tracking-wide mb-1">Paid Off In</div>
              <div className="text-2xl font-black text-green-700">{results.extraPayoffMonth} months</div>
              <div className="text-xs text-green-600 mt-0.5">vs {amortMonths} months originally</div>
            </div>
          </div>
        </div>
      )}

      {/* Loan Term Comparison */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Loan Term Comparison</h2>
          <p className="text-sm text-gray-500 mt-0.5">Same vehicle and rate — different terms</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Term</th>
                <th className="px-4 py-3 text-right text-gray-500 font-medium">Monthly Payment</th>
                <th className="px-4 py-3 text-right text-gray-500 font-medium">Total Interest</th>
                <th className="px-4 py-3 text-right text-gray-500 font-medium">Total Cost</th>
                <th className="px-4 py-3 text-right text-gray-500 font-medium">vs 60-month</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {amortOptions.map(m => {
                const mp = calcMonthlyPayment(results.principal, interestRate, m);
                const ti = mp * m - results.principal;
                const base60 = calcMonthlyPayment(results.principal, interestRate, 60);
                const ti60 = base60 * 60 - results.principal;
                const diff = ti - ti60;
                return (
                  <tr key={m} className={m === amortMonths ? "bg-blue-50" : "hover:bg-gray-50"}>
                    <td className={`px-6 py-3 font-medium ${m === amortMonths ? "text-blue-700" : "text-gray-700"}`}>
                      {m / 12} years ({m} mo)
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-800">{fmtFull(mp)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{fmt(ti)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{fmt(mp * m)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${diff < 0 ? "text-green-600" : diff > 0 ? "text-red-500" : "text-gray-400"}`}>
                      {diff === 0 ? "—" : diff > 0 ? `+${fmt(diff)}` : fmt(diff)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Down Payment Impact */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Down Payment Impact</h2>
          <p className="text-sm text-gray-500 mt-0.5">How much does a larger down payment save?</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Down Payment</th>
                <th className="px-4 py-3 text-right text-gray-500 font-medium">% of Price</th>
                <th className="px-4 py-3 text-right text-gray-500 font-medium">Monthly Payment</th>
                <th className="px-4 py-3 text-right text-gray-500 font-medium">Total Interest</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[0, 0.05, 0.10, 0.15, 0.20, 0.25].map(pct => {
                const dp = Math.round(vehiclePrice * pct);
                const princ = Math.max(0, results.totalVehicleCost - dp - tradeIn);
                const mp = calcMonthlyPayment(princ, interestRate, amortMonths);
                const ti = mp * amortMonths - princ;
                const isSelected = Math.abs(dp - downPayment) < 100;
                return (
                  <tr key={pct} className={isSelected ? "bg-blue-50" : "hover:bg-gray-50"}>
                    <td className={`px-6 py-3 font-medium ${isSelected ? "text-blue-700" : "text-gray-700"}`}>{fmt(dp)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{(pct * 100).toFixed(0)}%</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-800">{fmtFull(mp)}</td>
                    <td className="px-4 py-3 text-right text-red-500">{fmt(Math.max(0, ti))}</td>
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
          <span>Year-by-Year Amortization Summary</span>
          <span className="text-gray-400 text-sm">{showTable ? "▲ Hide" : "▼ Show"}</span>
        </button>
        {showTable && (
          <div className="overflow-x-auto border-t border-gray-100">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left text-gray-500">Year</th>
                  <th className="px-4 py-2 text-right text-gray-500">Payments</th>
                  <th className="px-4 py-2 text-right text-gray-500">Principal Paid</th>
                  <th className="px-4 py-2 text-right text-gray-500">Interest Paid</th>
                  <th className="px-4 py-2 text-right text-gray-500 font-bold">Remaining Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {results.yearlyRows.map(row => (
                  <tr key={row.year} className="hover:bg-gray-50">
                    <td className="px-4 py-1.5 font-medium text-gray-700">Year {row.year}</td>
                    <td className="px-4 py-1.5 text-right text-gray-600">{fmt(row.paid)}</td>
                    <td className="px-4 py-1.5 text-right text-blue-600">{fmt(row.principal)}</td>
                    <td className="px-4 py-1.5 text-right text-red-500">{fmt(row.interest)}</td>
                    <td className="px-4 py-1.5 text-right font-bold text-gray-800">{fmt(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      </>}

      {/* SEO / FAQ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5 text-sm text-gray-600 leading-relaxed">
        <h2 className="text-xl font-bold text-gray-900">Auto Loans in Canada: What You Need to Know</h2>

        <p>An auto loan is one of the most common forms of consumer debt in Canada. Understanding how the loan is structured — and how taxes, interest rates, and term length affect your total cost — can save you thousands of dollars.</p>

        <h3 className="text-base font-bold text-gray-800">How Sales Tax Works on Vehicle Purchases</h3>
        <p>In Canada, sales tax is applied to the full vehicle purchase price before financing. In HST provinces (Ontario, Atlantic Canada), you pay a single harmonized tax. In other provinces, GST and PST are applied separately. Quebec applies GST + QST. Alberta, Yukon, Northwest Territories, and Nunavut only charge GST. This tax is typically financed as part of your loan unless paid upfront.</p>

        <h3 className="text-base font-bold text-gray-800">Shorter vs Longer Loan Terms</h3>
        <p>A longer loan term (72 or 84 months) lowers your monthly payment but dramatically increases the total interest paid. It also increases the risk of being "underwater" — owing more than the car is worth — since vehicles depreciate quickly. Most financial advisors recommend keeping auto loans to 60 months or less.</p>

        <h3 className="text-base font-bold text-gray-800">The True Cost of 0% Financing</h3>
        <p>Manufacturer 0% financing offers on new vehicles can be attractive, but they typically require forgoing a cash purchase rebate (often $2,000–$5,000). In many cases, taking the rebate and financing through a credit union or bank at a low rate results in a lower total cost than 0% with no rebate.</p>

        <h3 className="text-base font-bold text-gray-800">Trade-In Tips</h3>
        <p>In most Canadian provinces, trade-in value reduces the taxable purchase price of your new vehicle. For example, in Ontario, if you buy a $40,000 car and trade in a vehicle worth $10,000, you pay HST on $30,000 — saving $1,300 in tax versus a private sale. Always negotiate your trade-in and new car price separately to get the best deal on each.</p>

        <h3 className="text-base font-bold text-gray-800">How to Pay Off Your Loan Faster</h3>
        <p>Even a modest extra payment of $50–$100 per month can shave months off your loan and save hundreds in interest. Making bi-weekly payments instead of monthly effectively makes one extra monthly payment per year. Always confirm with your lender that extra payments are applied directly to principal.</p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-xs">
          <strong>Disclaimer:</strong> This calculator provides estimates only. Actual loan terms, tax treatment, and rates vary by lender, province, and vehicle type. Consult your dealership or financial institution for exact figures.
        </div>
      </div>
    </div>
  );
}
