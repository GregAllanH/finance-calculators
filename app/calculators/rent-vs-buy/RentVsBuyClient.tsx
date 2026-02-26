"use client";

// app/calculators/rent-vs-buy/RentVsBuyClient.tsx

import PrintButton from "@/components/PrintButton";
import { useState, useMemo } from "react";
import { NumericFormat } from "react-number-format";

// ─── Down Payment Assistance Programs ────────────────────────────────────────

const DOWN_PAYMENT_PROGRAMS: Record<string, {
  name: string;
  programs: Array<{ title: string; amount: string; type: "grant" | "loan" | "shared"; details: string; url?: string }>;
}> = {
  BC: {
    name: "British Columbia",
    programs: [
      {
        title: "BC Home Owner Mortgage and Equity Partnership (ended)",
        amount: "Up to $37,500",
        type: "loan",
        details: "This program has ended but check BC Housing for current offerings.",
        url: "https://www.bchousing.org",
      },
      {
        title: "City of Vancouver — Moderate Income Rental Program",
        amount: "Varies",
        type: "loan",
        details: "Municipality-level assistance for eligible buyers in Vancouver.",
      },
    ],
  },
  ON: {
    name: "Ontario",
    programs: [
      {
        title: "City of Toronto — Home Ownership Assistance Program (HOAP)",
        amount: "Up to $75,000",
        type: "loan",
        details: "Interest-free loan for eligible first-time buyers in Toronto. Repayable on sale or refinance.",
        url: "https://www.toronto.ca/community-people/housing-shelter/rental-housing-support/affordable-home-ownership",
      },
      {
        title: "Attainable Homes (various Ontario municipalities)",
        amount: "Varies",
        type: "shared",
        details: "Shared equity programs available in some Ontario cities.",
      },
    ],
  },
  AB: {
    name: "Alberta",
    programs: [
      {
        title: "Attainable Homes Calgary",
        amount: "Up to 5% of purchase price",
        type: "loan",
        details: "Interest-free second mortgage for eligible buyers in Calgary. Repaid on sale.",
        url: "https://attainyourhome.com",
      },
      {
        title: "Edmonton — Cornerstones",
        amount: "Varies",
        type: "grant",
        details: "City of Edmonton affordable homeownership program for eligible low-to-moderate income buyers.",
      },
    ],
  },
  NS: {
    name: "Nova Scotia",
    programs: [
      {
        title: "Nova Scotia Down Payment Assistance Program",
        amount: "Up to 5% of purchase price",
        type: "loan",
        details: "Interest-free forgivable loan for first-time buyers with household income under $145,000.",
        url: "https://www.novascotia.ca/just/regulations/regs/housedownpayment.htm",
      },
    ],
  },
  PE: {
    name: "Prince Edward Island",
    programs: [
      {
        title: "PEI Down Payment Assistance Program",
        amount: "Up to $17,500",
        type: "loan",
        details: "Interest-free loan for first-time buyers on PEI. Repayable over 10 years.",
        url: "https://www.princeedwardisland.ca/en/information/social-development-and-housing/down-payment-assistance-program",
      },
    ],
  },
  MB: {
    name: "Manitoba",
    programs: [
      {
        title: "Manitoba Housing — Homeownership Program",
        amount: "Varies",
        type: "loan",
        details: "Down payment assistance for eligible buyers through Manitoba Housing.",
        url: "https://www.gov.mb.ca/housing",
      },
    ],
  },
  SK: {
    name: "Saskatchewan",
    programs: [
      {
        title: "Saskatchewan Home Ownership Program",
        amount: "Varies",
        type: "loan",
        details: "Down payment assistance through Saskatchewan Housing Corporation.",
        url: "https://www.saskatchewan.ca/residents/housing",
      },
    ],
  },
  NB: { name: "New Brunswick",           programs: [] },
  NL: { name: "Newfoundland & Labrador", programs: [] },
  NT: { name: "Northwest Territories",   programs: [] },
  NU: { name: "Nunavut",                 programs: [] },
  YT: { name: "Yukon",                   programs: [] },
  QC: {
    name: "Quebec",
    programs: [
      {
        title: "Accès Condos (Montreal)",
        amount: "Up to 10% of purchase price",
        type: "shared",
        details: "Shared equity program for new condos in Montreal for eligible first-time buyers.",
        url: "https://www.accescondos.org",
      },
    ],
  },
};

// Federal program — applies everywhere
const FEDERAL_PROGRAMS = [
  {
    title: "First Home Savings Account (FHSA)",
    amount: "Up to $40,000 tax-free",
    type: "grant" as const,
    details: "Save up to $8,000/year (lifetime max $40,000) in a tax-deductible, tax-free account for your first home purchase.",
  },
  {
    title: "RRSP Home Buyers' Plan (HBP)",
    amount: "Up to $60,000 per person",
    type: "loan" as const,
    details: "Withdraw up to $60,000 from your RRSP tax-free for a first home purchase. Must be repaid over 15 years.",
  },
  {
    title: "First-Time Home Buyer Incentive (ended March 2024)",
    amount: "5–10% of purchase price",
    type: "shared" as const,
    details: "This federal shared-equity program ended in March 2024. Existing participants are unaffected.",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt    = (n: number) => Math.round(n).toLocaleString("en-CA");
const fmtDec = (n: number) => n.toLocaleString("en-CA", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// ─── Types ────────────────────────────────────────────────────────────────────

interface YearData {
  year:           number;
  // Buy
  buyEquity:      number;
  buyCumCost:     number;
  buyNetWorth:    number;
  // Rent
  rentCumCost:    number;
  rentInvestment: number; // down payment + monthly savings invested
  rentNetWorth:   number;
}

interface RVBResult {
  // Monthly costs
  monthlyMortgage:    number;
  monthlyBuyCost:     number;  // mortgage + tax + maintenance + insurance
  monthlyRentCost:    number;  // rent + renter's insurance
  monthlyCostDiff:    number;  // buy - rent (positive = buying costs more)
  // Stress test
  stressTestRate:     number;
  stressTestPayment:  number;
  // Break-even
  breakevenYear:      number | null;
  // 5 / 10 year
  buyNetWorth5:       number;
  rentNetWorth5:      number;
  buyNetWorth10:      number;
  rentNetWorth10:     number;
  // Year-by-year
  yearlyData:         YearData[];
  // Equity at 10 years
  equityAt10:         number;
  opportunityCost10:  number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RentVsBuyClient() {
  const [province,        setProvince]        = useState("ON");
  const [homePrice,       setHomePrice]       = useState<number | null>(null);
  const [downPayment,     setDownPayment]     = useState<number | null>(null);
  const [mortgageRate,    setMortgageRate]    = useState<number | null>(5);
  const [amortYears,      setAmortYears]      = useState<number | null>(25);
  const [propertyTax,     setPropertyTax]     = useState<number | null>(null);
  const [maintenance,     setMaintenance]     = useState<number | null>(null);
  const [homeInsurance,   setHomeInsurance]   = useState<number | null>(null);
  const [monthlyRent,     setMonthlyRent]     = useState<number | null>(null);
  const [rentIncrease,    setRentIncrease]    = useState<number | null>(2);
  const [homeAppreciation,setHomeAppreciation]= useState<number | null>(3);
  const [investReturn,    setInvestReturn]    = useState<number | null>(6);
  const [showPrograms,    setShowPrograms]    = useState(false);

  const result = useMemo<RVBResult | null>(() => {
    if (!homePrice || !downPayment || !mortgageRate || !amortYears || !monthlyRent) return null;
    if (homePrice <= 0 || downPayment < 0 || mortgageRate <= 0 || amortYears <= 0) return null;

    const principal    = homePrice - downPayment;
    const r            = mortgageRate / 100 / 12;
    const n            = amortYears * 12;
    const monthlyMortgage = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

    // Monthly buy costs
    const monthlyTax         = (propertyTax   ?? homePrice * 0.01) / 12;
    const monthlyMaint       = (maintenance   ?? homePrice * 0.01) / 12;
    const monthlyHomeIns     = (homeInsurance ?? 150);
    const monthlyBuyCost     = monthlyMortgage + monthlyTax + monthlyMaint + monthlyHomeIns;

    // Monthly rent costs
    const monthlyRentIns     = 25; // renter's insurance approx
    const monthlyRentCost    = monthlyRent + monthlyRentIns;

    const monthlyCostDiff    = monthlyBuyCost - monthlyRentCost;

    // Stress test
    const stressTestRate     = mortgageRate + 2;
    const rStress            = stressTestRate / 100 / 12;
    const stressTestPayment  = principal * (rStress * Math.pow(1 + rStress, n)) / (Math.pow(1 + rStress, n) - 1);

    // Year-by-year simulation (25 years max)
    const appRate   = (homeAppreciation ?? 3) / 100;
    const rentRate  = (rentIncrease     ?? 2) / 100;
    const invRate   = (investReturn     ?? 6) / 100;
    const years     = Math.min(amortYears, 25);

    let balance       = principal;
    let homeValue     = homePrice;
    let rentAmount    = monthlyRent;
    let investBalance = downPayment; // down payment invested (rent scenario)
    let buyCumCost    = downPayment; // includes down payment
    let rentCumCost   = 0;
    let breakevenYear: number | null = null;

    const yearlyData: YearData[] = [];

    for (let y = 1; y <= years; y++) {
      // Buy side — 12 months of mortgage payments, equity building
      for (let m = 0; m < 12; m++) {
        const interest = balance * r;
        const principalPaid = monthlyMortgage - interest;
        balance = Math.max(0, balance - principalPaid);
      }
      homeValue   *= (1 + appRate);
      const equity = homeValue - balance;
      buyCumCost  += monthlyBuyCost * 12;
      const buyNetWorth = equity - (buyCumCost - downPayment - monthlyMortgage * 12 * y);

      // Rent side — invest the down payment + any monthly savings
      const monthlySavings = Math.max(0, monthlyCostDiff); // if buying costs more, renter saves difference
      investBalance = investBalance * (1 + invRate) + monthlySavings * 12;
      rentCumCost  += rentAmount * 12 + monthlyRentIns * 12;
      rentAmount   *= (1 + rentRate);
      const rentNetWorth = investBalance;

      yearlyData.push({
        year:           y,
        buyEquity:      Math.round(equity),
        buyCumCost:     Math.round(buyCumCost),
        buyNetWorth:    Math.round(buyNetWorth),
        rentCumCost:    Math.round(rentCumCost),
        rentInvestment: Math.round(investBalance),
        rentNetWorth:   Math.round(rentNetWorth),
      });

      if (breakevenYear === null && equity > rentNetWorth) {
        breakevenYear = y;
      }
    }

    const y5  = yearlyData[4]  ?? yearlyData[yearlyData.length - 1];
    const y10 = yearlyData[9]  ?? yearlyData[yearlyData.length - 1];

    return {
      monthlyMortgage,
      monthlyBuyCost,
      monthlyRentCost,
      monthlyCostDiff,
      stressTestRate,
      stressTestPayment,
      breakevenYear,
      buyNetWorth5:      y5.buyEquity,
      rentNetWorth5:     y5.rentNetWorth,
      buyNetWorth10:     y10.buyEquity,
      rentNetWorth10:    y10.rentNetWorth,
      yearlyData,
      equityAt10:        y10.buyEquity,
      opportunityCost10: y10.rentNetWorth,
    };
  }, [homePrice, downPayment, mortgageRate, amortYears, propertyTax, maintenance,
      homeInsurance, monthlyRent, rentIncrease, homeAppreciation, investReturn]);

  const provinceList = Object.entries(DOWN_PAYMENT_PROGRAMS).sort((a, b) =>
    a[1].name.localeCompare(b[1].name)
  );

  const provPrograms = DOWN_PAYMENT_PROGRAMS[province]?.programs ?? [];
  const typeColors = {
    grant:  { bg: "bg-green-100",  text: "text-green-700",  label: "Grant"        },
    loan:   { bg: "bg-blue-100",   text: "text-blue-700",   label: "Interest-Free Loan" },
    shared: { bg: "bg-purple-100", text: "text-purple-700", label: "Shared Equity" },
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-gray-900">Rent vs Buy Calculator</h1>
          <p className="text-gray-500 mt-1">
            Compare the true cost of renting vs buying in Canada — including equity, opportunity cost, and break-even year.
          </p>
        </div>

        {/* Down payment programs banner */}
        <button
          type="button"
          onClick={() => setShowPrograms(!showPrograms)}
          className="w-full bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-center justify-between text-left hover:bg-blue-100 transition-colors"
        >
          <div>
            <p className="text-sm font-semibold text-blue-800">🏦 Down Payment Assistance Programs</p>
            <p className="text-xs text-blue-600 mt-0.5">Federal + provincial grants and interest-free loans for first-time buyers</p>
          </div>
          <span className="text-blue-500 text-lg">{showPrograms ? "▲" : "▼"}</span>
        </button>

        {showPrograms && (
          <div className="print:hidden bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">🇨🇦 Federal Programs</h3>
              <div className="space-y-3">
                {FEDERAL_PROGRAMS.map((p) => {
                  const c = typeColors[p.type];
                  return (
                    <div key={p.title} className="border border-gray-100 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold text-gray-800">{p.title}</p>
                        <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
                          {c.label}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-blue-600 mb-1">{p.amount}</p>
                      <p className="text-xs text-gray-500">{p.details}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Provincial Programs</h3>
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="text-sm px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 bg-white"
                >
                  {provinceList.map(([code, data]) => (
                    <option key={code} value={code}>{data.name}</option>
                  ))}
                </select>
              </div>
              {provPrograms.length > 0 ? (
                <div className="space-y-3">
                  {provPrograms.map((p) => {
                    const c = typeColors[p.type];
                    return (
                      <div key={p.title} className="border border-gray-100 rounded-lg p-4">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-semibold text-gray-800">{p.title}</p>
                          <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
                            {c.label}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-blue-600 mb-1">{p.amount}</p>
                        <p className="text-xs text-gray-500">{p.details}</p>
                        {p.url && (
                          <a href={p.url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline mt-1 inline-block">
                            Learn more →
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">
                  No province-specific programs currently listed for {DOWN_PAYMENT_PROGRAMS[province]?.name}. Check your municipal government website for local programs.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Inputs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-800">Buying Details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Province</label>
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 bg-white text-gray-900"
            >
              {provinceList.map(([code, data]) => (
                <option key={code} value={code}>{data.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Home Purchase Price</label>
            <NumericFormat thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$600,000"
              onValueChange={(v) => setHomePrice(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Down Payment</label>
            <NumericFormat thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$120,000"
              onValueChange={(v) => setDownPayment(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
            />
            {homePrice && downPayment && (
              <p className="text-xs text-gray-400 mt-1">
                {((downPayment / homePrice) * 100).toFixed(1)}% down
                {downPayment / homePrice < 0.2 ? " — CMHC insurance required" : " — no CMHC required"}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mortgage Interest Rate (%)</label>
            <input type="number" min="0.5" max="20" step="0.1" defaultValue={5}
              onChange={(e) => setMortgageRate(Number(e.target.value) || null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amortization Period (years)</label>
            <input type="number" min="5" max="30" step="1" defaultValue={25}
              onChange={(e) => setAmortYears(Number(e.target.value) || null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Annual Property Tax</label>
              <NumericFormat thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
                placeholder="$6,000"
                onValueChange={(v) => setPropertyTax(v.floatValue ?? null)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Annual Maintenance</label>
              <NumericFormat thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
                placeholder="$6,000"
                onValueChange={(v) => setMaintenance(v.floatValue ?? null)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Insurance</label>
              <NumericFormat thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
                placeholder="$150"
                onValueChange={(v) => setHomeInsurance(v.floatValue ?? null)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right text-sm"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-800">Renting Details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Rent</label>
            <NumericFormat thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$2,500"
              onValueChange={(v) => setMonthlyRent(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Annual Rent Increase (%)</label>
              <input type="number" min="0" max="10" step="0.5" defaultValue={2}
                onChange={(e) => setRentIncrease(Number(e.target.value) || null)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Home Appreciation (%/yr)</label>
              <input type="number" min="0" max="15" step="0.5" defaultValue={3}
                onChange={(e) => setHomeAppreciation(Number(e.target.value) || null)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Investment Return (%/yr)</label>
              <input type="number" min="0" max="20" step="0.5" defaultValue={6}
                onChange={(e) => setInvestReturn(Number(e.target.value) || null)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right"
              />
              <p className="text-xs text-gray-400 mt-1">Return on down payment if invested instead</p>
            </div>
          </div>
        </div>

        {/* Results */}
        {result === null ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">🏠</div>
            <p className="text-xl font-semibold text-gray-700">Enter your details above</p>
            <p className="text-gray-500 mt-2">Your rent vs buy comparison will appear here instantly.</p>
          </div>
        ) : (
          <>
            {/* Monthly cost hero */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-600 text-white rounded-xl p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-blue-200 uppercase tracking-wide">Monthly Cost to Buy</p>
                <p className="text-4xl font-black mt-2">${fmt(result.monthlyBuyCost)}</p>
                <p className="text-blue-200 text-sm mt-1">mortgage + tax + maintenance + insurance</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Monthly Cost to Rent</p>
                <p className="text-4xl font-bold text-gray-900 mt-2">${fmt(result.monthlyRentCost)}</p>
                <p className="text-gray-400 text-sm mt-1">rent + renter's insurance</p>
              </div>
            </div>
            {/* Print button */}
            <div className="print:hidden flex justify-end">
              <PrintButton label="Print Report" />
            </div>

            {/* Monthly diff callout */}
            <div className={`rounded-xl p-5 border ${result.monthlyCostDiff > 0 ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}`}>
              <p className="text-sm font-semibold text-gray-800">
                {result.monthlyCostDiff > 0
                  ? `⚠️ Buying costs $${fmt(result.monthlyCostDiff)} more per month than renting`
                  : `✅ Buying costs $${fmt(Math.abs(result.monthlyCostDiff))} less per month than renting`}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                That's ${fmt(Math.abs(result.monthlyCostDiff) * 12)}/year.
                {result.monthlyCostDiff > 0
                  ? " However, part of your mortgage payment builds equity."
                  : " Buying provides better monthly cash flow plus equity growth."}
              </p>
            </div>

            {/* Stress test */}
            <div className="bg-white border border-orange-200 rounded-xl p-5 shadow-sm">
              <p className="text-sm font-semibold text-orange-700 mb-1">
                🧪 Mortgage Stress Test — Can you qualify?
              </p>
              <p className="text-sm text-gray-600">
                Canadian lenders require you to qualify at <strong>{result.stressTestRate.toFixed(1)}%</strong> (your rate + 2%).
                At the stress test rate, your monthly payment would be{" "}
                <strong className="text-orange-600">${fmt(result.stressTestPayment)}</strong>.
              </p>
            </div>

            {/* Break-even */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Break-Even Year</p>
                {result.breakevenYear ? (
                  <>
                    <p className="text-4xl font-bold text-blue-600">Year {result.breakevenYear}</p>
                    <p className="text-gray-500 text-sm mt-2">
                      After year {result.breakevenYear}, buying builds more net worth than renting + investing.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-gray-400">No break-even</p>
                    <p className="text-gray-500 text-sm mt-2">
                      Within {amortYears} years, renting + investing outperforms buying under these assumptions.
                    </p>
                  </>
                )}
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Opportunity Cost at 10 Years</p>
                <p className="text-4xl font-bold text-purple-600">${fmt(result.opportunityCost10)}</p>
                <p className="text-gray-500 text-sm mt-2">
                  What your down payment + savings would be worth if invested instead of buying.
                </p>
              </div>
            </div>

            {/* 5 and 10 year net worth */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">Net Worth Comparison</h2>
                <p className="text-sm text-gray-500 mt-0.5">Home equity (buy) vs invested portfolio (rent)</p>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  { label: "After 5 Years — Buy (equity)",    value: result.buyNetWorth5,   color: "text-blue-600"  },
                  { label: "After 5 Years — Rent (invested)", value: result.rentNetWorth5,  color: "text-gray-600"  },
                  { label: "After 10 Years — Buy (equity)",   value: result.buyNetWorth10,  color: "text-blue-700", bold: true },
                  { label: "After 10 Years — Rent (invested)",value: result.rentNetWorth10, color: "text-gray-700", bold: true },
                ].map((row) => (
                  <div key={row.label} className={`flex justify-between items-center px-6 py-3.5 ${row.bold ? "bg-gray-50" : "hover:bg-gray-50"}`}>
                    <span className={`text-sm ${row.bold ? "font-semibold text-gray-800" : "text-gray-600"}`}>{row.label}</span>
                    <span className={`text-sm font-${row.bold ? "bold" : "medium"} ${row.color}`}>${fmt(row.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Equity buildup bar chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Equity vs Investment Growth Over Time
              </h3>
              <div className="space-y-2">
                {result.yearlyData.filter((_, i) => [0,2,4,7,9,14,19,24].includes(i)).map((row) => {
                  const max = Math.max(
                    ...result.yearlyData.map(r => Math.max(r.buyEquity, r.rentNetWorth))
                  );
                  return (
                    <div key={row.year} className="space-y-1">
                      <p className="text-xs text-gray-500 font-medium">Year {row.year}</p>
                      <div className="flex gap-2 items-center">
                        <span className="text-xs text-blue-600 w-8">Buy</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${(row.buyEquity / max) * 100}%` }} />
                        </div>
                        <span className="text-xs text-gray-600 w-20 text-right">${fmt(row.buyEquity)}</span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="text-xs text-purple-500 w-8">Rent</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-400 rounded-full transition-all duration-500"
                            style={{ width: `${(row.rentNetWorth / max) * 100}%` }} />
                        </div>
                        <span className="text-xs text-gray-600 w-20 text-right">${fmt(row.rentNetWorth)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-6 mt-4 text-xs text-gray-400">
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-blue-500 rounded inline-block"/>Home Equity</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-purple-400 rounded inline-block"/>Invested Portfolio</span>
              </div>
            </div>
          </>
        )}

        {/* SEO / FAQ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 prose prose-gray max-w-none">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Rent vs Buy in Canada — What the Math Says</h2>
          <p className="text-gray-600">
            The rent vs buy decision is one of the most significant financial choices Canadians make. The right answer depends on your local market, time horizon, down payment size, and what you'd do with the money if you didn't buy.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">The Hidden Costs of Buying</h3>
          <p className="text-gray-600">
            Beyond your mortgage payment, buying a home involves <strong>property taxes</strong> (typically 0.5–1.5% of home value annually), <strong>maintenance</strong> (budget 1% of home value per year), <strong>home insurance</strong>, land transfer tax, legal fees, and potential condo fees. These costs add up and are often underestimated by first-time buyers.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">The Opportunity Cost of Your Down Payment</h3>
          <p className="text-gray-600">
            A $150,000 down payment invested in a diversified portfolio returning 6% annually would be worth over $268,000 after 10 years. This opportunity cost is real — and renters who invest their savings can build significant wealth without owning property.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">The Mortgage Stress Test</h3>
          <p className="text-gray-600">
            Since 2018, all Canadian mortgage applicants must qualify at their contract rate plus 2% (or 5.25%, whichever is higher). This stress test ensures buyers can still afford payments if rates rise — but it also reduces the maximum mortgage you qualify for.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">First-Time Buyer Programs</h3>
          <p className="text-gray-600">
            Canadian first-time buyers have access to several programs to help with the down payment: the <strong>FHSA</strong> (save up to $40,000 tax-free), the <strong>RRSP Home Buyers' Plan</strong> (withdraw up to $60,000 tax-free), and various provincial and municipal programs offering grants and interest-free loans.
          </p>

          <p className="text-sm text-gray-400 mt-6">
            This calculator provides estimates based on your inputs and assumed rates of return and appreciation. Real estate markets vary significantly by region. Program details are subject to change — verify current terms with the relevant program provider. Not financial advice.
          </p>
        </div>

      </div>
    </div>
  );
}
