// app/calculators/mortgage-payment/page.tsx

import MortgagePaymentClient from "./MortgagePaymentClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mortgage Payment Calculator Canada 2025 | Canadian Calculators",
  description:
    "Calculate your Canadian mortgage payment with CMHC insurance, stress test, full amortization schedule, and extra payment savings. All provinces, all amortization periods.",
};

export default function MortgagePaymentPage() {
  return <MortgagePaymentClient />;
}
