# Copilot Agent Instructions for finance-calculators

## Project Overview
- **Type:** Next.js 16, React 19, TypeScript, TailwindCSS, mathjs
- **Purpose:** Canadian finance calculators (TFSA, RRSP, etc.) for accurate, user-friendly projections
- **Data-driven:** Calculator definitions and formulas are in `data/finance-calculators.json`

## Architecture & Data Flow
- **Main entry:** `app/page.tsx` lists calculators from `finance-calculators.json`
- **Calculator pages:** Dynamic route `app/calculator/[slug]/page.tsx` loads calculator config by slug, passes to `CalculatorWrapper.tsx`
- **UI logic:** `components/Calculator.tsx` renders fields, handles input, computes results using mathjs formulas
- **Formula modes:**
  - Single formula: `calcData.formula`
  - Comparator mode: `calcData.formula_tfsa` & `calcData.formula_rrsp` (TFSA vs RRSP)
- **Result display:** Handles both single and dual (comparator) outputs, with custom styling and error handling

## Developer Workflows
- **Start dev server:** `npm run dev` (or `yarn dev`, `pnpm dev`, `bun dev`)
- **Build:** `npm run build`
- **Lint:** `npm run lint` (uses `eslint.config.mjs`)
- **No explicit tests** (add if needed)
- **Deploy:** Standard Next.js/Vercel workflow

## Conventions & Patterns
- **Calculator config:** All calculator logic (fields, formulas, notes) is defined in JSON, not hardcoded
- **Formulas:** Use mathjs syntax; formulas are evaluated in `Calculator.tsx` with user input as scope
- **Error handling:** User input is validated; errors and missing fields are shown in result area
- **UI:** TailwindCSS for styling; custom font via `next/font` (Geist)
- **Disclaimer:** Prominently displayed on calculator pages (see `app/calculator/[slug]/page.tsx`)
- **Share button:** Optional, not enabled by default

## Integration Points
- **External:** mathjs for formula evaluation, Next.js for routing/UI, TailwindCSS for styling
- **Data:** All calculators and formulas are in `data/finance-calculators.json`

## Examples
- To add a new calculator: Update `finance-calculators.json` with new fields/formula, no code changes needed
- To change formula logic: Edit JSON, ensure mathjs syntax is valid
- To customize UI: Edit `Calculator.tsx` or Tailwind classes

## Key Files
- `data/finance-calculators.json`: Calculator configs & formulas
- `components/Calculator.tsx`: Core calculator logic & UI
- `app/calculator/[slug]/page.tsx`: Loads calculator config, handles not-found
- `app/calculator/[slug]/CalculatorWrapper.tsx`: Passes config to Calculator

---

If unclear, review the above files for examples. Ask for feedback if any section is incomplete or ambiguous.