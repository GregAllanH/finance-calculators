// app/calculators/affordability-by-city/page.tsx

import AffordabilityByCityClient from "./AffordabilityByCityClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home Affordability by City Canada 2025 | Canadian Calculators",
  description:
    "Compare home affordability across 20 Canadian cities. See where you qualify, monthly costs, income needed, land transfer tax, and rent vs own — side by side.",
};

export default function AffordabilityByCityPage() {
  return <AffordabilityByCityClient />;
}
