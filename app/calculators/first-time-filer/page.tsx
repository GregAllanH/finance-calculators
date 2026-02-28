import type { Metadata } from "next";
import FirstTimeFilingClient from "./FirstTimeFilingClient";

export const metadata: Metadata = {
  title: "First Time Tax Filer Calculator Canada 2025 | Students, First Jobs & Gig Workers",
  description: "Free Canadian tax calculator for first-time filers. Students, first jobs, gig workers, and anyone turning 18. Calculate your refund, tuition credits, RRSP room, TFSA eligibility, and GST credit.",
  keywords: [
    "first time tax filer canada",
    "first canadian tax return",
    "student tax return canada",
    "first job tax return canada",
    "gig worker taxes canada",
    "tuition tax credit canada",
    "how to file taxes canada first time",
    "first time filer canada 2025",
    "canada tax return student",
    "t2202 tuition credit calculator",
    "first time filing taxes canada",
    "uber doordash taxes canada",
  ],
  openGraph: {
    title: "First Time Tax Filer Calculator Canada 2025",
    description: "Students, first jobs, gig workers — calculate your first Canadian tax return, refund, tuition credits, and GST credit.",
    url: "https://canadiancalculators.ca/calculators/first-time-filer",
    siteName: "Canadian Calculators",
    locale: "en_CA",
    type: "website",
  },
  alternates: {
    canonical: "https://canadiancalculators.ca/calculators/first-time-filer",
  },
};

export default function FirstTimeFilingPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-black text-gray-900">
            First Time Tax Filer Calculator
          </h1>
          <p className="text-gray-500 mt-2 text-base">
            Students, first jobs, gig workers, and anyone filing for the first time. Estimate your refund, tuition credits, CPP/EI, and benefits — plus a step-by-step checklist to get it done.
          </p>
        </div>
        <FirstTimeFilingClient />
      </div>
    </main>
  );
}
