// app/calculators/self-employed-tax/page.tsx

import SelfEmployedTaxClient from "./SelfEmployedTaxClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Self-Employed Tax Calculator Canada 2025 | Canadian Calculators",
  description:
    "Calculate income tax, CPP (both sides), business deductions, and quarterly instalments for Canadian freelancers and self-employed. Includes HST threshold warning and RRSP savings.",
};

export default function SelfEmployedTaxPage() {
  return <SelfEmployedTaxClient />;
}
