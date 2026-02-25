// app/calculators/rrsp-contribution/page.tsx

import RRSPContributionClient from "./RRSPContributionClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RRSP Contribution Room Calculator 2025 | Canadian Calculators",
  description:
    "Calculate your available RRSP contribution room for 2024 and 2025. See your estimated tax refund, over-contribution warnings, pension adjustment impact, and projected growth.",
};

export default function RRSPContributionPage() {
  return <RRSPContributionClient />;
}
