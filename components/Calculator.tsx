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

// Result shape variants
type TfsaRrspResult = { tfsa: number; rrsp: number };
type MortgageResult = { monthlyPayment: number; totalMonthly: number; cmhcPremium: number; principal: number };
type AffordabilityResult = { maxPrice: number; maxMortgagePayment: number; gdsRatio: string; tdsRatio: string };
type CalcResult = string | number | TfsaRrspResult | MortgageResult | AffordabilityResult;

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function Calculator({ title, fields, resultUnit, calcData }: CalculatorProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const autoChangeInterval = useRef<NodeJS.Timeout | null>(null);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (autoChangeInterval.current) clearInterval(autoChangeInterval.current);
    };
  }, []);

  // ── Stepper buttons ──────────────────────────────────────────────────────

  const getStep = (fieldName: string): number => {
    switch (fieldName) {
      case 'purchasePrice':       return 5000;
      case 'grossIncomeYearly':   return 1000;
      case 'downPaymentAmount':   return 100;
      case 'propertyTaxYearly':   return 1000;
      case 'annualContribution':  return 100;
      default:                    return 1000;
    }
  };

  const startAutoChange = (fieldName: string, direction: number) => {
    const step = getStep(fieldName);

    const applyChange = (prev: Record<string, string>) => {
      const curr = Math.max(0, Number(prev[fieldName] || 0) + direction * step);
      return { ...prev, [fieldName]: curr.toString() };
    };

    setValues(applyChange);

    autoChangeInterval.current = setInterval(() => {
      setValues(applyChange);
    }, 150);
  };

  const stopAutoChange = () => {
    if (autoChangeInterval.current) {
      clearInterval(autoChangeInterval.current);
      autoChangeInterval.current = null;
    }
  };

  // ── Input handler ────────────────────────────────────────────────────────

  const handleChange = (e: ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const value = e.target.value;
    if (value === '' || !isNaN(Number(value))) {
      setValues((prev) => ({ ...prev, [fieldName]: value }));
    }
  };

  // ── Province selector ────────────────────────────────────────────────────

  const handleProvinceChange = (province: string) => {
    const suggestedRates: Record<string, number> = {
      PE: 41.37, ON: 43.41, QC: 48.7,  BC: 40.7,  AB: 38,
      MB: 40.75, SK: 40.5,  NS: 45.25, NB: 43,    NL: 43.3,
      YT: 38,    NT: 37.05, NU: 37.05,
    };
    const rate = suggestedRates[province];
    if (rate) {
      setValues((prev) => ({
        ...prev,
        currentTaxRate: rate.toString(),
        futureTaxRate: (rate * 0.85).toFixed(1),
      }));
    }
  };

  // ── Core calculation ─────────────────────────────────────────────────────

  const calculate = (): CalcResult => {
    const missingFields = fields.filter(
      (f) => !values[f.name] || isNaN(Number(values[f.name]))
    );
    if (missingFields.length > 0) return 'Please fill all fields';

    try {
      const scope: Record<string, number> = {};
      fields.forEach((field) => {
        scope[field.name] = Number(values[field.name] || 0);
      });

      if (scope.annualReturn === 0) return 'Return cannot be 0%';

      // ── Simple formula ─────────────────────────────────────────────────
      if (calcData.formula) {
        const resultValue = evaluate(calcData.formula, scope);
        if (typeof resultValue === 'number' && !isNaN(resultValue) && isFinite(resultValue)) {
          return resultValue;
        }
        return 'Invalid result';
      }

      // ── TFSA vs RRSP dual formula ──────────────────────────────────────
      if (calcData.formula_tfsa && calcData.formula_rrsp) {
        const tfsaRaw = evaluate(calcData.formula_tfsa, scope);
        const rrspRaw = evaluate(calcData.formula_rrsp, scope);
        return {
          tfsa: typeof tfsaRaw === 'number' && isFinite(tfsaRaw) ? Math.round(tfsaRaw) : NaN,
          rrsp: typeof rrspRaw === 'number' && isFinite(rrspRaw) ? Math.round(rrspRaw) : NaN,
        };
      }

      // ── Mortgage payment affordability ─────────────────────────────────
      if (calcData.slug?.toLowerCase().includes('mortgage-payment-affordability')) {
        const price              = scope.purchasePrice       || 0;
        const downPct            = (scope.downPaymentPercent || 0) / 100;
        const interestRate       = (scope.interestRate       || 0) / 100;
        const amortizationYears  = scope.amortizationYears   || 0;
        const propertyTaxYearly  = scope.propertyTaxYearly   || 0;
        const heatingCostsMonthly = scope.heatingCostsMonthly || 0;

        if (price <= 0)                              return 'Purchase price must be greater than $0';
        if (downPct < 0 || downPct > 1)             return 'Down payment percent must be between 0 and 100';
        if (interestRate <= 0)                       return 'Interest rate must be greater than 0%';
        if (amortizationYears <= 0 || amortizationYears > 35)
                                                     return 'Amortization years must be between 1 and 35';

        const downAmount    = price * downPct;
        const principal     = price - downAmount;
        if (principal <= 0) return 'Down payment too high - principal must be positive';

        let cmhcRate = 0;
        if      (downPct < 0.05) cmhcRate = 0.04;
        else if (downPct < 0.1)  cmhcRate = 0.031;
        else if (downPct < 0.15) cmhcRate = 0.0175;
        else if (downPct < 0.2)  cmhcRate = 0.01;

        const cmhcPremium    = principal * cmhcRate;
        const totalPrincipal = principal + cmhcPremium;
        const monthlyRate    = interestRate / 12;
        const periods        = amortizationYears * 12;

        let monthlyPayment = 0;
        try {
          monthlyPayment = evaluate(
            'totalPrincipal * (monthlyRate * pow(1 + monthlyRate, periods)) / (pow(1 + monthlyRate, periods) - 1)',
            { totalPrincipal, monthlyRate, periods }
          );
        } catch (err) {
          console.error('Mortgage formula error:', err);
          return 'Calculation error - check interest rate or amortization';
        }

        if (!isFinite(monthlyPayment) || isNaN(monthlyPayment)) {
          return 'Invalid mortgage calculation - check inputs';
        }

        const monthlyTax   = propertyTaxYearly / 12;
        const totalMonthly = monthlyPayment + monthlyTax + heatingCostsMonthly;

        if (!isFinite(totalMonthly)) return 'Total cost overflow - property tax or other values too high';

        return {
          monthlyPayment: Math.round(monthlyPayment),
          totalMonthly:   Math.round(totalMonthly),
          cmhcPremium:    Math.round(cmhcPremium),
          principal:      Math.round(principal),
        };
      }

      // ── Max house affordability ────────────────────────────────────────
      if (calcData.slug?.toLowerCase().includes('max-house-affordability')) {
        const incomeYearly         = scope.grossIncomeYearly   || 0;
        const debtMonthly          = scope.monthlyDebtPayments || 0;
        const downAmount           = scope.downPaymentAmount   || 0;
        const interestRatePercent  = scope.interestRate        || 0;
        const amortizationYears    = scope.amortizationYears   || 0;
        const taxYearly            = scope.propertyTaxYearly   || 0;
        const heatMonthly          = scope.heatingCostsMonthly || 0;

        if (incomeYearly        <= 0) return 'Income must be positive';
        if (interestRatePercent <= 0) return 'Interest rate must be positive';
        if (amortizationYears   <= 0) return 'Amortization years must be positive';

        const monthlyRate   = interestRatePercent / 100 / 12;
        const periods       = amortizationYears * 12;
        const monthlyIncome = incomeYearly / 12;

        const maxHousingMonthly   = monthlyIncome * 0.32;
        const maxTotalDebtMonthly = monthlyIncome * 0.44;

        const maxMortgagePayment = Math.min(
          maxHousingMonthly   - (taxYearly / 12) - heatMonthly,
          maxTotalDebtMonthly - debtMonthly
        );

        if (maxMortgagePayment <= 0) return 'Income too low for mortgage with these costs';

        const powerTerm = Math.pow(1 + monthlyRate, periods);
        const principal = maxMortgagePayment * (powerTerm - 1) / (monthlyRate * powerTerm);
        const maxPrice  = principal + downAmount;

        return {
          maxPrice:           Math.round(maxPrice),
          maxMortgagePayment: Math.round(maxMortgagePayment),
          gdsRatio:           (maxHousingMonthly   / monthlyIncome * 100).toFixed(1) + '%',
          tdsRatio:           (maxTotalDebtMonthly / monthlyIncome * 100).toFixed(1) + '%',
        };
      }

      return 'No formula defined for this calculator';
    } catch (error) {
      console.error('Calculation error:', error);
      return 'Calculation error';
    }
  };

  const result = calculate();

  // ── Helpers for rendering ────────────────────────────────────────────────

  const fmt = (n: number) => Math.round(n).toLocaleString('en-CA');

  const isReadyMessage = (s: string) =>
    s === 'Please fill all fields' ||
    s.toLowerCase().includes('error') ||
    s.toLowerCase().includes('must') ||
    s.toLowerCase().includes('too') ||
    s.toLowerCase().includes('invalid') ||
    s.toLowerCase().includes('no formula');

  // ── Render ───────────────────────────────────────────────────────────────

  // Show province selector only for non-mortgage calculators
  const showProvince =
    calcData?.slug !== 'mortgage-payment-affordability' &&
    calcData?.slug !== 'max-house-affordability';

  const dollarFields = [
    'purchasePrice', 'propertyTaxYearly', 'grossIncomeYearly',
    'downPaymentAmount', 'annualContribution', 'currentRoom',
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="space-y-6">

        {/* Province selector */}
        {showProvince && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 relative">
            <label htmlFor="province" className="flex-1 font-medium text-gray-700">
              Province / Territory (optional - auto-suggests tax rate)
            </label>
            <select
              id="province"
              className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              onChange={(e) => handleProvinceChange(e.target.value)}
            >
              <option value="">Select province</option>
              <option value="PE">Prince Edward Island</option>
              <option value="ON">Ontario</option>
              <option value="QC">Quebec</option>
              <option value="BC">British Columbia</option>
              <option value="AB">Alberta</option>
              <option value="MB">Manitoba</option>
              <option value="SK">Saskatchewan</option>
              <option value="NS">Nova Scotia</option>
              <option value="NB">New Brunswick</option>
              <option value="NL">Newfoundland and Labrador</option>
              <option value="YT">Yukon</option>
              <option value="NT">Northwest Territories</option>
              <option value="NU">Nunavut</option>
            </select>
          </div>
        )}

        {/* Fields */}
        {fields.map((field) => (
          <div key={field.name} className="flex flex-col sm:flex-row sm:items-center gap-4">
            <label htmlFor={field.name} className="flex-1 font-medium text-gray-700">
              {field.label}
              {field.unit && <span className="text-gray-500 ml-1">({field.unit})</span>}
            </label>

            {dollarFields.includes(field.name) ? (
              <div className="relative flex items-center w-full sm:w-64">
                <NumericFormat
                  id={field.name}
                  thousandSeparator
                  prefix="$"
                  decimalScale={0}
                  allowNegative={false}
                  value={values[field.name] ?? ''}
                  onValueChange={(v) =>
                    setValues((prev) => ({
                      ...prev,
                      [field.name]: v.floatValue?.toString() ?? '',
                    }))
                  }
                  className="w-full px-4 py-2 pr-16 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-right"
                  placeholder={field.placeholder}
                />
                <div className="absolute right-0 flex flex-col h-full">
                  <button
                    type="button"
                    onMouseDown={() => startAutoChange(field.name, 1)}
                    onMouseUp={stopAutoChange}
                    onMouseLeave={stopAutoChange}
                    onTouchStart={() => startAutoChange(field.name, 1)}
                    onTouchEnd={stopAutoChange}
                    className="flex-1 px-3 bg-gray-100 hover:bg-gray-200 border-l border-gray-300 text-gray-700 rounded-tr-lg focus:outline-none text-sm font-medium"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onMouseDown={() => startAutoChange(field.name, -1)}
                    onMouseUp={stopAutoChange}
                    onMouseLeave={stopAutoChange}
                    onTouchStart={() => startAutoChange(field.name, -1)}
                    onTouchEnd={stopAutoChange}
                    className="flex-1 px-3 bg-gray-100 hover:bg-gray-200 border-l border-t border-gray-300 text-gray-700 rounded-br-lg focus:outline-none text-sm font-medium"
                  >
                    -
                  </button>
                </div>
              </div>
            ) : (
              <input
                id={field.name}
                type="number"
                step={
                  field.name === 'downPaymentPercent'  ? '1'   :
                  field.name === 'interestRate'         ? '0.1' :
                  field.name === 'monthlyDebtPayments'  ? '10'  :
                  field.name === 'heatingCostsMonthly'  ? '10'  :
                  'any'
                }
                min="0"
                placeholder={field.placeholder}
                value={values[field.name] || ''}
                onChange={(e) => handleChange(e, field.name)}
                className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-right"
              />
            )}
          </div>
        ))}
      </div>

      {/* ── Results ─────────────────────────────────────────────────────────── */}
      <div className="mt-10 pt-6 border-t border-gray-200">

        {typeof result === 'string' ? (
          <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-200 shadow-inner">
            <p className="text-4xl font-extrabold text-gray-800 mb-4">
              {isReadyMessage(result) ? 'Ready when you are!' : result}
            </p>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Enter your values to see projected results.
            </p>
          </div>

        ) : isMortgage(result) ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center bg-blue-50 p-6 rounded-xl">
                <p className="text-lg font-medium text-gray-700 mb-2">Monthly Mortgage Payment</p>
                <p className="text-4xl font-bold text-blue-600">
                  ${fmt(result.monthlyPayment)}
                </p>
              </div>
              <div className="text-center bg-green-50 p-6 rounded-xl">
                <p className="text-lg font-medium text-gray-700 mb-2">Total Monthly Cost (incl. tax &amp; heat)</p>
                <p className="text-4xl font-bold text-green-600">
                  ${fmt(result.totalMonthly)}
                </p>
              </div>
            </div>
            <div className="text-center text-gray-600 mt-4 space-y-1">
              <p>Principal borrowed: ${fmt(result.principal)}</p>
              <p>CMHC premium (if applicable): ${fmt(result.cmhcPremium)}</p>
            </div>
          </div>

        ) : isAffordability(result) ? (
          <div className="space-y-6">
            <div className="text-center bg-purple-50 p-6 rounded-xl">
              <p className="text-lg font-medium text-gray-700 mb-2">Maximum Home Price You Can Afford</p>
              <p className="text-5xl font-bold text-purple-600">
                ${fmt(result.maxPrice)}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center">
                <p className="text-lg font-medium text-gray-700">Max Monthly Mortgage Payment</p>
                <p className="text-3xl font-bold text-purple-600">
                  ${fmt(result.maxMortgagePayment)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-gray-700">GDS / TDS Ratios</p>
                <p className="text-xl">GDS: {result.gdsRatio} | TDS: {result.tdsRatio}</p>
              </div>
            </div>
            <p className="text-center text-gray-600 mt-4">
              Based on GDS ≤32% and TDS ≤44%. CMHC insurance not included in affordability.
            </p>
          </div>

        ) : isTfsaRrsp(result) ? (
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="text-center bg-gradient-to-br from-blue-50 to-blue-100 p-10 rounded-2xl shadow-lg border border-blue-200 mx-auto max-w-xl transform hover:scale-105 transition-transform duration-300">
              <p className="text-2xl md:text-3xl font-bold text-blue-900 mb-4">TFSA After-Tax Value</p>
              <p className="text-5xl md:text-6xl font-black text-blue-700 tracking-tight">
                ${!isNaN(result.tfsa) ? fmt(result.tfsa) : '—'}
              </p>
              <p className="text-lg md:text-xl text-blue-600 mt-4 font-medium">Tax-free growth</p>
            </div>

            {calcData.slug === 'tfsa-vs-rrsp' && (
              <div className="text-center bg-gradient-to-br from-green-50 to-green-100 p-10 rounded-2xl shadow-lg border border-green-200 mx-auto max-w-xl transform hover:scale-105 transition-transform duration-300">
                <p className="text-2xl md:text-3xl font-bold text-green-900 mb-4">RRSP After-Tax Value</p>
                <p className="text-5xl md:text-6xl font-black text-green-700 tracking-tight">
                  ${!isNaN(result.rrsp) ? fmt(result.rrsp) : '—'}
                </p>
                <p className="text-lg md:text-xl text-green-600 mt-4 font-medium">After withdrawal tax</p>
              </div>
            )}
          </div>

        ) : (
          // Single numeric result (e.g. tfsa-contribution-growth)
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="text-center bg-gradient-to-br from-blue-50 to-blue-100 p-10 rounded-2xl shadow-lg border border-blue-200 mx-auto max-w-xl transform hover:scale-105 transition-transform duration-300">
              <p className="text-2xl md:text-3xl font-bold text-blue-900 mb-4">Projected TFSA Value</p>
              <p className="text-5xl md:text-6xl font-black text-blue-700 tracking-tight">
                ${typeof result === 'number' && !isNaN(result) ? fmt(result) : '—'}
              </p>
              <p className="text-lg md:text-xl text-blue-600 mt-4 font-medium">Tax-free growth estimate</p>
            </div>
          </div>
        )}
      </div>

      <p className="mt-8 text-sm text-gray-500 text-center">
        Results update automatically as you type. This is an estimate only.
      </p>
    </div>
  );
}