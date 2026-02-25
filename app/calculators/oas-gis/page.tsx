// app/calculators/oas-gis/page.tsx

import OASGISClient from "./OASGISClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OAS & GIS Calculator Canada 2025 | Canadian Calculators",
  description:
    "Estimate your Old Age Security (OAS) and Guaranteed Income Supplement (GIS) for 2025. Includes clawback calculator, deferral comparison, Allowance for spouses, and total retirement income.",
};

export default function OASGISPage() {
  return <OASGISClient />;
}
