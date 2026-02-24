// app/calculators/rent-vs-buy/page.tsx

import RentVsBuyClient from "./RentVsBuyClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rent vs Buy Calculator Canada 2025 | Canadian Calculators",
  description:
    "Should you rent or buy in Canada? Compare monthly costs, 10-year net worth, break-even year, and opportunity cost. Includes mortgage stress test and provincial down payment assistance programs.",
};

export default function RentVsBuyPage() {
  return <RentVsBuyClient />;
}
