import { QueryClient, QueryClientProvider, type UseMutationResult } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ReportingUnitCreate from './index';

import type { FamLoginUser } from '@/context/auth/types';
import type { CodeDescriptionDto, ReportingUnitCreateDto } from '@/services/types';
import type { ChangeEvent, ReactElement, ReactNode } from 'react';

import { useWasteSearchFilterOptions } from '@/components/waste/WasteSearch/WasteSearchFilters/useWasteSearchFilterOptions';
import {
  useMyForestClientsQuery,
  useReportingUnitCreateMutation,
} from '@/config/react-query/hooks';
import { createTestRouter } from '@/config/tests/routerTestHelper';
import { useAuth } from '@/context/auth/useAuth';

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
    default: ({ selectedClients, onClientChange, invalid, invalidText }: MockClientInputProps) => (
      <div data-testid="client-input">
        <button
          type="button"
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

vi.mock('@carbon/react', async () => {
  const React = await import('react');
  const { Children, cloneElement, isValidElement } = React;

  type MockButtonProps = {
    children?: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    renderIcon?: ReactElement;
    [key: string]: unknown;
  };

  type MockComboBoxProps = {
    id?: string;
    titleText?: string;
    items?: CodeDescriptionDto[];
    selectedItem?: CodeDescriptionDto | null;
    onChange?: (event: { selectedItem?: CodeDescriptionDto | null }) => void;
    onBlur?: () => void;
  };

  type MockRadioButtonGroupProps = {
    children?: ReactNode;
    onChange?: (
      selection?: string | number,
      name?: string,
      event?: ChangeEvent<HTMLInputElement>,
    ) => void;
    onBlur?: () => void;
    legendText?: string;
    id?: string;
    value?: string;
  };

  type MockRadioButtonProps = {
    id?: string;
    labelText?: string;
    value?: string;
    checked?: boolean;
    onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  };

  return {
    Button: ({
      children,
      onClick,
      disabled,
      renderIcon: _renderIcon,
      ...props
    }: MockButtonProps) => (
      <button type="button" onClick={onClick} disabled={disabled} {...props}>
        {children}
      </button>
    ),
    Column: ({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) => (
      <div {...props}>{children}</div>
    ),
    ComboBox: ({
      id,
      titleText,
      items = [],
      selectedItem,
      onChange,
      onBlur,
    }: MockComboBoxProps) => (
      <div>
        <label htmlFor={id}>{titleText}</label>
        <select
          id={id}
          aria-label={titleText}
          value={selectedItem?.code ?? ''}
          onBlur={onBlur}
          onChange={(event) => {
            const selectedOption = items.find((item) => item.code === event.target.value);
            onChange?.({ selectedItem: selectedOption ?? null });
          }}
        >
          <option value="">Select</option>
          {items.map((item) => (
            <option key={item.code} value={item.code}>
              {item.description}
            </option>
          ))}
        </select>
      </div>
    ),
    RadioButtonGroup: ({
      children,
      onChange,
      onBlur,
      legendText,
      id,
      value,
    }: MockRadioButtonGroupProps) => (
      <fieldset id={id} onBlur={onBlur}>
        <legend>{legendText}</legend>
        {Children.map(children, (child) => {
          if (!isValidElement(child)) {
            return child;
          }

          const childProps = child.props as Partial<MockRadioButtonProps>;
          const childValue = childProps.value ?? '';

          return cloneElement(child as ReactElement<MockRadioButtonProps>, {
            checked: childValue === (value ?? ''),
            onChange: () =>
              onChange?.(undefined, undefined, {
                target: { value: childValue },
              } as unknown as ChangeEvent<HTMLInputElement>),
          });
        })}
      </fieldset>
    ),
    RadioButton: ({ id, labelText, value, checked, onChange }: MockRadioButtonProps) => (
      <label htmlFor={id}>
        <input id={id} type="radio" value={value ?? ''} checked={checked} onChange={onChange} />
        <span>{labelText}</span>
      </label>
    ),
  };
});

const mockDistrictOptions: CodeDescriptionDto[] = [
  { code: 'DKM', description: 'Dease Lake', areas: ['COASTAL', 'INTERIOR'] },
  { code: 'DCR', description: 'Campbell River', areas: ['COASTAL'] },
  { code: 'DPG', description: 'Prince George', areas: [] },
];

const mockSamplingOptions: CodeDescriptionDto[] = [
  { code: 'AVG', description: 'Average' },
  { code: 'GND', description: 'Ground Sampling' },
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
  await router.load();

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('ReportingUnitCreate branch coverage', () => {
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
        content: mockClients.map((client) => ({ client })),
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

  it('shows grade options when a district supports both grade areas', async () => {
    const user = userEvent.setup();

    await renderComponent();

    await user.selectOptions(screen.getByLabelText('District'), 'DKM');

    await waitFor(() => {
      expect(screen.getByText('Select grades you will use')).toBeTruthy();
    });
  });

  it('does not show grade options for districts with a single area', async () => {
    const user = userEvent.setup();

    await renderComponent();

    await user.selectOptions(screen.getByLabelText('District'), 'DCR');

    await waitFor(() => {
      expect(screen.queryByText('Select grades you will use')).toBeNull();
    });
  });

  it('submits the form with the selected client, district, grade, and sampling values', async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue(12345);
    vi.mocked(useReportingUnitCreateMutation).mockReturnValue(createMockMutation({ mutateAsync }));

    await renderComponent();

    await user.click(screen.getByRole('button', { name: 'Select Client' }));

    await user.selectOptions(screen.getByLabelText('District'), 'DKM');

    await user.click(screen.getByLabelText('Coastal grades'));

    await user.selectOptions(screen.getByLabelText('Sampling option'), 'GND');

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /Create/i });
      expect(submitButton.hasAttribute('disabled')).toBe(false);
    });

    // eslint-disable-next-line testing-library/no-node-access
    const form = screen.getByRole('button', { name: /Create/i }).closest('form');
    if (!form) {
      throw new Error('Form element not found');
    }

    fireEvent.submit(form);

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        clientNumber: '00001001',
        districtCode: 'DKM',
        gradeCode: 'COASTAL',
        samplingCode: 'GND',
      });
    });
  });
});
