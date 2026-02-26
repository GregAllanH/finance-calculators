// app/calculators/mortgage-refinance/page.tsx

import Client from "./Client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mortgage Refinance Break-Even Calculator Canada 2025 | Canadian Calculators",
  description:
    "Should you break your mortgage early? Calculate the IRD penalty, total refinancing costs, monthly savings, and exact break-even point. Covers big bank vs monoline penalties.",
};

export default function MortgageRefinancePage() {
  return <Client />;
}
