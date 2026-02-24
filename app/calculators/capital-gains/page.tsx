// app/calculators/capital-gains/page.tsx

import CapitalGainsClient from "./CapitalGainsClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Capital Gains Tax Calculator Canada 2025 | Canadian Calculators",
  description:
    "Calculate your Canadian capital gains tax under the 2024 inclusion rate changes. Compare old vs new rules, apply principal residence exemption, and see your net proceeds.",
};

export default function CapitalGainsPage() {
  return <CapitalGainsClient />;
}
