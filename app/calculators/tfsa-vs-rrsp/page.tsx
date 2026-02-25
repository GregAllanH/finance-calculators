// app/calculators/tfsa-vs-rrsp/page.tsx

import TFSAvsRRSPClient from "./TFSAvsRRSPClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TFSA vs RRSP Calculator Canada 2025 | Canadian Calculators",
  description:
    "Find out whether TFSA or RRSP is better for your situation. Side-by-side after-tax comparison, break-even retirement rate, refund reinvestment strategy, and personalized recommendation.",
};

export default function TFSAvsRRSPPage() {
  return <TFSAvsRRSPClient />;
}
