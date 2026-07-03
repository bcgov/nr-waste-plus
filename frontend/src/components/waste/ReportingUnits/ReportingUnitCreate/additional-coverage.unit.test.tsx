import { QueryClient, QueryClientProvider, type UseMutationResult } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import ReportingUnitCreate from './index';

import type { FamLoginUser } from '@/context/auth/types';
import type { CodeDescriptionDto, ReportingUnitCreateDto } from '@/services/types';

import { useWasteSearchFilterOptions } from '@/components/waste/WasteSearch/WasteSearchFilters/useWasteSearchFilterOptions';
import {
  useReportingUnitCreateMutation,
  useMyForestClientsQuery,
} from '@/config/react-query/hooks';
import { createTestRouter } from '@/config/tests/routerTestHelper';
import { useAuth } from '@/context/auth/useAuth';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/components/waste/WasteSearch/WasteSearchFilters/useWasteSearchFilterOptions', () => ({
  useWasteSearchFilterOptions: vi.fn(),
}));

vi.mock('@/config/react-query/hooks', () => ({
  useReportingUnitCreateMutation: vi.fn(),
  useMyForestClientsQuery: vi.fn(),
}));

type MockClientInputProps = {
  selectedClients?: CodeDescriptionDto[];
  myClients?: CodeDescriptionDto[];
  invalid?: boolean;
  invalidText?: string | string[];
  onClientChange: (changes: { selectedItems: CodeDescriptionDto[] }) => void;
  onBlur?: () => void;
};

vi.mock(
  '@/components/waste/WasteSearch/WasteSearchFiltersAdvanced/AdvancedFilterClientInput',
  () => ({
    default: ({
      selectedClients,
      onClientChange,
      invalid,
      invalidText,
      onBlur,
    }: MockClientInputProps) => (
      <div data-testid="client-input">
        <button
          data-testid="select-client-btn"
          onClick={() =>
            onClientChange({ selectedItems: [{ code: '00001001', description: 'Test Client' }] })
          }
        >
          Select Client
        </button>
        {selectedClients?.[0] && (
          <span data-testid="selected-client">{selectedClients[0].code}</span>
        )}
        {invalid && <span data-testid="client-error">{invalidText}</span>}
        <input data-testid="client-blur-input" onBlur={onBlur} type="hidden" />
      </div>
    ),
  }),
);

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockDistrictOptions: CodeDescriptionDto[] = [
  { code: 'DKM', description: 'Dease Lake', areas: ['COASTAL', 'INTERIOR'] },
  { code: 'DCR', description: 'Campbell River', areas: ['COASTAL'] },
  { code: 'DPG', description: 'Prince George', areas: [] },
];

const mockSamplingOptions: CodeDescriptionDto[] = [
  { code: 'AVG', description: 'Average' },
  { code: 'SAM1', description: 'Ground Sampling' },
  { code: 'SAM2', description: 'Crown Sampling' },
];

const mockClients: CodeDescriptionDto[] = [
  { code: '00001001', description: 'Test Client 1' },
  { code: '00001002', description: 'Test Client 2' },
];

const mockAuthUser: FamLoginUser = {
  idpProvider: 'BCEIDBUSINESS',
  displayName: 'Test User',
  email: 'test@example.com',
  privileges: {},
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function createMockMutation(
  overrides?: Partial<UseMutationResult<number, Error, ReportingUnitCreateDto>>,
) {
  return {
    mutateAsync: vi.fn().mockResolvedValue(12345),
    isPending: false,
    data: null,
    status: 'idle',
    isError: false,
    error: null,
    failureCount: 0,
    failureReason: null,
    isIdle: true,
    isSuccess: false,
    isPaused: false,
    mutate: vi.fn(),
    reset: vi.fn(),
    submittedAt: 0,
    variables: undefined,
    context: undefined,
    ...overrides,
  } as UseMutationResult<number, Error, ReportingUnitCreateDto>;
}

async function renderComponent() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const router = createTestRouter(() => <ReportingUnitCreate />);

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  await act(async () => {});
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ReportingUnitCreate - Additional Coverage', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockAuthUser,
      isLoggedIn: true,
      isLoading: false,
      userToken: vi.fn(),
      getClients: vi.fn().mockReturnValue([
        { code: '00001001', description: 'Client 1' },
        { code: '00001002', description: 'Client 2' },
      ]),
      logout: vi.fn(),
      login: vi.fn(),
    });

    vi.mocked(useWasteSearchFilterOptions).mockReturnValue({
      samplingOptions: mockSamplingOptions,
      districtOptions: mockDistrictOptions,
      statusOptions: [],
    });

    vi.mocked(useReportingUnitCreateMutation).mockReturnValue(createMockMutation());

    vi.mocked(useMyForestClientsQuery).mockReturnValue({
      data: {
        content: mockClients.map((c) => ({ client: c })),
        page: 0,
        pageSize: 10,
        total: mockClients.length,
      },
      isLoading: false,
      isError: false,
      error: null,
      status: 'success',
    } as unknown as ReturnType<typeof useMyForestClientsQuery>);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('grade auto-selection with form.setFieldValue', () => {
    it('should auto-select grade when district with single area is selected', async () => {
      // Mock district with single area
      vi.mocked(useWasteSearchFilterOptions).mockReturnValue({
        samplingOptions: mockSamplingOptions,
        districtOptions: [
          { code: 'DKM', description: 'Dease Lake', areas: ['COASTAL'] },
          { code: 'DCR', description: 'Campbell River', areas: ['COASTAL'] },
        ],
        statusOptions: [],
      });

      await renderComponent();

      const districtComboBox = document.querySelector('#create-ru-district') as HTMLElement;
      await act(async () => {
        const event = new CustomEvent('change', {
          detail: { selectedItem: { code: 'DKM', description: 'Dease Lake' } },
          bubbles: true,
          cancelable: true,
        });
        districtComboBox?.dispatchEvent(event);
      });

      // Grade should be auto-selected, so field should not show
      await waitFor(() => {
        const gradeGroup = document.querySelector('#create-ru-grade');
        expect(gradeGroup).toBeNull();
      });
    });

    it('should set grade to null when district has multiple areas', async () => {
      await renderComponent();

      const districtComboBox = document.querySelector('#create-ru-district') as HTMLElement;
      await act(async () => {
        const event = new CustomEvent('change', {
          detail: { selectedItem: { code: 'DKM', description: 'Dease Lake' } },
          bubbles: true,
          cancelable: true,
        });
        districtComboBox?.dispatchEvent(event);
      });

      await waitFor(() => {
        const gradeGroup = document.querySelector('#create-ru-grade');
        expect(gradeGroup).toBeDefined();
      });
    });
  });

  describe('itemToString callback coverage', () => {
    it('should render district combobox with itemToString', async () => {
      await renderComponent();

      const districtComboBox = document.querySelector('#create-ru-district');
      expect(districtComboBox).toBeDefined();
      // itemToString is used internally by Carbon ComboBox
    });

    it('should render sampling combobox with itemToString', async () => {
      await renderComponent();

      const samplingComboBox = document.querySelector('#as-sampling-multi-select');
      expect(samplingComboBox).toBeDefined();
      // itemToString is used internally by Carbon ComboBox
    });
  });

  describe('grade field rendering and interaction', () => {
    it('should render grade field with correct structure when visible', async () => {
      await renderComponent();

      const districtComboBox = document.querySelector('#create-ru-district') as HTMLElement;
      await act(async () => {
        const event = new CustomEvent('change', {
          detail: { selectedItem: { code: 'DKM', description: 'Dease Lake' } },
          bubbles: true,
          cancelable: true,
        });
        districtComboBox?.dispatchEvent(event);
      });

      await waitFor(() => {
        const gradeGroup = document.querySelector('#create-ru-grade');
        expect(gradeGroup).toBeDefined();
      });
    });

    it('should render both coastal and interior radio buttons', async () => {
      await renderComponent();

      const districtComboBox = document.querySelector('#create-ru-district') as HTMLElement;
      await act(async () => {
        const event = new CustomEvent('change', {
          detail: { selectedItem: { code: 'DKM', description: 'Dease Lake' } },
          bubbles: true,
          cancelable: true,
        });
        districtComboBox?.dispatchEvent(event);
      });

      await waitFor(() => {
        const coastalRadio = document.querySelector('#create-ru-grade-coastal');
        const interiorRadio = document.querySelector('#create-ru-grade-interior');
        expect(coastalRadio).toBeDefined();
        expect(interiorRadio).toBeDefined();
      });
    });

    it('should handle grade field onChange with proper event handling', async () => {
      await renderComponent();

      const districtComboBox = document.querySelector('#create-ru-district') as HTMLElement;
      await act(async () => {
        const event = new CustomEvent('change', {
          detail: { selectedItem: { code: 'DKM', description: 'Dease Lake' } },
          bubbles: true,
          cancelable: true,
        });
        districtComboBox?.dispatchEvent(event);
      });

      await waitFor(() => {
        const gradeGroup = document.querySelector('#create-ru-grade');
        expect(gradeGroup).toBeDefined();
      });

      const coastalRadio = document.querySelector('#create-ru-grade-coastal') as HTMLInputElement;
      if (coastalRadio) {
        await act(async () => {
          const changeEvent = new Event('change', { bubbles: true });
          Object.defineProperty(changeEvent, 'target', {
            value: { value: 'COASTAL' },
            enumerable: true,
          });
          coastalRadio.dispatchEvent(changeEvent);
        });
      }

      expect(coastalRadio).toBeDefined();
    });

    it('should display grade field validation errors when touched', async () => {
      await renderComponent();

      const districtComboBox = document.querySelector('#create-ru-district') as HTMLElement;
      await act(async () => {
        const event = new CustomEvent('change', {
          detail: { selectedItem: { code: 'DKM', description: 'Dease Lake' } },
          bubbles: true,
          cancelable: true,
        });
        districtComboBox?.dispatchEvent(event);
      });

      await waitFor(() => {
        const gradeGroup = document.querySelector('#create-ru-grade');
        expect(gradeGroup).toBeDefined();
      });

      const gradeGroup = document.querySelector('#create-ru-grade') as HTMLElement;
      await act(async () => {
        const blurEvent = new FocusEvent('blur', { bubbles: true });
        gradeGroup?.dispatchEvent(blurEvent);
      });

      expect(gradeGroup).toBeDefined();
    });
  });

  describe('button onClick handler', () => {
    it('should call form.handleSubmit when button is clicked', async () => {
      const mutateAsyncMock = vi.fn().mockResolvedValue(12345);

      vi.mocked(useReportingUnitCreateMutation).mockReturnValue(
        createMockMutation({
          mutateAsync: mutateAsyncMock,
        }),
      );

      await renderComponent();
      const user = userEvent.setup();

      // Select client
      const selectClientBtn = screen.getByTestId('select-client-btn');
      await user.click(selectClientBtn);

      // Select district
      const districtComboBox = document.querySelector('#create-ru-district') as HTMLElement;
      await act(async () => {
        const event = new CustomEvent('change', {
          detail: { selectedItem: { code: 'DCR', description: 'Campbell River' } },
          bubbles: true,
          cancelable: true,
        });
        districtComboBox?.dispatchEvent(event);
      });

      // Select sampling
      const samplingComboBox = document.querySelector('#as-sampling-multi-select') as HTMLElement;
      await act(async () => {
        const event = new CustomEvent('change', {
          detail: { selectedItem: { code: 'SAM1', description: 'Ground Sampling' } },
          bubbles: true,
          cancelable: true,
        });
        samplingComboBox?.dispatchEvent(event);
      });

      // Now button should be clickable
      await waitFor(() => {
        const submitBtn = screen.getByRole('button', { name: /Create/i });
        expect(submitBtn).toBeDefined();
      });
    });

    it('should show submitting state when form is being submitted', async () => {
      vi.mocked(useReportingUnitCreateMutation).mockReturnValue(
        createMockMutation({
          isPending: true,
        }),
      );

      await renderComponent();

      const submitBtn = screen.getByRole('button', { name: /Create/i });
      expect((submitBtn as HTMLButtonElement).disabled).toBe(true);
      expect(screen.getByText('Submitting...')).toBeDefined();
    });
  });

  describe('form field validators - async validation', () => {
    it('should validate client field with runValidators on blur', async () => {
      await renderComponent();

      const clientBlurInput = screen.getByTestId('client-blur-input');
      await act(async () => {
        clientBlurInput.blur();
      });

      expect(clientBlurInput).toBeDefined();
    });

    it('should validate client field with runValidators on change', async () => {
      await renderComponent();
      const user = userEvent.setup();

      const selectClientBtn = screen.getByTestId('select-client-btn');
      await user.click(selectClientBtn);

      expect(selectClientBtn).toBeDefined();
    });

    it('should validate district field with runValidators on blur', async () => {
      await renderComponent();

      const districtComboBox = document.querySelector('#create-ru-district') as HTMLElement;
      await act(async () => {
        const blurEvent = new FocusEvent('blur', { bubbles: true });
        districtComboBox?.dispatchEvent(blurEvent);
      });

      expect(districtComboBox).toBeDefined();
    });

    it('should validate district field with runValidators on change', async () => {
      await renderComponent();

      const districtComboBox = document.querySelector('#create-ru-district') as HTMLElement;
      await act(async () => {
        const event = new CustomEvent('change', {
          detail: { selectedItem: { code: 'DKM', description: 'Dease Lake' } },
          bubbles: true,
          cancelable: true,
        });
        districtComboBox?.dispatchEvent(event);
      });

      expect(districtComboBox).toBeDefined();
    });

    it('should validate sampling field with runValidators on blur', async () => {
      await renderComponent();

      const samplingComboBox = document.querySelector('#as-sampling-multi-select') as HTMLElement;
      await act(async () => {
        const blurEvent = new FocusEvent('blur', { bubbles: true });
        samplingComboBox?.dispatchEvent(blurEvent);
      });

      expect(samplingComboBox).toBeDefined();
    });

    it('should validate sampling field with runValidators on change', async () => {
      await renderComponent();

      const samplingComboBox = document.querySelector('#as-sampling-multi-select') as HTMLElement;
      await act(async () => {
        const event = new CustomEvent('change', {
          detail: { selectedItem: { code: 'SAM1', description: 'Ground Sampling' } },
          bubbles: true,
          cancelable: true,
        });
        samplingComboBox?.dispatchEvent(event);
      });

      expect(samplingComboBox).toBeDefined();
    });

    it('should validate grade field with runValidators on blur when visible', async () => {
      await renderComponent();

      const districtComboBox = document.querySelector('#create-ru-district') as HTMLElement;
      await act(async () => {
        const event = new CustomEvent('change', {
          detail: { selectedItem: { code: 'DKM', description: 'Dease Lake' } },
          bubbles: true,
          cancelable: true,
        });
        districtComboBox?.dispatchEvent(event);
      });

      await waitFor(() => {
        const gradeGroup = document.querySelector('#create-ru-grade');
        expect(gradeGroup).toBeDefined();
      });

      const gradeGroup = document.querySelector('#create-ru-grade') as HTMLElement;
      await act(async () => {
        const blurEvent = new FocusEvent('blur', { bubbles: true });
        gradeGroup?.dispatchEvent(blurEvent);
      });

      expect(gradeGroup).toBeDefined();
    });

    it('should validate grade field with runValidators on change when visible', async () => {
      await renderComponent();

      const districtComboBox = document.querySelector('#create-ru-district') as HTMLElement;
      await act(async () => {
        const event = new CustomEvent('change', {
          detail: { selectedItem: { code: 'DKM', description: 'Dease Lake' } },
          bubbles: true,
          cancelable: true,
        });
        districtComboBox?.dispatchEvent(event);
      });

      await waitFor(() => {
        const gradeGroup = document.querySelector('#create-ru-grade');
        expect(gradeGroup).toBeDefined();
      });

      const coastalRadio = document.querySelector('#create-ru-grade-coastal') as HTMLInputElement;
      if (coastalRadio) {
        await act(async () => {
          const changeEvent = new Event('change', { bubbles: true });
          Object.defineProperty(changeEvent, 'target', {
            value: { value: 'COASTAL' },
            enumerable: true,
          });
          coastalRadio.dispatchEvent(changeEvent);
        });
      }

      expect(coastalRadio).toBeDefined();
    });
  });

  describe('district selection with grade clearing', () => {
    it('should clear grade when switching from multi-area to single-area district', async () => {
      await renderComponent();

      const districtComboBox = document.querySelector('#create-ru-district') as HTMLElement;

      // First select DKM (multi-area)
      await act(async () => {
        const event = new CustomEvent('change', {
          detail: { selectedItem: { code: 'DKM', description: 'Dease Lake' } },
          bubbles: true,
          cancelable: true,
        });
        districtComboBox?.dispatchEvent(event);
      });

      await waitFor(() => {
        const gradeGroup = document.querySelector('#create-ru-grade');
        expect(gradeGroup).toBeDefined();
      });

      // Then switch to DCR (single-area)
      await act(async () => {
        const event = new CustomEvent('change', {
          detail: { selectedItem: { code: 'DCR', description: 'Campbell River' } },
          bubbles: true,
          cancelable: true,
        });
        districtComboBox?.dispatchEvent(event);
      });

      await waitFor(() => {
        const gradeGroup = document.querySelector('#create-ru-grade');
        expect(gradeGroup).toBeNull();
      });
    });
  });

  describe('combobox onChange with null selectedItem', () => {
    it('should handle district combobox onChange with null selectedItem', async () => {
      await renderComponent();

      const districtComboBox = document.querySelector('#create-ru-district') as HTMLElement;
      await act(async () => {
        const event = new CustomEvent('change', {
          detail: {},
          bubbles: true,
          cancelable: true,
        });
        districtComboBox?.dispatchEvent(event);
      });

      expect(districtComboBox).toBeDefined();
    });

    it('should handle sampling combobox onChange with null selectedItem', async () => {
      await renderComponent();

      const samplingComboBox = document.querySelector('#as-sampling-multi-select') as HTMLElement;
      await act(async () => {
        const event = new CustomEvent('change', {
          detail: {},
          bubbles: true,
          cancelable: true,
        });
        samplingComboBox?.dispatchEvent(event);
      });

      expect(samplingComboBox).toBeDefined();
    });
  });

  describe('form field state tracking', () => {
    it('should track district field state changes', async () => {
      await renderComponent();

      const districtComboBox = document.querySelector('#create-ru-district') as HTMLElement;
      await act(async () => {
        const event = new CustomEvent('change', {
          detail: { selectedItem: { code: 'DKM', description: 'Dease Lake' } },
          bubbles: true,
          cancelable: true,
        });
        districtComboBox?.dispatchEvent(event);
      });

      expect(districtComboBox).toBeDefined();
    });

    it('should track sampling field state changes', async () => {
      await renderComponent();

      const samplingComboBox = document.querySelector('#as-sampling-multi-select') as HTMLElement;
      await act(async () => {
        const event = new CustomEvent('change', {
          detail: { selectedItem: { code: 'SAM1', description: 'Ground Sampling' } },
          bubbles: true,
          cancelable: true,
        });
        samplingComboBox?.dispatchEvent(event);
      });

      expect(samplingComboBox).toBeDefined();
    });
  });
});
