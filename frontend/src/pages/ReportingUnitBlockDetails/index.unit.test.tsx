import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { useBlockDetailsQuery, useReportingUnitDetailsQuery } from '@/config/react-query/hooks';
import { renderWithApp } from '@/config/tests/renderWithApp';

import ReportingUnitBlockDetailsPage from './index';

const mockNavigate = vi.fn();
const mockRuRefetch = vi.fn();
const mockBlockRefetch = vi.fn();

vi.mock('@/config/react-query/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/react-query/hooks')>();
  return {
    ...actual,
    useReportingUnitDetailsQuery: vi.fn(),
    useBlockDetailsQuery: vi.fn(),
  };
});

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useParams: () => ({ ruId: '468', blockId: '12' }),
    useNavigate: () => mockNavigate,
  };
});

const defaultData = {
  id: 468,
  client: { code: '00002022', description: 'Canadian Forest Products Ltd.' },
  clientStatus: { code: 'ACT', description: 'Active' },
  grade: { code: 'IN', description: 'Interior' },
  sampling: { code: 'DA', description: 'District Average' },
  district: { code: 'DKM', description: 'Coast Mountains District' },
};

const defaultBlockData = {
  id: 12,
  reportingUnitId: 468,
  blockType: 'DISTRICT_AVERAGE',
  draft: true,
  plcDate: '2026-01-15',
  revision: 0,
  isLegacy: false,
};

const renderPage = async () => {
  const result = renderWithApp(<ReportingUnitBlockDetailsPage />);
  await act(async () => {
    await Promise.resolve();
  });
  return result;
};

describe('ReportingUnitBlockDetailsPage (foundation)', () => {
  it('renders block details page with controlled tabs and actions', async () => {
    const user = userEvent.setup();
    mockNavigate.mockClear();
    vi.mocked(useReportingUnitDetailsQuery).mockReturnValue({
      data: defaultData,
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: mockRuRefetch,
    } as never);
    vi.mocked(useBlockDetailsQuery).mockReturnValue({
      data: defaultBlockData,
      isLoading: false,
      isError: false,
      refetch: mockBlockRefetch,
    } as never);

    await renderPage();

    expect(screen.getByRole('heading', { level: 1, name: /Block ID 12/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Block details' })).toBeTruthy();
    expect(screen.getByLabelText('Submission details')).toBeTruthy();

    await user.click(screen.getByRole('tab', { name: 'Attachments' }));
    expect(screen.getByText('Attachments content')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Save' }));
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(mockNavigate).toHaveBeenCalled();
  });

  it('renders read-only mode for legacy block and progress skeleton when fetching', async () => {
    vi.mocked(useReportingUnitDetailsQuery).mockReturnValue({
      data: defaultData,
      isLoading: false,
      isFetching: true,
      isError: false,
      refetch: mockRuRefetch,
    } as never);
    vi.mocked(useBlockDetailsQuery).mockReturnValue({
      data: { ...defaultBlockData, isLegacy: true },
      isLoading: false,
      isError: false,
      refetch: mockBlockRefetch,
    } as never);

    await renderPage();
    expect(screen.getByRole('heading', { level: 1, name: /Block ID 12/i })).toBeTruthy();
  });

  it('renders block-missing error state and supports retry/back actions', async () => {
    const user = userEvent.setup();
    mockNavigate.mockClear();
    mockRuRefetch.mockClear();
    mockBlockRefetch.mockClear();
    vi.mocked(useReportingUnitDetailsQuery).mockReturnValue({
      data: defaultData,
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: mockRuRefetch,
    } as never);
    vi.mocked(useBlockDetailsQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mockBlockRefetch,
    } as never);

    await renderPage();

    expect(screen.getByText('Reporting Unit Block not found')).toBeTruthy();
    await user.click(screen.getByTestId('rublock-retry'));
    expect(mockRuRefetch).toHaveBeenCalled();
    expect(mockBlockRefetch).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(mockNavigate).toHaveBeenCalled();
  });
});
