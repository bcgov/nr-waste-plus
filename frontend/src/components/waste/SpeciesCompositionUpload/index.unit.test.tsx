/* eslint-disable @typescript-eslint/no-explicit-any */
import { screen, waitFor, fireEvent } from '@testing-library/react';
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

/**
 * Hoisted mock data reference for FileUploadInput.
 * Tests can set `mockFileData.current` to control what onProcessed receives.
 */
const { mockFileData } = vi.hoisted(() => ({
  mockFileData: { current: null as unknown as any[] | null },
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
          if (e.target.files?.[0]) {
            // Use controlled data if set, otherwise use default valid row
            const data = mockFileData.current ?? [
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
            ];
            onProcessed(data);
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
    mockFileData.current = null;
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

  describe('file upload edge cases (handleFileChange)', () => {
    it('should not set form data when results array is empty', async () => {
      // Mock onProcessed with empty array
      mockFileData.current = [];

      await renderWithAppAsync(<SpeciesCompositionUpload />);

      const fileInput = screen.getByTestId('mock-file-input');
      await userEvent.upload(
        fileInput,
        new File(['test'], 'test.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      );

      // Upload button should remain disabled (no data loaded)
      expect((screen.getByTestId('upload-table-button') as HTMLButtonElement).disabled).toBe(true);
    });

    it('should not set form data when first result is undefined', async () => {
      mockFileData.current = [undefined as any];

      await renderWithAppAsync(<SpeciesCompositionUpload />);

      const fileInput = screen.getByTestId('mock-file-input');
      await userEvent.upload(
        fileInput,
        new File(['test'], 'test.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      );

      expect((screen.getByTestId('upload-table-button') as HTMLButtonElement).disabled).toBe(true);
    });
  });

  describe('form submission', () => {
    it('should call mutateAsync with tableData on valid submission', async () => {
      const user = userEvent.setup();
      await renderWithAppAsync(<SpeciesCompositionUpload />);

      // Upload a file first to populate data
      const fileInput = screen.getByTestId('mock-file-input');
      await user.upload(
        fileInput,
        new File(['test'], 'test.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      );

      await waitFor(() => {
        expect((screen.getByTestId('upload-table-button') as HTMLButtonElement).disabled).toBe(
          false,
        );
      });

      // Click the Upload table button (calls handleSubmit)
      await user.click(screen.getByRole('button', { name: 'Upload table' }));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          tableData: {
            rows: [
              expect.objectContaining({
                district: { code: 'DCC', description: '' },
              }),
            ],
          },
        });
      });
    });

    it('should show submit error when mutation throws an Error', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockRejectedValue(new Error('API failure'));

      await renderWithAppAsync(<SpeciesCompositionUpload />);

      // Upload data to enable submit
      const fileInput = screen.getByTestId('mock-file-input');
      await user.upload(
        fileInput,
        new File(['test'], 'test.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      );

      await waitFor(() => {
        expect((screen.getByTestId('upload-table-button') as HTMLButtonElement).disabled).toBe(
          false,
        );
      });

      await user.click(screen.getByRole('button', { name: 'Upload table' }));

      await waitFor(() => {
        expect(screen.getByTestId('submit-error')).toBeTruthy();
        expect(screen.getByText('API failure')).toBeTruthy();
      });
    });

    it('should show generic submit error when mutation throws a non-Error', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockRejectedValue('unknown error');

      await renderWithAppAsync(<SpeciesCompositionUpload />);

      const fileInput = screen.getByTestId('mock-file-input');
      await user.upload(
        fileInput,
        new File(['test'], 'test.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      );

      await waitFor(() => {
        expect((screen.getByTestId('upload-table-button') as HTMLButtonElement).disabled).toBe(
          false,
        );
      });

      await user.click(screen.getByRole('button', { name: 'Upload table' }));

      await waitFor(() => {
        expect(screen.getByTestId('submit-error')).toBeTruthy();
        expect(screen.getByText('Submission failed')).toBeTruthy();
      });
    });

    it('should clear previous submit error on new submission attempt', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockRejectedValueOnce(new Error('First failure'));

      await renderWithAppAsync(<SpeciesCompositionUpload />);

      const fileInput = screen.getByTestId('mock-file-input');
      await user.upload(
        fileInput,
        new File(['test'], 'test.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      );

      await waitFor(() => {
        expect((screen.getByTestId('upload-table-button') as HTMLButtonElement).disabled).toBe(
          false,
        );
      });

      // First submission — fails
      await user.click(screen.getByRole('button', { name: 'Upload table' }));

      await waitFor(() => {
        expect(screen.getByTestId('submit-error')).toBeTruthy();
      });

      // Second submission — should clear error before attempt
      mockMutateAsync.mockResolvedValue(undefined);
      await user.click(screen.getByRole('button', { name: 'Upload table' }));

      await waitFor(() => {
        expect(screen.queryByTestId('submit-error')).toBeNull();
      });
    });
  });

  describe('button disabled states', () => {
    it('should disable Upload table button when mutation is pending', async () => {
      mockUseSpeciesCompositionCreateMutation.mockReturnValue(
        createDefaultMutationReturn({ isPending: true }),
      );

      await renderWithAppAsync(<SpeciesCompositionUpload />);

      const uploadButton = screen.getByTestId('upload-table-button');
      expect((uploadButton as HTMLButtonElement).disabled).toBe(true);
    });
  });

  describe('native form submission (onSubmit handler)', () => {
    it('should handle native form submit event', async () => {
      await renderWithAppAsync(<SpeciesCompositionUpload />);

      // Upload data first
      const fileInput = screen.getByTestId('mock-file-input');
      await userEvent.upload(
        fileInput,
        new File(['test'], 'test.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      );

      await waitFor(() => {
        expect((screen.getByTestId('upload-table-button') as HTMLButtonElement).disabled).toBe(
          false,
        );
      });

      // Trigger native form submission (simulates pressing Enter)
      fireEvent.submit(screen.getByTestId('species-composition-upload-form'));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });
    });
  });
});
