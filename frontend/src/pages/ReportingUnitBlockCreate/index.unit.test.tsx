import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useReportingUnitDetailsQuery } from '@/config/react-query/hooks';
import { renderWithApp } from '@/config/tests/renderWithApp';
import { SKELETON_DELAY_MS } from '@/hooks/useDelayedFlag';
import { sendEvent } from '@/hooks/useNotificationEvents/eventHandler';

import ReportingUnitBlockCreatePage from './index';

import type { ReportingUnitDto } from '@/services/types';

// ── Mutable state used by the module mocks ─────────────────────────────────────

const EVENT_TARGET = 'block-create';
const mockRefetch = vi.fn();
const mockNavigate = vi.fn();
let mockParams: Record<string, string> = { ruId: '468' };
let mockSearch: { blockId?: number; blockState?: string } | undefined = {
  blockId: 12,
  blockState: 'DRAFT',
};

// ── Module mocks ───────────────────────────────────────────────────────────────

vi.mock('@/config/react-query/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/react-query/hooks')>();
  return { ...actual, useReportingUnitDetailsQuery: vi.fn() };
});

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useParams: () => mockParams,
    useSearch: () => mockSearch,
    useNavigate: () => mockNavigate,
  };
});

// ── Helpers ────────────────────────────────────────────────────────────────────

const defaultData: ReportingUnitDto = {
  id: 468,
  client: { code: '00002022', description: 'Canadian Forest Products Ltd.' },
  clientStatus: { code: 'ACT', description: 'Active' },
  grade: { code: 'IN', description: 'Interior' },
  sampling: { code: 'DA', description: 'District Average' },
  district: { code: 'DKM', description: 'Coast Mountains District' },
  createdAt: '2025-05-25',
};

type QueryResult = Partial<ReturnType<typeof useReportingUnitDetailsQuery>>;

function mockQuery(result: QueryResult) {
  vi.mocked(useReportingUnitDetailsQuery).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: mockRefetch,
    ...result,
  } as ReturnType<typeof useReportingUnitDetailsQuery>);
}

/**
 * Renders the page and flushes the in-memory router's initial load so the
 * route component is mounted before assertions run.
 *
 * @returns The Testing Library render result.
 */
async function renderPage() {
  const result = renderWithApp(<ReportingUnitBlockCreatePage />);
  await act(async () => {
    await Promise.resolve();
  });
  return result;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('ReportingUnitBlockCreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { ruId: '468' };
    mockSearch = { blockId: 12, blockState: 'DRAFT' };
    mockQuery({ data: defaultData });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('page banner', () => {
    it('shouldRenderBlockIdHeading_andSubtitle_fromSearch', async () => {
      await renderPage();

      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Block ID 12');
      expect(screen.getByText('View block details')).toBeTruthy();
    });

    it('shouldRenderBreadcrumb_withReportingUnitEntry', async () => {
      await renderPage();

      expect(screen.getByText('RU No. 468')).toBeTruthy();
    });

    it('shouldRenderDraftStatusTag_whenBlockStateIsDraft', async () => {
      await renderPage();

      expect(screen.getByTestId('block-status-tag').textContent).toBe('Draft');
    });

    it('shouldRenderRawStateStatusTag_whenBlockStateIsNotDraft', async () => {
      mockSearch = { blockId: 12, blockState: 'SUBMITTED' };

      await renderPage();

      expect(screen.getByTestId('block-status-tag').textContent).toBe('SUBMITTED');
    });

    it('shouldMoveFocusToHeading_onLoad', async () => {
      await renderPage();

      const heading = screen.getByRole('heading', { level: 1 });
      expect(document.activeElement).toBe(heading);
      expect(heading.getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('submission progress', () => {
    it('shouldRenderProgressHeading', async () => {
      await renderPage();

      expect(screen.getByRole('heading', { level: 2, name: 'Submission progress' })).toBeTruthy();
    });

    it('shouldRenderThreeProgressStepLabels', async () => {
      await renderPage();

      expect(screen.getByText('Enter details and submit')).toBeTruthy();
      expect(screen.getByText('Ministry review')).toBeTruthy();
      expect(screen.getByText('Decision')).toBeTruthy();
    });

    it('shouldMarkExactlyOneStepAsCurrent', async () => {
      await renderPage();

      expect(document.querySelectorAll('.cds--progress-step--current')).toHaveLength(1);
    });

    it('shouldRenderIdentitySummaryValues_fromReportingUnit', async () => {
      await renderPage();

      const identity = screen.getByTestId('block-wizard-summary-identity');
      expect(identity.textContent).toContain('DKM - Coast Mountains District');
      expect(identity.textContent).toContain('DA-District Average');
      expect(identity.textContent).toContain('Canadian Forest Products Ltd.');
      expect(identity.textContent).toContain('00002022');
    });

    it('shouldRenderBlockSummaryPlaceholders_whenNoBlockDetailsExist', async () => {
      await renderPage();

      const blockSummary = screen.getByTestId('block-wizard-summary-block');
      expect(blockSummary.textContent).toContain('Licence No.');
      expect(blockSummary.textContent).toContain('Last updated');
    });
  });

  describe('wizard tabs', () => {
    it('shouldRenderFiveTabs_inOrder', async () => {
      await renderPage();

      expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
        'Block details',
        'Area calculator',
        'Waste volumes',
        'Attachments',
        'Endorsement',
      ]);
    });

    it('shouldRenderWizardShellColumn', async () => {
      await renderPage();

      expect(document.querySelector('.rubc-column__wizard')).toBeTruthy();
      expect(screen.getByTestId('block-wizard-footer')).toBeTruthy();
    });
  });

  describe('loading state', () => {
    it('shouldNotRenderSkeleton_beforeDelayElapses', async () => {
      vi.useFakeTimers();
      mockQuery({ data: undefined, isLoading: true });

      await renderPage();

      expect(screen.queryByTestId('block-details-skeleton')).toBeNull();
      expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    });

    it('shouldRenderSkeleton_afterDelayElapses', async () => {
      vi.useFakeTimers();
      mockQuery({ data: undefined, isLoading: true });

      await renderPage();

      act(() => {
        vi.advanceTimersByTime(SKELETON_DELAY_MS);
      });

      expect(screen.getByTestId('block-details-skeleton')).toBeTruthy();
    });
  });

  describe('error state', () => {
    beforeEach(() => {
      mockQuery({ data: undefined, isError: true });
    });

    it('shouldRenderErrorTitle_andSubtitle', async () => {
      await renderPage();

      expect(screen.getByText('Reporting Unit Block not found')).toBeTruthy();
      expect(
        screen.getByText('Required data is missing or an error occurred while loading.'),
      ).toBeTruthy();
      expect(screen.queryByTestId('rubc-banner')).toBeNull();
    });

    it('shouldRenderAlertRegion_whenErrorNotificationIsDispatched', async () => {
      await renderPage();

      act(() => {
        sendEvent({
          title: 'Reporting Unit Block not found',
          description: 'The reporting unit could not be loaded.',
          eventType: 'error',
          displayMode: 'inline',
          eventTarget: EVENT_TARGET,
        });
      });

      const message = await screen.findByText('The reporting unit could not be loaded.');
      expect(message.closest('[role="alert"]')).toBeTruthy();
    });

    it('shouldCallRefetch_whenRetryIsClicked', async () => {
      const user = userEvent.setup();

      await renderPage();
      await user.click(screen.getByTestId('rubc-retry'));

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('shouldNavigateToReportingUnit_whenBackIsClicked', async () => {
      const user = userEvent.setup();

      await renderPage();
      await user.click(screen.getByRole('button', { name: 'Back' }));

      expect(mockNavigate).toHaveBeenCalledWith({ to: '/reporting-units/468' });
    });
  });

  describe('invalid block id', () => {
    it('shouldRenderErrorBranch_whenSearchIsMissingBlockId', async () => {
      mockSearch = {};

      await renderPage();

      expect(screen.getByText('Reporting Unit Block not found')).toBeTruthy();
      expect(screen.queryByRole('heading', { level: 1, name: 'Block ID NaN' })).toBeNull();
    });

    it('shouldRenderErrorBranch_whenBlockIdIsNotFinite', async () => {
      mockSearch = { blockId: Number.NaN };

      await renderPage();

      expect(screen.getByText('Reporting Unit Block not found')).toBeTruthy();
    });
  });

  describe('query wiring', () => {
    it('shouldQueryWithRouteParam_andNotificationTarget', async () => {
      await renderPage();

      await waitFor(() =>
        expect(vi.mocked(useReportingUnitDetailsQuery)).toHaveBeenCalledWith(468, {
          notificationTarget: EVENT_TARGET,
        }),
      );
    });
  });
});
