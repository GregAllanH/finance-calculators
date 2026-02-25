// app/calculators/land-transfer-tax/page.tsx

import LandTransferTaxClient from "./LandTransferTaxClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Land Transfer Tax Calculator Canada 2025 | Canadian Calculators",
  description:
    "Calculate land transfer tax for every Canadian province. Includes Toronto municipal LTT, first-time buyer rebates, and a side-by-side province comparison.",
};

export default function LandTransferTaxPage() {
  return <LandTransferTaxClient />;
}
