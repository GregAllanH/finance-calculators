// app/calculators/tfsa-growth/page.tsx

import TFSAGrowthClient from "./TFSAGrowthClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TFSA Growth Calculator Canada 2025 | Canadian Calculators",
  description:
    "Project your TFSA balance over time. See tax-free growth milestones, compare investment types, track your contribution room, and find out how much the TFSA saves you in tax.",
};

export default function TFSAGrowthPage() {
  return <TFSAGrowthClient />;
}
