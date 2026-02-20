// components/Calculator.tsx
'use client';

import { useState, ChangeEvent } from 'react';
import { evaluate } from 'mathjs';
import { NumericFormat } from 'react-number-format';
import { useRef } from 'react';

export default function Calculator({ title, fields, formula, formula_tfsa, formula_rrsp, resultUnit, calcData }) {
  // 1. All hooks first
  const [values, setValues] = useState<Record<string, string | boolean>>({});

  // 2. ← ADD THE AUTO-REPEAT CODE HERE (right after useState)
  const autoChangeInterval = useRef<NodeJS.Timeout | null>(null);

  const startAutoChange = (fieldName, direction) => {
    // Immediate change
    const current = Number(values[fieldName] || 0);
    const step = fieldName === "purchasePrice" ? 5000 :
                 fieldName === "grossIncomeYearly" ? 1000 :
                 fieldName === "downPaymentAmount" ? 100 :
                 fieldName === "propertyTaxYearly" ? 1000 :
                 fieldName === "annualContribution" ? 100 :
                 1000;
    setValues((prev) => ({
      ...prev,
      [fieldName]: (current + direction * step).toString(),
    }));

    // Start repeating
    autoChangeInterval.current = setInterval(() => {
      setValues((prev) => {
        const curr = Number(prev[fieldName] || 0);
        return {
          ...prev,
          [fieldName]: (curr + direction * step).toString(),
        };
      });
    }, 150); // adjust speed if needed (150ms = fairly fast)
  };

  const stopAutoChange = () => {
    if (autoChangeInterval.current) {
      clearInterval(autoChangeInterval.current);
      autoChangeInterval.current = null;
    }
  };

  // 3. Any other logic / functions (e.g. calculate, handleChange)
  

const calculate = () => {
  const missingFields = fields.filter((f) => !values[f.name] || isNaN(Number(values[f.name])));
  if (missingFields.length > 0) {
    return 'Please fill all fields';
  }

  try {
    const scope: Record<string, number> = {};
    fields.forEach((field: CalculatorField) => {
      scope[field.name] = Number(values[field.name] || 0);
    });

    if (scope.annualReturn === 0) {
      return 'Return cannot be 0%';
    }

    // Single formula mode (TFSA growth)
    if (calcData.formula) {
      const resultValue = evaluate(calcData.formula, scope);
      if (typeof resultValue === 'number' && !isNaN(resultValue)) {
        return resultValue;  // ← return number, not formatted string
      }
      return 'Invalid result';
    }

// Comparator mode (TFSA vs RRSP)
if (calcData.formula_tfsa && calcData.formula_rrsp) {
  const tfsaRaw = evaluate(calcData.formula_tfsa, scope);
  const rrspRaw = evaluate(calcData.formula_rrsp, scope);

  return {
    tfsa: typeof tfsaRaw === 'number' && !isNaN(tfsaRaw) ? Math.round(tfsaRaw) : NaN,
    rrsp: typeof rrspRaw === 'number' && !isNaN(rrspRaw) ? Math.round(rrspRaw) : NaN
  };
}

// Mortgage mode
if (calcData.slug === 'mortgage-payment-affordability') {
  // Force safe numbers – default to 0 if missing/invalid
  const price = Number(scope.purchasePrice) || 0;
  const downPct = (Number(scope.downPaymentPercent) || 0) / 100;
  const interestRate = (Number(scope.interestRate) || 0) / 100;
  const amortizationYears = Number(scope.amortizationYears) || 0;
  const propertyTaxYearly = Number(scope.propertyTaxYearly) || 0;
  const heatingCostsMonthly = Number(scope.heatingCostsMonthly) || 0;

  // Early bail-out with clear message if critical inputs are invalid
  if (price <= 0) return 'Purchase price must be greater than $0';
  if (downPct < 0 || downPct > 1) return 'Down payment percent must be between 0 and 100';
  if (interestRate <= 0) return 'Interest rate must be greater than 0%';
  if (amortizationYears <= 0 || amortizationYears > 35) return 'Amortization years must be between 1 and 35';

  const downAmount = price * downPct;
  const principal = price - downAmount;

  if (principal <= 0) return 'Down payment too high – principal must be positive';

  let cmhcRate = 0;
  if (downPct < 0.05) cmhcRate = 0.04;
  else if (downPct < 0.1) cmhcRate = 0.031;
  else if (downPct < 0.15) cmhcRate = 0.0175;
  else if (downPct < 0.2) cmhcRate = 0.01;

  const cmhcPremium = principal * cmhcRate;
  const totalPrincipal = principal + cmhcPremium;

  const monthlyRate = interestRate / 12;
  const periods = amortizationYears * 12;

  let monthlyPayment = 0;
  try {
    monthlyPayment = evaluate(
      'totalPrincipal * (monthlyRate * pow(1 + monthlyRate, periods)) / (pow(1 + monthlyRate, periods) - 1)',
      { totalPrincipal, monthlyRate, periods }
    );
  } catch (err) {
    console.error('Mortgage formula error:', err);
    return 'Calculation error – check interest rate or amortization';
  }

  if (isNaN(monthlyPayment) || !isFinite(monthlyPayment)) {
    return 'Invalid mortgage calculation – check inputs';
  }

  const monthlyTax = propertyTaxYearly / 12;
  const totalMonthly = monthlyPayment + monthlyTax + heatingCostsMonthly;

  // Final NaN safety net
  if (isNaN(totalMonthly) || !isFinite(totalMonthly)) {
    return 'Total cost overflow – property tax or other values too high';
  }

 return {
  monthlyPayment: Math.round(monthlyPayment),     // raw number
  totalMonthly: Math.round(totalMonthly),
  cmhcPremium: Math.round(cmhcPremium),
  principal: Math.round(principal)
};
}

    // Max house affordability mode
    if (calcData.slug === 'max-house-affordability') {
      const incomeYearly = scope.grossIncomeYearly;
      const debtMonthly = scope.monthlyDebtPayments;
      const downAmount = scope.downPaymentAmount;
      const annualRate = scope.interestRate / 100;
      const monthlyRate = annualRate / 12;
      const periods = scope.amortizationYears * 12;
      const taxYearly = scope.propertyTaxYearly;
      const heatMonthly = scope.heatingCostsMonthly;

      if (incomeYearly <= 0) return 'Income must be positive';
      if (scope.interestRate <= 0) return 'Interest rate must be positive';
      if (scope.amortizationYears <= 0) return 'Amortization years must be positive';

      const monthlyIncome = incomeYearly / 12;
      const maxHousingMonthly = monthlyIncome * 0.32;
      const maxTotalDebtMonthly = monthlyIncome * 0.44;

      const maxMortgagePayment = Math.min(
        maxHousingMonthly - (taxYearly / 12) - heatMonthly,
        maxTotalDebtMonthly - debtMonthly
      );

      if (maxMortgagePayment <= 0) return 'Income too low for mortgage with these costs';

      const powerTerm = Math.pow(1 + monthlyRate, periods);
      const principal = maxMortgagePayment * (powerTerm - 1) / (monthlyRate * powerTerm);
      const maxPrice = principal + downAmount;

      return {
        maxPrice: maxPrice.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
        maxMortgagePayment: maxMortgagePayment.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
        gdsRatio: (maxHousingMonthly / monthlyIncome * 100).toFixed(1) + '%',
        tdsRatio: (maxTotalDebtMonthly / monthlyIncome * 100).toFixed(1) + '%'
      };
    }
    return 'No formula defined for this calculator';
  } catch (error) {
    console.error('Calculation error:', error);
    return 'Calculation error';
  }
};

const handleChange = (e: ChangeEvent<HTMLInputElement>, fieldName: string) => {
  setValues((prev) => ({
    ...prev,
    [fieldName]: e.target.value,
  }));
};
const result = calculate();

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
    {/* Form inputs */}
    <div className="space-y-6">
      {/* Province dropdown – hidden on mortgage & affordability */}
      {calcData?.slug !== 'mortgage-payment-affordability' &&
       calcData?.slug !== 'max-house-affordability' && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 relative">
          <label htmlFor="province" className="flex-1 font-medium text-gray-700">
            Province / Territory (optional – auto-suggests tax rate)
          </label>
          <select
            id="province"
            className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            onChange={(e) => {
              const province = e.target.value;
              const suggestedRates = {
                'PE': 41.37,
                'ON': 43.41,
                'QC': 48.7,
                'BC': 40.7,
                'AB': 38,
                'MB': 40.75,
                'SK': 40.5,
                'NS': 45.25,
                'NB': 43,
                'NL': 43.3,
                'YT': 38,
                'NT': 37.05,
                'NU': 37.05,
              };
              const suggestedRate = suggestedRates[province] || '';
              if (suggestedRate) {
                setValues((prev) => ({
                  ...prev,
                  currentTaxRate: suggestedRate.toString(),
                  futureTaxRate: (suggestedRate * 0.85).toFixed(1).toString(),
                  _autoFilled: true,
                }));

                setTimeout(() => {
                  setValues((prev) => ({ ...prev, _autoFilled: false }));
                }, 4000);
              }
            }}
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

          {values._autoFilled && values.currentTaxRate && (
            <div className="relative inline-block group">
              <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                Auto-filled ({values.currentTaxRate}% now → ~{values.futureTaxRate}% later)
              </span>

              <span className="absolute left-0 top-full mt-2 hidden group-hover:block w-80 p-3 bg-gray-800 text-white text-sm rounded-lg shadow-lg z-10">
                <strong>Combined marginal rate</strong> = federal + provincial tax rate on your next dollar earned.  
                Used for RRSP deduction/refund and future withdrawal tax.  
                Rates are approximate mid-income estimates for 2026 — actual rate depends on your total income and bracket. Verify with CRA.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Dynamic fields */}
      {fields.map((field) => (
        <div key={field.name} className="flex flex-col sm:flex-row sm:items-center gap-4">
          <label htmlFor={field.name} className="flex-1 font-medium text-gray-700">
            {field.label}
            {field.unit && <span className="text-gray-500 ml-1">({field.unit})</span>}
          </label>

          {["purchasePrice", "propertyTaxYearly", "grossIncomeYearly", "downPaymentAmount", "annualContribution", "currentRoom"].includes(field.name) ? (
            <div className="relative flex items-center w-full sm:w-64">
              <NumericFormat
                id={field.name}
                thousandSeparator={true}
                prefix="$"
                decimalScale={0}
                allowNegative={false}
                value={values[field.name] || ''}
                onValueChange={(values) => {
                  setValues((prev) => ({
                    ...prev,
                    [field.name]: values.floatValue || '',
                  }));
                }}
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
                field.name === "downPaymentPercent" ? "1" :
                field.name === "interestRate" ? "0.1" :
                field.name === "monthlyDebtPayments" ? "10" :
                field.name === "heatingCostsMonthly" ? "10" :
                "any"
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

    {/* Result display – centered and prominent */}
    <div className="mt-8">
      {typeof result === 'string' ? (
        <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-200 shadow-inner">
          <p className="text-4xl font-extrabold text-gray-800 mb-4">
            {result.includes('Fill') || result.includes('error') 
              ? 'Ready when you are!' 
              : result}
          </p>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Enter your values to see projected results.
          </p>
        </div>
      ) : calcData.slug === 'mortgage-payment-affordability' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center bg-blue-50 p-6 rounded-xl">
              <p className="text-lg font-medium text-gray-700 mb-2">Monthly Mortgage Payment</p>
              <p className="text-4xl font-bold text-blue-600">${result.monthlyPayment || '—'}</p>
            </div>

            <div className="text-center bg-green-50 p-6 rounded-xl">
              <p className="text-lg font-medium text-gray-700 mb-2">Total Monthly Cost (incl. tax & heat)</p>
              <p className="text-4xl font-bold text-green-600">${result.totalMonthly || '—'}</p>
            </div>
          </div>

          <div className="text-center text-gray-600 mt-4 space-y-1">
            <p>Principal borrowed: ${result.principal || '—'}</p>
            <p>CMHC premium (if applicable): ${result.cmhcPremium || '—'}</p>
          </div>
        </div>
      ) : calcData.slug === 'max-house-affordability' ? (
        <div className="space-y-6">
          <div className="text-center bg-purple-50 p-6 rounded-xl">
            <p className="text-lg font-medium text-gray-700 mb-2">Maximum Home Price You Can Afford</p>
            <p className="text-5xl font-bold text-purple-600">${result.maxPrice || '—'}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center">
              <p className="text-lg font-medium text-gray-700">Max Monthly Mortgage Payment</p>
              <p className="text-3xl font-bold text-purple-600">${result.maxMortgagePayment || '—'}</p>
            </div>

            <div className="text-center">
              <p className="text-lg font-medium text-gray-700">GDS / TDS Ratios</p>
              <p className="text-xl">GDS: {result.gdsRatio || '—'} | TDS: {result.tdsRatio || '—'}</p>
            </div>
          </div>

          <p className="text-center text-gray-600 mt-4">
            Based on GDS ≤32% and TDS ≤44%. CMHC insurance not included in affordability.
          </p>
        </div>
      
      ) : (
        <div className="max-w-3xl mx-auto space-y-8">
          {/* TFSA card */}
          <div className="text-center bg-gradient-to-br from-blue-50 to-blue-100 p-10 rounded-2xl shadow-lg border border-blue-200 mx-auto max-w-xl transform hover:scale-105 transition-transform duration-300">
            <p className="text-2xl md:text-3xl font-bold text-blue-900 mb-4">
              {calcData.slug === 'tfsa-contribution-growth' 
                ? 'Projected TFSA Value' 
                : 'TFSA After-Tax Value'}
            </p>
            <p className="text-5xl md:text-6xl font-black text-blue-700 tracking-tight">
              ${!isNaN(result) && result !== null && result !== undefined 
                ? Math.round(Number(result)).toLocaleString('en-CA') 
                : (!isNaN(result?.tfsa) && result?.tfsa !== undefined 
                  ? Math.round(Number(result.tfsa)).toLocaleString('en-CA') 
                  : '—')}
            </p>
            <p className="text-lg md:text-xl text-blue-600 mt-4 font-medium">
              {calcData.slug === 'tfsa-contribution-growth' 
                ? 'Tax-free growth estimate' 
                : 'Tax-free growth'}
            </p>
          </div>

          {/* RRSP card – only on comparator */}
          {calcData.slug === 'tfsa-vs-rrsp' && (
            <div className="text-center bg-gradient-to-br from-green-50 to-green-100 p-10 rounded-2xl shadow-lg border border-green-200 mx-auto max-w-xl transform hover:scale-105 transition-transform duration-300">
              <p className="text-2xl md:text-3xl font-bold text-green-900 mb-4">RRSP After-Tax Value</p>
              <p className="text-5xl md:text-6xl font-black text-green-700 tracking-tight">
                ${!isNaN(result?.rrsp) && result?.rrsp !== undefined 
                  ? Math.round(Number(result.rrsp)).toLocaleString('en-CA') 
                  : '—'}
              </p>
              <p className="text-lg md:text-xl text-green-600 mt-4 font-medium">After withdrawal tax</p>
            </div>
          )}
        </div>
      )}
   {/* Share button – appears only when there's a result */}
    {typeof result !== 'string' && result && (
      <div className="mt-8 text-center">
        <button
          onClick={() => {
            const url = window.location.href;
            let summary = '';

            if (calcData.slug === 'mortgage-payment-affordability') {
              summary = `Mortgage result:\nMonthly Payment: $${result.monthlyPayment}\nTotal Monthly Cost: $${result.totalMonthly}`;
            } else if (calcData.slug === 'max-house-affordability') {
              summary = `Max House Affordability:\nMax Price: $${result.maxPrice}\nMax Monthly Payment: $${result.maxMortgagePayment}`;
            } else if (calcData.slug === 'tfsa-contribution-growth') {
              summary = `Projected TFSA Value: $${result.toLocaleString('en-CA')}`;
            } else if (calcData.slug === 'tfsa-vs-rrsp') {
              summary = `TFSA After-Tax Value: $${result.tfsa || '—'}\nRRSP After-Tax Value: $${result.rrsp || '—'}`;
            }

            const text = `${summary}\n\nCheck your own numbers here: ${url}`;

            navigator.clipboard.writeText(text)
              .then(() => alert('Result copied to clipboard! Paste anywhere to share.'))
              .catch(err => console.error('Failed to copy:', err));
          }}
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367 2.684m0-2.684a3 3 0 10-5.367 2.684" />
          </svg>
          Share Result
        </button>
      </div>
)} 
    </div>
    {/* RRSP Deadline Countdown */}
<div className="mt-6 text-center text-sm text-gray-600">
  <p>
    <strong>2025 RRSP contribution deadline</strong> (to deduct on 2025 taxes):{' '}
    <span className="font-medium text-red-600">
      March 2, 2026
    </span>
  </p>
  <p className="mt-1">
    Days remaining: <span className="font-bold">
      {Math.ceil((new Date('2026-03-03').getTime() - Date.now()) / (1000 * 60 * 60 * 24))}
    </span>
  </p>
</div>

    <p className="mt-8 text-sm text-gray-500 text-center">
      Results update automatically as you type. This is an estimate only.
    </p>
  </div>
  );
}