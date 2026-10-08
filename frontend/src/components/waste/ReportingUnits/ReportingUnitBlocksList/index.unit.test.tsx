import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import userEvent from '@testing-library/user-event';

import { PreferenceProvider } from '@/context/preference/PreferenceProvider';

import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { CodeDescriptionDto } from '@/services/types';
import type { PageableResponse } from '@/types/PageableResponse.types';

import ReportingUnitBlocksList, { type ReportingUnitBlocksRow } from './index';

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

/**
 * Status code/description pairs from the Figma design (zInceMk1eEq3X1p0LFwoK8,
 * node 161:29645), reused to exercise every ColorTag color mapping.
 */
const BLOCK_STATUSES = {
  submitted: { code: 'SUB', description: 'Submitted' },
  approved: { code: 'APP', description: 'Approved' },
  billingIssued: { code: 'BIS', description: 'Billing Issued' },
  officeRejected: { code: 'OREJ', description: 'Office Rejected' },
  hold: { code: 'HLD', description: 'Hold' },
  draft: { code: 'DFT', description: 'Draft' },
} satisfies Record<string, CodeDescriptionDto>;

/**
 * Ten rows exercising the blocks table visuals: the Figma status distribution,
 * the "…" continuation row from the design, and one Draft block (id 9) with
 * null licence fields to exercise the empty-value treatment. First row matches
 * the first row of the Figma mock verbatim.
 */
const DUMMY_BLOCKS_CONTENT: PageableResponse<ReportingUnitBlocksRow> = {
  content: [
    {
      id: 1,
      licenseNumber: 'A00123',
      cuttingPermit: '75',
      cutBlockId: '101',
      timberMark: '75/1AD',
      totalWasteAreaHa: 1.99,
      totalWasteVolumeM3: 57,
      submitter: 'Jane Lumberjack',
      status: BLOCK_STATUSES.submitted,
      lastUpdated: '2025-07-01T16:43:00',
    },
    {
      id: 2,
      licenseNumber: 'A00123',
      cuttingPermit: '75',
      cutBlockId: '102',
      timberMark: '75/1AD',
      totalWasteAreaHa: 2.5,
      totalWasteVolumeM3: 88,
      submitter: 'Jane Lumberjack',
      status: BLOCK_STATUSES.billingIssued,
      lastUpdated: '2025-07-14T09:05:00',
    },
    {
      id: 3,
      licenseNumber: 'A00456',
      cuttingPermit: '12B',
      cutBlockId: '103',
      timberMark: '12B/07',
      totalWasteAreaHa: 0.75,
      totalWasteVolumeM3: 21,
      submitter: 'John Forester',
      status: BLOCK_STATUSES.hold,
      lastUpdated: '2025-07-10T14:22:00',
    },
    {
      id: 4,
      licenseNumber: 'A00456',
      cuttingPermit: '12B',
      cutBlockId: '104',
      timberMark: '12B/08',
      totalWasteAreaHa: 3.1,
      totalWasteVolumeM3: 102,
      submitter: 'Jane Lumberjack',
      status: BLOCK_STATUSES.officeRejected,
      lastUpdated: '2025-07-08T11:37:00',
    },
    {
      id: 5,
      licenseNumber: 'A00789',
      cuttingPermit: '03',
      cutBlockId: '105',
      timberMark: '03/99',
      totalWasteAreaHa: 5.02,
      totalWasteVolumeM3: 188,
      submitter: 'Mika Rivers',
      status: BLOCK_STATUSES.approved,
      lastUpdated: '2025-07-05T08:15:00',
    },
    {
      id: 6,
      licenseNumber: 'A00789',
      cuttingPermit: '03',
      cutBlockId: '106',
      timberMark: '03/99',
      totalWasteAreaHa: 1.2,
      totalWasteVolumeM3: 34,
      submitter: 'Mika Rivers',
      status: BLOCK_STATUSES.billingIssued,
      lastUpdated: '2025-06-28T17:52:00',
    },
    {
      id: 7,
      licenseNumber: 'A00999',
      cuttingPermit: '8C',
      cutBlockId: '107',
      timberMark: '8C/21',
      totalWasteAreaHa: 0.95,
      totalWasteVolumeM3: 26,
      submitter: 'Jane Lumberjack',
      status: BLOCK_STATUSES.submitted,
      lastUpdated: '2025-06-20T13:03:00',
    },
    {
      id: 8,
      licenseNumber: 'A00999',
      cuttingPermit: '8C',
      cutBlockId: '108',
      timberMark: '8C/21',
      totalWasteAreaHa: 2.05,
      totalWasteVolumeM3: 74,
      submitter: 'John Forester',
      status: BLOCK_STATUSES.hold,
      lastUpdated: '2025-06-15T10:41:00',
    },
    {
      id: 9,
      licenseNumber: null,
      cuttingPermit: null,
      cutBlockId: '109',
      timberMark: null,
      totalWasteAreaHa: null,
      totalWasteVolumeM3: null,
      submitter: null,
      status: BLOCK_STATUSES.draft,
      lastUpdated: '2025-08-18T09:32:00',
    },
    {
      id: 10,
      licenseNumber: 'A00123',
      cuttingPermit: '75',
      cutBlockId: '110',
      timberMark: '75/1AD',
      totalWasteAreaHa: 4.4,
      totalWasteVolumeM3: 143,
      submitter: 'Ed Spruce',
      status: BLOCK_STATUSES.billingIssued,
      lastUpdated: '2025-08-01T16:12:00',
    },
  ],
  page: { size: 10, number: 0, totalElements: 10, totalPages: 1 },
};

const renderBlocksList = async (
  ui: ReactElement = <ReportingUnitBlocksList ruId={468} content={DUMMY_BLOCKS_CONTENT} />,
) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <PreferenceProvider>{ui}</PreferenceProvider>
    </QueryClientProvider>,
  );
  // Wait until the table headers or the empty state have rendered — the empty
  // state (no content prop) never shows any header text.
  await waitFor(() => {
    const ready =
      screen.queryByText('Licence No.') !== null || screen.queryByText('No results') !== null;
    expect(ready).toBe(true);
  });
};

describe('ReportingUnitBlocksList', () => {
  it('renders all column headers in Figma order', async () => {
    await renderBlocksList();

    expect(screen.getByRole('table')).toBeDefined();
    const columnHeaders = screen.getAllByRole('columnheader').map((col) => col.textContent);
    expect(columnHeaders).toEqual([
      'Licence No.',
      'Cutting permit',
      'Block ID',
      'Timber mark',
      'Total waste area',
      'Total waste volume',
      'Submitter/Sponsor',
      'Status',
      'Last updated',
      'Time',
      'Actions',
    ]);
  });

  it('renders all fixture rows', async () => {
    await renderBlocksList();

    // One header row plus the ten fixture rows.
    expect(screen.getAllByRole('row')).toHaveLength(11);
  });

  it('renders formatted dates and times', async () => {
    await renderBlocksList();

    expect(screen.getByText('Jul 1, 2025')).toBeDefined();
    expect(screen.getByText('16:43')).toBeDefined();
  });

  it('renders status tags for the fixture statuses', async () => {
    await renderBlocksList();

    // ColorTag sentence-cases multi-word descriptions ("Billing Issued" → "Billing issued").
    expect(screen.getAllByText('Submitted')).toHaveLength(2);
    expect(screen.getAllByText('Approved')).toHaveLength(1);
    expect(screen.getAllByText('Billing issued')).toHaveLength(3);
    expect(screen.getAllByText('Office rejected')).toHaveLength(1);
    expect(screen.getAllByText('Hold')).toHaveLength(2);
    expect(screen.getAllByText('Draft')).toHaveLength(1);
  });

  it('renders dashes for null field values on the Draft row', async () => {
    await renderBlocksList();

    // TableResource's renderCell renders null values as a plain dash.
    const draftRow = screen.getByText('109').closest('tr');
    expect(draftRow).not.toBeNull();
    const dashCells = [...draftRow!.querySelectorAll('td')].filter(
      (cell) => cell.textContent === '-',
    );
    expect(dashCells).toHaveLength(6);
  });

  it('renders pagination controls', async () => {
    await renderBlocksList();

    expect(screen.getByText('Items per page:')).toBeDefined();
    // Items-per-page and page selectors.
    expect(screen.getAllByRole('combobox').length).toBeGreaterThanOrEqual(2);
  });

  it('navigates to the selected block details page', async () => {
    mockNavigate.mockClear();
    await renderBlocksList();

    await userEvent.click(screen.getAllByRole('button', { name: 'See details' })[0]);

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/reporting-units/468/1' });
  });

  it('shows the delete action as disabled', async () => {
    await renderBlocksList();

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete block' });
    expect(deleteButtons).toHaveLength(DUMMY_BLOCKS_CONTENT.content.length);
    expect(deleteButtons.every((button) => (button as HTMLButtonElement).disabled)).toBe(true);
  });

  it('renders the empty state when no content is provided (API not wired yet)', async () => {
    await renderBlocksList(<ReportingUnitBlocksList ruId={468} />);

    // TableResource shows its "No results" empty section for a provided but
    // empty page — the initial-empty branch needs `content: undefined`, which
    // its required prop type does not allow.
    expect(screen.getByText('No results')).toBeDefined();
  });

  it('does not render the table toolbar in the read-only design', async () => {
    await renderBlocksList();

    expect(screen.queryByTestId('table-toolbar')).toBeNull();
  });
});
