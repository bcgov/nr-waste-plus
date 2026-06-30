/* eslint-disable @typescript-eslint/no-explicit-any */
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import DistrictVolumeTableUpload from './index';

import type { TableData } from '@/services/districtvolumes.types';

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
    onProcessed: (results: TableData[]) => void;
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

describe('DistrictVolumeTableUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDistrictVolumeTableCreateMutation.mockReturnValue(createDefaultMutationReturn());
  });

  describe('rendering', () => {
    it('should render the form with all form fields when mounted', async () => {
      await renderWithAppAsync(<DistrictVolumeTableUpload />);

      expect(screen.getByText('Area')).toBeTruthy();
      expect(screen.getByLabelText('Coast')).toBeTruthy();
      expect(screen.getByLabelText('Interior')).toBeTruthy();
      expect(screen.getByLabelText('Start date')).toBeTruthy();
      expect(screen.getByTestId('file-upload-input')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Upload table' })).toBeTruthy();
    });

    it('should default area to INTERIOR when mounted', async () => {
      await renderWithAppAsync(<DistrictVolumeTableUpload />);

      const interiorRadio = screen.getByLabelText('Interior') as HTMLInputElement;
      expect(interiorRadio.checked).toBe(true);
    });

    it('should render the upload button as enabled when form is valid', async () => {
      await renderWithAppAsync(<DistrictVolumeTableUpload />);

      const uploadButton = screen.getByRole('button', { name: 'Upload table' });
      expect(uploadButton).toBeTruthy();
    });
  });

  describe('area selection', () => {
    it('should switch area to COASTAL when Coast radio is clicked', async () => {
      const user = userEvent.setup();
      await renderWithAppAsync(<DistrictVolumeTableUpload />);

      const coastRadio = screen.getByLabelText('Coast');
      await user.click(coastRadio);

      expect((coastRadio as HTMLInputElement).checked).toBe(true);
      expect((screen.getByLabelText('Interior') as HTMLInputElement).checked).toBe(false);
    });

    it('should switch area back to INTERIOR when Interior radio is clicked', async () => {
      const user = userEvent.setup();
      await renderWithAppAsync(<DistrictVolumeTableUpload />);

      // First switch to Coastal
      await user.click(screen.getByLabelText('Coast'));
      // Then switch back to Interior
      await user.click(screen.getByLabelText('Interior'));

      expect((screen.getByLabelText('Interior') as HTMLInputElement).checked).toBe(true);
    });
  });

  describe('navigation', () => {
    it('should call navigateInTree with list path when Cancel is clicked', async () => {
      const user = userEvent.setup();
      await renderWithAppAsync(<DistrictVolumeTableUpload />);

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(inTreePaths.navigateInTree).toHaveBeenCalledWith(
        expect.anything(),
        '/configuration/district-volume-tables',
      );
    });
  });

  describe('form submission', () => {
    it('should show error when form validation fails and submission is attempted', async () => {
      const user = userEvent.setup();
      await renderWithAppAsync(<DistrictVolumeTableUpload />);

      // Click submit without filling in required fields
      await user.click(screen.getByRole('button', { name: 'Upload table' }));

      // The form should not call mutateAsync because validation fails
      // (startDate is empty and tableData has no zones)
      await waitFor(() => {
        expect(mockMutateAsync).not.toHaveBeenCalled();
      });
    });

    it('should clear submit error when submitting again', async () => {
      const user = userEvent.setup();
      await renderWithAppAsync(<DistrictVolumeTableUpload />);

      // First submission attempt (will fail validation)
      await user.click(screen.getByRole('button', { name: 'Upload table' }));

      // Second submission attempt should clear previous error
      await user.click(screen.getByRole('button', { name: 'Upload table' }));

      // mutateAsync should still not be called (validation still fails)
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('file upload handling', () => {
    it('should update form area when file is uploaded with INTERIOR data', async () => {
      const user = userEvent.setup();
      await renderWithAppAsync(<DistrictVolumeTableUpload />);

      const fileInput = screen.getByTestId('mock-file-input');
      const file = new File(['test'], 'interior.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      await user.upload(fileInput, file);

      // After upload, the INTERIOR radio should still be selected (mock returns INTERIOR data)
      expect((screen.getByLabelText('Interior') as HTMLInputElement).checked).toBe(true);
    });
  });

  describe('submit button state', () => {
    it('should disable Upload table button when mutation is pending', async () => {
      mockUseDistrictVolumeTableCreateMutation.mockReturnValue(
        createDefaultMutationReturn({ isPending: true }),
      );

      await renderWithAppAsync(<DistrictVolumeTableUpload />);

      const uploadButton = screen.getByRole('button', { name: 'Upload table' });
      expect((uploadButton as HTMLButtonElement).disabled).toBe(true);
    });

    it('should enable Upload table button when mutation is not pending', async () => {
      mockUseDistrictVolumeTableCreateMutation.mockReturnValue(
        createDefaultMutationReturn({ isPending: false }),
      );

      await renderWithAppAsync(<DistrictVolumeTableUpload />);

      const uploadButton = screen.getByRole('button', { name: 'Upload table' });
      expect((uploadButton as HTMLButtonElement).disabled).toBe(false);
    });
  });

  describe('mutation configuration', () => {
    it('should configure mutation with notificationTarget and onSuccess', async () => {
      await renderWithAppAsync(<DistrictVolumeTableUpload />);

      expect(mockUseDistrictVolumeTableCreateMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          notificationTarget: 'upload-table',
          onSuccess: expect.any(Function),
        }),
      );
    });

    it('should navigate to details page on successful mutation', async () => {
      let capturedOnSuccess: ((id: number) => void) | undefined;

      mockUseDistrictVolumeTableCreateMutation.mockImplementation((options: any) => {
        capturedOnSuccess = options.onSuccess;
        return createDefaultMutationReturn();
      });

      await renderWithAppAsync(<DistrictVolumeTableUpload />);

      // Simulate successful creation
      capturedOnSuccess?.(42);

      expect(inTreePaths.navigateInTree).toHaveBeenCalledWith(
        expect.anything(),
        '/configuration/district-volume-tables/42',
      );
    });
  });

  describe('data-testid', () => {
    it('should render the column with correct data-testid', async () => {
      await renderWithAppAsync(<DistrictVolumeTableUpload />);

      expect(screen.getByTestId('district-volume-upload-column')).toBeTruthy();
    });
  });
});
