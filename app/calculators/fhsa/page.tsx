// app/calculators/fhsa/page.tsx

import FHSAClient from "./FHSAClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FHSA Calculator 2025 | First Home Savings Account | Canadian Calculators",
  description:
    "Calculate your First Home Savings Account (FHSA) growth, tax savings, and years to your down payment goal. Compare FHSA vs RRSP for your first home purchase.",
};

export default function FHSAPage() {
  return <FHSAClient />;
}
