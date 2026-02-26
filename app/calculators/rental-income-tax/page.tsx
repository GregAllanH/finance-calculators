// app/calculators/rental-income-tax/page.tsx

import RentalIncomeTaxClient from "./RentalIncomeTaxClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rental Income Tax Calculator Canada 2025 | Canadian Calculators",
  description:
    "Calculate net rental income, deductible expenses, CCA, and tax owing on your Canadian rental property. Covers T776, repairs vs improvements, rental losses, and partial use.",
};

export default function RentalIncomeTaxPage() {
  return <RentalIncomeTaxClient />;
}
