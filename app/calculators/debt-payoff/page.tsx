// app/calculators/debt-payoff/page.tsx

import DebtPayoffClient from "./DebtPayoffClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Debt Payoff Calculator Canada 2025 | Canadian Calculators",
  description:
    "Calculate how fast you can pay off credit card and line of credit debt. Compare avalanche vs snowball strategies, see the impact of extra payments, and explore refinancing options.",
};

export default function DebtPayoffPage() {
  return <DebtPayoffClient />;
}
