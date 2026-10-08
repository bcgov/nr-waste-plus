import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ReportingUnitBlocksList from './index';

import type { ReportingUnitBlocksRow } from './constants';
import type { TableRowAction } from '@/components/Form/TableResource/types';
import type { CodeDescriptionDto } from '@/services/types';

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/components/Form/TableResource', () => ({
  default: ({
    content,
    getRowActions,
    onPageChange,
    loading,
    error,
  }: {
    content: {
      content: ReportingUnitBlocksRow[];
      page: { number: number; size: number; totalElements: number; totalPages: number };
    };
    getRowActions: (row: ReportingUnitBlocksRow) => TableRowAction<ReportingUnitBlocksRow>[];
    onPageChange: (params: { page: number; pageSize: number }) => void;
    loading: boolean;
    error: boolean;
  }) => (
    <div>
      <span>{loading ? 'Loading' : 'Loaded'}</span>
      <span>{error ? 'Error' : 'No error'}</span>
      <span>{`Page ${content.page.number}; size ${content.page.size}; total ${content.page.totalElements}`}</span>
      <button onClick={() => onPageChange({ page: 1, pageSize: 20 })}>Next page</button>
      <button onClick={() => onPageChange({ page: 0, pageSize: 10 })}>Previous page</button>
      <button
        onClick={() =>
          getRowActions(content.content[0])
            .find((action) => action.id === 'delete')
            ?.onClick(content.content[0])
        }
      >
        Invoke disabled delete callback
      </button>
      {content.content.flatMap((row) =>
        getRowActions(row).map((action) => (
          <button
            key={`${row.id}-${action.id}`}
            disabled={
              typeof action.isDisabled === 'function' ? action.isDisabled(row) : action.isDisabled
            }
            onClick={() => action.onClick(row)}
          >
            {typeof action.label === 'function' ? action.label(row) : action.label}
          </button>
        )),
      )}
    </div>
  ),
}));

const row: ReportingUnitBlocksRow = {
  id: 12,
  licenseNumber: null,
  cuttingPermit: null,
  cutBlockId: '12',
  timberMark: null,
  totalWasteAreaHa: null,
  totalWasteVolumeM3: null,
  submitter: null,
  status: null as unknown as CodeDescriptionDto,
  lastUpdated: null,
};

describe('ReportingUnitBlocksList row actions', () => {
  it('shouldExposeWorkingDetailsNavigationAndDisabledNoOpDelete', async () => {
    const user = userEvent.setup();
    render(
      <ReportingUnitBlocksList
        ruId={468}
        content={{ content: [row], page: { number: 0, size: 10, totalElements: 1, totalPages: 1 } }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'See details' }));
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/reporting-units/468/12' });

    await user.click(screen.getByRole('button', { name: 'Delete block' }));
    expect(mockNavigate).toHaveBeenCalledOnce();
  });

  it('shouldKeepTheDeleteCallbackAsANoOp', async () => {
    const user = userEvent.setup();
    render(
      <ReportingUnitBlocksList
        ruId={468}
        content={{ content: [row], page: { number: 0, size: 10, totalElements: 1, totalPages: 1 } }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Invoke disabled delete callback' }));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shouldUseTheEmptyPageDefaultsWhenContentIsMissing', () => {
    render(<ReportingUnitBlocksList ruId={468} />);

    expect(screen.getByText('Page 0; size 10; total 0')).toBeTruthy();
  });

  it('shouldApplyRequestedPageAndPageSizeToTheRenderedTable', async () => {
    const user = userEvent.setup();
    render(
      <ReportingUnitBlocksList
        ruId={468}
        content={{ content: [row], page: { number: 0, size: 10, totalElements: 1, totalPages: 1 } }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Page 1; size 20; total 1')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(screen.getByText('Page 0; size 10; total 1')).toBeTruthy();
  });

  it('shouldPassLoadingAndErrorFlagsToTheTableResource', () => {
    render(
      <ReportingUnitBlocksList
        ruId={468}
        content={{ content: [row], page: { number: 0, size: 10, totalElements: 1, totalPages: 1 } }}
        isLoading
        isError
      />,
    );

    expect(screen.getByText('Loading')).toBeTruthy();
    expect(screen.getByText('Error')).toBeTruthy();
  });
});
