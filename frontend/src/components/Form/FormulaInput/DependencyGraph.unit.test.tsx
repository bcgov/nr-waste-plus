import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import DependencyGraph, { resolveVariableClassification } from './DependencyGraph';

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

describe('resolveVariableClassification', () => {
  it('shouldReturnBlueAndFixed_whenNameIsInFixedParamNames', () => {
    const result = resolveVariableClassification('rate', new Set(['rate']), new Set());
    expect(result.color).toBe('blue');
    expect(result.label).toBe('fixed');
  });

  it('shouldReturnTealAndDynamic_whenNameIsInDynamicParamNames', () => {
    const result = resolveVariableClassification('qty', new Set(), new Set(['qty']));
    expect(result.color).toBe('teal');
    expect(result.label).toBe('dynamic');
  });

  it('shouldReturnGreenAndNotClassified_whenNameIsInNeither', () => {
    const result = resolveVariableClassification('other', new Set(), new Set());
    expect(result.color).toBe('green');
    expect(result.label).toBe('not classified');
  });

  it('shouldPreferFixed_whenNameIsInBothSets', () => {
    const result = resolveVariableClassification(
      'overlap',
      new Set(['overlap']),
      new Set(['overlap']),
    );
    expect(result.color).toBe('blue');
    expect(result.label).toBe('fixed');
  });
});

describe('DependencyGraph', () => {
  it('shouldRenderNothing_whenUsedVariablesIsEmpty', () => {
    const { container } = render(
      <DependencyGraph
        usedVariables={[]}
        mergedScope={{}}
        fixedParamNames={new Set()}
        dynamicParamNames={new Set()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('shouldRenderLabelAndList_whenUsedVariablesAreProvided', () => {
    render(
      <DependencyGraph
        usedVariables={['taxRate']}
        mergedScope={{ taxRate: 10 }}
        fixedParamNames={new Set(['taxRate'])}
        dynamicParamNames={new Set()}
      />,
    );

    screen.getByText('Variables used in formula');
    screen.getByRole('list');
  });

  it('shouldRenderAsRegion_whenUsedVariablesAreProvided', () => {
    render(
      <DependencyGraph
        usedVariables={['taxRate']}
        mergedScope={{ taxRate: 10 }}
        fixedParamNames={new Set(['taxRate'])}
        dynamicParamNames={new Set()}
      />,
    );

    screen.getByRole('region', { name: 'Dependency graph' });
  });

  it('shouldAssociateListWithSectionLabel_viaAriaLabelledBy', () => {
    render(
      <DependencyGraph
        usedVariables={['taxRate']}
        mergedScope={{ taxRate: 10 }}
        fixedParamNames={new Set(['taxRate'])}
        dynamicParamNames={new Set()}
      />,
    );

    screen.getByRole('list', { name: 'Variables used in formula' });
  });

  it('shouldApplyBlueColorAndFixedTooltip_whenVariableIsFixed', () => {
    render(
      <DependencyGraph
        usedVariables={['taxRate']}
        mergedScope={{ taxRate: 12.5 }}
        fixedParamNames={new Set(['taxRate'])}
        dynamicParamNames={new Set()}
      />,
    );

    const tag = screen.getByTestId('color-tag-taxRate');
    expect(JSON.parse(tag.dataset.colorMap!)).toEqual({ taxRate: 'blue' });
    expect(tag.dataset.showTooltip).toBe('true');
    expect(tag.textContent).toBe('taxRate=12.5');
  });

  it('shouldApplyTealColorAndDynamicTooltip_whenVariableIsDynamic', () => {
    render(
      <DependencyGraph
        usedVariables={['hours']}
        mergedScope={{ hours: 8 }}
        fixedParamNames={new Set()}
        dynamicParamNames={new Set(['hours'])}
      />,
    );

    const tag = screen.getByTestId('color-tag-hours');
    expect(JSON.parse(tag.dataset.colorMap!)).toEqual({ hours: 'teal' });
    expect(tag.dataset.showTooltip).toBe('true');
    expect(tag.textContent).toBe('hours=8');
  });

  it('shouldApplyGreenColorAndNotClassifiedTooltip_whenVariableIsInScopeOnly', () => {
    render(
      <DependencyGraph
        usedVariables={['someVar']}
        mergedScope={{ someVar: 99 }}
        fixedParamNames={new Set()}
        dynamicParamNames={new Set()}
      />,
    );

    const tag = screen.getByTestId('color-tag-someVar');
    expect(JSON.parse(tag.dataset.colorMap!)).toEqual({ someVar: 'green' });
    expect(tag.dataset.showTooltip).toBe('true');
    expect(tag.textContent).toBe('someVar=99');
  });

  it('shouldPreferFixedClassification_whenVariableExistsInBothSets', () => {
    render(
      <DependencyGraph
        usedVariables={['overlap']}
        mergedScope={{ overlap: 5 }}
        fixedParamNames={new Set(['overlap'])}
        dynamicParamNames={new Set(['overlap'])}
      />,
    );

    const tag = screen.getByTestId('color-tag-overlap');
    expect(JSON.parse(tag.dataset.colorMap!)).toEqual({ overlap: 'blue' });
    expect(tag.dataset.showTooltip).toBe('true');
  });

  it('shouldShowNA_whenVariableIsAbsentFromMergedScope', () => {
    render(
      <DependencyGraph
        usedVariables={['missing']}
        mergedScope={{}}
        fixedParamNames={new Set()}
        dynamicParamNames={new Set()}
      />,
    );

    const tag = screen.getByTestId('color-tag-missing');
    expect(tag.textContent).toBe('missing=N/A');
  });

  it('shouldRenderOneTagPerVariable_whenMultipleUsedVariablesProvided', () => {
    render(
      <DependencyGraph
        usedVariables={['a', 'b', 'c']}
        mergedScope={{ a: 1, b: 2, c: 3 }}
        fixedParamNames={new Set(['a'])}
        dynamicParamNames={new Set(['b'])}
      />,
    );

    const list = screen.getByRole('list');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(3);
  });

  it('shouldApplyCorrectTagPropsToAllVariables_whenRendering', () => {
    render(
      <DependencyGraph
        usedVariables={['rate']}
        mergedScope={{ rate: 7 }}
        fixedParamNames={new Set(['rate'])}
        dynamicParamNames={new Set()}
      />,
    );

    const tag = screen.getByTestId('color-tag-rate');
    const li = tag.closest('li');
    expect(JSON.parse(tag.dataset.colorMap!)).toEqual({ rate: 'blue' });
    expect(tag.dataset.showTooltip).toBe('true');
    expect(li).not.toBeNull();
    expect(li!.className).toContain('formula-input__tag');
    expect(li!.className).toContain('formula-input__tag--used');
  });
});
