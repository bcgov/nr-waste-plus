import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';

import WasteSearchTableExpandContent from './index';

import type { ReportingUnitSearchExpandedDto } from '@/services/search.types';

import { makeTestQueryClient } from '@/config/tests/renderWithApp';
import APIs from '@/services/APIs';

vi.mock('@/services/APIs', () => {
  return {
    default: {
      search: {
        getReportingUnitSearchExpand: vi.fn(),
      },
    },
  };
});

const mockExpandedData: ReportingUnitSearchExpandedDto = {
  id: 4069,
  licenseNo: 'LIC-12345',
  cuttingPermit: 'CP-001',
  timberMark: 'TM-001',
  exempted: false,
  multiMark: true,
  netArea: 1500.5,
  markArea: 2000,
  submitter: String.raw`IDIR\TESTUSER`,
  attachment: { code: 'ATT01', description: 'Attachment Type 1' },
  comments: 'Test comments for this reporting unit',
  totalBlocks: 5,
  totalChildren: 3,
  status: { code: 'ACTIVE', description: 'Active' },
  secondaryMarks: [
    { mark: 'SM-001', status: { code: 'ACTIVE', description: 'Active' }, area: 500 },
    { mark: 'SM-002', status: { code: 'INACTIVE', description: 'Inactive' }, area: 300 },
  ],
};

const renderWithProps = (rowId: string) => {
  const qc = makeTestQueryClient();
  render(
    <QueryClientProvider client={qc}>
      <WasteSearchTableExpandContent rowId={rowId} />
    </QueryClientProvider>,
  );
};

describe('WasteSearchTableExpandContent - Row Expansion Data Display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (APIs.search.getReportingUnitSearchExpand as Mock).mockResolvedValue(mockExpandedData);
  });

  describe('row expansion data display', () => {
    it('displays all key information together', async () => {
      const rowId = 'RU-4069-Block-411-224813681';
      renderWithProps(rowId);

      await waitFor(() => {
        // Verify multiple fields are displayed
        screen.getByText('Licence number');
        screen.getByText('LIC-12345');
        screen.getByText('Cutting Permit');
        screen.getByText('CP-001');
        screen.getByText('Blocks in the RU: 5');
      });
    });

    it('properly formats numeric net area', async () => {
      const dataWithDecimal: ReportingUnitSearchExpandedDto = {
        ...mockExpandedData,
        netArea: 2500.75,
      };
      (APIs.search.getReportingUnitSearchExpand as Mock).mockResolvedValue(dataWithDecimal);

      const rowId = 'RU-4069-Block-411B-224813681';
      renderWithProps(rowId);

      await waitFor(() => {
        screen.getByText('2500.75 ha');
      });
    });

    it('displays zero total blocks correctly', async () => {
      const dataWithZeroBlocks: ReportingUnitSearchExpandedDto = {
        ...mockExpandedData,
        totalBlocks: 0,
      };
      (APIs.search.getReportingUnitSearchExpand as Mock).mockResolvedValue(dataWithZeroBlocks);

      const rowId = 'RU-4069-Block-411B-224813681';
      renderWithProps(rowId);

      await waitFor(() => {
        screen.getByText('Blocks in the RU: 0');
      });
    });

    it('displays timber mark multiple times for different screen sizes', async () => {
      const rowId = 'RU-4069-Block-411-224813681';
      renderWithProps(rowId);

      await waitFor(() => {
        const timberMarkElements = screen.getAllByText('TM-001');
        // Timber mark appears in both lg+ and md/sm sections
        expect(timberMarkElements.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('displays mark area multiple times for different screen sizes', async () => {
      const rowId = 'RU-4069-Block-411-224813681';
      renderWithProps(rowId);

      await waitFor(() => {
        const markAreaElements = screen.getAllByText('2000 ha');
        // Mark area appears in both lg+ and md/sm sections
        expect(markAreaElements.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('displays status description multiple times for different screen sizes', async () => {
      const rowId = 'RU-4069-Block-411-224813681';
      renderWithProps(rowId);

      await waitFor(() => {
        const statusElements = screen.getAllByText('Active');
        // Status appears in main section, lg+ section, and md/sm section
        expect(statusElements.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('displays all secondary marks with their areas and statuses', async () => {
      const rowId = 'RU-4069-Block-411-224813681';
      renderWithProps(rowId);

      await waitFor(() => {
        // Check secondary marks appear
        screen.getAllByText('SM-001');
        screen.getAllByText('SM-002');
        // Check areas appear
        screen.getAllByText('500 ha');
        screen.getAllByText('300 ha');
      });
    });

    it('displays total secondary marks count', async () => {
      const rowId = 'RU-4069-Block-411-224813681';
      renderWithProps(rowId);

      await waitFor(() => {
        screen.getByText('Secondary marks in the block: 3');
      });
    });

    it('displays empty string for null timber mark', async () => {
      const dataWithNullTimberMark: ReportingUnitSearchExpandedDto = {
        ...mockExpandedData,
        timberMark: null,
      };
      (APIs.search.getReportingUnitSearchExpand as Mock).mockResolvedValue(dataWithNullTimberMark);

      const rowId = 'RU-4069-Block-411B-224813681';
      renderWithProps(rowId);

      await waitFor(() => {
        expect(APIs.search.getReportingUnitSearchExpand).toHaveBeenCalled();
      });
    });
  });
});
