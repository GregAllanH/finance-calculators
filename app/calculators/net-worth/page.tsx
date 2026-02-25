// app/calculators/net-worth/page.tsx

import NetWorthClient from "./NetWorthClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Net Worth Calculator Canada 2025 | Canadian Calculators",
  description:
    "Calculate your net worth — total assets minus liabilities. Compare to Canadian median by age group, see your debt-to-asset ratio, and get personalized tips to grow your wealth.",
};

export default function NetWorthPage() {
  return <NetWorthClient />;
}
