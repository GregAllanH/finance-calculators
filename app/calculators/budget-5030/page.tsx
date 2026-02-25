// app/calculators/budget-5030/page.tsx

import Budget5030Client from "./Budget5030Client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "50/30/20 Budget Calculator Canada 2025 | Canadian Calculators",
  description:
    "Calculate your 50/30/20 budget based on your Canadian take-home pay. See exactly how much to spend on needs, wants, and savings — and where you're over or under target.",
};

export default function Budget5030Page() {
  return <Budget5030Client />;
}
