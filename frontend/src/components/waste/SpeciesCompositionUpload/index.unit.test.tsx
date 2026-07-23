/* eslint-disable @typescript-eslint/no-explicit-any */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import SpeciesCompositionUpload from './index';

import * as hooks from '@/config/react-query/hooks';
import { renderWithAppAsync } from '@/config/tests/renderWithApp';
import * as inTreePaths from '@/routes/inTreePaths';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@/config/react-query/hooks');

const mockMutateAsync = vi.fn();
const mockUseSpeciesCompositionCreateMutation = vi.mocked(
  hooks.useSpeciesCompositionCreateMutation,
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
          // Simulate processor returning species composition data
          if (e.target.files?.[0]) {
            onProcessed([
              {
                rows: [
                  {
                    district: { code: 'DCC', description: '' },
                    balsam: 0.1,
                    cedar: 0.2,
                    cottonwood: 0.05,
                    cypress: 0.02,
                    fir: 0.15,
                    hemlock: 0.08,
                    larch: 0.03,
                    maple: 0.04,
                    pine: 0.1,
                    poplar: 0.05,
                    redcedar: 0.02,
                    redwood: 0.01,
                    spruce: 0.03,
                    whitebirch: 0.01,
                    whitepine: 0.01,
                    yew: 0.005,
                    other: 0.005,
                    unknown: 0.005,
                    total: 1.0,
                  },
                ],
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

describe('SpeciesCompositionUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSpeciesCompositionCreateMutation.mockReturnValue(createDefaultMutationReturn());
  });

  describe('rendering', () => {
    it('should render the upload form component', async () => {
      await renderWithAppAsync(<SpeciesCompositionUpload />);

      expect(screen.getByTestId('species-composition-upload-column')).toBeTruthy();
    });

    it('should render the file upload input', async () => {
      await renderWithAppAsync(<SpeciesCompositionUpload />);

      expect(screen.getByTestId('file-upload-input')).toBeTruthy();
    });

    it('should render Cancel and Upload table buttons', async () => {
      await renderWithAppAsync(<SpeciesCompositionUpload />);

      expect(screen.getByTestId('cancel-button')).toBeTruthy();
      expect(screen.getByTestId('upload-table-button')).toBeTruthy();
    });

    it('should disable Upload table button when no data is loaded', async () => {
      await renderWithAppAsync(<SpeciesCompositionUpload />);

      const uploadButton = screen.getByTestId('upload-table-button');
      expect((uploadButton as HTMLButtonElement).disabled).toBe(true);
    });
  });

  describe('file upload', () => {
    it('should show review table after file is uploaded', async () => {
      await renderWithAppAsync(<SpeciesCompositionUpload />);

      const fileInput = screen.getByTestId('mock-file-input');
      await userEvent.upload(
        fileInput,
        new File(['test'], 'test.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      );

      expect(screen.getByTestId('species-composition-review-table')).toBeTruthy();
      expect(screen.getByText('Review uploaded data')).toBeTruthy();
    });

    it('should enable Upload table button after data is loaded', async () => {
      await renderWithAppAsync(<SpeciesCompositionUpload />);

      const fileInput = screen.getByTestId('mock-file-input');
      await userEvent.upload(
        fileInput,
        new File(['test'], 'test.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      );

      const uploadButton = screen.getByTestId('upload-table-button');
      expect((uploadButton as HTMLButtonElement).disabled).toBe(false);
    });
  });

  describe('navigation', () => {
    it('should call navigateInTree with list path when Cancel is clicked', async () => {
      await renderWithAppAsync(<SpeciesCompositionUpload />);

      const cancelButton = await screen.findByRole('button', { name: 'Cancel' });
      await userEvent.click(cancelButton);

      expect(inTreePaths.navigateInTree).toHaveBeenCalledWith(
        expect.anything(),
        '/configuration/species-composition',
      );
    });

    it('should navigate to details page on successful upload', async () => {
      let capturedOnSuccess: ((id: number) => void) | undefined;

      mockUseSpeciesCompositionCreateMutation.mockImplementation((options: any) => {
        capturedOnSuccess = options.onSuccess;
        return createDefaultMutationReturn();
      });

      await renderWithAppAsync(<SpeciesCompositionUpload />);

      // Simulate successful upload
      capturedOnSuccess?.(42);

      expect(inTreePaths.navigateInTree).toHaveBeenCalledWith(
        expect.anything(),
        '/configuration/species-composition/42',
      );
    });
  });
});
