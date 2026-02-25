// app/calculators/charitable-donation/page.tsx

import CharitableDonationClient from "./CharitableDonationClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Charitable Donation Tax Credit Calculator Canada 2025 | Canadian Calculators",
  description:
    "Calculate your federal and provincial charitable donation tax credit. See what your donation actually costs after tax, compare provinces, and learn about the securities donation strategy.",
};

export default function CharitableDonationPage() {
  return <CharitableDonationClient />;
}
