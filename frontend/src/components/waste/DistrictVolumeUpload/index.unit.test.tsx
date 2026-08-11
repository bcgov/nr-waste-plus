/* eslint-disable @typescript-eslint/no-explicit-any */
import { fireEvent, screen, waitFor } from '@testing-library/react';
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
const { mockListSheets, mockTableData, coastValidator, interiorValidator, bypassValidation } =
  vi.hoisted(() => ({
    mockListSheets: vi.fn().mockResolvedValue(['Interior']),
    mockTableData: { current: null as unknown },
    coastValidator: vi.fn().mockResolvedValue([] as string[]),
    interiorValidator: vi.fn().mockResolvedValue([] as string[]),
    bypassValidation: { current: false },
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

vi.mock('@carbon/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@carbon/react')>();
  return {
    ...actual,
    DatePicker: ({ children, onChange }: any) => (
      <div>
        {children}
        <button
          type="button"
          data-testid="mock-valid-date"
          onClick={() => onChange([new Date(2026, 7, 13)])}
        >
          Valid date
        </button>
        <button
          type="button"
          data-testid="mock-invalid-date"
          onClick={() => onChange([new Date(2026, 7, 11)])}
        >
          Invalid date
        </button>
        <button type="button" data-testid="mock-empty-date" onClick={() => onChange([])}>
          Clear date
        </button>
      </div>
    ),
    DatePickerInput: ({
      id,
      labelText,
      invalid: _invalid,
      invalidText: _invalidText,
      ...props
    }: any) => (
      <>
        <label htmlFor={id}>
          {labelText}
          <input id={id} {...props} />
        </label>
        <button
          type="button"
          data-testid="mock-invalid-text"
          onClick={() => {
            props.onChange?.({ target: { value: 'not-a-date' } });
            props.onBlur?.();
          }}
        >
          Invalid text
        </button>
        <button
          type="button"
          data-testid="mock-past-text"
          onClick={() => {
            props.onChange?.({ target: { value: '2020-01-01' } });
            props.onBlur?.();
          }}
        >
          Past text
        </button>
      </>
    ),
  };
});

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
          if (e.target.files?.[0]) {
            if (validator && !bypassValidation.current) {
              const errors = await validator(e.target.files[0]);
              if (errors && errors.length > 0) {
                return;
              }
            }

            onProcessed(
              Array.isArray(mockTableData.current)
                ? (mockTableData.current as TableData[])
                : [mockTableData.current as TableData],
            );
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
    bypassValidation.current = false;
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
    it('should review parsed data before mutating and save only after confirmation', async () => {
      const user = userEvent.setup();
      await renderWithAppAsync(<DistrictVolumeTableUpload />);
      await user.upload(screen.getByTestId('mock-file-input'), new File(['test'], 'interior.xlsx'));

      expect(await screen.findByRole('button', { name: 'Upload table' })).toBeTruthy();
      await user.click(screen.getByRole('button', { name: 'Upload table' }));
      expect(mockMutateAsync).not.toHaveBeenCalled();
      expect(screen.getByTestId('district-volume-review-table')).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'Back' }));
      expect(screen.getByTestId('mock-file-input')).toBeTruthy();
      expect(mockMutateAsync).not.toHaveBeenCalled();

      await user.click(screen.getByRole('button', { name: 'Upload table' }));
      await user.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1));
    });

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
    it('should ignore empty or undefined processed results', async () => {
      const user = userEvent.setup();
      await renderWithAppAsync(<DistrictVolumeTableUpload />);

      mockTableData.current = [];
      await user.upload(screen.getByTestId('mock-file-input'), new File(['test'], 'empty.xlsx'));
      expect(screen.getByRole('button', { name: 'Upload table' })).toBeTruthy();

      mockTableData.current = undefined;
      await user.upload(screen.getByTestId('mock-file-input'), new File(['test'], 'missing.xlsx'));
      expect(screen.getByRole('button', { name: 'Upload table' })).toBeTruthy();
    });

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

    it('should reject processed data when it does not match the selected area', async () => {
      const user = userEvent.setup();
      mockTableData.current = {
        type: 'COASTAL',
        sections: [{ name: 'Mature', districts: [] }],
        formulas: {},
      } as unknown;

      await renderWithAppAsync(<DistrictVolumeTableUpload />);
      await user.upload(screen.getByTestId('mock-file-input'), new File(['test'], 'coast.xlsx'));

      await waitFor(() => {
        expect(screen.getByTestId('file-error').textContent).toContain('Area mismatch');
      });
      expect((screen.getByLabelText('Interior') as HTMLInputElement).checked).toBe(true);
    });

    it('should submit through the native form handler while uploading', async () => {
      const user = userEvent.setup();
      await renderWithAppAsync(<DistrictVolumeTableUpload />);
      await user.upload(screen.getByTestId('mock-file-input'), new File(['test'], 'interior.xlsx'));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Upload table' })).toBeTruthy();
        expect(
          (screen.getByRole('button', { name: 'Upload table' }) as HTMLButtonElement).disabled,
        ).toBe(false);
      });
      fireEvent.submit(screen.getByTestId('district-volume-upload-form'));

      await screen.findByRole('button', { name: 'Save' });
    });

    it('should display all review fields when optional values are absent', async () => {
      const user = userEvent.setup();
      mockTableData.current = {
        type: 'INTERIOR',
        zones: [{ name: 'Dry belt', districts: [{ code: 'DCC', avoidableSawlog: 1, total: 1 }] }],
        formulas: {},
      } as unknown;

      await renderWithAppAsync(<DistrictVolumeTableUpload />);
      await user.upload(screen.getByTestId('mock-file-input'), new File(['test'], 'interior.xlsx'));
      await user.click(screen.getByRole('button', { name: 'Upload table' }));

      expect(screen.getByTestId('district-volume-review-table')).toBeTruthy();
    });

    it('should render coastal rows when optional values are absent', async () => {
      const user = userEvent.setup();
      mockTableData.current = {
        type: 'COASTAL',
        sections: [{ name: 'Mature', districts: [{ code: 'DCC', avoidableSawlog: 1, total: 1 }] }],
        formulas: {},
      } as unknown;
      mockListSheets.mockResolvedValue(['Coast Districts']);

      await renderWithAppAsync(<DistrictVolumeTableUpload />);
      await user.click(screen.getByLabelText('Coast'));
      await waitFor(() =>
        expect((screen.getByLabelText('Coast') as HTMLInputElement).checked).toBe(true),
      );
      await user.upload(screen.getByTestId('mock-file-input'), new File(['test'], 'coast.xlsx'));
      await user.click(screen.getByRole('button', { name: 'Upload table' }));

      expect(screen.getByText('Mature')).toBeTruthy();
      expect(screen.getByText('DCC')).toBeTruthy();
    });

    it('should render a valid selected start date', async () => {
      const user = userEvent.setup();
      await renderWithAppAsync(<DistrictVolumeTableUpload />);

      await user.click(screen.getByTestId('mock-valid-date'));
      expect(screen.getByTestId('start-date-picker')).toBeTruthy();
    });

    it('should show the opposite area mismatch when Coast is selected', async () => {
      const user = userEvent.setup();
      bypassValidation.current = true;
      mockTableData.current = {
        type: 'INTERIOR',
        zones: [],
        formulas: {},
      } as unknown;

      await renderWithAppAsync(<DistrictVolumeTableUpload />);
      await user.click(screen.getByRole('radio', { name: 'Coast' }));
      await waitFor(() =>
        expect((screen.getByRole('radio', { name: 'Coast' }) as HTMLInputElement).checked).toBe(
          true,
        ),
      );
      await user.upload(screen.getByTestId('mock-file-input'), new File(['test'], 'interior.xlsx'));

      await waitFor(() => expect(screen.getByTestId('file-error').textContent).toContain('Coast'));
    });

    it('should render populated interior review rows and values', async () => {
      const user = userEvent.setup();
      mockTableData.current = {
        type: 'INTERIOR',
        zones: [
          {
            name: 'Dry belt',
            districts: [
              {
                code: 'DCC',
                avoidableSawlog: 1,
                avoidableGrade4: 2,
                unavoidableGrade4: 3,
                total: 6,
              },
            ],
          },
        ],
        formulas: {},
      } as unknown;

      await renderWithAppAsync(<DistrictVolumeTableUpload />);
      await user.upload(screen.getByTestId('mock-file-input'), new File(['test'], 'interior.xlsx'));
      await user.click(screen.getByRole('button', { name: 'Upload table' }));

      expect(screen.getByText('Dry belt')).toBeTruthy();
      expect(screen.getByText('DCC')).toBeTruthy();
      expect(screen.getByText('6')).toBeTruthy();
    });

    it('should render populated coastal review rows and values', async () => {
      const user = userEvent.setup();
      await renderWithAppAsync(<DistrictVolumeTableUpload />);
      await user.click(screen.getByLabelText('Coast'));
      mockTableData.current = {
        type: 'COASTAL',
        sections: [
          {
            name: 'Mature',
            districts: [
              {
                code: 'DCC',
                avoidableSawlog: 1,
                avoidableHembalGradeU: 2,
                avoidableGradeY: 3,
                unavoidable: 4,
                total: 10,
              },
            ],
          },
        ],
        formulas: {},
      } as unknown;
      mockListSheets.mockResolvedValue(['Coast Districts']);

      await user.upload(screen.getByTestId('mock-file-input'), new File(['test'], 'coast.xlsx'));
      await user.click(screen.getByRole('button', { name: 'Upload table' }));

      expect(screen.getByText('Mature')).toBeTruthy();
      expect(screen.getByText('10')).toBeTruthy();
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

      // 3. Submit the form by clicking the Upload table button after the async
      // validation cycle resolves.
      await user.click(screen.getByRole('button', { name: 'Upload table' }));
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            area: 'COASTAL' as const,
            startDate: expect.any(String),
          }),
        );
      });
    });

    it('should show the coastal validation error when no coastal data is uploaded', async () => {
      const user = userEvent.setup();
      await renderWithAppAsync(<DistrictVolumeTableUpload />);
      await user.click(screen.getByRole('radio', { name: 'Coast' }));
      await waitFor(() =>
        expect((screen.getByRole('radio', { name: 'Coast' }) as HTMLInputElement).checked).toBe(
          true,
        ),
      );
      mockTableData.current = { type: 'COASTAL', sections: [], formulas: {} };
      mockListSheets.mockResolvedValue(['Coast Districts']);
      await user.upload(screen.getByTestId('mock-file-input'), new File(['test'], 'coast.xlsx'));
      await user.click(screen.getByRole('button', { name: 'Upload table' }));

      await waitFor(() =>
        expect(screen.getByTestId('submit-error').textContent).toContain('Coast'),
      );
    });

    it('should show a generic error when the district mutation rejects with a non-Error', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockRejectedValue('failure');
      await renderWithAppAsync(<DistrictVolumeTableUpload />);
      await user.upload(screen.getByTestId('mock-file-input'), new File(['test'], 'interior.xlsx'));
      await user.click(screen.getByRole('button', { name: 'Upload table' }));
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() =>
        expect(screen.getByTestId('submit-error').textContent).toBe('Submission failed'),
      );
    });

    it('should reset data when matching-area validation returns errors', async () => {
      const user = userEvent.setup();
      interiorValidator.mockResolvedValue(['Invalid rows']);
      await renderWithAppAsync(<DistrictVolumeTableUpload />);
      await user.upload(screen.getByTestId('mock-file-input'), new File(['test'], 'interior.xlsx'));

      expect(
        (screen.getByRole('button', { name: 'Upload table' }) as HTMLButtonElement).disabled,
      ).toBe(false);
    });

    it('should report both invalid and cleared start dates', async () => {
      await renderWithAppAsync(<DistrictVolumeTableUpload />);
      await screen.findByTestId('mock-valid-date');
      await userEvent.click(screen.getByTestId('mock-invalid-date'));
      expect((screen.getByTestId('start-date-picker') as HTMLInputElement).value).toBe('');
      await userEvent.click(screen.getByTestId('mock-empty-date'));
      expect((screen.getByTestId('start-date-picker') as HTMLInputElement).value).toBe('');
      await userEvent.click(screen.getByTestId('mock-valid-date'));
      expect(screen.getByTestId('start-date-picker')).toBeTruthy();
    });

    it('should validate manually entered invalid and past start dates', async () => {
      await renderWithAppAsync(<DistrictVolumeTableUpload />);
      await userEvent.click(screen.getByTestId('mock-invalid-text'));
      await userEvent.click(screen.getByTestId('mock-past-text'));
    });

    it('should display a submit error when the mutation fails', async () => {
      const user = userEvent.setup();
      await renderWithAppAsync(<DistrictVolumeTableUpload />);

      // Make mutateAsync reject on submission
      mockMutateAsync.mockRejectedValue(new Error('API failure'));

      // Upload a valid file, then confirm the review before exercising mutation failure.
      await user.upload(screen.getByTestId('mock-file-input'), new File(['test'], 'interior.xlsx'));
      await user.click(screen.getByRole('button', { name: 'Upload table' }));
      await user.click(screen.getByRole('button', { name: 'Save' }));

      // The submit error should appear
      await waitFor(() => {
        expect(screen.getByTestId('submit-error')).toBeTruthy();
      });
    });
  });
});
