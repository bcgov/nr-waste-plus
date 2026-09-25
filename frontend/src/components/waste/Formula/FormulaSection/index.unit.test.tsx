import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { FormulaKeyDefinition } from '@/services/formulaConfiguration.constants.ts';
import type { FormulaValidationError } from '@/services/formulaConfiguration.types.ts';

import FormulaSection from './index.tsx';

// ─── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('./FormulaRow.tsx', () => ({
  default: ({
    keyDef,
    onChange,
  }: {
    keyDef: FormulaKeyDefinition;
    onChange: (expression: string, validationErrors: FormulaValidationError[]) => void;
  }) => (
    <button
      data-testid={`formula-row-${keyDef.key}`}
      onClick={() => onChange('quantity * rate', [])}
    >
      simulate row change
    </button>
  ),
}));

// ─── Test Data ─────────────────────────────────────────────────────────────────

const firstKey: FormulaKeyDefinition = {
  key: 'block.waste.avoidable_sawlog',
  label: 'Avoidable Sawlog Volume',
};

const secondKey: FormulaKeyDefinition = {
  key: 'block.area.road',
  label: 'Road Area',
};

const defaultProps = {
  sectionName: 'Waste Volume Formulas',
  keys: [firstKey],
  area: 'INTERIOR' as const,
  date: '2025-01-15',
  formulas: [],
  isEditable: false,
  onChange: vi.fn(),
};

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('FormulaSection', () => {
  it('renders the section title and formula count', () => {
    render(<FormulaSection {...defaultProps} />);
    expect(screen.getByText('Waste Volume Formulas')).toBeTruthy();
    expect(screen.getByText('1 formula')).toBeTruthy();
  });

  it('pluralises the formula count when more than one key is present', () => {
    render(<FormulaSection {...defaultProps} keys={[firstKey, secondKey]} />);
    expect(screen.getByText('2 formulas')).toBeTruthy();
  });

  it('forwards a row change together with its section key', () => {
    const onChange = vi.fn();
    render(<FormulaSection {...defaultProps} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('formula-row-block.waste.avoidable_sawlog'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('block.waste.avoidable_sawlog', 'quantity * rate', []);
  });
});
