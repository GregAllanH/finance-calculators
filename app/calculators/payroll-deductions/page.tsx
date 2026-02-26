// app/calculators/payroll-deductions/page.tsx

import PayrollDeductionsClient from "./PayrollDeductionsClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payroll Deductions Calculator Canada 2025 | Canadian Calculators",
  description:
    "Calculate exact take-home pay after income tax, CPP/QPP, EI, RRSP, and benefits. All provinces, all pay frequencies. Includes pay stub view, annual summary, and raise impact calculator.",
};

export default function PayrollDeductionsPage() {
  return <PayrollDeductionsClient />;
}
