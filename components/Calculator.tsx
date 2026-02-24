// components/Calculator.tsx
'use client';

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { evaluate } from 'mathjs';
import { NumericFormat } from 'react-number-format';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Field {
  name: string;
  label: string;
  placeholder?: string;
  unit?: string;
}

interface CalcData {
  slug: string;
  formula?: string;
  formula_tfsa?: string;
  formula_rrsp?: string;
}

interface CalculatorProps {
  title: string;
  fields: Field[];
  resultUnit: string;
  calcData: CalcData;
}

type TfsaRrspResult    = { tfsa: number; rrsp: number };
type MortgageResult    = { monthlyPayment: number; totalMonthly: number; cmhcPremium: number; principal: number };
type AffordabilityResult = { maxPrice: number; maxMortgagePayment: number; gdsRatio: string; tdsRatio: string };
type CalcResult        = string | number | TfsaRrspResult | MortgageResult | AffordabilityResult;

// ─── Type guards ──────────────────────────────────────────────────────────────

function isTfsaRrsp(r: CalcResult): r is TfsaRrspResult {
  return typeof r === 'object' && r !== null && 'tfsa' in r;
}
function isMortgage(r: CalcResult): r is MortgageResult {
  return typeof r === 'object' && r !== null && 'monthlyPayment' in r;
}
function isAffordability(r: CalcResult): r is AffordabilityResult {
  return typeof r === 'object' && r !== null && 'maxPrice' in r;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) => Math.round(n).toLocaleString('en-CA');

// ─── Component ────────────────────────────────────────────────────────────────

export default function Calculator({ title, fields, resultUnit, calcData }: CalculatorProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const autoChangeInterval  = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => { if (autoChangeInterval.current) clearInterval(autoChangeInterval.current); };
  }, []);

  // ── Stepper ───────────────────────────────────────────────────────────────

  const getStep = (fieldName: string): number => {
    switch (fieldName) {
      case 'purchasePrice':      return 5000;
      case 'grossIncomeYearly':  return 1000;
      case 'downPaymentAmount':  return 1000;
      case 'propertyTaxYearly':  return 500;
      case 'annualContribution': return 500;
      default:                   return 1000;
    }
  };

  const startAutoChange = (fieldName: string, direction: number) => {
    const step = getStep(fieldName);
    const applyChange = (prev: Record<string, string>) => {
      const curr = Math.max(0, Number(prev[fieldName] || 0) + direction * step);
      return { ...prev, [fieldName]: curr.toString() };
    };
    setValues(applyChange);
    autoChangeInterval.current = setInterval(() => setValues(applyChange), 150);
  };

  const stopAutoChange = () => {
    if (autoChangeInterval.current) { clearInterval(autoChangeInterval.current); autoChangeInterval.current = null; }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const value = e.target.value;
    if (value === '' || !isNaN(Number(value))) setValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleProvinceChange = (province: string) => {
    const suggestedRates: Record<string, number> = {
      PE: 41.37, ON: 43.41, QC: 48.7, BC: 40.7,  AB: 38,
      MB: 40.75, SK: 40.5,  NS: 45.25, NB: 43,   NL: 43.3,
      YT: 38,    NT: 37.05, NU: 37.05,
    };
    const rate = suggestedRates[province];
    if (rate) setValues((prev) => ({ ...prev, currentTaxRate: rate.toString(), futureTaxRate: (rate * 0.85).toFixed(1) }));
  };

  // ── Calculation ───────────────────────────────────────────────────────────

  const calculate = (): CalcResult => {
    const missingFields = fields.filter((f) => !values[f.name] || isNaN(Number(values[f.name])));
    if (missingFields.length > 0) return 'Please fill all fields';

    try {
      const scope: Record<string, number> = {};
      fields.forEach((f) => { scope[f.name] = Number(values[f.name] || 0); });

      if (scope.annualReturn === 0) return 'Return cannot be 0%';

      if (calcData.formula) {
        const r = evaluate(calcData.formula, scope);
        return typeof r === 'number' && !isNaN(r) && isFinite(r) ? r : 'Invalid result';
      }

      if (calcData.formula_tfsa && calcData.formula_rrsp) {
        const tfsaRaw = evaluate(calcData.formula_tfsa, scope);
        const rrspRaw = evaluate(calcData.formula_rrsp, scope);
        return {
          tfsa: typeof tfsaRaw === 'number' && isFinite(tfsaRaw) ? Math.round(tfsaRaw) : NaN,
          rrsp: typeof rrspRaw === 'number' && isFinite(rrspRaw) ? Math.round(rrspRaw) : NaN,
        };
      }

      // ── Mortgage payment ─────────────────────────────────────────────────
      if (calcData.slug?.toLowerCase().includes('mortgage-payment-affordability')) {
        const price               = scope.purchasePrice        || 0;
        const downPct             = (scope.downPaymentPercent  || 0) / 100;
        const interestRate        = (scope.interestRate        || 0) / 100;
        const amortizationYears   = scope.amortizationYears    || 0;
        const propertyTaxYearly   = scope.propertyTaxYearly    || 0;
        const heatingCostsMonthly = scope.heatingCostsMonthly  || 0;

        if (price <= 0)                                        return 'Purchase price must be greater than $0';
        if (downPct < 0 || downPct > 1)                       return 'Down payment must be between 0–100%';
        if (interestRate <= 0)                                 return 'Interest rate must be greater than 0%';
        if (amortizationYears <= 0 || amortizationYears > 35) return 'Amortization must be 1–35 years';

        const principal = price - price * downPct;
        if (principal <= 0) return 'Down payment too high';

        let cmhcRate = 0;
        if      (downPct < 0.05) cmhcRate = 0.040;
        else if (downPct < 0.10) cmhcRate = 0.031;
        else if (downPct < 0.15) cmhcRate = 0.0175;
        else if (downPct < 0.20) cmhcRate = 0.010;

        const cmhcPremium    = principal * cmhcRate;
        const totalPrincipal = principal + cmhcPremium;
        const monthlyRate    = interestRate / 12;
        const periods        = amortizationYears * 12;
        const monthlyPayment = evaluate(
          'totalPrincipal * (monthlyRate * pow(1+monthlyRate,periods)) / (pow(1+monthlyRate,periods)-1)',
          { totalPrincipal, monthlyRate, periods }
        );

        if (!isFinite(monthlyPayment) || isNaN(monthlyPayment)) return 'Invalid calculation — check inputs';

        return {
          monthlyPayment: Math.round(monthlyPayment),
          totalMonthly:   Math.round(monthlyPayment + propertyTaxYearly / 12 + heatingCostsMonthly),
          cmhcPremium:    Math.round(cmhcPremium),
          principal:      Math.round(principal),
        };
      }

      // ── Max affordability ────────────────────────────────────────────────
      if (calcData.slug?.toLowerCase().includes('max-house-affordability')) {
        const incomeYearly  = scope.grossIncomeYearly   || 0;
        const debtMonthly   = scope.monthlyDebtPayments || 0;
        const downAmount    = scope.downPaymentAmount   || 0;
        const interestRate  = scope.interestRate        || 0;
        const amortYears    = scope.amortizationYears   || 0;
        const taxYearly     = scope.propertyTaxYearly   || 0;
        const heatMonthly   = scope.heatingCostsMonthly || 0;

        if (incomeYearly <= 0) return 'Income must be positive';
        if (interestRate <= 0) return 'Interest rate must be positive';
        if (amortYears   <= 0) return 'Amortization must be positive';

        const monthlyRate   = interestRate / 100 / 12;
        const periods       = amortYears * 12;
        const monthlyIncome = incomeYearly / 12;
        const maxGDS        = monthlyIncome * 0.32;
        const maxTDS        = monthlyIncome * 0.44;
        const maxPayment    = Math.min(maxGDS - taxYearly / 12 - heatMonthly, maxTDS - debtMonthly);

        if (maxPayment <= 0) return 'Income too low for these costs';

        const powerTerm = Math.pow(1 + monthlyRate, periods);
        const maxPrice  = maxPayment * (powerTerm - 1) / (monthlyRate * powerTerm) + downAmount;

        return {
          maxPrice:           Math.round(maxPrice),
          maxMortgagePayment: Math.round(maxPayment),
          gdsRatio:           (maxGDS / monthlyIncome * 100).toFixed(1) + '%',
          tdsRatio:           (maxTDS / monthlyIncome * 100).toFixed(1) + '%',
        };
      }

      return 'No formula defined';
    } catch {
      return 'Calculation error';
    }
  };

  const result = calculate();

  const isEmpty = typeof result === 'string' && result === 'Please fill all fields';
  const isError = typeof result === 'string' && result !== 'Please fill all fields';

  const showProvince =
    calcData?.slug !== 'mortgage-payment-affordability' &&
    calcData?.slug !== 'max-house-affordability';

  const dollarFields = [
    'purchasePrice', 'propertyTaxYearly', 'grossIncomeYearly',
    'downPaymentAmount', 'annualContribution', 'currentRoom',
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-gray-900">{title}</h1>
          <p className="text-gray-500 mt-1">Free Canadian financial calculator — results update as you type.</p>
        </div>

        {/* Inputs card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-800">Your Details</h2>

          {/* Province selector */}
          {showProvince && (
            <div>
              <label htmlFor="province" className="block text-sm font-medium text-gray-700 mb-2">
                Province / Territory
                <span className="text-gray-400 font-normal ml-1">(auto-suggests tax rate)</span>
              </label>
              <select
                id="province"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-gray-900"
                onChange={(e) => handleProvinceChange(e.target.value)}
              >
                <option value="">Select province</option>
                <option value="AB">Alberta</option>
                <option value="BC">British Columbia</option>
                <option value="MB">Manitoba</option>
                <option value="NB">New Brunswick</option>
                <option value="NL">Newfoundland and Labrador</option>
                <option value="NS">Nova Scotia</option>
                <option value="NT">Northwest Territories</option>
                <option value="NU">Nunavut</option>
                <option value="ON">Ontario</option>
                <option value="PE">Prince Edward Island</option>
                <option value="QC">Quebec</option>
                <option value="SK">Saskatchewan</option>
                <option value="YT">Yukon</option>
              </select>
            </div>
          )}

          {/* Fields */}
          {fields.map((field) => (
            <div key={field.name}>
              <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-2">
                {field.label}
                {field.unit && <span className="text-gray-400 font-normal ml-1">({field.unit})</span>}
              </label>

              {dollarFields.includes(field.name) ? (
                <div className="relative flex items-center">
                  <NumericFormat
                    id={field.name}
                    thousandSeparator
                    prefix="$"
                    decimalScale={0}
                    allowNegative={false}
                    value={values[field.name] ?? ''}
                    onValueChange={(v) => setValues((prev) => ({ ...prev, [field.name]: v.floatValue?.toString() ?? '' }))}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2.5 pr-16 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-right"
                  />
                  <div className="absolute right-0 flex flex-col h-full">
                    <button
                      type="button"
                      onMouseDown={() => startAutoChange(field.name, 1)}
                      onMouseUp={stopAutoChange}
                      onMouseLeave={stopAutoChange}
                      onTouchStart={() => startAutoChange(field.name, 1)}
                      onTouchEnd={stopAutoChange}
                      className="flex-1 px-3 bg-gray-100 hover:bg-gray-200 border-l border-gray-300 text-gray-600 rounded-tr-lg text-sm font-medium focus:outline-none"
                    >+</button>
                    <button
                      type="button"
                      onMouseDown={() => startAutoChange(field.name, -1)}
                      onMouseUp={stopAutoChange}
                      onMouseLeave={stopAutoChange}
                      onTouchStart={() => startAutoChange(field.name, -1)}
                      onTouchEnd={stopAutoChange}
                      className="flex-1 px-3 bg-gray-100 hover:bg-gray-200 border-l border-t border-gray-300 text-gray-600 rounded-br-lg text-sm font-medium focus:outline-none"
                    >−</button>
                  </div>
                </div>
              ) : (
                <input
                  id={field.name}
                  type="number"
                  step={
                    field.name === 'downPaymentPercent' ? '1'   :
                    field.name === 'interestRate'        ? '0.1' :
                    field.name === 'amortizationYears'   ? '1'   :
                    field.name === 'heatingCostsMonthly' ? '10'  :
                    field.name === 'monthlyDebtPayments' ? '10'  : 'any'
                  }
                  min="0"
                  placeholder={field.placeholder}
                  value={values[field.name] || ''}
                  onChange={(e) => handleChange(e, field.name)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-right"
                />
              )}
            </div>
          ))}
        </div>

        {/* ── Results ───────────────────────────────────────────────────────── */}

        {/* Empty state */}
        {isEmpty ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">🍁</div>
            <p className="text-xl font-semibold text-gray-700">Enter your details above</p>
            <p className="text-gray-500 mt-2">Your results will appear here instantly.</p>
          </div>

        ) : isError ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-700 font-medium">
            {result as string}
          </div>

        ) : isMortgage(result) ? (
          <>
            {/* Hero */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-600 text-white rounded-xl p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-blue-200 uppercase tracking-wide">Monthly Mortgage Payment</p>
                <p className="text-4xl font-black mt-2">${fmt(result.monthlyPayment)}</p>
                <p className="text-blue-200 text-sm mt-1">principal + interest</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Monthly Cost</p>
                <p className="text-4xl font-bold text-gray-900 mt-2">${fmt(result.totalMonthly)}</p>
                <p className="text-gray-400 text-sm mt-1">incl. tax &amp; heat</p>
              </div>
            </div>

            {/* Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">Mortgage Breakdown</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  { label: 'Principal Borrowed',        value: result.principal,      color: 'text-gray-900', bold: true  },
                  { label: 'CMHC Insurance Premium',    value: result.cmhcPremium,    color: 'text-amber-600',bold: false },
                  { label: 'Monthly Mortgage Payment',  value: result.monthlyPayment, color: 'text-blue-600', bold: false },
                  { label: 'Total Monthly Cost',        value: result.totalMonthly,   color: 'text-blue-700', bold: true  },
                ].map((row) => (
                  <div key={row.label} className={`flex justify-between items-center px-6 py-3.5 ${row.bold ? 'bg-gray-50' : 'hover:bg-gray-50'} transition-colors`}>
                    <span className={`text-sm ${row.bold ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>{row.label}</span>
                    <span className={`text-sm font-${row.bold ? 'bold' : 'medium'} ${row.color}`}>${fmt(row.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bar chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Monthly Cost Breakdown</h3>
              <div className="space-y-3">
                {[
                  { label: 'Mortgage Payment', value: result.monthlyPayment,                         color: 'bg-blue-500' },
                  { label: 'Property Tax',      value: result.totalMonthly - result.monthlyPayment,   color: 'bg-orange-400' },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{row.label}</span>
                      <span className="font-medium text-gray-800">${fmt(row.value)}/mo</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${row.color} rounded-full transition-all duration-500`} style={{ width: `${(row.value / result.totalMonthly) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>

        ) : isAffordability(result) ? (
          <>
            {/* Hero */}
            <div className="bg-blue-600 text-white rounded-xl p-6 text-center shadow-sm">
              <p className="text-sm font-medium text-blue-200 uppercase tracking-wide">Maximum Home Price You Can Afford</p>
              <p className="text-5xl font-black mt-2">${fmt(result.maxPrice)}</p>
              <p className="text-blue-200 text-sm mt-1">based on GDS ≤32% and TDS ≤44%</p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Max Monthly Payment</p>
                <p className="text-3xl font-bold text-gray-900">${fmt(result.maxMortgagePayment)}</p>
                <p className="text-gray-400 text-sm mt-1">mortgage only</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">GDS Ratio</p>
                <p className="text-3xl font-bold text-orange-500">{result.gdsRatio}</p>
                <p className="text-gray-400 text-sm mt-1">target ≤32%</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">TDS Ratio</p>
                <p className="text-3xl font-bold text-purple-600">{result.tdsRatio}</p>
                <p className="text-gray-400 text-sm mt-1">target ≤44%</p>
              </div>
            </div>

            <p className="text-sm text-gray-400 text-center">
              CMHC insurance not included in affordability calculation. Consult a mortgage professional for personalized advice.
            </p>
          </>

        ) : isTfsaRrsp(result) ? (
          <>
            {/* Hero — TFSA */}
            <div className="bg-blue-600 text-white rounded-xl p-6 text-center shadow-sm">
              <p className="text-sm font-medium text-blue-200 uppercase tracking-wide">TFSA After-Tax Value</p>
              <p className="text-5xl font-black mt-2">${!isNaN(result.tfsa) ? fmt(result.tfsa) : '—'}</p>
              <p className="text-blue-200 text-sm mt-1">tax-free growth</p>
            </div>

            {calcData.slug === 'tfsa-vs-rrsp' && (
              <>
                {/* RRSP card */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">RRSP After-Tax Value</p>
                  <p className="text-4xl font-bold text-green-600 mt-2">${!isNaN(result.rrsp) ? fmt(result.rrsp) : '—'}</p>
                  <p className="text-gray-400 text-sm mt-1">after withdrawal tax</p>
                </div>

                {/* Comparison breakdown */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800">TFSA vs RRSP Comparison</h2>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {[
                      { label: 'TFSA Value (tax-free)',       value: result.tfsa, color: 'text-blue-600',  bold: false },
                      { label: 'RRSP Value (after tax)',       value: result.rrsp, color: 'text-green-600', bold: false },
                      { label: 'TFSA Advantage',              value: result.tfsa - result.rrsp, color: result.tfsa >= result.rrsp ? 'text-blue-700' : 'text-green-700', bold: true },
                    ].map((row) => (
                      <div key={row.label} className={`flex justify-between items-center px-6 py-3.5 ${row.bold ? 'bg-gray-50' : 'hover:bg-gray-50'} transition-colors`}>
                        <span className={`text-sm ${row.bold ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>{row.label}</span>
                        <span className={`text-sm font-${row.bold ? 'bold' : 'medium'} ${row.color}`}>
                          {row.value < 0 ? '−' : ''}${fmt(Math.abs(row.value))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bar chart */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Value Comparison</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'TFSA', value: result.tfsa, color: 'bg-blue-500'  },
                      { label: 'RRSP', value: result.rrsp, color: 'bg-green-500' },
                    ].map((row) => {
                      const max = Math.max(result.tfsa, result.rrsp);
                      return (
                        <div key={row.label}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">{row.label}</span>
                            <span className="font-medium text-gray-800">${fmt(row.value)}</span>
                          </div>
                          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full ${row.color} rounded-full transition-all duration-500`} style={{ width: `${(row.value / max) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </>

        ) : (
          // Single numeric result (TFSA contribution growth)
          <>
            <div className="bg-blue-600 text-white rounded-xl p-6 text-center shadow-sm">
              <p className="text-sm font-medium text-blue-200 uppercase tracking-wide">Projected TFSA Value</p>
              <p className="text-5xl font-black mt-2">
                ${typeof result === 'number' && !isNaN(result) ? fmt(result) : '—'}
              </p>
              <p className="text-blue-200 text-sm mt-1">tax-free growth estimate</p>
            </div>
          </>
        )}

        {/* Disclaimer */}
        <p className="text-sm text-gray-400 text-center pb-4">
          Results update automatically as you type. Estimates only — not financial advice.
        </p>

      </div>
    </div>
  );
}
