"use client";

import { useState, useMemo } from "react";
import { NumericFormat } from "react-number-format";
import PrintButton from "@/components/PrintButton";

function fmt(n: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
}
function fmtFull(n: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}
function fmtYears(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} month${m !== 1 ? "s" : ""}`;
  if (m === 0) return `${y} year${y !== 1 ? "s" : ""}`;
  return `${y} yr ${m} mo`;
}

interface PayoffRow {
  month: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

function calcMinimumPayment(balance: number, rate: number, minPct: number, minFloor: number): number {
  const interest = balance * (rate / 100 / 12);
  const pctPayment = balance * (minPct / 100);
  return Math.max(minFloor, pctPayment, interest + 1); // always at least cover interest + $1
}

function buildPayoffMinimum(
  balance: number,
  annualRate: number,
  minPct: number,
  minFloor: number
): PayoffRow[] {
  const rows: PayoffRow[] = [];
  let bal = balance;
  const r = annualRate / 100 / 12;
  let month = 0;

  while (bal > 0.01 && month < 1200) { // cap at 100 years
    month++;
    const interest = bal * r;
    const payment = Math.min(bal + interest, calcMinimumPayment(bal, annualRate, minPct, minFloor));
    const principal = payment - interest;
    bal = Math.max(0, bal - principal);
    rows.push({ month, payment, interest, principal, balance: bal });
  }
  return rows;
}

function buildPayoffFixed(balance: number, annualRate: number, fixedPayment: number): PayoffRow[] {
  const rows: PayoffRow[] = [];
  let bal = balance;
  const r = annualRate / 100 / 12;
  let month = 0;

  while (bal > 0.01 && month < 1200) {
    month++;
    const interest = bal * r;
    const payment = Math.min(bal + interest, Math.max(fixedPayment, interest + 0.01));
    const principal = payment - interest;
    bal = Math.max(0, bal - principal);
    rows.push({ month, payment, interest, principal, balance: bal });
  }
  return rows;
}

export default function CreditCardMinPaymentClient() {
  const [balance, setBalance] = useState(0);
  const [interestRate, setInterestRate] = useState(19.99);
  const [minPct, setMinPct] = useState(2.0);
  const [minFloor, setMinFloor] = useState(10);
  const [fixedPayment, setFixedPayment] = useState(0);
  const [extraPayment, setExtraPayment] = useState(0);
  const [showTable, setShowTable] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const hasResults = balance > 0;

  const results = useMemo(() => {
    if (!hasResults) return null;

    const minRows = buildPayoffMinimum(balance, interestRate, minPct, minFloor);
    const minTotalPaid = minRows.reduce((s, r) => s + r.payment, 0);
    const minTotalInterest = minTotalPaid - balance;
    const minMonths = minRows.length;
    const firstMinPayment = minRows[0]?.payment ?? 0;

    // Fixed payment scenario
    const effectiveFixed = fixedPayment > 0 ? fixedPayment : firstMinPayment;
    const fixedRows = buildPayoffFixed(balance, interestRate, effectiveFixed);
    const fixedTotalPaid = fixedRows.reduce((s, r) => s + r.payment, 0);
    const fixedTotalInterest = fixedTotalPaid - balance;
    const fixedMonths = fixedRows.length;

    // Extra payment scenario
    const extraRows = fixedPayment > 0
      ? buildPayoffFixed(balance, interestRate, fixedPayment + extraPayment)
      : buildPayoffFixed(balance, interestRate, firstMinPayment + extraPayment);
    const extraTotalInterest = extraRows.reduce((s, r) => s + r.payment, 0) - balance;
    const extraMonths = extraRows.length;

    // Quick payoff targets
    const targets = [12, 24, 36, 48, 60].map(targetMonths => {
      // Binary search for payment needed
      const r = interestRate / 100 / 12;
      const payment = r === 0
        ? balance / targetMonths
        : balance * (r * Math.pow(1 + r, targetMonths)) / (Math.pow(1 + r, targetMonths) - 1);
      const totalInterest = payment * targetMonths - balance;
      return { months: targetMonths, payment, totalInterest };
    });

    // Interest saved by paying fixed vs minimum
    const interestSavedFixed = minTotalInterest - fixedTotalInterest;
    const monthsSavedFixed = minMonths - fixedMonths;

    // Interest saved by extra payment
    const interestSavedExtra = extraPayment > 0 ? (fixedTotalInterest - extraTotalInterest) : 0;
    const monthsSavedExtra = extraPayment > 0 ? (fixedMonths - extraMonths) : 0;

    // Year-by-year summary for table
    const yearRows: { year: number; paid: number; interest: number; principal: number; balance: number }[] = [];
    for (let y = 1; y <= Math.ceil(minMonths / 12); y++) {
      const slice = minRows.slice((y - 1) * 12, y * 12);
      if (slice.length === 0) break;
      yearRows.push({
        year: y,
        paid: slice.reduce((s, r) => s + r.payment, 0),
        interest: slice.reduce((s, r) => s + r.interest, 0),
        principal: slice.reduce((s, r) => s + r.principal, 0),
        balance: slice[slice.length - 1].balance,
      });
    }

    return {
      minRows, minTotalPaid, minTotalInterest, minMonths, firstMinPayment,
      fixedRows, fixedTotalPaid, fixedTotalInterest, fixedMonths,
      extraRows, extraTotalInterest, extraMonths,
      targets, interestSavedFixed, monthsSavedFixed,
      interestSavedExtra, monthsSavedExtra, yearRows,
      effectiveFixed,
    };
  }, [balance, interestRate, minPct, minFloor, fixedPayment, extraPayment, hasResults]);

  const commonRates = [
    { label: "Store card (29.99%)", rate: 29.99 },
    { label: "Standard (19.99%)", rate: 19.99 },
    { label: "Low-rate card (12.99%)", rate: 12.99 },
    { label: "HELOC (7.2%)", rate: 7.20 },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* Info Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl overflow-hidden">
        <button onClick={() => setShowInfo(!showInfo)}
          className="w-full flex items-center justify-between px-5 py-3 text-blue-800 font-semibold text-sm">
          <span>💡 Why minimum payments are a debt trap</span>
          <span>{showInfo ? "▲ Hide" : "▼ Show"}</span>
        </button>
        {showInfo && (
          <div className="px-5 pb-4 text-blue-900 text-sm space-y-2">
            <p>Credit card minimum payments are typically 2–3% of your balance or a flat floor (often $10). At 19.99% interest, paying only minimums on a $5,000 balance takes <strong>over 20 years</strong> and costs more in interest than the original debt.</p>
            <p>The minimum payment is calculated to keep you in debt as long as possible — it's rarely enough to make meaningful progress on the principal. Even a modest increase above the minimum dramatically accelerates payoff.</p>
            <p>In Canada, credit card issuers are required to disclose on your statement how long it will take to pay off your balance making only minimum payments. This calculator shows you the full picture.</p>
          </div>
        )}
      </div>

      {/* Inputs */}
      <div className="print:hidden bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <h2 className="text-lg font-bold text-gray-800">Credit Card Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Balance</label>
            <NumericFormat value={balance || ""} onValueChange={v => setBalance(v.floatValue ?? 0)}
              thousandSeparator prefix="$" placeholder="$0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Annual Interest Rate: <span className="text-blue-600 font-bold">{interestRate}%</span>
            </label>
            <input type="range" min={0} max={35} step={0.25} value={interestRate}
              onChange={e => setInterestRate(Number(e.target.value))}
              className="w-full accent-blue-600 mt-1" />
            <div className="flex flex-wrap gap-2 mt-2">
              {commonRates.map(r => (
                <button key={r.rate} onClick={() => setInterestRate(r.rate)}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${interestRate === r.rate ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"}`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Payment: <span className="text-blue-600 font-bold">{minPct}% of balance</span>
            </label>
            <input type="range" min={1} max={5} step={0.5} value={minPct}
              onChange={e => setMinPct(Number(e.target.value))}
              className="w-full accent-blue-600 mt-1" />
            <p className="text-xs text-gray-400 mt-1">Most Canadian cards use 2–3% minimum (or $10 floor)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Payment Floor</label>
            <NumericFormat value={minFloor} onValueChange={v => setMinFloor(v.floatValue ?? 10)}
              prefix="$"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>

        {/* Fixed payment & extra */}
        <div className="pt-4 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Payment Scenarios</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fixed Monthly Payment (optional)</label>
              <NumericFormat value={fixedPayment || ""} onValueChange={v => setFixedPayment(v.floatValue ?? 0)}
                thousandSeparator prefix="$" placeholder="Same as first minimum"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
              <p className="text-xs text-gray-400 mt-1">Pay a fixed amount instead of recalculating minimum each month</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Extra Monthly Payment (optional)</label>
              <NumericFormat value={extraPayment || ""} onValueChange={v => setExtraPayment(v.floatValue ?? 0)}
                thousandSeparator prefix="$" placeholder="$0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
              <p className="text-xs text-gray-400 mt-1">See how much extra payment saves</p>
            </div>
          </div>
        </div>
      </div>

      {/* Results Gate */}
      {!hasResults && (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-400">
          <div className="text-3xl mb-2">💳</div>
          <div className="font-medium">Enter your credit card balance above to see your payoff timeline</div>
        </div>
      )}

      {hasResults && results && <>

      {/* Hero — minimum payment warning */}
      <div className="bg-red-600 text-white rounded-xl p-6 text-center">
        <div className="text-sm font-medium text-red-200 mb-1">Paying Minimums Only — You'll Be Debt-Free In</div>
        <div className="text-5xl font-black mb-1">{fmtYears(results.minMonths)}</div>
        <div className="text-red-200 text-sm">
          Total interest: {fmt(results.minTotalInterest)} · First payment: {fmtFull(results.firstMinPayment)} · Total paid: {fmt(results.minTotalPaid)}
        </div>
      </div>

      <PrintButton />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Balance</div>
          <div className="text-xl font-bold text-gray-800">{fmt(balance)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">First Min. Payment</div>
          <div className="text-xl font-bold text-gray-800">{fmtFull(results.firstMinPayment)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Total Interest (min)</div>
          <div className="text-xl font-bold text-red-600">{fmt(results.minTotalInterest)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Interest Rate</div>
          <div className="text-xl font-bold text-gray-800">{interestRate}%</div>
        </div>
      </div>

      {/* Fixed vs Minimum Comparison */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Minimum vs Fixed Payment Comparison</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Minimum Payments Only</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Payoff time</span><span className="font-bold text-gray-800">{fmtYears(results.minMonths)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Total interest</span><span className="font-bold text-red-600">{fmt(results.minTotalInterest)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Total paid</span><span className="font-bold text-gray-800">{fmt(results.minTotalPaid)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">First payment</span><span className="font-bold text-gray-800">{fmtFull(results.firstMinPayment)}</span></div>
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">
              Fixed Payment ({fmtFull(results.effectiveFixed)}/mo)
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Payoff time</span><span className="font-bold text-gray-800">{fmtYears(results.fixedMonths)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Total interest</span><span className="font-bold text-green-600">{fmt(results.fixedTotalInterest)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Total paid</span><span className="font-bold text-gray-800">{fmt(results.fixedTotalPaid)}</span></div>
              <div className="flex justify-between text-green-700 font-semibold border-t border-green-200 pt-1 mt-1"><span>Interest saved</span><span>{fmt(results.interestSavedFixed)}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Extra Payment Impact */}
      {extraPayment > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <h2 className="text-lg font-bold text-green-800 mb-3">Extra {fmt(extraPayment)}/month Impact</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-xs text-green-600 font-semibold uppercase tracking-wide mb-1">Interest Saved</div>
              <div className="text-2xl font-black text-green-700">{fmt(results.interestSavedExtra)}</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-xs text-green-600 font-semibold uppercase tracking-wide mb-1">Months Saved</div>
              <div className="text-2xl font-black text-green-700">{results.monthsSavedExtra}</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-xs text-green-600 font-semibold uppercase tracking-wide mb-1">Paid Off In</div>
              <div className="text-2xl font-black text-green-700">{fmtYears(results.extraMonths)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Payoff Targets */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">What Payment Clears Your Debt by Target Date?</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Target Payoff</th>
                <th className="px-4 py-3 text-right text-gray-500 font-medium">Monthly Payment</th>
                <th className="px-4 py-3 text-right text-gray-500 font-medium">Total Interest</th>
                <th className="px-4 py-3 text-right text-gray-500 font-medium">vs Minimum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {results.targets.map(t => (
                <tr key={t.months} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-700">{fmtYears(t.months)}</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-700">{fmtFull(t.payment)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{fmt(t.totalInterest)}</td>
                  <td className="px-4 py-3 text-right text-green-600 font-medium">
                    save {fmt(results.minTotalInterest - t.totalInterest)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Year-by-Year Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <button onClick={() => setShowTable(!showTable)}
          className="w-full flex items-center justify-between px-6 py-4 text-gray-800 font-semibold">
          <span>Year-by-Year Minimum Payment Schedule</span>
          <span className="text-gray-400 text-sm">{showTable ? "▲ Hide" : "▼ Show"}</span>
        </button>
        {showTable && (
          <div className="overflow-x-auto border-t border-gray-100">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left text-gray-500">Year</th>
                  <th className="px-4 py-2 text-right text-gray-500">Payments Made</th>
                  <th className="px-4 py-2 text-right text-gray-500">Principal Paid</th>
                  <th className="px-4 py-2 text-right text-gray-500">Interest Paid</th>
                  <th className="px-4 py-2 text-right text-gray-500 font-bold">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {results.yearRows.map(row => (
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
        <h2 className="text-xl font-bold text-gray-900">Credit Card Minimum Payments in Canada</h2>
        <p>Credit card minimum payments are designed to keep you paying interest for as long as possible. At Canada's standard rate of 19.99%, a $5,000 balance paid at 2% minimum per month takes over 20 years to clear and costs more than $7,000 in interest alone.</p>
        <h3 className="text-base font-bold text-gray-800">How Canadian Minimum Payments Are Calculated</h3>
        <p>Most Canadian credit cards calculate the minimum as the greater of: a percentage of the outstanding balance (typically 2–3%), a flat dollar amount (usually $10), or the interest accrued plus $1. As your balance decreases, so does the minimum payment — which is why payoff takes so long.</p>
        <h3 className="text-base font-bold text-gray-800">The Power of a Fixed Payment</h3>
        <p>The single most effective change you can make is to fix your monthly payment at the amount of your first minimum payment and never let it decrease as your balance drops. This alone can cut years off your payoff timeline and save thousands in interest.</p>
        <h3 className="text-base font-bold text-gray-800">Balance Transfer Cards in Canada</h3>
        <p>Many Canadian issuers offer balance transfer promotions at 0% for 6–12 months (sometimes with a 1–3% transfer fee). Transferring a high-rate balance and paying aggressively during the promotional period can save significant interest. Just ensure the balance is cleared before the promotional rate expires.</p>
        <h3 className="text-base font-bold text-gray-800">Credit Card Disclosure Requirements</h3>
        <p>Canadian regulations require credit card statements to show how long it will take to pay off your balance making only minimum payments, and the total interest cost. If you only see a minimum payment amount on your statement, look for the disclosure box — it's legally required.</p>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-xs">
          <strong>Disclaimer:</strong> This calculator provides estimates only. Actual minimum payments vary by issuer. Consult your cardholder agreement for exact terms.
        </div>
      </div>
    </div>
  );
}
