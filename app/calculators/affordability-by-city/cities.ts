// app/calculators/affordability-by-city/cities.ts
// Last updated: March 2025
// Sources: CREA, municipal tax websites, CMHC, Statistics Canada

export type City = {
  name:           string;
  province:       string;
  provinceCode:   string;
  medianPrice:    number;   // median home price (all types)
  medianCondo:    number;   // median condo/apt price
  medianDetached: number;   // median detached house price
  propTaxRate:    number;   // property tax rate (%)
  avgCondoFee:    number;   // avg monthly condo fee
  avgHeating:     number;   // avg monthly heating cost
  avgRent1br:     number;   // avg 1-bedroom rent
  avgRent2br:     number;   // avg 2-bedroom rent
  medianHHIncome: number;   // median household income
  population:     string;   // city population range label
  notes:          string;   // notable context
};

export const CITIES: City[] = [
  // ── British Columbia ───────────────────────────────────────────────────────
  {
    name: "Vancouver",
    province: "British Columbia", provinceCode: "BC",
    medianPrice: 1195000, medianCondo: 745000, medianDetached: 1850000,
    propTaxRate: 0.27958, avgCondoFee: 650, avgHeating: 100,
    avgRent1br: 2850, avgRent2br: 3750,
    medianHHIncome: 92000,
    population: "2.5M+ (Metro)",
    notes: "Most expensive market in Canada. Foreign buyer tax applies.",
  },
  {
    name: "Victoria",
    province: "British Columbia", provinceCode: "BC",
    medianPrice: 895000, medianCondo: 595000, medianDetached: 1150000,
    propTaxRate: 0.52044, avgCondoFee: 500, avgHeating: 90,
    avgRent1br: 2100, avgRent2br: 2750,
    medianHHIncome: 88000,
    population: "400K+ (Metro)",
    notes: "Strong demand from retirees and remote workers.",
  },
  {
    name: "Kelowna",
    province: "British Columbia", provinceCode: "BC",
    medianPrice: 795000, medianCondo: 490000, medianDetached: 1000000,
    propTaxRate: 0.56870, avgCondoFee: 420, avgHeating: 110,
    avgRent1br: 1900, avgRent2br: 2400,
    medianHHIncome: 82000,
    population: "200K+ (Metro)",
    notes: "Fast-growing Okanagan market. Popular with remote workers.",
  },
  // ── Alberta ────────────────────────────────────────────────────────────────
  {
    name: "Calgary",
    province: "Alberta", provinceCode: "AB",
    medianPrice: 595000, medianCondo: 310000, medianDetached: 750000,
    propTaxRate: 0.65340, avgCondoFee: 550, avgHeating: 160,
    avgRent1br: 1900, avgRent2br: 2400,
    medianHHIncome: 107000,
    population: "1.4M+ (Metro)",
    notes: "No provincial land transfer tax. Strong job market.",
  },
  {
    name: "Edmonton",
    province: "Alberta", provinceCode: "AB",
    medianPrice: 420000, medianCondo: 195000, medianDetached: 510000,
    propTaxRate: 0.86869, avgCondoFee: 450, avgHeating: 160,
    avgRent1br: 1450, avgRent2br: 1850,
    medianHHIncome: 98000,
    population: "1.5M+ (Metro)",
    notes: "Most affordable major city in Canada. No provincial LTT.",
  },
  // ── Saskatchewan ──────────────────────────────────────────────────────────
  {
    name: "Saskatoon",
    province: "Saskatchewan", provinceCode: "SK",
    medianPrice: 355000, medianCondo: 210000, medianDetached: 430000,
    propTaxRate: 1.07260, avgCondoFee: 380, avgHeating: 150,
    avgRent1br: 1250, avgRent2br: 1600,
    medianHHIncome: 90000,
    population: "330K+ (Metro)",
    notes: "No provincial land transfer tax in Saskatchewan.",
  },
  {
    name: "Regina",
    province: "Saskatchewan", provinceCode: "SK",
    medianPrice: 310000, medianCondo: 175000, medianDetached: 370000,
    propTaxRate: 1.29890, avgCondoFee: 340, avgHeating: 155,
    avgRent1br: 1150, avgRent2br: 1450,
    medianHHIncome: 87000,
    population: "250K+ (Metro)",
    notes: "Among the most affordable cities in Canada.",
  },
  // ── Manitoba ──────────────────────────────────────────────────────────────
  {
    name: "Winnipeg",
    province: "Manitoba", provinceCode: "MB",
    medianPrice: 375000, medianCondo: 230000, medianDetached: 450000,
    propTaxRate: 1.29660, avgCondoFee: 390, avgHeating: 160,
    avgRent1br: 1350, avgRent2br: 1700,
    medianHHIncome: 85000,
    population: "870K+ (Metro)",
    notes: "Stable market with strong rental demand.",
  },
  // ── Ontario ───────────────────────────────────────────────────────────────
  {
    name: "Toronto",
    province: "Ontario", provinceCode: "ON",
    medianPrice: 1080000, medianCondo: 695000, medianDetached: 1500000,
    propTaxRate: 0.66390, avgCondoFee: 700, avgHeating: 130,
    avgRent1br: 2500, avgRent2br: 3300,
    medianHHIncome: 96000,
    population: "6.2M+ (Metro)",
    notes: "Double land transfer tax (provincial + municipal).",
  },
  {
    name: "Ottawa",
    province: "Ontario", provinceCode: "ON",
    medianPrice: 665000, medianCondo: 415000, medianDetached: 820000,
    propTaxRate: 1.07670, avgCondoFee: 520, avgHeating: 145,
    avgRent1br: 2050, avgRent2br: 2600,
    medianHHIncome: 102000,
    population: "1.4M+ (Metro)",
    notes: "Stable government-driven market. High incomes offset costs.",
  },
  {
    name: "Hamilton",
    province: "Ontario", provinceCode: "ON",
    medianPrice: 735000, medianCondo: 490000, medianDetached: 890000,
    propTaxRate: 1.26150, avgCondoFee: 490, avgHeating: 140,
    avgRent1br: 1850, avgRent2br: 2350,
    medianHHIncome: 84000,
    population: "800K+ (Metro)",
    notes: "Popular Toronto commuter market. High property tax rate.",
  },
  {
    name: "London",
    province: "Ontario", provinceCode: "ON",
    medianPrice: 625000, medianCondo: 390000, medianDetached: 750000,
    propTaxRate: 1.38610, avgCondoFee: 430, avgHeating: 145,
    avgRent1br: 1700, avgRent2br: 2150,
    medianHHIncome: 80000,
    population: "540K+ (Metro)",
    notes: "University town with growing tech sector.",
  },
  {
    name: "Kitchener-Waterloo",
    province: "Ontario", provinceCode: "ON",
    medianPrice: 720000, medianCondo: 465000, medianDetached: 870000,
    propTaxRate: 1.14920, avgCondoFee: 460, avgHeating: 140,
    avgRent1br: 1900, avgRent2br: 2400,
    medianHHIncome: 91000,
    population: "600K+ (Metro)",
    notes: "Canada's Tech Triangle — strong employment base.",
  },
  // ── Quebec ────────────────────────────────────────────────────────────────
  {
    name: "Montreal",
    province: "Quebec", provinceCode: "QC",
    medianPrice: 545000, medianCondo: 390000, medianDetached: 720000,
    propTaxRate: 0.76720, avgCondoFee: 480, avgHeating: 110,
    avgRent1br: 1650, avgRent2br: 2100,
    medianHHIncome: 78000,
    population: "4.2M+ (Metro)",
    notes: "Welcome Tax (Land Transfer Tax) varies by municipality.",
  },
  {
    name: "Quebec City",
    province: "Quebec", provinceCode: "QC",
    medianPrice: 365000, medianCondo: 255000, medianDetached: 435000,
    propTaxRate: 0.98750, avgCondoFee: 380, avgHeating: 115,
    avgRent1br: 1250, avgRent2br: 1600,
    medianHHIncome: 80000,
    population: "830K+ (Metro)",
    notes: "Stable, affordable market with strong public sector employment.",
  },
  // ── Nova Scotia ───────────────────────────────────────────────────────────
  {
    name: "Halifax",
    province: "Nova Scotia", provinceCode: "NS",
    medianPrice: 510000, medianCondo: 380000, medianDetached: 620000,
    propTaxRate: 1.10770, avgCondoFee: 430, avgHeating: 160,
    avgRent1br: 1950, avgRent2br: 2450,
    medianHHIncome: 82000,
    population: "470K+ (Metro)",
    notes: "Fastest-growing Atlantic city. Significant interprovincial migration.",
  },
  // ── New Brunswick ─────────────────────────────────────────────────────────
  {
    name: "Moncton",
    province: "New Brunswick", provinceCode: "NB",
    medianPrice: 310000, medianCondo: 215000, medianDetached: 365000,
    propTaxRate: 1.42140, avgCondoFee: 340, avgHeating: 155,
    avgRent1br: 1350, avgRent2br: 1700,
    medianHHIncome: 73000,
    population: "170K+ (Metro)",
    notes: "Bilingual city with rapid price appreciation since 2020.",
  },
  {
    name: "Fredericton",
    province: "New Brunswick", provinceCode: "NB",
    medianPrice: 290000, medianCondo: 195000, medianDetached: 340000,
    propTaxRate: 1.37200, avgCondoFee: 320, avgHeating: 155,
    avgRent1br: 1250, avgRent2br: 1600,
    medianHHIncome: 76000,
    population: "100K+ (Metro)",
    notes: "Capital city — stable government employment.",
  },
  // ── Newfoundland ──────────────────────────────────────────────────────────
  {
    name: "St. John's",
    province: "Newfoundland & Labrador", provinceCode: "NL",
    medianPrice: 330000, medianCondo: 220000, medianDetached: 385000,
    propTaxRate: 0.79500, avgCondoFee: 350, avgHeating: 180,
    avgRent1br: 1300, avgRent2br: 1650,
    medianHHIncome: 83000,
    population: "215K+ (Metro)",
    notes: "Oil-driven economy. High heating costs due to climate.",
  },
  // ── PEI ───────────────────────────────────────────────────────────────────
  {
    name: "Charlottetown",
    province: "Prince Edward Island", provinceCode: "PE",
    medianPrice: 380000, medianCondo: 265000, medianDetached: 445000,
    propTaxRate: 0.67000, avgCondoFee: 360, avgHeating: 160,
    avgRent1br: 1550, avgRent2br: 1950,
    medianHHIncome: 74000,
    population: "75K+ (Metro)",
    notes: "Island market — limited supply driving significant price growth.",
  },
];

export const PROVINCE_LTT: Record<string, {
  calculate: (price: number, firstTime: boolean) => number;
  hasMunicipalLTT?: boolean;
  municipalLTT?: (price: number, firstTime: boolean) => number;
  firstTimeRebate?: number;
  notes: string;
}> = {
  BC: {
    calculate: (price, _) => {
      let tax = 0;
      if (price <= 200000)       tax = price * 0.01;
      else if (price <= 2000000) tax = 2000 + (price - 200000) * 0.02;
      else if (price <= 3000000) tax = 38000 + (price - 2000000) * 0.03;
      else                       tax = 68000 + (price - 3000000) * 0.05;
      return tax;
    },
    firstTimeRebate: 8000,
    notes: "First-time buyer rebate up to $8,000 (max price $500k).",
  },
  AB: { calculate: () => 0, notes: "No provincial land transfer tax in Alberta." },
  SK: { calculate: () => 0, notes: "No provincial land transfer tax in Saskatchewan." },
  MB: {
    calculate: (price, _) => {
      let tax = 0;
      if (price <= 30000)        tax = 0;
      else if (price <= 90000)   tax = (price - 30000) * 0.005;
      else if (price <= 150000)  tax = 300 + (price - 90000) * 0.01;
      else if (price <= 200000)  tax = 900 + (price - 150000) * 0.015;
      else                       tax = 1650 + (price - 200000) * 0.02;
      return tax;
    },
    firstTimeRebate: 4500,
    notes: "First-time buyer rebate up to $4,500.",
  },
  ON: {
    calculate: (price, _) => {
      let tax = 0;
      if (price <= 55000)        tax = price * 0.005;
      else if (price <= 250000)  tax = 275 + (price - 55000) * 0.01;
      else if (price <= 400000)  tax = 2225 + (price - 250000) * 0.015;
      else if (price <= 2000000) tax = 4475 + (price - 400000) * 0.02;
      else                       tax = 36475 + (price - 2000000) * 0.025;
      return tax;
    },
    hasMunicipalLTT: true,
    municipalLTT: (price, _) => {
      let tax = 0;
      if (price <= 55000)        tax = price * 0.005;
      else if (price <= 250000)  tax = 275 + (price - 55000) * 0.01;
      else if (price <= 400000)  tax = 2225 + (price - 250000) * 0.015;
      else if (price <= 2000000) tax = 4475 + (price - 400000) * 0.02;
      else                       tax = 36475 + (price - 2000000) * 0.025;
      return tax;
    },
    firstTimeRebate: 4000,
    notes: "Toronto buyers pay double LTT (provincial + municipal).",
  },
  QC: {
    calculate: (price, _) => {
      let tax = 0;
      if (price <= 53200)        tax = price * 0.005;
      else if (price <= 266200)  tax = 266 + (price - 53200) * 0.01;
      else if (price <= 528300)  tax = 2398 + (price - 266200) * 0.015;
      else if (price <= 1056500) tax = 6331 + (price - 528300) * 0.02;
      else                       tax = 16895 + (price - 1056500) * 0.025;
      return tax;
    },
    notes: "Welcome Tax (Bienvenue Tax) — varies slightly by municipality.",
  },
  NB: {
    calculate: (price, _) => price * 0.01,
    notes: "Flat 1% land transfer tax.",
  },
  NS: {
    calculate: (price, _) => price * 0.015,
    notes: "Deed transfer tax 1–1.5% (varies by municipality).",
  },
  NL: {
    calculate: (price, _) => {
      if (price <= 500000) return price * 0.01;
      return 5000 + (price - 500000) * 0.015;
    },
    notes: "1% up to $500k, 1.5% above.",
  },
  PE: {
    calculate: (price, _) => Math.max(0, price - 30000) * 0.01,
    firstTimeRebate: 2000,
    notes: "First-time buyer rebate up to $2,000.",
  },
  NT: {
    calculate: (price, _) => {
      if (price <= 1000000) return price * 0.015;
      return 15000 + (price - 1000000) * 0.02;
    },
    notes: "1.5% up to $1M, 2% above.",
  },
  NU: { calculate: () => 0, notes: "No land transfer tax in Nunavut." },
  YT: { calculate: () => 0, notes: "No land transfer tax in Yukon." },
};
