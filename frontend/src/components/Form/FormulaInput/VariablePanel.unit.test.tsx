import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import VariablePanel from './VariablePanel';

vi.mock('@/components/core/Tags/ColorTag', () => ({
  default: ({
    value,
    colorMap,
    showTooltip,
  }: {
    value: { code: string; description: string };
    colorMap: Record<string, string>;
    showTooltip?: boolean;
  }) => (
    <span
      data-testid={`color-tag-${value.code}`}
      data-color-map={JSON.stringify(colorMap)}
      data-show-tooltip={String(showTooltip)}
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
    expect(JSON.parse(usedTag.dataset.colorMap!)).toEqual({ hours: 'teal' });
    expect(usedTag.dataset.showTooltip).toBe('true');
    const usedLi = usedTag.closest('li');
    expect(usedLi).not.toBeNull();
    expect(usedLi!.className).toContain('formula-input__tag');
    expect(usedLi!.className).toContain('formula-input__tag--used');

    const unusedTag = screen.getByTestId('color-tag-rate');
    expect(JSON.parse(unusedTag.dataset.colorMap!)).toEqual({ rate: 'gray' });
    expect(unusedTag.dataset.showTooltip).toBe('true');
    const unusedLi = unusedTag.closest('li');
    expect(unusedLi).not.toBeNull();
    expect(unusedLi!.className).toContain('formula-input__tag');
    expect(unusedLi!.className).not.toContain('formula-input__tag--used');
  });
});
