// app/calculators/cpp-benefits/page.tsx

import CPPClient from "./CPPClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CPP Benefits Estimator 2025 | Canadian Calculators",
  description:
    "Estimate your Canada Pension Plan (CPP) monthly payments. Compare taking CPP at 60, 65, or 70 and find your breakeven age. Free Canadian CPP calculator.",
};

export default function CPPPage() {
  return <CPPClient />;
}
