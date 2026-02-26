"use client";

// app/calculators/net-worth/NetWorthClient.tsx

import PrintButton from "@/components/PrintButton";
import { useState, useMemo } from "react";
import { NumericFormat } from "react-number-format";

// ─── Categories ───────────────────────────────────────────────────────────────

const ASSET_CATEGORIES = [
  {
    key: "cash",
    label: "Cash & Savings",
    icon: "💵",
    items: [
      { key: "chequing",   label: "Chequing Account"         },
      { key: "savings",    label: "Savings Account / HISA"   },
      { key: "tfsa",       label: "TFSA"                     },
      { key: "cash_other", label: "Cash / Other"             },
    ],
  },
  {
    key: "investments",
    label: "Investments",
    icon: "📈",
    items: [
      { key: "rrsp",       label: "RRSP"                     },
      { key: "fhsa",       label: "FHSA"                     },
      { key: "resp",       label: "RESP"                     },
      { key: "pension",    label: "Pension (commuted value)"  },
      { key: "nonreg",     label: "Non-Registered Investments"},
      { key: "gic",        label: "GICs / Bonds"             },
      { key: "crypto",     label: "Crypto"                   },
      { key: "other_inv",  label: "Other Investments"        },
    ],
  },
  {
    key: "property",
    label: "Real Estate",
    icon: "🏠",
    items: [
      { key: "primary",    label: "Primary Residence"        },
      { key: "rental",     label: "Rental Property"          },
      { key: "cottage",    label: "Cottage / Vacation Home"  },
      { key: "land",       label: "Land"                     },
    ],
  },
  {
    key: "personal",
    label: "Personal Assets",
    icon: "🚗",
    items: [
      { key: "vehicle",    label: "Vehicle(s)"               },
      { key: "business",   label: "Business Equity"          },
      { key: "lifeins",    label: "Life Insurance (CSV)"     },
      { key: "valuables",  label: "Valuables / Collectibles" },
      { key: "other_pers", label: "Other Assets"             },
    ],
  },
];

const LIABILITY_CATEGORIES = [
  {
    key: "mortgage_liab",
    label: "Mortgages",
    icon: "🏠",
    items: [
      { key: "mort_primary", label: "Primary Mortgage"       },
      { key: "mort_rental",  label: "Rental Property Mortgage"},
      { key: "mort_other",   label: "Other Mortgage / HELOC" },
    ],
  },
  {
    key: "vehicle_liab",
    label: "Vehicle Loans",
    icon: "🚗",
    items: [
      { key: "car_loan",     label: "Car / Truck Loan"       },
      { key: "lease",        label: "Vehicle Lease Buyout"   },
    ],
  },
  {
    key: "credit_liab",
    label: "Credit & Lines",
    icon: "💳",
    items: [
      { key: "cc1",          label: "Credit Card(s)"         },
      { key: "loc",          label: "Line of Credit"         },
      { key: "bnpl",         label: "Buy Now Pay Later"      },
    ],
  },
  {
    key: "other_liab",
    label: "Other Debts",
    icon: "📋",
    items: [
      { key: "student",      label: "Student Loan"           },
      { key: "personal_loan",label: "Personal Loan"          },
      { key: "taxes",        label: "Taxes Owing"            },
      { key: "other_debt",   label: "Other Debts"            },
    ],
  },
];

// Canadian net worth benchmarks by age (median, Statistics Canada approx)
const BENCHMARKS: Record<string, { median: number; label: string }> = {
  "Under 35":  { median: 48000,   label: "Under 35"  },
  "35–44":     { median: 234000,  label: "35–44"     },
  "45–54":     { median: 521000,  label: "45–54"     },
  "55–64":     { median: 690000,  label: "55–64"     },
  "65+":       { median: 543000,  label: "65+"       },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt    = (n: number) => Math.round(n).toLocaleString("en-CA");
const sumObj = (obj: Record<string, number | null>) =>
  Object.values(obj).reduce((s: number, v) => s + (v ?? 0), 0);

// ─── Component ────────────────────────────────────────────────────────────────

export default function NetWorthClient() {
  const [assets,      setAssets]      = useState<Record<string, number | null>>({});
  const [liabilities, setLiabilities] = useState<Record<string, number | null>>({});
  const [ageGroup,    setAgeGroup]    = useState<string>("35–44");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    cash: true, investments: true, property: true, personal: false,
    mortgage_liab: true, vehicle_liab: false, credit_liab: true, other_liab: false,
  });

  const toggleSection = (key: string) =>
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const setVal = (
    setter: React.Dispatch<React.SetStateAction<Record<string, number | null>>>,
    key: string, val: number | null
  ) => setter(prev => ({ ...prev, [key]: val }));

  // ── Calculations ─────────────────────────────────────────────────────────

  const result = useMemo(() => {
    const totalAssets      = sumObj(assets);
    const totalLiabilities = sumObj(liabilities);
    const netWorth         = totalAssets - totalLiabilities;
    const debtRatio        = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
    const benchmark        = BENCHMARKS[ageGroup];

    // Category subtotals for assets
    const assetBreakdown = ASSET_CATEGORIES.map(cat => ({
      ...cat,
      total: cat.items.reduce((s, item) => s + (assets[item.key] ?? 0), 0),
    }));

    const liabBreakdown = LIABILITY_CATEGORIES.map(cat => ({
      ...cat,
      total: cat.items.reduce((s, item) => s + (liabilities[item.key] ?? 0), 0),
    }));

    return {
      totalAssets,
      totalLiabilities,
      netWorth,
      debtRatio,
      benchmark,
      vsMedian:       netWorth - benchmark.median,
      assetBreakdown,
      liabBreakdown,
    };
  }, [assets, liabilities, ageGroup]);

  const hasData = result.totalAssets > 0 || result.totalLiabilities > 0;
  const maxAssetCat = Math.max(...result.assetBreakdown.map(c => c.total), 1);
  const maxLiabCat  = Math.max(...result.liabBreakdown.map(c => c.total), 1);

  // ── Render ────────────────────────────────────────────────────────────────

  const renderCategory = (
    cat: typeof ASSET_CATEGORIES[0],
    values: Record<string, number | null>,
    setter: React.Dispatch<React.SetStateAction<Record<string, number | null>>>,
    color: string,
    barColor: string
  ) => {
    const total   = cat.items.reduce((s, item) => s + (values[item.key] ?? 0), 0);
    const isOpen  = openSections[cat.key] ?? true;

    return (
      <div key={cat.key} className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection(cat.key)}
          className="w-full flex items-center justify-between px-5 py-3.5 bg-white hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span>{cat.icon}</span>
            <span className="text-sm font-semibold text-gray-800">{cat.label}</span>
          </div>
          <div className="flex items-center gap-3">
            {total > 0 && <span className={`text-sm font-bold ${color}`}>${fmt(total)}</span>}
            <span className="text-gray-400 text-xs">{isOpen ? "▲" : "▼"}</span>
          </div>
        </button>
        {isOpen && (
          <div className="px-5 py-3 space-y-3 bg-gray-50 border-t border-gray-100">
            {cat.items.map(item => (
              <div key={item.key} className="flex items-center gap-3">
                <label className="flex-1 text-sm text-gray-600 min-w-0">{item.label}</label>
                <NumericFormat
                  thousandSeparator prefix="$" decimalScale={0} allowNegative={false}
                  placeholder="$0"
                  value={values[item.key] ?? ""}
                  onValueChange={(v) => setVal(setter, item.key, v.floatValue ?? null)}
                  className="w-32 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 dark:bg-white dark:text-gray-900 text-right text-sm bg-white"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-gray-900">Net Worth Calculator</h1>
          <p className="text-gray-500 mt-1">
            Add up everything you own and owe — your net worth is your single best financial health metric.
          </p>
        </div>

        {/* Age group + live net worth sticky bar */}

                        <div className="print:hidden flex justify-end">
              <PrintButton label="Print Report" />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Age Group</label>
              <div className="flex flex-wrap gap-2">
                {Object.keys(BENCHMARKS).map(age => (
                  <button
                    key={age}
                    type="button"
                    onClick={() => setAgeGroup(age)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-colors ${
                      ageGroup === age
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                    }`}
                  >
                    {age}
                  </button>
                ))}
              </div>
            </div>
            {hasData && (
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Your Net Worth</p>
                <p className={`text-3xl font-black ${result.netWorth >= 0 ? "text-blue-600" : "text-red-500"}`}>
                  {result.netWorth < 0 ? "−" : ""}${fmt(Math.abs(result.netWorth))}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── ASSETS ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-800">Assets — What You Own</h2>
            {result.totalAssets > 0 && (
              <span className="text-sm font-bold text-green-600">${fmt(result.totalAssets)}</span>
            )}
          </div>
          <div className="space-y-3">
            {ASSET_CATEGORIES.map(cat =>
              renderCategory(cat, assets, setAssets, "text-green-600", "bg-green-500")
            )}
          </div>
        </div>

        {/* ── LIABILITIES ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-800">Liabilities — What You Owe</h2>
            {result.totalLiabilities > 0 && (
              <span className="text-sm font-bold text-red-500">${fmt(result.totalLiabilities)}</span>
            )}
          </div>
          <div className="space-y-3">
            {LIABILITY_CATEGORIES.map(cat =>
              renderCategory(cat, liabilities, setLiabilities, "text-red-500", "bg-red-400")
            )}
          </div>
        </div>

        {/* ── Results ── */}
        {!hasData ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">💎</div>
            <p className="text-xl font-semibold text-gray-700">Enter your assets and liabilities above</p>
            <p className="text-gray-500 mt-2">Your net worth will calculate instantly.</p>
          </div>
        ) : (
          <>
            {/* Net worth hero */}
            <div className={`rounded-xl p-6 text-center shadow-sm text-white ${result.netWorth >= 0 ? "bg-blue-600" : "bg-red-500"}`}>
              <p className="text-sm font-medium text-blue-200 uppercase tracking-wide">Your Net Worth</p>
              <p className="text-5xl font-black mt-2">
                {result.netWorth < 0 ? "−" : ""}${fmt(Math.abs(result.netWorth))}
              </p>
              <p className="text-blue-200 text-sm mt-1">
                ${fmt(result.totalAssets)} assets − ${fmt(result.totalLiabilities)} liabilities
              </p>
            </div>

            {/* Key metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Total Assets</p>
                <p className="text-3xl font-bold text-green-600">${fmt(result.totalAssets)}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Total Liabilities</p>
                <p className="text-3xl font-bold text-red-500">${fmt(result.totalLiabilities)}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Debt-to-Asset Ratio</p>
                <p className={`text-3xl font-bold ${result.debtRatio > 50 ? "text-red-500" : result.debtRatio > 30 ? "text-amber-500" : "text-green-600"}`}>
                  {result.debtRatio.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {result.debtRatio > 50 ? "High" : result.debtRatio > 30 ? "Moderate" : "Healthy"}
                </p>
              </div>
            </div>

            {/* Canadian benchmark comparison */}
            <div className={`rounded-xl p-5 border ${result.vsMedian >= 0 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
              <p className="text-sm font-semibold text-gray-800 mb-1">
                {result.vsMedian >= 0
                  ? `✅ You're $${fmt(result.vsMedian)} above the Canadian median for your age group`
                  : `📊 You're $${fmt(Math.abs(result.vsMedian))} below the Canadian median for your age group`}
              </p>
              <p className="text-xs text-gray-500">
                Canadian median net worth for age {result.benchmark.label}: <strong>${fmt(result.benchmark.median)}</strong> (Statistics Canada, approximate).
                Medians vary significantly by province and individual circumstances.
              </p>
            </div>

            {/* Asset breakdown bars */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Asset Breakdown</h3>
              <div className="space-y-3">
                {result.assetBreakdown.filter(c => c.total > 0).map((cat, i) => {
                  const colors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-400"];
                  return (
                    <div key={cat.key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{cat.icon} {cat.label}</span>
                        <span className="font-medium text-gray-800">${fmt(cat.total)}</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${colors[i % colors.length]} rounded-full transition-all duration-500`}
                          style={{ width: `${(cat.total / maxAssetCat) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Liability breakdown bars */}
            {result.totalLiabilities > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Liability Breakdown</h3>
                <div className="space-y-3">
                  {result.liabBreakdown.filter(c => c.total > 0).map((cat) => (
                    <div key={cat.key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{cat.icon} {cat.label}</span>
                        <span className="font-medium text-red-500">${fmt(cat.total)}</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-400 rounded-full transition-all duration-500"
                          style={{ width: `${(cat.total / maxLiabCat) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assets vs liabilities stacked */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Assets vs Liabilities</h3>
              <div className="space-y-3">
                {[
                  { label: "Assets",      value: result.totalAssets,      color: "bg-green-500", text: "text-green-600" },
                  { label: "Liabilities", value: result.totalLiabilities,  color: "bg-red-400",   text: "text-red-500"  },
                ].map(row => {
                  const max = Math.max(result.totalAssets, result.totalLiabilities, 1);
                  return (
                    <div key={row.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{row.label}</span>
                        <span className={`font-medium ${row.text}`}>${fmt(row.value)}</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${row.color} rounded-full transition-all duration-500`}
                          style={{ width: `${(row.value / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tips */}
            <div className="space-y-3">
              {result.debtRatio > 50 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                  <p className="text-sm font-semibold text-red-700 mb-1">⚠️ High debt-to-asset ratio ({result.debtRatio.toFixed(0)}%)</p>
                  <p className="text-sm text-red-600">
                    More than half your assets are offset by debt. Focus on paying down high-interest liabilities first — use our <a href="/calculators/debt-payoff" className="underline">Debt Payoff Calculator</a> to make a plan.
                  </p>
                </div>
              )}
              {(assets["crypto"] ?? 0) > result.totalAssets * 0.2 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                  <p className="text-sm font-semibold text-amber-700 mb-1">💡 High crypto concentration</p>
                  <p className="text-sm text-amber-600">
                    Crypto makes up a significant portion of your assets. Consider whether your portfolio is appropriately diversified given the volatility.
                  </p>
                </div>
              )}
              {result.netWorth > 0 && result.totalAssets > 0 && (assets["rrsp"] ?? 0) + (assets["tfsa"] ?? 0) < result.totalAssets * 0.1 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                  <p className="text-sm font-semibold text-blue-700 mb-1">📈 Consider maximizing registered accounts</p>
                  <p className="text-sm text-blue-600">
                    Your TFSA and RRSP holdings are low relative to your assets. Sheltering more in registered accounts can reduce your tax burden significantly.
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* SEO / FAQ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 prose prose-gray max-w-none">
          <h2 className="text-xl font-bold text-gray-900 mb-4">What is Net Worth and Why Does it Matter?</h2>
          <p className="text-gray-600">
            Net worth is the single most important number in your financial life. It's simply <strong>everything you own minus everything you owe</strong>. A positive and growing net worth means you're building wealth over time — regardless of income level.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Average Canadian Net Worth by Age</h3>
          <p className="text-gray-600">
            According to Statistics Canada, median family net worth varies widely by age. Canadians under 35 have a median net worth of around $48,000, while those aged 55–64 peak near $690,000. These are medians — half of Canadians are above, half below. Don't be discouraged if you're starting behind — what matters is the trend.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">How to Grow Your Net Worth</h3>
          <p className="text-gray-600">
            Net worth grows two ways: increasing assets (saving and investing) and decreasing liabilities (paying down debt). In Canada, the most effective tools are maximizing your <strong>TFSA</strong> and <strong>RRSP</strong> for tax-sheltered growth, paying down high-interest debt aggressively, and building home equity over time.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Should You Include Your Home?</h3>
          <p className="text-gray-600">
            Yes — your primary residence is a legitimate asset, offset by your outstanding mortgage. However, it's illiquid — you can't spend home equity without selling or borrowing against it. Many financial planners track "investable net worth" separately (excluding primary residence) to better gauge financial flexibility.
          </p>

          <p className="text-sm text-gray-400 mt-6">
            Asset values are self-reported estimates. Use current market values where possible. Pension values should use the commuted value if available. Not financial advice — consult a financial planner for a complete financial picture.
          </p>
        </div>

      </div>
    </div>
  );
}
