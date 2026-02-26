// app/calculators/resp/page.tsx

import RESPClient from "./RESPClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RESP Calculator Canada 2025 | Canadian Calculators",
  description:
    "Project your child's RESP with CESG grants, Additional CESG, Canada Learning Bond, and Quebec QESI. Includes year-by-year schedule, university cost coverage, and grant maximization tips.",
};

export default function RESPPage() {
  return <RESPClient />;
}
