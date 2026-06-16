import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { toInteriorTableHeader } from './tableHeaders';

describe('toInteriorTableHeader', () => {
  it('maps District column header', () => {
    const header = toInteriorTableHeader({ key: 'district', header: 'District' });
    expect(header).toEqual({
      key: 'district',
      header: 'District',
      sortable: false,
      selected: true,
      renderAs: expect.any(Function),
    });
  });

  it('maps columnMap property with corrected header name', () => {
    const header = toInteriorTableHeader({
      key: 'dryBeltAvoidableSawlog',
      header: 'Dry Belt - Avoidable Sawlog',
    });
    expect(header.key).toBe('dryBeltAvoidableSawlog');
    expect(header.header).toBe('Dry Belt - Avoidable Sawlog');
  });

  it('renderAs renders PrecisionNumberTag with 3-digit precision', () => {
    const header = toInteriorTableHeader({
      key: 'dryBeltTotal',
      header: 'Dry Belt - Total',
    });

    const { container } = render(<>{header.renderAs?.(2.4567)}</>);
    const span = container.querySelector('span');
    expect(span).toBeDefined();
    expect(span?.textContent).toBe('2.457');
  });

  it('renderAs handles null value', () => {
    const header = toInteriorTableHeader({
      key: 'dryBeltTotal',
      header: 'Dry Belt - Total',
    });

    const { container } = render(<>{header.renderAs?.(null)}</>);
    const span = container.querySelector('span');
    expect(span).toBeDefined();
  });

  it('produces consistent output for all column map entries', () => {
    const keys = [
      { key: 'dryBeltAvoidableSawlog', header: 'Dry Belt - Avoidable Sawlog' },
      { key: 'dryBeltAvoidableGradeY4', header: 'Dry Belt - Grade Y/4' },
      { key: 'dryBeltUnavoidable', header: 'Dry Belt - Unavoidable' },
      { key: 'transitionZoneAvoidableSawlog', header: 'Transition - Avoidable Sawlog' },
      { key: 'transitionZoneAvoidableGradeY4', header: 'Transition - Grade Y/4' },
      { key: 'transitionZoneUnavoidable', header: 'Transition - Unavoidable' },
      { key: 'wetBeltAvoidableSawlog', header: 'Wet Belt - Avoidable Sawlog' },
      { key: 'wetBeltAvoidableGradeY4', header: 'Wet Belt - Grade Y/4' },
      { key: 'wetBeltUnavoidable', header: 'Wet Belt - Unavoidable' },
    ];
    for (const col of keys) {
      const result = toInteriorTableHeader(col);
      expect(result.key).toBe(col.key);
      expect(result.header).toBe(col.header);
      expect(typeof result.renderAs).toBe('function');
    }
  });
});
