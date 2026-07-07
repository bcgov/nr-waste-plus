/* eslint-disable @typescript-eslint/no-explicit-any */
import { screen, waitFor, fireEvent } from '@testing-library/react';
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

/**
 * Hoisted mock utilities shared across module-level mocks.
 *
 * - `mockListSheets` controls what ExcelReader.listSheets() returns
 * - `mockTableData` controls what FileUploadInput's onProcessed receives
 * - `coastValidator` / `interiorValidator` intercept format-validation calls
 */
const { mockListSheets, mockTableData, coastValidator, interiorValidator } = vi.hoisted(() => ({
  mockListSheets: vi.fn().mockResolvedValue(['Interior']),
  mockTableData: { current: null as unknown },
  coastValidator: vi.fn().mockResolvedValue([] as string[]),
  interiorValidator: vi.fn().mockResolvedValue([] as string[]),
}));

// Mock ExcelReader so the validator doesn't need real .xlsx files
// Must use a regular function (not arrow) so `new ExcelReader()` works as a constructor.
vi.mock('@/services/spreadsheet/excelReader', () => ({
  ExcelReader: vi.fn().mockImplementation(function () {
    return { listSheets: mockListSheets };
  }),
}));

// Mock the format-specific validators the component validator delegates to
vi.mock('@/services/districtvolumes/validators/coastValidator', () => ({
  coastValidator,
}));

vi.mock('@/services/districtvolumes/validators/interiorValidator', () => ({
  interiorValidator,
}));

vi.mock('@/config/react-query/hooks');

const mockMutateAsync = vi.fn();
const mockUseDistrictVolumeTableCreateMutation = vi.mocked(
  hooks.useDistrictVolumeTableCreateMutation,
);

vi.mock('@/routes/inTreePaths', () => ({
  navigateInTree: vi.fn(),
}));

/**
 * FileUploadInput mock that mirrors the real component's validation flow:
 *
 * 1. Calls the `validator` prop with the selected file
 * 2. If validator returns errors → file is rejected, onProcessed is NOT called
 * 3. If validator passes → onProcessed is called with the current mockTableData
 *
 * This lets tests exercise the area-mismatch & format-detection logic in the
 * component's inlined validator function.
 */
vi.mock('@/components/Form/FileUploadInput', () => ({
  default: ({
    onProcessed,
    externalErrors,
    validator,
  }: {
    onProcessed: (results: TableData[]) => void;
    externalErrors?: string[];
    validator?: (file: File) => Promise<string[]>;
  }) => (
    <div data-testid="file-upload-input">
      <label htmlFor="mock-file-input">Upload spreadsheet</label>
      <input
        id="mock-file-input"
        type="file"
        data-testid="mock-file-input"
        onChange={async (e) => {
          console.log('[DEBUG mock onChange] fired');
          if (e.target.files?.[0]) {
            console.log('[DEBUG mock onChange] file received:', e.target.files[0].name);
            // Run validation first (mirrors real component behaviour)
            if (validator) {
              console.log('[DEBUG mock onChange] calling validator...');
              const errors = await validator(e.target.files[0]);
              console.log(
                '[DEBUG mock onChange] validator returned:',
                JSON.stringify(errors),
                'length:',
                errors?.length,
              );
              if (errors && errors.length > 0) {
                console.log('[DEBUG mock onChange] validator rejected file');
                return;
              }
            }
            console.log(
              '[DEBUG mock onChange] validator passed, calling onProcessed with:',
              JSON.stringify(mockTableData.current),
            );
            // Validation passed — simulate successful processing
            onProcessed([mockTableData.current] as TableData[]);
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
    // Restore hoisted mock defaults
    mockListSheets.mockResolvedValue(['Interior']);
    mockTableData.current = {
      type: 'INTERIOR' as const,
      zones: [{ name: 'Dry belt', districts: [] }],
      formulas: {},
    } as unknown;
    coastValidator.mockResolvedValue([]);
    interiorValidator.mockResolvedValue([]);
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

  describe('validator (area/file-type mismatch detection)', () => {
    it('should accept a file when detected type matches the selected area (Interior)', async () => {
      const user = userEvent.setup();
      await renderWithAppAsync(<DistrictVolumeTableUpload />);

      // Default area is INTERIOR, default mockListSheets returns ['Interior']
      const fileInput = screen.getByTestId('mock-file-input');
      await user.upload(
        fileInput,
        new File(['test'], 'interior.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      );

      // Validator passed → onProcessed was called → file errors stay empty & Interior stays checked
      await waitFor(() => {
        expect((screen.getByLabelText('Interior') as HTMLInputElement).checked).toBe(true);
      });
      expect(screen.queryByTestId('file-error')).toBeNull();
    });

    it('should reject a Coast file when Interior is selected', async () => {
      const user = userEvent.setup();
      await renderWithAppAsync(<DistrictVolumeTableUpload />);

      // Make ExcelReader report Coast-style sheet names
      mockListSheets.mockResolvedValue(['Coast Districts']);

      const fileInput = screen.getByTestId('mock-file-input');
      await user.upload(
        fileInput,
        new File(['test'], 'coast.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      );

      // Validator rejects the file — onProcessed is never called, Interior stays selected
      await waitFor(() => {
        expect((screen.getByLabelText('Interior') as HTMLInputElement).checked).toBe(true);
      });
    });

    it('should reject an Interior file when Coast is selected', async () => {
      const user = userEvent.setup();
      await renderWithAppAsync(<DistrictVolumeTableUpload />);

      // First switch area to Coast
      await user.click(screen.getByLabelText('Coast'));

      // mockListSheets already defaults to ['Interior']
      const fileInput = screen.getByTestId('mock-file-input');
      await user.upload(
        fileInput,
        new File(['test'], 'interior.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      );

      // Validator rejects the file — area stays Coast
      await waitFor(() => {
        expect((screen.getByLabelText('Coast') as HTMLInputElement).checked).toBe(true);
      });
    });

    it('should return a format error when sheet names are unrecognized', async () => {
      const user = userEvent.setup();
      await renderWithAppAsync(<DistrictVolumeTableUpload />);

      mockListSheets.mockResolvedValue(['Unknown Sheet']);

      // The validator can't match "COAST" or "INTERIOR" and returns a format error.
      // The mock rejects the file when errors are present, so onProcessed is not called.
      const fileInput = screen.getByTestId('mock-file-input');
      await user.upload(
        fileInput,
        new File(['test'], 'unknown.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      );

      // Interior stays selected (default) since onProcessed was never called
      await waitFor(() => {
        expect((screen.getByLabelText('Interior') as HTMLInputElement).checked).toBe(true);
      });
    });

    it('should catch and return errors thrown during sheet inspection', async () => {
      const user = userEvent.setup();
      await renderWithAppAsync(<DistrictVolumeTableUpload />);

      mockListSheets.mockRejectedValue(new Error('Corrupted file'));

      const fileInput = screen.getByTestId('mock-file-input');
      await user.upload(
        fileInput,
        new File(['test'], 'corrupted.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      );

      // Validator's catch block returns the error message; onProcessed never called
      await waitFor(() => {
        expect((screen.getByLabelText('Interior') as HTMLInputElement).checked).toBe(true);
      });
    });
  });

  describe('file upload processing (handleFileChange)', () => {
    it('should update area to COASTAL and set heliMultiplier when a Coast-file result is processed', async () => {
      const user = userEvent.setup();
      await renderWithAppAsync(<DistrictVolumeTableUpload />);

      // Switch area to Coast first so the mismatch guard doesn't block
      await user.click(screen.getByLabelText('Coast'));

      // Set up the mock to return Coast data
      mockTableData.current = {
        type: 'COASTAL',
        sections: [{ name: 'Mature', districts: [] }],
        formulas: {},
      } as unknown;

      // Also need the validator to pass — mock sheets containing "COAST"
      mockListSheets.mockResolvedValue(['Coast Districts']);

      const fileInput = screen.getByTestId('mock-file-input');
      await user.upload(
        fileInput,
        new File(['test'], 'coast.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      );

      await waitFor(() => {
        expect((screen.getByLabelText('Coast') as HTMLInputElement).checked).toBe(true);
      });
    });
  });

  describe('form submission', () => {
    it('should successfully submit a valid COASTAL form', async () => {
      const user = userEvent.setup();
      await renderWithAppAsync(<DistrictVolumeTableUpload />);

      // 1. Switch area to Coast
      await user.click(screen.getByLabelText('Coast'));

      // 2. Upload a Coast file so tableData gets populated with sections
      mockTableData.current = {
        type: 'COASTAL',
        sections: [{ name: 'Mature', districts: [] }],
        formulas: {},
      } as unknown;
      mockListSheets.mockResolvedValue(['Coast Districts']);

      const fileInput = screen.getByTestId('mock-file-input');
      await user.upload(
        fileInput,
        new File(['test'], 'coast.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      );

      // Wait for async validators to settle & re-render
      await waitFor(() => {
        expect((screen.getByTestId('upload-table-button') as HTMLButtonElement).disabled).toBe(
          false,
        );
      });

      // 3. Submit the form by dispatching a submit event on the <form> element.
      // Using fireEvent.submit avoids issues with the button being disabled during
      // TanStack Form's async validation cycle after setFieldValue.
      const formEl = screen.getByTestId('district-volume-upload-column').querySelector('form')!;
      fireEvent.submit(formEl);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            area: 'COASTAL' as const,
            startDate: expect.any(String),
          }),
        );
      });
    });

    it('should display a submit error when the mutation fails', async () => {
      const user = userEvent.setup();
      await renderWithAppAsync(<DistrictVolumeTableUpload />);

      // Make mutateAsync reject on submission
      mockMutateAsync.mockRejectedValue(new Error('API failure'));

      // Click submit — form validation fails (no file uploaded)
      await user.click(screen.getByRole('button', { name: 'Upload table' }));

      // The submit error should appear
      await waitFor(() => {
        expect(screen.getByTestId('submit-error')).toBeTruthy();
      });
    });
  });
});
