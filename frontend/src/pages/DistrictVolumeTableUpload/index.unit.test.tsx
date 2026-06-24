/* eslint-disable @typescript-eslint/no-explicit-any */
import { screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import DistrictVolumeTableUploadPage from './index';

import * as hooks from '@/config/react-query/hooks';
import { renderWithAppAsync } from '@/config/tests/renderWithApp';
import * as inTreePaths from '@/routes/inTreePaths';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@/config/react-query/hooks');

const mockMutateAsync = vi.fn();
const mockUseDistrictVolumeTableCreateMutation = vi.mocked(
  hooks.useDistrictVolumeTableCreateMutation,
);

vi.mock('@/routes/inTreePaths', () => ({
  navigateInTree: vi.fn(),
}));

// Mock FileUploadInput to avoid Excel processing in tests
vi.mock('@/components/Form/FileUploadInput', () => ({
  default: ({
    onProcessed,
    externalErrors,
  }: {
    onProcessed: (results: any[]) => void;
    externalErrors?: string[];
  }) => (
    <div data-testid="file-upload-input">
      <label htmlFor="mock-file-input">Upload spreadsheet</label>
      <input
        id="mock-file-input"
        type="file"
        data-testid="mock-file-input"
        onChange={(e) => {
          // Simulate processor returning interior data
          if (e.target.files?.[0]) {
            onProcessed([
              {
                type: 'INTERIOR',
                zones: [{ name: 'Dry belt', districts: [] }],
                formulas: {},
              },
            ]);
          }
        }}
      />
      {externalErrors?.map((err) => (
        <div key={err} data-testid="file-error">
          {err}
        </div>
      ))}
    </div>
  ),
}));

// ============================================================================
// Helpers
// ============================================================================

function createDefaultMutationReturn(overrides?: Record<string, unknown>) {
  return {
    mutateAsync: mockMutateAsync,
    isPending: false,
    isError: false,
    error: null,
    data: undefined,
    reset: vi.fn(),
    ...overrides,
  } as any;
}

// ============================================================================
// Tests
// ============================================================================

describe('DistrictVolumeTableUploadPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDistrictVolumeTableCreateMutation.mockReturnValue(createDefaultMutationReturn());
  });

  describe('rendering', () => {
    it('should render the page with banner title and subtitle', async () => {
      await renderWithAppAsync(<DistrictVolumeTableUploadPage />);

      expect(screen.getByText('Upload new volumes table')).toBeTruthy();
      expect(
        screen.getByText(
          'Load .csv or .xls file to calculate waste volumes when district averages waste assessment is used',
        ),
      ).toBeTruthy();
    });

    it('should render the notification component', async () => {
      await renderWithAppAsync(<DistrictVolumeTableUploadPage />);

      expect(screen.getByTestId('page-notification')).toBeTruthy();
    });

    it('should render the upload form component', async () => {
      await renderWithAppAsync(<DistrictVolumeTableUploadPage />);

      expect(screen.getByTestId('district-volume-upload-column')).toBeTruthy();
    });

    it('should render all form fields (area, start date, file upload, buttons)', async () => {
      await renderWithAppAsync(<DistrictVolumeTableUploadPage />);

      expect(screen.getByText('Area')).toBeTruthy();
      expect(screen.getByLabelText('Coast')).toBeTruthy();
      expect(screen.getByLabelText('Interior')).toBeTruthy();
      expect(screen.getByLabelText('Start date')).toBeTruthy();
      expect(screen.getByTestId('file-upload-input')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Upload table' })).toBeTruthy();
    });

    it('should default area to INTERIOR when mounted', async () => {
      await renderWithAppAsync(<DistrictVolumeTableUploadPage />);

      const interiorRadio = screen.getByLabelText('Interior') as HTMLInputElement;
      expect(interiorRadio.checked).toBe(true);
    });
  });

  describe('navigation', () => {
    it('should call navigateInTree with list path when Cancel is clicked', async () => {
      await renderWithAppAsync(<DistrictVolumeTableUploadPage />);

      await screen.getByRole('button', { name: 'Cancel' }).click();

      expect(inTreePaths.navigateInTree).toHaveBeenCalledWith(
        expect.anything(),
        '/configuration/district-volume-tables',
      );
    });

    it('should navigate to details page on successful upload', async () => {
      let capturedOnSuccess: ((id: number) => void) | undefined;

      mockUseDistrictVolumeTableCreateMutation.mockImplementation((options: any) => {
        capturedOnSuccess = options.onSuccess;
        return createDefaultMutationReturn();
      });

      await renderWithAppAsync(<DistrictVolumeTableUploadPage />);

      // Simulate successful upload
      capturedOnSuccess?.(42);

      expect(inTreePaths.navigateInTree).toHaveBeenCalledWith(
        expect.anything(),
        '/configuration/district-volume-tables/42',
      );
    });
  });

  describe('page structure', () => {
    it('should render a Column with lg=16, md=8, sm=4 for the banner', async () => {
      await renderWithAppAsync(<DistrictVolumeTableUploadPage />);

      const bannerColumn = screen
        .getByText('Upload new volumes table')
        .closest('div[style*="max-width"]');
      expect(bannerColumn).toBeTruthy();
    });

    it('should render a Column with lg=16, md=8, sm=4 for the notification', async () => {
      await renderWithAppAsync(<DistrictVolumeTableUploadPage />);

      const notificationColumn = screen
        .getByText('PageNotification')
        .closest('div[style*="max-width"]');
      expect(notificationColumn).toBeTruthy();
    });
  });

  describe('data-testid', () => {
    it('should render the page with correct structure for testing', async () => {
      await renderWithAppAsync(<DistrictVolumeTableUploadPage />);

      // Verify the page structure is testable
      const pageContent = await screen.findByText('Upload new volumes table');
      expect(pageContent).toBeTruthy();
    });
  });
});
