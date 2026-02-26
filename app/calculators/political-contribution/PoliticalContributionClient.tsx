"use client";

import { useState, useMemo } from "react";
import { NumericFormat } from "react-number-format";
import PrintButton from "@/components/PrintButton";

// ─── Federal Political Contribution Tax Credit 2025 ───────────────────────────
// Canada Elections Act s. 127
// 75% on first $400 = $300 max
// 50% on next $350 ($400–$750) = $175 max
// 33.33% on next $525 ($750–$1,275) = $175 max
// Maximum federal credit: $650 on $1,275 contribution

function calcFederalCredit(amount: number): number {
  let credit = 0;
  if (amount <= 0) return 0;
  // Tier 1: 75% on first $400
  credit += Math.min(amount, 400) * 0.75;
  // Tier 2: 50% on next $350
  if (amount > 400) credit += Math.min(amount - 400, 350) * 0.50;
  // Tier 3: 33.33% on next $525
  if (amount > 750) credit += Math.min(amount - 750, 525) * (1 / 3);
  return Math.min(credit, 650);
}

// ─── Provincial Political Contribution Credits ────────────────────────────────

interface ProvincialCredit {
  name: string;
  hasCredit: boolean;
  description: string;
  calc: (amount: number) => number;
  maxCredit: number;
  maxContrib: number;
  notes?: string;
}

const PROVINCIAL_CREDITS: Record<string, ProvincialCredit> = {
  AB: {
    name: "Alberta",
    hasCredit: false,
    description: "Alberta does not offer a provincial political contribution tax credit.",
    calc: () => 0, maxCredit: 0, maxContrib: 0,
  },
  BC: {
    name: "British Columbia",
    hasCredit: true,
    description: "BC offers a 75% credit on the first $100, 50% on the next $900 ($100–$1,000), and 33.33% on the next $1,225 ($1,000–$2,225).",
    calc: (amount: number) => {
      let c = 0;
      if (amount <= 0) return 0;
      c += Math.min(amount, 100) * 0.75;
      if (amount > 100) c += Math.min(amount - 100, 900) * 0.50;
      if (amount > 1000) c += Math.min(amount - 1000, 1225) * (1 / 3);
      return Math.min(c, 675);
    },
    maxCredit: 675, maxContrib: 2225,
    notes: "Credit claimed on BC provincial return (Schedule BC(S11))",
  },
  MB: {
    name: "Manitoba",
    hasCredit: true,
    description: "Manitoba offers a 75% credit on first $400, 50% on next $350, and 33.33% on the next $525. Mirrors the federal structure.",
    calc: (amount: number) => {
      let c = 0;
      if (amount <= 0) return 0;
      c += Math.min(amount, 400) * 0.75;
      if (amount > 400) c += Math.min(amount - 400, 350) * 0.50;
      if (amount > 750) c += Math.min(amount - 750, 525) * (1 / 3);
      return Math.min(c, 650);
    },
    maxCredit: 650, maxContrib: 1275,
  },
  NB: {
    name: "New Brunswick",
    hasCredit: false,
    description: "New Brunswick does not offer a provincial political contribution tax credit.",
    calc: () => 0, maxCredit: 0, maxContrib: 0,
  },
  NL: {
    name: "Newfoundland & Labrador",
    hasCredit: false,
    description: "Newfoundland & Labrador does not offer a provincial political contribution tax credit.",
    calc: () => 0, maxCredit: 0, maxContrib: 0,
  },
  NS: {
    name: "Nova Scotia",
    hasCredit: false,
    description: "Nova Scotia does not offer a provincial political contribution tax credit.",
    calc: () => 0, maxCredit: 0, maxContrib: 0,
  },
  ON: {
    name: "Ontario",
    hasCredit: true,
    description: "Ontario offers 75% on the first $389, 50% on the next $388, and 33.33% on contributions between $777–$1,365.",
    calc: (amount: number) => {
      let c = 0;
      if (amount <= 0) return 0;
      c += Math.min(amount, 389) * 0.75;
      if (amount > 389) c += Math.min(amount - 389, 388) * 0.50;
      if (amount > 777) c += Math.min(amount - 777, 588) * (1 / 3);
      return Math.min(c, 487.11);
    },
    maxCredit: 487, maxContrib: 1365,
    notes: "Ontario municipal/school board contributions not eligible",
  },
  PE: {
    name: "Prince Edward Island",
    hasCredit: false,
    description: "Prince Edward Island does not offer a provincial political contribution tax credit.",
    calc: () => 0, maxCredit: 0, maxContrib: 0,
  },
  QC: {
    name: "Quebec",
    hasCredit: true,
    description: "Quebec has its own political financing system. Donations to provincial parties are limited to $100/year per registered party and the credit is 85% on the first $50, then varies. Federal credit does not apply to provincial QC donations.",
    calc: (amount: number) => {
      // QC: 85% on first $50, 70% on next $50
      let c = 0;
      if (amount <= 0) return 0;
      c += Math.min(amount, 50) * 0.85;
      if (amount > 50) c += Math.min(amount - 50, 50) * 0.70;
      return Math.min(c, 77.5);
    },
    maxCredit: 77, maxContrib: 100,
    notes: "Quebec caps donations at $100/year per party. Federal credit applies to federal party donations only.",
  },
  SK: {
    name: "Saskatchewan",
    hasCredit: true,
    description: "Saskatchewan offers a 50% credit on political contributions up to $500 (max credit $250).",
    calc: (amount: number) => Math.min(amount * 0.50, 250),
    maxCredit: 250, maxContrib: 500,
  },
  NT: {
    name: "Northwest Territories",
    hasCredit: false,
    description: "Northwest Territories does not offer a territorial political contribution tax credit.",
    calc: () => 0, maxCredit: 0, maxContrib: 0,
  },
  NU: {
    name: "Nunavut",
    hasCredit: false,
    description: "Nunavut does not offer a territorial political contribution tax credit.",
    calc: () => 0, maxCredit: 0, maxContrib: 0,
  },
  YT: {
    name: "Yukon",
    hasCredit: false,
    description: "Yukon does not offer a territorial political contribution tax credit.",
    calc: () => 0, maxCredit: 0, maxContrib: 0,
  },
};

// ─── Formatting ───────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
}
function fmtFull(n: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}
function fmtPct(n: number): string {
  return (n * 100).toFixed(1) + "%";
}

// ─── Component ────────────────────────────────────────────────────────────────

type DonationType = "federal" | "provincial" | "both";

export default function PoliticalContributionClient() {
  const [federalAmount, setFederalAmount] = useState(0);
  const [provincialAmount, setProvincialAmount] = useState(0);
  const [province, setProvince] = useState("ON");
  const [donationType, setDonationType] = useState<DonationType>("federal");
  const [showInfo, setShowInfo] = useState(false);

  const provCredit = PROVINCIAL_CREDITS[province];

  const amount = donationType === "federal" ? federalAmount
    : donationType === "provincial" ? provincialAmount
    : federalAmount;

  const provAmount = donationType === "both" ? provincialAmount : provincialAmount;

  const hasResults = (donationType === "federal" && federalAmount > 0)
    || (donationType === "provincial" && provincialAmount > 0)
    || (donationType === "both" && (federalAmount > 0 || provincialAmount > 0));

  const results = useMemo(() => {
    if (!hasResults) return null;

    const fedContrib = donationType === "provincial" ? 0 : federalAmount;
    const provContrib = donationType === "federal" ? 0 : provincialAmount;

    const federalCredit = calcFederalCredit(fedContrib);
    const provincialCredit = provCredit.calc(provContrib);

    const totalContrib = fedContrib + provContrib;
    const totalCredit = federalCredit + provincialCredit;
    const netCost = totalContrib - totalCredit;
    const effectiveRate = totalContrib > 0 ? (totalCredit / totalContrib) * 100 : 0;

    // Federal tier breakdown
    const fedTiers = fedContrib > 0 ? [
      {
        label: "First $400",
        rate: "75%",
        contribution: Math.min(fedContrib, 400),
        credit: Math.min(fedContrib, 400) * 0.75,
        active: fedContrib > 0,
      },
      {
        label: "Next $350 ($400–$750)",
        rate: "50%",
        contribution: Math.max(0, Math.min(fedContrib - 400, 350)),
        credit: Math.max(0, Math.min(fedContrib - 400, 350)) * 0.50,
        active: fedContrib > 400,
      },
      {
        label: "Next $525 ($750–$1,275)",
        rate: "33.33%",
        contribution: Math.max(0, Math.min(fedContrib - 750, 525)),
        credit: Math.max(0, Math.min(fedContrib - 750, 525)) * (1 / 3),
        active: fedContrib > 750,
      },
      {
        label: "Above $1,275",
        rate: "0%",
        contribution: Math.max(0, fedContrib - 1275),
        credit: 0,
        active: fedContrib > 1275,
      },
    ].filter(t => t.contribution > 0 || t.active) : [];

    // What would maximizing get you?
    const maxFedCredit = 650;
    const maxProvCredit = provCredit.maxCredit;
    const additionalFedNeeded = Math.max(0, 1275 - fedContrib);
    const additionalProvNeeded = Math.max(0, provCredit.maxContrib - provContrib);

    return {
      fedContrib, provContrib, federalCredit, provincialCredit,
      totalContrib, totalCredit, netCost, effectiveRate,
      fedTiers, maxFedCredit, maxProvCredit,
      additionalFedNeeded, additionalProvNeeded,
    };
  }, [federalAmount, provincialAmount, province, donationType, hasResults, provCredit]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* Info Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl overflow-hidden">
        <button onClick={() => setShowInfo(!showInfo)}
          className="w-full flex items-center justify-between px-5 py-3 text-blue-800 font-semibold text-sm">
          <span>💡 How political contribution tax credits work</span>
          <span>{showInfo ? "▲ Hide" : "▼ Show"}</span>
        </button>
        {showInfo && (
          <div className="px-5 pb-4 text-blue-900 text-sm space-y-2">
            <p>Political contributions to registered federal parties, candidates, and riding associations qualify for a <strong>non-refundable federal tax credit</strong> under the Canada Elections Act. The credit is very generous — 75% on the first $400 — making small donations highly tax-efficient.</p>
            <p>Several provinces also offer their own political contribution credits for donations to registered provincial parties. The federal credit and provincial credit are claimed separately on your tax return.</p>
            <p>Unlike charitable donation credits, political credits are <strong>non-refundable</strong> — they can reduce your tax to zero but won't generate a refund. You must owe enough federal/provincial tax to use the full credit.</p>
          </div>
        )}
      </div>

      {/* Inputs */}
      <div className="print:hidden bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <h2 className="text-lg font-bold text-gray-800">Contribution Details</h2>

        {/* Donation Type Toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Contribution Type</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { key: "federal", label: "Federal Only" },
              { key: "provincial", label: "Provincial Only" },
              { key: "both", label: "Federal + Provincial" },
            ] as { key: DonationType; label: string }[]).map(opt => (
              <button key={opt.key} onClick={() => setDonationType(opt.key)}
                className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${donationType === opt.key ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Federal Amount */}
          {(donationType === "federal" || donationType === "both") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Federal Contribution Amount
              </label>
              <NumericFormat value={federalAmount || ""} onValueChange={v => setFederalAmount(v.floatValue ?? 0)}
                thousandSeparator prefix="$" placeholder="$0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
              <p className="text-xs text-gray-400 mt-1">Max credit at $1,275 · Annual limit $1,725/person</p>
            </div>
          )}

          {/* Provincial Amount */}
          {(donationType === "provincial" || donationType === "both") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Provincial Contribution Amount
              </label>
              <NumericFormat value={provincialAmount || ""} onValueChange={v => setProvincialAmount(v.floatValue ?? 0)}
                thousandSeparator prefix="$" placeholder="$0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
              {provCredit.maxContrib > 0 && (
                <p className="text-xs text-gray-400 mt-1">Max credit at {fmt(provCredit.maxContrib)}</p>
              )}
            </div>
          )}

          {/* Province */}
          {(donationType === "provincial" || donationType === "both") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
              <select value={province} onChange={e => setProvince(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none">
                {Object.entries(PROVINCIAL_CREDITS).sort((a, b) => a[1].name.localeCompare(b[1].name)).map(([code, p]) => (
                  <option key={code} value={code}>{p.name} {p.hasCredit ? "✓" : ""}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">{provCredit.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Results Gate */}
      {!hasResults && (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-400">
          <div className="text-3xl mb-2">🗳️</div>
          <div className="font-medium">Enter a contribution amount above to calculate your tax credit</div>
        </div>
      )}

      {hasResults && results && <>

      {/* Hero */}
      <div className="bg-blue-600 text-white rounded-xl p-6 text-center">
        <div className="text-sm font-medium text-blue-200 mb-1">Total Tax Credit</div>
        <div className="text-5xl font-black mb-1">{fmtFull(results.totalCredit)}</div>
        <div className="text-blue-200 text-sm">
          Net cost after credit: {fmtFull(results.netCost)} · Effective credit rate: {results.effectiveRate.toFixed(1)}%
        </div>
      </div>

      <PrintButton />

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Total Contributed</div>
          <div className="text-xl font-bold text-gray-800">{fmt(results.totalContrib)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Federal Credit</div>
          <div className="text-xl font-bold text-blue-700">{fmtFull(results.federalCredit)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Provincial Credit</div>
          <div className="text-xl font-bold text-purple-700">
            {provCredit.hasCredit ? fmtFull(results.provincialCredit) : "N/A"}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Your Net Cost</div>
          <div className="text-xl font-bold text-green-700">{fmtFull(results.netCost)}</div>
        </div>
      </div>

      {/* Federal Tier Breakdown */}
      {results.fedContrib > 0 && results.fedTiers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Federal Credit Tier Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Tier</th>
                  <th className="px-4 py-3 text-right text-gray-500 font-medium">Credit Rate</th>
                  <th className="px-4 py-3 text-right text-gray-500 font-medium">Your Amount</th>
                  <th className="px-4 py-3 text-right text-gray-500 font-medium">Credit Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {results.fedTiers.map((tier, i) => (
                  <tr key={i} className={tier.active ? "hover:bg-gray-50" : "opacity-40"}>
                    <td className="px-4 py-3 text-gray-700">{tier.label}</td>
                    <td className="px-4 py-3 text-right font-semibold text-blue-600">{tier.rate}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmtFull(tier.contribution)}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-800">{fmtFull(tier.credit)}</td>
                  </tr>
                ))}
                <tr className="bg-blue-50 font-bold">
                  <td className="px-4 py-3 text-blue-800" colSpan={2}>Total Federal Credit</td>
                  <td className="px-4 py-3 text-right text-blue-800">{fmtFull(results.fedContrib)}</td>
                  <td className="px-4 py-3 text-right text-blue-800">{fmtFull(results.federalCredit)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Provincial Credit Detail */}
      {(donationType === "provincial" || donationType === "both") && (
        <div className={`rounded-xl p-5 border ${provCredit.hasCredit ? "bg-purple-50 border-purple-200" : "bg-gray-50 border-gray-200"}`}>
          <h2 className="text-lg font-bold text-gray-800 mb-2">
            {provCredit.name} Provincial Credit
          </h2>
          <p className="text-sm text-gray-600 mb-3">{provCredit.description}</p>
          {provCredit.hasCredit && results.provContrib > 0 && (
            <div className="flex flex-wrap gap-4">
              <div className="bg-white rounded-lg px-4 py-3 text-center">
                <div className="text-xs text-gray-500 mb-0.5">Your Contribution</div>
                <div className="text-lg font-bold text-gray-800">{fmtFull(results.provContrib)}</div>
              </div>
              <div className="bg-white rounded-lg px-4 py-3 text-center">
                <div className="text-xs text-gray-500 mb-0.5">Provincial Credit</div>
                <div className="text-lg font-bold text-purple-700">{fmtFull(results.provincialCredit)}</div>
              </div>
              <div className="bg-white rounded-lg px-4 py-3 text-center">
                <div className="text-xs text-gray-500 mb-0.5">Max Possible Credit</div>
                <div className="text-lg font-bold text-gray-600">{fmt(provCredit.maxCredit)}</div>
              </div>
            </div>
          )}
          {provCredit.notes && (
            <p className="text-xs text-gray-500 mt-2">ℹ️ {provCredit.notes}</p>
          )}
        </div>
      )}

      {/* Maximize Your Credit */}
      {(results.additionalFedNeeded > 0 || results.additionalProvNeeded > 0) && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <h2 className="text-lg font-bold text-green-800 mb-3">💡 Maximize Your Credit</h2>
          <div className="space-y-2 text-sm text-green-800">
            {results.additionalFedNeeded > 0 && donationType !== "provincial" && (
              <p>
                Contribute an additional <strong>{fmt(results.additionalFedNeeded)}</strong> federally to reach the maximum credit of <strong>{fmt(results.maxFedCredit)}</strong>.
                At this level your net cost is only <strong>{fmt(1275 - 650)}</strong> for a $1,275 donation — a 51% effective subsidy.
              </p>
            )}
            {provCredit.hasCredit && results.additionalProvNeeded > 0 && donationType !== "federal" && (
              <p>
                Contribute an additional <strong>{fmt(results.additionalProvNeeded)}</strong> provincially to reach the {provCredit.name} maximum credit of <strong>{fmt(provCredit.maxCredit)}</strong>.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Province Credit Comparison */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Provincial Credit Availability</h2>
          <p className="text-sm text-gray-500 mt-0.5">Which provinces offer political contribution tax credits?</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Province</th>
                <th className="px-4 py-3 text-center text-gray-500 font-medium">Credit?</th>
                <th className="px-4 py-3 text-right text-gray-500 font-medium">Max Credit</th>
                <th className="px-4 py-3 text-right text-gray-500 font-medium">Max Contribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.entries(PROVINCIAL_CREDITS)
                .sort((a, b) => a[1].name.localeCompare(b[1].name))
                .map(([code, p]) => (
                  <tr key={code} className={code === province ? "bg-blue-50" : "hover:bg-gray-50"}>
                    <td className={`px-6 py-3 font-medium ${code === province ? "text-blue-700" : "text-gray-700"}`}>{p.name}</td>
                    <td className="px-4 py-3 text-center">
                      {p.hasCredit
                        ? <span className="text-green-600 font-semibold">✓ Yes</span>
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{p.maxCredit > 0 ? fmt(p.maxCredit) : "—"}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{p.maxContrib > 0 ? fmt(p.maxContrib) : "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      </>}

      {/* SEO / FAQ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5 text-sm text-gray-600 leading-relaxed">
        <h2 className="text-xl font-bold text-gray-900">Political Contribution Tax Credits in Canada</h2>

        <p>Canada offers some of the most generous political contribution tax credits in the world. The federal credit gives you back 75 cents on every dollar for the first $400 donated — making small political contributions extremely tax-efficient compared to charitable donations, which are credited at your marginal rate.</p>

        <h3 className="text-base font-bold text-gray-800">Federal Political Contribution Tax Credit</h3>
        <p>Registered federal political parties, local candidates, and riding associations are eligible. The credit is claimed on line 40900 of your federal return. The three-tier structure rewards smaller contributions most generously: 75% on the first $400, 50% on the next $350, and 33.33% on contributions up to $1,275. The annual contribution limit per individual is $1,725 to each registered party, candidate, or association.</p>

        <h3 className="text-base font-bold text-gray-800">Political vs Charitable Donations</h3>
        <p>For small amounts, political contributions are far more tax-efficient than charitable donations. A $200 charitable donation might generate a $30–$60 credit depending on your province and marginal rate. A $200 political contribution generates a $150 federal credit — plus a provincial credit if you're in BC, Manitoba, Ontario, or Saskatchewan. The first $400 political contribution effectively costs you only $100 after tax credits.</p>

        <h3 className="text-base font-bold text-gray-800">Non-Refundable Credit — What This Means</h3>
        <p>The political contribution credit is non-refundable, meaning it can reduce your federal or provincial tax to zero, but any unused credit is lost. If your federal tax owing is less than your credit, you can't carry forward the unused portion. Ensure you owe enough tax to use the full credit before maximizing contributions.</p>

        <h3 className="text-base font-bold text-gray-800">Quebec's Unique System</h3>
        <p>Quebec has strict political financing rules — donations to provincial parties are capped at $100 per person per year. The provincial credit is 85% on the first $50 and 70% on the next $50. Quebec residents making federal party donations still claim the federal credit on their Quebec return.</p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-xs">
          <strong>Disclaimer:</strong> This calculator provides estimates based on 2025 Canada Elections Act provisions and provincial legislation. Contribution limits and credit rates may change. This is not legal or tax advice — consult Elections Canada, your provincial elections authority, or a tax professional for your specific situation.
        </div>
      </div>
    </div>
  );
}
