// app/calculators/gic-hisa/page.tsx

import GICHISAClient from "./GICHISAClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GIC & HISA Interest Calculator Canada 2025 | Canadian Calculators",
  description:
    "Calculate compound interest on Canadian GICs and high-interest savings accounts. Compare rates, compounding frequencies, account types, and tax impact. Includes year-by-year schedule.",
};

export default function GICHISAPage() {
  return <GICHISAClient />;
}
