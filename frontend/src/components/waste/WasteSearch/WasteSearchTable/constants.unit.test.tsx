import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { headers } from './constants';

describe('WasteSearchTable Constants', () => {
  describe('headers', () => {
    it('should export headers array', () => {
      expect(headers).toBeDefined();
      expect(Array.isArray(headers)).toBe(true);
      expect(headers.length).toBeGreaterThan(0);
    });

    it('should have required header properties', () => {
      headers.forEach((header) => {
        expect(header.key).toBeDefined();
        expect(header.header).toBeDefined();
      });
    });

    it('should have cutBlockId header with renderAs', () => {
      const cutBlockIdHeader = headers.find((h) => h.key === 'cutBlockId');
      expect(cutBlockIdHeader).toBeDefined();
      expect(cutBlockIdHeader?.renderAs).toBeDefined();
    });

    it('should render EmptyValueTag for string values using renderAs', () => {
      const headers_with_renderAs = headers.filter((h) => h.renderAs);
      const emptyValueTagHeaders = ['cutBlockId', 'licenseNumber', 'cuttingPermit', 'timberMark'];

      emptyValueTagHeaders.forEach((key) => {
        const header = headers_with_renderAs.find((h) => h.key === key);
        expect(header).toBeDefined();

        if (header?.renderAs) {
          const result = header.renderAs('test-value');
          expect(result).toBeDefined();

          const { container } = render(result);
          expect(container.firstChild).toBeDefined();
        }
      });
    });

    it('should handle empty/null values in EmptyValueTag renderAs', () => {
      const cutBlockIdHeader = headers.find((h) => h.key === 'cutBlockId');

      if (cutBlockIdHeader?.renderAs) {
        const emptyResult = cutBlockIdHeader.renderAs('');
        expect(emptyResult).toBeDefined();

        const { container: emptyContainer } = render(emptyResult);
        expect(emptyContainer.firstChild).toBeDefined();

        const nullResult = cutBlockIdHeader.renderAs(null);
        expect(nullResult).toBeDefined();

        const { container: nullContainer } = render(nullResult);
        expect(nullContainer.firstChild).toBeDefined();
      }
    });

    it('should use the same renderAs function for all EmptyValueTag columns', () => {
      const emptyValueTagKeys = ['cutBlockId', 'licenseNumber', 'cuttingPermit', 'timberMark'];

      const renderFunctions = emptyValueTagKeys
        .map((key) => {
          const header = headers.find((h) => h.key === key);
          return header?.renderAs;
        })
        .filter((fn) => fn !== undefined);

      const firstRender = renderFunctions[0];
      renderFunctions.forEach((renderFn) => {
        expect(renderFn).toBe(firstRender);
      });
    });

    it('should have correct header properties for EmptyValueTag columns', () => {
      const expectedHeaders = [
        { key: 'cutBlockId', header: 'Block ID', sortable: true, selected: true },
        {
          key: 'licenseNumber',
          header: 'Licence No.',
          sortable: true,
          selected: false,
        },
        {
          key: 'cuttingPermit',
          header: 'Cutting Permit',
          sortable: true,
          selected: false,
        },
        {
          key: 'timberMark',
          header: 'Timber Mark',
          sortable: true,
          selected: false,
        },
      ];

      expectedHeaders.forEach((expectedHeader) => {
        const header = headers.find((h) => h.key === expectedHeader.key);
        expect(header?.key).toBe(expectedHeader.key);
        expect(header?.header).toBe(expectedHeader.header);
        expect(header?.sortable).toBe(expectedHeader.sortable);
        expect(header?.selected).toBe(expectedHeader.selected);
      });
    });
  });
});
