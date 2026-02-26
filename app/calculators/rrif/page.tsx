// app/calculators/rrif/page.tsx

import RRIFClient from "./RRIFClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RRIF Withdrawal Calculator Canada 2025 | Canadian Calculators",
  description:
    "Calculate RRIF mandatory minimum withdrawals by age, tax impact, OAS clawback risk, and how long your RRIF will last. Includes spouse age election, year-by-year schedule, and meltdown strategy tips.",
};

export default function RRIFPage() {
  return <RRIFClient />;
}
