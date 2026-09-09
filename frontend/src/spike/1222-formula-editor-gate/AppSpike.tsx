import React from 'react';
import { FormulaInput } from './Form/FormulaInput/index.tsx';

export const AppSpike: React.FC = () => {
  const fixedParams = { tax_rate: 0.15, basePrice: 100 };
  const dynamicParams = { quantity: 5, discount: 0.1 };

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h1>Formula Editor Spike - Monaco</h1>
      <FormulaInput
        fixedParams={fixedParams}
        dynamicParams={dynamicParams}
        initialFormula="basePrice * quantity * (1 - discount) * (1 + tax_rate)"
        ariaLabel="Spike formula editor"
        displayResult
        displayDependencyGraph
      />
    </div>
  );
};
