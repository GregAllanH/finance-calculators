// app/calculator/[slug]/CalculatorWrapper.tsx
'use client';

import Calculator from '@/components/Calculator';

interface WrapperProps {
  calcData: any;  // or use proper type later
}

export default function CalculatorWrapper({ calcData }: WrapperProps) {
  return (
    <Calculator 
      {...calcData}           // spreads title, fields, formula, formula_tfsa, formula_rrsp, etc.
      calcData={calcData}     // also pass the full object explicitly
    />
  );
}