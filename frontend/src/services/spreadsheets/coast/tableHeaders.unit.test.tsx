import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { toCoastTableHeader } from './tableHeaders';

describe('toCoastTableHeader', () => {
  it('maps District column header', () => {
    const header = toCoastTableHeader({ key: 'district', header: 'District' });
    expect(header).toEqual({
      key: 'district',
      header: 'District',
      sortable: false,
      selected: true,
      renderAs: expect.any(Function),
    });
  });

  it('maps columnMap property with corrected header name', () => {
    const header = toCoastTableHeader({
      key: 'matureAvoidableSawlog',
      header: 'Mature - Avoidable Sawlog',
    });
    expect(header.key).toBe('matureAvoidableSawlog');
    expect(header.header).toBe('Mature - Avoidable Sawlog');
  });

  it('renderAs renders PrecisionNumberTag with 3-digit precision', () => {
    const header = toCoastTableHeader({
      key: 'matureTotal',
      header: 'Mature - Total',
    });

    const { container } = render(<>{header.renderAs?.(3.14159)}</>);
    const span = container.querySelector('span');
    expect(span).toBeDefined();
    expect(span?.textContent).toBe('3.142');
  });

  it('renderAs handles null value', () => {
    const header = toCoastTableHeader({
      key: 'matureTotal',
      header: 'Mature - Total',
    });

    const { container } = render(<>{header.renderAs?.(null)}</>);
    const span = container.querySelector('span');
    expect(span).toBeDefined();
  });

  it('produces consistent output for all column map entries', () => {
    const keys = [
      { key: 'matureAvoidableSawlog', header: 'Mature - Avoidable Sawlog' },
      { key: 'matureAvoidable025', header: 'Mature - Avoidable 0.25' },
      { key: 'matureAvoidableGradeY', header: 'Mature - Avoidable Grade Y' },
      { key: 'matureUnavoidableGradeY', header: 'Mature - Unavoidable Grade Y' },
      { key: 'immatureAvoidableSawlog', header: 'Immature - Avoidable Sawlog' },
      { key: 'immatureAvoidable025', header: 'Immature - Avoidable 0.25' },
      { key: 'immatureAvoidableGradeY', header: 'Immature - Avoidable Grade Y' },
      { key: 'immatureUnavoidableGradeY', header: 'Immature - Unavoidable Grade Y' },
      { key: 'heliMultiplier', header: 'Heli Multiplier' },
    ];
    for (const col of keys) {
      const result = toCoastTableHeader(col);
      expect(result.key).toBe(col.key);
      expect(result.header).toBe(col.header);
      expect(typeof result.renderAs).toBe('function');
    }
  });
});
