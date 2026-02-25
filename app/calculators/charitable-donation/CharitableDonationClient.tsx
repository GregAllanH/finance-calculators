"use client";

// app/calculators/charitable-donation/CharitableDonationClient.tsx

import { useState, useMemo } from "react";
import { NumericFormat } from "react-number-format";

// ─── Provincial Tax Credit Rates ─────────────────────────────────────────────
// Canada: first $200 federal = 15%, above $200 federal = 29% (33% if income > $246,752)
// Provincial rates vary — first $200 / above $200

const PROVINCES: Record<string, {
  name: string;
  below200: number;  // provincial rate on first $200
  above200: number;  // provincial rate on donations above $200
  surtax?: number;   // Ontario surtax adjustment (approx)
}> = {
  AB: { name: "Alberta",                  below200: 0.10,   above200: 0.21   },
  BC: { name: "British Columbia",         below200: 0.0506, above200: 0.1680 },
  MB: { name: "Manitoba",                 below200: 0.108,  above200: 0.174  },
  NB: { name: "New Brunswick",            below200: 0.094,  above200: 0.195  },
  NL: { name: "Newfoundland & Labrador",  below200: 0.087,  above200: 0.218  },
  NS: { name: "Nova Scotia",              below200: 0.0879, above200: 0.210  },
  NT: { name: "Northwest Territories",    below200: 0.059,  above200: 0.1405 },
  NU: { name: "Nunavut",                  below200: 0.04,   above200: 0.1195 },
  ON: { name: "Ontario",                  below200: 0.0505, above200: 0.1316 },
  PE: { name: "Prince Edward Island",     below200: 0.098,  above200: 0.167  },
  QC: { name: "Quebec",                   below200: 0.20,   above200: 0.24   },
  SK: { name: "Saskatchewan",             below200: 0.105,  above200: 0.145  },
  YT: { name: "Yukon",                    below200: 0.064,  above200: 0.1502 },
};

// Federal rates
const FED_BELOW_200  = 0.15;
const FED_ABOVE_200  = 0.29;
const FED_ABOVE_HIGH = 0.33;  // for income over $246,752
const HIGH_INCOME_THRESHOLD = 246752;

// Annual donation limit (75% of net income, 100% in year of death)
const DONATION_LIMIT_PCT = 0.75;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt    = (n: number) => Math.round(n).toLocaleString("en-CA");
const fmtDec = (n: number) => n.toFixed(2);
const fmtPct = (n: number) => (n * 100).toFixed(1);

// ─── Types ────────────────────────────────────────────────────────────────────

interface Donation {
  id:     string;
  name:   string;
  amount: number | null;
  type:   string;
}

let nextId = 1;
const newId = () => String(nextId++);

const DONATION_TYPES = [
  "Cash / Cheque / Online",
  "Publicly Traded Securities",
  "Real Estate",
  "Cultural / Ecological Gift",
  "Payroll Deduction",
  "In-Kind / Goods",
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function CharitableDonationClient() {
  const [province,   setProvince]   = useState("ON");
  const [income,     setIncome]     = useState<number | null>(null);
  const [donations,  setDonations]  = useState<Donation[]>([
    { id: newId(), name: "Charity 1", amount: null, type: "Cash / Cheque / Online" },
  ]);
  const [spouseGive, setSpouseGive] = useState(false);
  const [carryforward, setCarryforward] = useState<number | null>(null);
  const [showEligible, setShowEligible] = useState(false);

  const prov = PROVINCES[province];

  const addDonation = () =>
    setDonations(prev => [...prev, { id: newId(), name: `Charity ${prev.length + 1}`, amount: null, type: "Cash / Cheque / Online" }]);
  const removeDonation = (id: string) =>
    setDonations(prev => prev.filter(d => d.id !== id));
  const updateDonation = (id: string, field: keyof Donation, value: any) =>
    setDonations(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));

  const result = useMemo(() => {
    const totalDonated = donations.reduce((s, d) => s + (d.amount ?? 0), 0)
      + (carryforward ?? 0);
    if (totalDonated <= 0 || !income || income <= 0) return null;

    const netIncome   = income;
    const limit       = netIncome * DONATION_LIMIT_PCT;
    const eligible    = Math.min(totalDonated, limit);
    const isHighIncome = netIncome > HIGH_INCOME_THRESHOLD;

    // Federal credit
    const fedBelow  = Math.min(eligible, 200) * FED_BELOW_200;
    const fedAbove  = Math.max(0, eligible - 200) * (isHighIncome ? FED_ABOVE_HIGH : FED_ABOVE_200);
    const fedCredit = fedBelow + fedAbove;

    // Provincial credit
    const provBelow  = Math.min(eligible, 200) * prov.below200;
    const provAbove  = Math.max(0, eligible - 200) * prov.above200;
    const provCredit = provBelow + provAbove;

    const totalCredit     = fedCredit + provCredit;
    const effectiveRate   = eligible > 0 ? totalCredit / eligible : 0;
    const netCost         = eligible - totalCredit;
    const excessDonation  = Math.max(0, totalDonated - limit);

    // Combined rates for display
    const combinedBelow200 = FED_BELOW_200 + prov.below200;
    const combinedAbove200 = (isHighIncome ? FED_ABOVE_HIGH : FED_ABOVE_200) + prov.above200;

    // "Real cost" per dollar donated above $200
    const realCostPerDollar = 1 - combinedAbove200;

    return {
      totalDonated,
      eligible,
      limit,
      excessDonation,
      fedCredit,
      provCredit,
      totalCredit,
      effectiveRate,
      netCost,
      isHighIncome,
      combinedBelow200,
      combinedAbove200,
      realCostPerDollar,
      // Rate breakdown
      fedRateBelow:  FED_BELOW_200,
      fedRateAbove:  isHighIncome ? FED_ABOVE_HIGH : FED_ABOVE_200,
      provRateBelow: prov.below200,
      provRateAbove: prov.above200,
    };
  }, [donations, income, province, carryforward, prov]);

  const provinceList = Object.entries(PROVINCES).sort((a, b) => a[1].name.localeCompare(b[1].name));

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-gray-900">Charitable Donation Tax Credit Calculator</h1>
          <p className="text-gray-500 mt-1">
            Calculate your federal + provincial donation tax credit and find out what your generosity actually costs after tax.
          </p>
        </div>

        {/* Eligible charities info */}
        <button
          type="button"
          onClick={() => setShowEligible(!showEligible)}
          className="w-full bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-center justify-between text-left hover:bg-blue-100 transition-colors"
        >
          <div>
            <p className="text-sm font-semibold text-blue-800">🏛 What Donations Qualify for the Tax Credit?</p>
            <p className="text-xs text-blue-600 mt-0.5">Registered charities, political parties, universities, Crown gifts and more</p>
          </div>
          <span className="text-blue-500 text-lg">{showEligible ? "▲" : "▼"}</span>
        </button>

        {showEligible && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Eligible Donations</h3>
            <div className="space-y-3">
              {[
                { icon: "✅", title: "Registered Canadian Charities", desc: "Any charity with a CRA registration number — hospitals, food banks, religious organizations, universities, arts groups, etc." },
                { icon: "✅", title: "Registered Amateur Athletic Associations", desc: "Donations to CRA-registered amateur athletic organizations qualify." },
                { icon: "✅", title: "Gifts to the Crown", desc: "Donations to federal, provincial, or municipal governments for public purposes." },
                { icon: "✅", title: "Publicly Traded Securities", desc: "Donating appreciated stocks or ETFs directly to a charity eliminates capital gains tax AND generates a donation receipt for full market value — a powerful strategy." },
                { icon: "✅", title: "United Nations & Select Foreign Universities", desc: "Some foreign universities that are prescribed by CRA regulations qualify." },
                { icon: "❌", title: "Political Party Donations", desc: "Federal and provincial political donations have separate (and less generous) tax credit rules — they do not use this calculator." },
                { icon: "❌", title: "Donations with Benefits", desc: "If you receive something of value in return (event tickets, goods), only the amount above the fair market value of what you received qualifies." },
                { icon: "❌", title: "Crowdfunding / GoFundMe", desc: "Unless the recipient is a registered charity, these do not qualify for a donation tax credit." },
              ].map(item => (
                <div key={item.title} className="flex gap-3">
                  <span className="text-base shrink-0 mt-0.5">{item.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-800 mb-1">💡 The Securities Donation Strategy</p>
              <p className="text-xs text-blue-700">
                If you own publicly traded stocks with unrealized gains, donating them directly to a charity is far more tax-efficient than selling and donating cash. You pay <strong>zero capital gains tax</strong> and receive a donation receipt for the full market value. This can effectively double the tax benefit compared to a cash donation.
              </p>
            </div>
            <p className="text-xs text-gray-400">
              Always verify a charity's registration status at <a href="https://www.canada.ca/en/revenue-agency/services/charities-giving/charities/listings.html" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">CRA's charity listings</a>.
            </p>
          </div>
        )}

        {/* Inputs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-800">Your Details</h2>

          {/* Province */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Province</label>
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
            >
              {provinceList.map(([code, data]) => (
                <option key={code} value={code}>{data.name}</option>
              ))}
            </select>
          </div>

          {/* Net income */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Net Income (Line 23600)
              <span className="text-gray-400 font-normal ml-1">(from your tax return)</span>
            </label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$90,000"
              onValueChange={(v) => setIncome(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right"
            />
            {income && (
              <p className="text-xs text-gray-400 mt-1">
                Maximum eligible donations: ${fmt(income * DONATION_LIMIT_PCT)} (75% of net income)
              </p>
            )}
          </div>

          {/* Carryforward */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Unused Donations Carried Forward
              <span className="text-gray-400 font-normal ml-1">(from prior years, up to 5 years)</span>
            </label>
            <NumericFormat
              thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
              placeholder="$0"
              onValueChange={(v) => setCarryforward(v.floatValue ?? null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right"
            />
          </div>

          {/* Spouse toggle */}
          <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Combining with spouse / common-law partner?</p>
              <p className="text-xs text-gray-400 mt-0.5">You can pool donations with your spouse on one return to maximize the above-$200 credit rate</p>
            </div>
            <button
              type="button"
              onClick={() => setSpouseGive(!spouseGive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ml-4 ${spouseGive ? "bg-blue-600" : "bg-gray-300"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${spouseGive ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
          {spouseGive && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                <strong>Tip:</strong> Combine all household donations on the higher-income spouse's return. This maximizes the credit since more of your combined donations exceed the $200 threshold and qualify for the higher credit rate ({fmtPct(FED_ABOVE_200 + prov.above200)}% combined in {prov.name}).
              </p>
            </div>
          )}
        </div>

        {/* Donation entries */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">Your Donations</h2>
            <button
              type="button"
              onClick={addDonation}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-400 px-3 py-1.5 rounded-lg transition-colors"
            >
              + Add Charity
            </button>
          </div>

          {donations.map((d) => (
            <div key={d.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={d.name}
                  onChange={(e) => updateDonation(d.id, "name", e.target.value)}
                  placeholder="Charity name"
                  className="text-sm font-semibold text-gray-800 border-0 outline-none bg-transparent flex-1 min-w-0"
                />
                {donations.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDonation(d.id)}
                    className="text-red-400 hover:text-red-600 text-xs font-medium shrink-0"
                  >
                    ✕ Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Donation Amount</label>
                  <NumericFormat
                    thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
                    placeholder="$500"
                    onValueChange={(v) => updateDonation(d.id, "amount", v.floatValue ?? null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Donation Type</label>
                  <select
                    value={d.type}
                    onChange={(e) => updateDonation(d.id, "type", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm text-gray-700"
                  >
                    {DONATION_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              {d.type === "Publicly Traded Securities" && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <p className="text-xs text-green-700 font-medium">
                    ✅ Donating securities directly eliminates capital gains tax on the appreciation — and you still get a full fair market value receipt.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Results */}
        {result === null ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">❤️</div>
            <p className="text-xl font-semibold text-gray-700">Enter your income and donations above</p>
            <p className="text-gray-500 mt-2">Your tax credit estimate will appear here instantly.</p>
          </div>
        ) : (
          <>
            {/* Hero */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-600 text-white rounded-xl p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-blue-200 uppercase tracking-wide">Total Tax Credit</p>
                <p className="text-4xl font-black mt-2">${fmt(result.totalCredit)}</p>
                <p className="text-blue-200 text-sm mt-1">on ${fmt(result.eligible)} donated</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Net Cost to You</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">${fmt(result.netCost)}</p>
                <p className="text-gray-400 text-sm mt-1">after tax credit</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Effective Credit Rate</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{fmtPct(result.effectiveRate)}%</p>
                <p className="text-gray-400 text-sm mt-1">of total donated</p>
              </div>
            </div>

            {/* Limit warning */}
            {result.excessDonation > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <p className="text-sm font-semibold text-amber-700 mb-1">⚠️ ${fmt(result.excessDonation)} exceeds the annual limit</p>
                <p className="text-sm text-amber-600">
                  The annual donation limit is 75% of your net income (${fmt(result.limit)}). The excess ${fmt(result.excessDonation)} can be carried forward for up to 5 years.
                </p>
              </div>
            )}

            {/* Rate breakdown table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-800">Credit Rate Breakdown — {prov.name}</h2>
                <p className="text-sm text-gray-500 mt-0.5">Canada uses a two-tier rate: lower on the first $200, higher on everything above</p>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  {
                    label:    "First $200",
                    donated:  Math.min(result.eligible, 200),
                    fedRate:  result.fedRateBelow,
                    provRate: result.provRateBelow,
                    combined: result.combinedBelow200,
                    credit:   Math.min(result.eligible, 200) * result.combinedBelow200,
                    bold:     false,
                  },
                  {
                    label:    "Above $200",
                    donated:  Math.max(0, result.eligible - 200),
                    fedRate:  result.fedRateAbove,
                    provRate: result.provRateAbove,
                    combined: result.combinedAbove200,
                    credit:   Math.max(0, result.eligible - 200) * result.combinedAbove200,
                    bold:     false,
                  },
                  {
                    label:    "Total",
                    donated:  result.eligible,
                    fedRate:  null,
                    provRate: null,
                    combined: result.effectiveRate,
                    credit:   result.totalCredit,
                    bold:     true,
                  },
                ].map((row) => (
                  <div key={row.label} className={`px-6 py-3.5 ${row.bold ? "bg-gray-50" : "hover:bg-gray-50"}`}>
                    <div className="grid grid-cols-5 gap-2 text-sm">
                      <span className={`${row.bold ? "font-semibold text-gray-800" : "text-gray-600"}`}>{row.label}</span>
                      <span className="text-right text-gray-700">${fmt(row.donated)}</span>
                      <span className="text-right text-gray-500">{row.fedRate !== null ? `${fmtPct(row.fedRate)}% fed` : ""}</span>
                      <span className="text-right text-gray-500">{row.provRate !== null ? `${fmtPct(row.provRate)}% prov` : ""}</span>
                      <span className={`text-right font-semibold ${row.bold ? "text-blue-700" : "text-green-600"}`}>${fmt(row.credit)}</span>
                    </div>
                    {!row.bold && row.combined > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5 text-right">Combined: {fmtPct(row.combined)}%</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Federal vs provincial split */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Federal Credit</p>
                <p className="text-3xl font-bold text-blue-600">${fmt(result.fedCredit)}</p>
                <p className="text-gray-400 text-sm mt-1">from CRA</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Provincial Credit</p>
                <p className="text-3xl font-bold text-purple-600">${fmt(result.provCredit)}</p>
                <p className="text-gray-400 text-sm mt-1">{prov.name}</p>
              </div>
            </div>

            {/* Real cost bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Where Your Donation Dollars Go
              </h3>
              <div className="space-y-3">
                {[
                  { label: "Goes to charity",   value: result.eligible,    color: "bg-blue-500"  },
                  { label: "You get back (credit)", value: result.totalCredit, color: "bg-green-500" },
                  { label: "Your net cost",      value: result.netCost,     color: "bg-gray-400"  },
                ].map(row => (
                  <div key={row.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{row.label}</span>
                      <span className="font-medium text-gray-800">${fmt(row.value)}</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${row.color} rounded-full transition-all duration-500`}
                        style={{ width: `${(row.value / result.eligible) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800 font-medium">
                  💡 Every dollar you donate above $200 only costs you <strong>${fmtDec(result.realCostPerDollar)}</strong> after the {fmtPct(result.combinedAbove200)}% combined tax credit in {prov.name}.
                </p>
              </div>
            </div>

            {/* High income note */}
            {result.isHighIncome && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                <p className="text-sm font-semibold text-blue-800 mb-1">📌 High Income — 33% Federal Rate Applies</p>
                <p className="text-sm text-blue-700">
                  Since your income exceeds $246,752, the federal charitable donation credit on donations above $200 is <strong>33%</strong> (instead of 29%). Combined with {prov.name}'s {fmtPct(prov.above200)}% provincial credit, your effective rate on donations above $200 is <strong>{fmtPct(result.combinedAbove200)}%</strong>.
                </p>
              </div>
            )}
          </>
        )}

        {/* SEO / FAQ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 prose prose-gray max-w-none">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Canadian Charitable Donation Tax Credits Explained</h2>
          <p className="text-gray-600">
            Canada's charitable donation tax credit works differently from a deduction — it directly reduces the tax you owe, not just your taxable income. The federal credit is calculated at <strong>15% on the first $200</strong> and <strong>29% (or 33% for high earners) on amounts above $200</strong>. Each province adds its own credit on top.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Why Combine Donations on One Return?</h3>
          <p className="text-gray-600">
            Each taxpayer gets only one $200 threshold. If you and your spouse each donate $200 separately, you each get the 15% rate on $200. But if one person claims $400 combined, $200 is at 15% and $200 is at the much higher 29%+ rate — saving more tax overall. CRA allows spouses to pool donations on either return.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">5-Year Carry-Forward</h3>
          <p className="text-gray-600">
            Unused donation tax credits can be carried forward for up to <strong>5 years</strong>. This is useful if your income (and therefore tax owing) is higher in future years, or if you want to accumulate several years of donations to cross the $200 threshold for the higher credit rate.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Annual Donation Limit</h3>
          <p className="text-gray-600">
            You can claim donations up to <strong>75% of your net income</strong> (Line 23600) in any given year. In the year of death, the limit increases to 100%. Any donations exceeding the annual limit can be carried forward for up to 5 years.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">The Securities Donation Strategy</h3>
          <p className="text-gray-600">
            Donating publicly traded securities (stocks, ETFs, mutual funds) directly to a registered charity is one of Canada's most powerful tax strategies. You pay <strong>zero capital gains tax</strong> on the appreciation, and you receive a donation receipt for the full fair market value. Compared to selling the securities and donating cash, this can save thousands in capital gains tax — especially after the 2024 inclusion rate increase.
          </p>

          <p className="text-sm text-gray-400 mt-6">
            This calculator provides estimates based on 2025 federal and provincial charitable donation tax credit rates. Actual credits depend on your complete tax situation and may be affected by provincial surtaxes or other factors. Consult a tax professional for personalized advice. Always verify a charity's CRA registration before donating.
          </p>
        </div>

      </div>
    </div>
  );
}
