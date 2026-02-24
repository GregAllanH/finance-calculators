// app/calculators/mortgage-comparison/page.tsx

import MortgageComparisonClient from "./MortgageComparisonClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mortgage Amortization Comparison Calculator 2025 | Canadian Calculators",
  description:
    "Compare 15, 20, 25, and 30-year mortgage amortization periods side by side. See monthly payments, total interest paid, and how extra payments can save you thousands.",
};

export default function MortgageComparisonPage() {
  return <MortgageComparisonClient />;
}
