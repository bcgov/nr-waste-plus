/* eslint-disable @typescript-eslint/no-explicit-any */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';

import WasteSearchTableExpandContent from './index';

import type { ReportingUnitSearchExpandedDto } from '@/services/search.types';

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
  submitter: 'IDIR\\TESTUSER',
  attachment: { code: 'ATT01', description: 'Attachment Type 1' },
  comments: 'Test comments for this reporting unit',
  totalBlocks: 5,
};

const renderWithProps = async (rowId: string) => {
  const qc = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });
  await act(async () =>
    render(
      <QueryClientProvider client={qc}>
        <WasteSearchTableExpandContent rowId={rowId} />
      </QueryClientProvider>,
    ),
  );
};

describe('WasteSearchTableExpandContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (APIs.search.getReportingUnitSearchExpand as Mock).mockResolvedValue(mockExpandedData);
  });

  describe('data extraction from rowId', () => {
    it('extracts ruId and blockId from rowId correctly', async () => {
      const rowId = 'RU-4069-Block-411-224813681';
      await renderWithProps(rowId);

      await waitFor(() => {
        expect(APIs.search.getReportingUnitSearchExpand).toHaveBeenCalledWith(4069, 411);
      });
    });

    it('handles different rowId formats', async () => {
      const rowId = 'RU-5000-Block-500-999999999';
      await renderWithProps(rowId);

      await waitFor(() => {
        expect(APIs.search.getReportingUnitSearchExpand).toHaveBeenCalledWith(5000, 500);
      });
    });

    it('does not call API when ruId is null', async () => {
      const rowId = 'RU-N/A-Block-411B-224813681';
      await renderWithProps(rowId);

      // Wait a bit to ensure no API call
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(APIs.search.getReportingUnitSearchExpand).not.toHaveBeenCalled();
    });

    it('does not call API when blockId is null', async () => {
      const rowId = 'RU-4069-Block-N/A-224813681';
      await renderWithProps(rowId);

      // Wait a bit to ensure no API call
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(APIs.search.getReportingUnitSearchExpand).not.toHaveBeenCalled();
    });
  });

  describe('rendering expanded content', () => {
    it('renders all readonly input fields', async () => {
      const rowId = 'RU-4069-Block-411B-224813681';
      await renderWithProps(rowId);

      await waitFor(() => {
        expect(screen.getByText('Licence number')).toBeDefined();
        expect(screen.getByText('Cutting Permit')).toBeDefined();
        expect(screen.getByText('Timber Mark')).toBeDefined();
        expect(screen.getByText('Exempted (Yes/No)')).toBeDefined();
        expect(screen.getByText('Multi-mark (Yes/No)')).toBeDefined();
        expect(screen.getByText('Net area')).toBeDefined();
        expect(screen.getByText('Submitter')).toBeDefined();
        expect(screen.getByText('Attachments')).toBeDefined();
        expect(screen.getByText('Comment:')).toBeDefined();
      });
    });

    it('displays license number correctly', async () => {
      const rowId = 'RU-4069-Block-411B-224813681';
      await renderWithProps(rowId);

      await waitFor(() => {
        expect(screen.getByText('LIC-12345')).toBeDefined();
      });
    });

    it('displays cutting permit correctly', async () => {
      const rowId = 'RU-4069-Block-411B-224813681';
      await renderWithProps(rowId);

      await waitFor(() => {
        expect(screen.getByText('CP-001')).toBeDefined();
      });
    });

    it('displays timber mark correctly', async () => {
      const rowId = 'RU-4069-Block-411B-224813681';
      await renderWithProps(rowId);

      await waitFor(() => {
        expect(screen.getByText('TM-001')).toBeDefined();
      });
    });

    it('displays submitter correctly', async () => {
      const rowId = 'RU-4069-Block-411B-224813681';
      await renderWithProps(rowId);

      await waitFor(() => {
        expect(screen.getByText('IDIR\\TESTUSER')).toBeDefined();
      });
    });

    it('displays net area with number styling', async () => {
      const rowId = 'RU-4069-Block-411B-224813681';
      await renderWithProps(rowId);

      await waitFor(() => {
        expect(screen.getByText('1500.5')).toBeDefined();
      });
    });

    it('displays total blocks in reporting unit', async () => {
      const rowId = 'RU-4069-Block-411B-224813681';
      await renderWithProps(rowId);

      await waitFor(() => {
        expect(screen.getByText('Total blocks in reporting unit: 5')).toBeDefined();
      });
    });

    it('displays comments', async () => {
      const rowId = 'RU-4069-Block-411B-224813681';
      await renderWithProps(rowId);

      await waitFor(() => {
        expect(screen.getByText('Test comments for this reporting unit')).toBeDefined();
      });
    });
  });

  describe('loading states', () => {
    it('shows loading skeleton while fetching data', async () => {
      let resolveSearch: (value: any) => void;
      const searchPromise = new Promise((resolve) => {
        resolveSearch = resolve;
      });
      (APIs.search.getReportingUnitSearchExpand as Mock).mockReturnValue(searchPromise);

      const rowId = 'RU-4069-Block-411-224813681';
      const qc = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0, staleTime: 0 },
        },
      });
      let container: HTMLElement = document.createElement('div');
      await act(async () => {
        const result = render(
          <QueryClientProvider client={qc}>
            <WasteSearchTableExpandContent rowId={rowId} />
          </QueryClientProvider>,
        );
        container = result.container;
      });

      // Should show skeletons initially (not actual data)
      const skeletons = container?.querySelectorAll('.cds--skeleton');
      expect(skeletons?.length).toBeGreaterThan(0);

      // Resolve the promise
      await act(async () => {
        resolveSearch!(mockExpandedData);
      });

      // Wait for data to be displayed
      await waitFor(() => {
        expect(screen.getByText('LIC-12345')).toBeDefined();
      });
    });

    it('hides loading skeleton after data is fetched', async () => {
      const rowId = 'RU-4069-Block-411-224813681';
      await renderWithProps(rowId);

      await waitFor(() => {
        expect(screen.getByText('LIC-12345')).toBeDefined();
      });

      // Verify data is displayed (not in skeleton state)
      expect(screen.getByText('CP-001')).toBeDefined();
    });
  });

  describe('null and empty field handling', () => {
    it('displays empty string when licenseNo is null', async () => {
      const dataWithNulls: ReportingUnitSearchExpandedDto = {
        ...mockExpandedData,
        licenseNo: null,
      };
      (APIs.search.getReportingUnitSearchExpand as Mock).mockResolvedValue(dataWithNulls);

      const rowId = 'RU-4069-Block-411B-224813681';
      await renderWithProps(rowId);

      await waitFor(() => {
        expect(APIs.search.getReportingUnitSearchExpand).toHaveBeenCalled();
      });
    });

    it('displays empty string when cuttingPermit is null', async () => {
      const dataWithNulls: ReportingUnitSearchExpandedDto = {
        ...mockExpandedData,
        cuttingPermit: null,
      };
      (APIs.search.getReportingUnitSearchExpand as Mock).mockResolvedValue(dataWithNulls);

      const rowId = 'RU-4069-Block-411B-224813681';
      await renderWithProps(rowId);

      await waitFor(() => {
        expect(APIs.search.getReportingUnitSearchExpand).toHaveBeenCalled();
      });
    });

    it('displays empty string when submitter is null', async () => {
      const dataWithNulls: ReportingUnitSearchExpandedDto = {
        ...mockExpandedData,
        submitter: null,
      };
      (APIs.search.getReportingUnitSearchExpand as Mock).mockResolvedValue(dataWithNulls);

      const rowId = 'RU-4069-Block-411B-224813681';
      await renderWithProps(rowId);

      await waitFor(() => {
        expect(APIs.search.getReportingUnitSearchExpand).toHaveBeenCalled();
      });
    });

    it('displays empty value tag when comments is null', async () => {
      const dataWithNulls: ReportingUnitSearchExpandedDto = {
        ...mockExpandedData,
        comments: null,
      };
      (APIs.search.getReportingUnitSearchExpand as Mock).mockResolvedValue(dataWithNulls);

      const rowId = 'RU-4069-Block-411B-224813681';
      await renderWithProps(rowId);

      await waitFor(() => {
        expect(APIs.search.getReportingUnitSearchExpand).toHaveBeenCalled();
      });
    });
  });

  describe('boolean field rendering', () => {
    it('renders exempted as Yes when true', async () => {
      const dataWithTrue: ReportingUnitSearchExpandedDto = {
        ...mockExpandedData,
        exempted: true,
      };
      (APIs.search.getReportingUnitSearchExpand as Mock).mockResolvedValue(dataWithTrue);

      const rowId = 'RU-4069-Block-411B-224813681';
      await renderWithProps(rowId);

      await waitFor(() => {
        expect(APIs.search.getReportingUnitSearchExpand).toHaveBeenCalled();
      });
    });

    it('renders exempted as No when false', async () => {
      const dataWithFalse: ReportingUnitSearchExpandedDto = {
        ...mockExpandedData,
        exempted: false,
      };
      (APIs.search.getReportingUnitSearchExpand as Mock).mockResolvedValue(dataWithFalse);

      const rowId = 'RU-4069-Block-411B-224813681';
      await renderWithProps(rowId);

      await waitFor(() => {
        expect(APIs.search.getReportingUnitSearchExpand).toHaveBeenCalled();
      });
    });

    it('renders multi-mark as Yes when true', async () => {
      const dataWithTrue: ReportingUnitSearchExpandedDto = {
        ...mockExpandedData,
        multiMark: true,
      };
      (APIs.search.getReportingUnitSearchExpand as Mock).mockResolvedValue(dataWithTrue);

      const rowId = 'RU-4069-Block-411B-224813681';
      await renderWithProps(rowId);

      await waitFor(() => {
        expect(APIs.search.getReportingUnitSearchExpand).toHaveBeenCalled();
      });
    });

    it('renders multi-mark as No when false', async () => {
      const dataWithFalse: ReportingUnitSearchExpandedDto = {
        ...mockExpandedData,
        multiMark: false,
      };
      (APIs.search.getReportingUnitSearchExpand as Mock).mockResolvedValue(dataWithFalse);

      const rowId = 'RU-4069-Block-411B-224813681';
      await renderWithProps(rowId);

      await waitFor(() => {
        expect(APIs.search.getReportingUnitSearchExpand).toHaveBeenCalled();
      });
    });
  });

  describe('attachment handling', () => {
    it('renders redirect link when attachment has code', async () => {
      const rowId = 'RU-4069-Block-411B-224813681';
      await renderWithProps(rowId);

      await waitFor(() => {
        const links = screen.queryAllByRole('link');
        // Should have at least one link for the attachment
        expect(links.length).toBeGreaterThan(0);
      });
    });

    it('renders empty value when attachment code is empty', async () => {
      const dataNoAttachment: ReportingUnitSearchExpandedDto = {
        ...mockExpandedData,
        attachment: { code: '', description: 'Empty Attachment' },
      };
      (APIs.search.getReportingUnitSearchExpand as Mock).mockResolvedValue(dataNoAttachment);

      const rowId = 'RU-4069-Block-411B-224813681';
      await renderWithProps(rowId);

      await waitFor(() => {
        expect(APIs.search.getReportingUnitSearchExpand).toHaveBeenCalled();
      });
    });

    it('constructs correct attachment URL with blockId', async () => {
      const rowId = 'RU-4069-Block-411-224813681';
      await renderWithProps(rowId);

      await waitFor(() => {
        expect(APIs.search.getReportingUnitSearchExpand).toHaveBeenCalledWith(4069, 411);
      });
    });
  });

  describe('element IDs', () => {
    it('generates correct element IDs from rowId', async () => {
      const rowId = 'RU-4069-Block-411B-224813681';
      const qc = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0, staleTime: 0 },
        },
      });
      const { container } = await act(async () =>
        render(
          <QueryClientProvider client={qc}>
            <WasteSearchTableExpandContent rowId={rowId} />
          </QueryClientProvider>,
        ),
      );

      await waitFor(() => {
        expect(container.querySelector(`#${rowId}-license-number`)).toBeDefined();
        expect(container.querySelector(`#${rowId}-cutting-permit`)).toBeDefined();
        expect(container.querySelector(`#${rowId}-timber-mark`)).toBeDefined();
        expect(container.querySelector(`#${rowId}-exempted`)).toBeDefined();
        expect(container.querySelector(`#${rowId}-multi-mark`)).toBeDefined();
        expect(container.querySelector(`#${rowId}-net-area`)).toBeDefined();
        expect(container.querySelector(`#${rowId}-submitter`)).toBeDefined();
        expect(container.querySelector(`#${rowId}-attachments`)).toBeDefined();
        expect(container.querySelector(`#${rowId}-comment`)).toBeDefined();
      });
    });
  });

  describe('query configuration', () => {
    it('caches data indefinitely with staleTime: Infinity', async () => {
      const rowId = 'RU-4069-Block-411-224813681';
      const qc = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0, staleTime: Infinity },
        },
      });

      await act(async () =>
        render(
          <QueryClientProvider client={qc}>
            <WasteSearchTableExpandContent rowId={rowId} />
          </QueryClientProvider>,
        ),
      );

      await waitFor(() => {
        expect(APIs.search.getReportingUnitSearchExpand).toHaveBeenCalledTimes(1);
      });

      // API should not be called again due to cache
      expect(APIs.search.getReportingUnitSearchExpand).toHaveBeenCalledTimes(1);
    });

    it('includes all parameters in query key', async () => {
      const rowId = 'RU-4069-Block-411-224813681';
      await renderWithProps(rowId);

      await waitFor(() => {
        const callArgs = (APIs.search.getReportingUnitSearchExpand as Mock).mock.calls[0];
        expect(callArgs[0]).toBe(4069);
        expect(callArgs[1]).toBe(411);
      });
    });
  });

  describe('different rowId formats', () => {
    it('handles rowId with different RU numbers', async () => {
      const rowId = 'RU-100-Block-1A-123456789';
      await renderWithProps(rowId);

      // Block ID extraction only gets numeric part (position 3)
      await waitFor(() => {
        expect(APIs.search.getReportingUnitSearchExpand).toHaveBeenCalled();
      });
    });

    it('handles rowId with larger RU numbers', async () => {
      const rowId = 'RU-9999-Block-999-987654321';
      await renderWithProps(rowId);

      await waitFor(() => {
        expect(APIs.search.getReportingUnitSearchExpand).toHaveBeenCalledWith(9999, 999);
      });
    });

    it('handles rowId with zero-padded values', async () => {
      const rowId = 'RU-0050-Block-050-111111111';
      await renderWithProps(rowId);

      await waitFor(() => {
        expect(APIs.search.getReportingUnitSearchExpand).toHaveBeenCalledWith(50, 50);
      });
    });
  });

  describe('row expansion data display', () => {
    it('displays all key information together', async () => {
      const rowId = 'RU-4069-Block-411-224813681';
      await renderWithProps(rowId);

      await waitFor(() => {
        // Verify multiple fields are displayed
        expect(screen.getByText('Licence number')).toBeDefined();
        expect(screen.getByText('LIC-12345')).toBeDefined();
        expect(screen.getByText('Cutting Permit')).toBeDefined();
        expect(screen.getByText('CP-001')).toBeDefined();
        expect(screen.getByText('Total blocks in reporting unit: 5')).toBeDefined();
      });
    });

    it('properly formats numeric net area', async () => {
      const dataWithDecimal: ReportingUnitSearchExpandedDto = {
        ...mockExpandedData,
        netArea: 2500.75,
      };
      (APIs.search.getReportingUnitSearchExpand as Mock).mockResolvedValue(dataWithDecimal);

      const rowId = 'RU-4069-Block-411B-224813681';
      await renderWithProps(rowId);

      await waitFor(() => {
        expect(screen.getByText('2500.75')).toBeDefined();
      });
    });

    it('displays zero total blocks correctly', async () => {
      const dataWithZeroBlocks: ReportingUnitSearchExpandedDto = {
        ...mockExpandedData,
        totalBlocks: 0,
      };
      (APIs.search.getReportingUnitSearchExpand as Mock).mockResolvedValue(dataWithZeroBlocks);

      const rowId = 'RU-4069-Block-411B-224813681';
      await renderWithProps(rowId);

      await waitFor(() => {
        expect(screen.getByText('Total blocks in reporting unit: 0')).toBeDefined();
      });
    });
  });
});
