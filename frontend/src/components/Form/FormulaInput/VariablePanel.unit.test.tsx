import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import VariablePanel from './VariablePanel';

vi.mock('@/components/core/Tags/ColorTag', () => ({
  default: ({
    value,
    colorType,
    tooltipLabel,
    contentMode,
    textCaseMode,
    className,
  }: {
    value: { code: string; description: string };
    colorType: string;
    tooltipLabel: string;
    contentMode: string;
    textCaseMode: string;
    className: string;
  }) => (
    <span
      data-testid={`color-tag-${value.code}`}
      data-color-type={colorType}
      data-tooltip-label={tooltipLabel}
      data-content-mode={contentMode}
      data-text-case-mode={textCaseMode}
      data-class-name={className}
    >
      {`${value.code}=${value.description}`}
    </span>
  ),
}));

describe('VariablePanel', () => {
  it('shouldRenderNothing_whenEntriesAreEmpty', () => {
    const { container } = render(
      <VariablePanel label="Fixed parameters" entries={[]} tagType="blue" usedSet={new Set()} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('shouldRenderLabelAndEntries_whenEntriesAreProvided', () => {
    render(
      <VariablePanel
        label="Fixed parameters"
        entries={[
          ['taxRate', 12.5],
          ['basePrice', 100],
        ]}
        tagType="blue"
        usedSet={new Set(['taxRate'])}
      />,
    );

    screen.getByText('Fixed parameters');

    const list = screen.getByRole('list');
    const listItems = within(list).getAllByRole('listitem');
    expect(listItems).toHaveLength(2);

    screen.getByText('taxRate=12.5');
    screen.getByText('basePrice=100');
  });

  it('shouldApplyUsedAndUnusedTagProps_whenUsedSetContainsOnlySomeEntries', () => {
    render(
      <VariablePanel
        label="Dynamic parameters"
        entries={[
          ['hours', 8],
          ['rate', 99],
        ]}
        tagType="teal"
        usedSet={new Set(['hours'])}
      />,
    );

    const usedTag = screen.getByTestId('color-tag-hours');
    expect(usedTag.dataset.colorType).toBe('teal');
    expect(usedTag.dataset.tooltipLabel).toBe('Used in current formula');
    expect(usedTag.dataset.contentMode).toBe('code-equals-description');
    expect(usedTag.dataset.textCaseMode).toBe('preserve');
    expect(usedTag.dataset.className).toContain('formula-input__tag');
    expect(usedTag.dataset.className).toContain('formula-input__tag--used');

    const unusedTag = screen.getByTestId('color-tag-rate');
    expect(unusedTag.dataset.colorType).toBe('gray');
    expect(unusedTag.dataset.tooltipLabel).toBe('Available but not used');
    expect(unusedTag.dataset.contentMode).toBe('code-equals-description');
    expect(unusedTag.dataset.textCaseMode).toBe('preserve');
    expect(unusedTag.dataset.className).toContain('formula-input__tag');
    expect(unusedTag.dataset.className).not.toContain('formula-input__tag--used');
  });
});
