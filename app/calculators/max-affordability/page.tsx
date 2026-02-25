// app/calculators/max-affordability/page.tsx

import MaxAffordabilityClient from "./MaxAffordabilityClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Maximum Home Affordability Calculator Canada 2025 | Canadian Calculators",
  description:
    "Find the maximum home price a Canadian lender will approve. Uses GDS/TDS ratios and the mortgage stress test. Includes CMHC insurance, debt impact, and conservative vs maximum scenarios.",
};

export default function MaxAffordabilityPage() {
  return <MaxAffordabilityClient />;
}
