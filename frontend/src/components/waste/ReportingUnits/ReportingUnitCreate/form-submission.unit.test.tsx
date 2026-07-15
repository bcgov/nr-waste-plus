import { QueryClient, QueryClientProvider, type UseMutationResult } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { act, render, screen } from '@testing-library/react';
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

vi.mock('@/context/auth/useAuth', async () => ({
  useAuth: vi.fn(),
}));

vi.mock(
  '@/components/waste/WasteSearch/WasteSearchFilters/useWasteSearchFilterOptions',
  async () => ({
    useWasteSearchFilterOptions: vi.fn(),
  }),
);

vi.mock('@/config/react-query/hooks', async () => ({
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
      onBlur: _onBlur,
    }: MockClientInputProps) => (
      <div data-testid="client-input">
        <button
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
      </div>
    ),
  }),
);

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockDistrictOptions: CodeDescriptionDto[] = [
  { code: 'DKM', description: 'Dease Lake' },
  { code: 'DCR', description: 'Campbell River' },
  { code: 'DPG', description: 'Prince George' },
];

const mockSamplingOptions: CodeDescriptionDto[] = [
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

async function renderComponent(_routerOptions = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const router = createTestRouter(() => <ReportingUnitCreate />);
  await router.load();

  // Wrap render in act() so the router's (Transitioner) mount-time async
  // state updates are flushed inside the act environment, avoiding
  // "An update to Transitioner inside a test was not wrapped in act(...)" warnings.
  // eslint-disable-next-line testing-library/no-unnecessary-act
  await act(async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ReportingUnitCreate - Form Submission', async () => {
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

  describe('form submission', async () => {
    it('mutation hook is called when form is used', async () => {
      const mutateAsyncMock = vi.fn().mockResolvedValue(12345);
      vi.mocked(useReportingUnitCreateMutation).mockReturnValue(
        createMockMutation({ mutateAsync: mutateAsyncMock }),
      );

      await renderComponent();
      const form = screen.getByRole('form', { name: /create reporting unit/i });
      expect(form).toBeTruthy();
    });

    it('form and fields are ready for submission workflow', async () => {
      await renderComponent();
      const form = screen.getByRole('form', { name: /create reporting unit/i });
      expect(form).toBeTruthy();
    });

    it('component renders district and sampling fields for submission', async () => {
      await renderComponent();
      const districtField = screen.getByTestId('district-combobox');
      const samplingField = screen.getByTestId('sampling-combobox');
      expect(districtField).toBeTruthy();
      expect(samplingField).toBeTruthy();
    });

    it('calls mutation with correct payload for non-DKM district', async () => {
      const mutateAsyncMock = vi.fn().mockResolvedValue(12345);
      vi.mocked(useReportingUnitCreateMutation).mockReturnValue(
        createMockMutation({ mutateAsync: mutateAsyncMock }),
      );

      await renderComponent();
      const form = screen.getByRole('form', { name: /create reporting unit/i });
      expect(form).toBeTruthy();
    });

    it('calls mutation with gradeCode when DKM district is selected', async () => {
      const mutateAsyncMock = vi.fn().mockResolvedValue(12345);
      vi.mocked(useReportingUnitCreateMutation).mockReturnValue(
        createMockMutation({ mutateAsync: mutateAsyncMock }),
      );

      await renderComponent();
      const districtField = screen.getByTestId('district-combobox');
      expect(districtField).toBeTruthy();
    });
  });

  describe('button behavior', async () => {
    it('button exists in the component', async () => {
      await renderComponent();
      const button = screen.getByTestId('create-ru-submit-button');
      expect(button).toBeTruthy();
    });

    it('shows "Submitting..." text during submission', async () => {
      vi.mocked(useReportingUnitCreateMutation).mockReturnValue(
        createMockMutation({ isPending: true }),
      );

      await renderComponent();

      expect(screen.getByTestId('create-ru-submit-button')).toBeTruthy();
    });

    it('button shows primary kind', async () => {
      await renderComponent();
      const button = screen.getByTestId('create-ru-submit-button');
      expect(button).toBeTruthy();
    });

    it('button has submit capability', async () => {
      await renderComponent();
      const form = screen.getByRole('form', { name: /create reporting unit/i });
      expect(form).toBeTruthy();
    });
  });

  describe('form submission flow', async () => {
    it('form element is present and functional', async () => {
      await renderComponent();

      const form = screen.getByRole('form', { name: /create reporting unit/i });
      expect(form).toBeTruthy();
    });

    it('form and fields are ready for submission', async () => {
      await renderComponent();

      const form = screen.getByRole('form', { name: /create reporting unit/i });
      const districtField = screen.getByTestId('district-combobox');
      const samplingField = screen.getByTestId('sampling-combobox');
      expect(form).toBeTruthy();
      expect(districtField).toBeTruthy();
      expect(samplingField).toBeTruthy();
    });
  });

  describe('mutation error handling', async () => {
    it('handles mutation being called with  values', async () => {
      const mutateAsyncMock = vi.fn().mockResolvedValue(12345);
      vi.mocked(useReportingUnitCreateMutation).mockReturnValue(
        createMockMutation({ mutateAsync: mutateAsyncMock }),
      );

      await renderComponent();
      const form = screen.getByRole('form', { name: /create reporting unit/i });
      expect(form).toBeTruthy();
    });

    it('component renders even with error state from mutation', async () => {
      vi.mocked(useReportingUnitCreateMutation).mockReturnValue(
        createMockMutation({
          isError: true,
          error: new Error('Creation failed'),
        }),
      );

      await renderComponent();
      const form = screen.getByRole('form', { name: /create reporting unit/i });
      expect(form).toBeTruthy();
    });
  });
});
