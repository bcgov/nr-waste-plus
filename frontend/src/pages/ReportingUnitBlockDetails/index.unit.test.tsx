import { act, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useBlockDetailsQuery, useReportingUnitDetailsQuery } from '@/config/react-query/hooks';
import { renderWithApp } from '@/config/tests/renderWithApp';

import ReportingUnitBlockDetailsPage from './index';

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
    useNavigate: () => vi.fn(),
  };
});

const renderPage = async () => {
  const result = renderWithApp(<ReportingUnitBlockDetailsPage />);
  await act(async () => {
    await Promise.resolve();
  });
  return result;
};

describe('ReportingUnitBlockDetailsPage (foundation)', () => {
  it('renders block details page with controlled tabs and block details content', async () => {
    vi.mocked(useReportingUnitDetailsQuery).mockReturnValue({
      data: {
        id: 468,
        client: { code: '00002022', description: 'Canadian Forest Products Ltd.' },
        clientStatus: { code: 'ACT', description: 'Active' },
        grade: { code: 'IN', description: 'Interior' },
        sampling: { code: 'DA', description: 'District Average' },
        district: { code: 'DKM', description: 'Coast Mountains District' },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useBlockDetailsQuery).mockReturnValue({
      data: {
        id: 12,
        reportingUnitId: 468,
        blockType: 'DISTRICT_AVERAGE',
        draft: true,
        plcDate: '2026-01-15',
        revision: 0,
        isLegacy: false,
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);

    await renderPage();

    expect(screen.getByRole('heading', { level: 1, name: /Block ID 12/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Block details' })).toBeTruthy();
    expect(screen.getByLabelText('Submission details')).toBeTruthy();
  });
});
