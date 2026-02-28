import type { Metadata } from "next";
import NewcomerTaxClient from "./NewcomerTaxClient";

export const metadata: Metadata = {
  title: "Newcomer to Canada Tax Calculator 2025 | First Canadian Tax Return",
  description: "Free tax calculator for new immigrants to Canada. Estimate your first Canadian tax return including partial-year residency, world income, foreign tax credits, T1135 requirements, GST/HST credit, and Canada Child Benefit.",
  keywords: [
    "newcomer canada tax calculator",
    "new immigrant tax return canada",
    "first canadian tax return",
    "partial year residency tax canada",
    "world income canada tax",
    "foreign tax credit canada",
    "T1135 foreign property",
    "canada child benefit newcomer",
    "GST credit new resident canada",
    "new to canada taxes",
    "PR tax return canada",
    "work permit taxes canada",
  ],
  openGraph: {
    title: "Newcomer to Canada Tax Calculator 2025",
    description: "Estimate your first Canadian tax return. Covers partial-year residency, world income, foreign tax credits, T1135, GST/HST credit, and CCB.",
    url: "https://canadiancalculators.ca/calculators/newcomer-tax",
    siteName: "Canadian Calculators",
    locale: "en_CA",
    type: "website",
  },
  alternates: {
    canonical: "https://canadiancalculators.ca/calculators/newcomer-tax",
  },
};

export default function NewcomerTaxPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-black text-gray-900">
            Newcomer to Canada Tax Calculator
          </h1>
          <p className="text-gray-500 mt-2 text-base">
            Estimate your first Canadian tax return — partial-year residency, world income, foreign tax credits, benefits, and the newcomer checklist.
          </p>
        </div>
        <NewcomerTaxClient />
      </div>
    </main>
  );
}
