import { useNavigate, useParams } from '@tanstack/react-router';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import FormulaConfigurationDetailPage from './index';

import type { FormulaSetResponse } from '@/services/formulaConfiguration.types';

import { useFormulaSetDetail } from '@/hooks/useFormulaConfiguration';
import { navigateInTree } from '@/routes/inTreePaths';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@tanstack/react-router', () => ({
  useNavigate: vi.fn(),
  useParams: vi.fn().mockReturnValue({ id: '42' }),
}));

vi.mock('@/hooks/useFormulaConfiguration', () => ({
  useFormulaSetDetail: vi.fn(),
}));

vi.mock('@/components/waste/FormulaConfigurationDetail/FormulaConfigurationDetailView', () => ({
  default: ({ data }: { data: FormulaSetResponse }) => (
    <div data-testid="formula-set-detail-view">
      <span data-testid="rendered-id">{data.id}</span>
    </div>
  ),
}));

vi.mock('@/components/waste/FormulaConfigurationDetail/FormulaConfigurationDetailSkeleton', () => ({
  default: () => <div data-testid="formula-set-detail-skeleton" />,
}));

vi.mock('@/components/core/PageTitle', () => ({
  default: ({
    title,
    subtitle,
    breadCrumbs,
    children,
  }: {
    title: string;
    subtitle?: string;
    breadCrumbs?: Array<{ name: string; path: string }>;
    children?: ReactNode;
  }) => (
    <div data-testid="page-title">
      <span data-testid="page-title-text">{title}</span>
      {subtitle && <span data-testid="page-subtitle-text">{subtitle}</span>}
      {breadCrumbs?.map((crumb) => (
        <a key={crumb.name} data-testid={`breadcrumb-${crumb.name}`} href={crumb.path}>
          {crumb.name}
        </a>
      ))}
      {children}
    </div>
  ),
}));

vi.mock('@/components/core/PageNotification', () => ({
  default: ({ eventTarget }: { eventTarget: string }) => (
    <div data-testid="page-notification" data-event-target={eventTarget} />
  ),
}));

vi.mock('@/routes/inTreePaths', () => ({
  navigateInTree: vi.fn(),
}));

// ============================================================================
// Factory helpers
// ============================================================================

const createData = (id = 42): FormulaSetResponse => ({
  id,
  area: 'INTERIOR',
  startDate: '2026-06-01',
  endDate: null,
  deleted: false,
  formulas: [],
  createdAt: '2026-05-15T14:23:00Z',
  updatedAt: '2026-06-01T10:00:00Z',
});

// ============================================================================
// Tests
// ============================================================================

describe('FormulaConfigurationDetailPage', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
  });

  it('should render FormulaConfigurationDetailSkeleton when isLoading is true', () => {
    vi.mocked(useFormulaSetDetail).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useFormulaSetDetail>);

    render(<FormulaConfigurationDetailPage />);

    expect(screen.getByTestId('formula-set-detail-skeleton')).toBeTruthy();
    expect(screen.queryByTestId('page-title')).toBeNull();
    expect(screen.queryByTestId('formula-set-detail-view')).toBeNull();
  });

  it('should render error title and PageNotification when isError is true', () => {
    vi.mocked(useFormulaSetDetail).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof useFormulaSetDetail>);

    render(<FormulaConfigurationDetailPage />);

    expect(screen.getByTestId('page-title-text').textContent).toBe('Formula set not found');
    expect(screen.getByTestId('page-notification')).toBeTruthy();
    expect(screen.queryByTestId('formula-set-detail-view')).toBeNull();
  });

  it('should render error title when data is null', () => {
    vi.mocked(useFormulaSetDetail).mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useFormulaSetDetail>);

    render(<FormulaConfigurationDetailPage />);

    expect(screen.getByTestId('page-title-text').textContent).toBe('Formula set not found');
    expect(screen.queryByTestId('formula-set-detail-view')).toBeNull();
  });

  it('should navigate back from the error state', async () => {
    vi.mocked(useFormulaSetDetail).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof useFormulaSetDetail>);

    const user = userEvent.setup();
    render(<FormulaConfigurationDetailPage />);

    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(navigateInTree).toHaveBeenCalledWith(mockNavigate, '/configuration/formulas');
  });

  it('should render page title with data and FormulaConfigurationDetailView', () => {
    const data = createData(42);
    vi.mocked(useFormulaSetDetail).mockReturnValue({
      data,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useFormulaSetDetail>);

    render(<FormulaConfigurationDetailPage />);

    expect(screen.getByTestId('page-title-text').textContent).toBe('Formula set: Interior');
    expect(screen.getByTestId('formula-set-detail-view')).toBeTruthy();
    expect(screen.getByTestId('rendered-id').textContent).toBe('42');
  });

  it('should normalize the area in the page title', () => {
    const data = createData();
    data.area = 'COASTAL';
    vi.mocked(useFormulaSetDetail).mockReturnValue({
      data,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useFormulaSetDetail>);

    render(<FormulaConfigurationDetailPage />);

    expect(screen.getByTestId('page-title-text').textContent).toBe('Formula set: Coastal');
  });

  it('should render the correct subtitle text', () => {
    const data = createData();
    vi.mocked(useFormulaSetDetail).mockReturnValue({
      data,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useFormulaSetDetail>);

    render(<FormulaConfigurationDetailPage />);

    expect(screen.getByTestId('page-subtitle-text').textContent).toBe(
      'View formulas used to calculate reporting unit and block values',
    );
  });

  it('should pass breadcrumbs to PageTitle', () => {
    const data = createData(42);
    vi.mocked(useFormulaSetDetail).mockReturnValue({
      data,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useFormulaSetDetail>);

    render(<FormulaConfigurationDetailPage />);

    expect(screen.getByTestId('breadcrumb-Configuration')).toBeTruthy();
    expect(screen.getByTestId('breadcrumb-Configuration').getAttribute('href')).toBe(
      '/configuration',
    );
    expect(screen.getByTestId('breadcrumb-Formula sets')).toBeTruthy();
    expect(screen.getByTestId('breadcrumb-Formula sets').getAttribute('href')).toBe(
      '/configuration/formulas',
    );
  });

  it('should render a Back button that navigates to the formula set list', async () => {
    vi.mocked(useFormulaSetDetail).mockReturnValue({
      data: createData(),
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useFormulaSetDetail>);

    const user = userEvent.setup();
    render(<FormulaConfigurationDetailPage />);

    const backButton = screen.getByRole('button', { name: 'Back' });
    await user.click(backButton);

    expect(navigateInTree).toHaveBeenCalledWith(mockNavigate, '/configuration/formulas');

    // The Back button is placed at the bottom of the page, not in the page title.
    expect(
      within(screen.getByTestId('page-title')).queryByRole('button', { name: 'Back' }),
    ).toBeNull();
    expect(
      within(screen.getByTestId('formula-set-detail-actions')).getByRole('button', {
        name: 'Back',
      }),
    ).toBeTruthy();
  });

  it('passes the numeric id derived from route params to the query hook', () => {
    vi.mocked(useFormulaSetDetail).mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useFormulaSetDetail>);

    render(<FormulaConfigurationDetailPage />);

    expect(useFormulaSetDetail).toHaveBeenCalledWith(42);
  });

  it('forwards NaN when the route id cannot be parsed as a number', () => {
    // Override the useParams mock for this test only.
    vi.mocked(useParams).mockReturnValue({ id: 'not-a-number' });

    vi.mocked(useFormulaSetDetail).mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useFormulaSetDetail>);

    render(<FormulaConfigurationDetailPage />);

    expect(useFormulaSetDetail).toHaveBeenCalledWith(NaN);
  });
});
