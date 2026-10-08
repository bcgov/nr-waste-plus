import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useBlockDetailsQuery, useReportingUnitDetailsQuery } from '@/config/react-query/hooks';
import { renderWithApp } from '@/config/tests/renderWithApp';
import { SKELETON_DELAY_MS } from '@/hooks/useDelayedFlag';
import { sendEvent } from '@/hooks/useNotificationEvents/eventHandler';

import ReportingUnitBlockDetailsPage from './index';

import type { BlockDetailsDto, ReportingUnitDto } from '@/services/types';

// ── Mutable state used by the module mocks ─────────────────────────────────────

const EVENT_TARGET = 'reporting-unit-block-details';
const mockRefetch = vi.fn();
const mockBlockRefetch = vi.fn();
const mockNavigate = vi.fn();
let mockParams: Record<string, string> = { ruId: '468', blockId: '12' };

// ── Module mocks ───────────────────────────────────────────────────────────────

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
    useParams: () => mockParams,
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

const defaultBlockData: BlockDetailsDto = {
  id: 12,
  reportingUnitId: 468,
  blockType: 'DISTRICT_AVERAGE',
  draft: true,
  plcDate: '2026-01-15',
  revision: 0,
  isLegacy: false,
};

type QueryResult = Partial<ReturnType<typeof useReportingUnitDetailsQuery>>;
type BlockQueryResult = Partial<ReturnType<typeof useBlockDetailsQuery>>;

function mockQuery(result: QueryResult) {
  vi.mocked(useReportingUnitDetailsQuery).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: mockRefetch,
    ...result,
  } as ReturnType<typeof useReportingUnitDetailsQuery>);
}

function mockBlockQuery(result: BlockQueryResult) {
  vi.mocked(useBlockDetailsQuery).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: mockBlockRefetch,
    ...result,
  } as ReturnType<typeof useBlockDetailsQuery>);
}

/**
 * Renders the page and flushes the in-memory router's initial load so the
 * route component is mounted before assertions run.
 *
 * @returns The Testing Library render result.
 */
async function renderPage() {
  const result = renderWithApp(<ReportingUnitBlockDetailsPage />);
  await act(async () => {
    await Promise.resolve();
  });
  return result;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('ReportingUnitBlockDetailsPage', () => {
  beforeEach(() => {
    mockParams = { ruId: '468', blockId: '12' };
    mockQuery({ data: defaultData });
    mockBlockQuery({ data: defaultBlockData });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('page banner', () => {
    it('shouldRenderTitleAndSubtitle_fromRouteParams', async () => {
      await renderPage();

      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Block ID 12');
      expect(screen.getByText('View block details')).toBeTruthy();
    });

    it('shouldRenderBreadcrumb_withReportingUnitAndBlockEntries', async () => {
      await renderPage();

      expect(screen.getByText('Reporting unit 468')).toBeTruthy();
      expect(screen.getByText('Block 12')).toBeTruthy();
    });

    it('shouldTriggerNavigation_whenBreadcrumbCrumbIsClicked', async () => {
      const user = userEvent.setup();
      await renderPage();

      await user.click(screen.getByText('Reporting unit 468'));
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/reporting-units/468' });

      await user.click(screen.getByText('Block 12'));
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/reporting-units/468/12' });
    });

    it('shouldMoveFocusToHeading_onLoad', async () => {
      await renderPage();

      const heading = screen.getByRole('heading', { level: 1 });
      expect(document.activeElement).toBe(heading);
      expect(heading.getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('summary card', () => {
    it('shouldRenderSummaryHeading', async () => {
      await renderPage();

      expect(
        screen.getByRole('heading', { level: 2, name: 'Reporting unit summary' }),
      ).toBeTruthy();
    });

    it('shouldRenderReadOnlyValues', async () => {
      await renderPage();

      expect(screen.getByTestId('card-item-content-client-name').textContent).toBe(
        'Canadian Forest Products Ltd.',
      );
      expect(screen.getByTestId('card-item-content-client-id').textContent).toBe('00002022');
      expect(screen.getByTestId('card-item-content-district').textContent).toBe(
        'DKM - Coast Mountains District',
      );
      expect(screen.getByTestId('card-item-content-grades').textContent).toBe('Interior');
      expect(screen.getByTestId('card-item-content-sampling-option').textContent).toBe(
        'DA - District Average',
      );
      expect(screen.getByTestId('card-item-content-created-on').textContent).toBe('May 25, 2025');
    });

    it('shouldRenderNoEditableInputs', async () => {
      await renderPage();

      expect(screen.queryAllByRole('textbox')).toHaveLength(0);
      expect(screen.queryByRole('button', { name: /edit/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /delete/i })).toBeNull();
    });

    it('shouldRenderPlaceholder_whenCreatedAtIsMissing', async () => {
      mockQuery({ data: { ...defaultData, createdAt: undefined } });

      await renderPage();

      expect(screen.getByTestId('card-item-content-created-on').textContent).toBe('--');
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

    it('shouldRenderErrorTitle_andNotificationRegion', async () => {
      await renderPage();

      expect(screen.getByText('Reporting Unit Block not found')).toBeTruthy();
      expect(
        screen.getByText('Required data is missing or an error occurred while loading.'),
      ).toBeTruthy();
      expect(screen.queryByTestId('block-details-summary')).toBeNull();
    });

    it('shouldRenderAlert_whenErrorNotificationIsDispatched', async () => {
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

      const alert = await screen.findByRole('alert');
      expect(alert.textContent).toContain('The reporting unit could not be loaded.');
    });

    it('shouldCallRefetch_whenRetryIsClicked', async () => {
      const user = userEvent.setup();

      await renderPage();
      await user.click(screen.getByTestId('rublock-retry'));

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('shouldNavigateToReportingUnit_whenBackIsClicked', async () => {
      const user = userEvent.setup();

      await renderPage();
      await user.click(screen.getByRole('button', { name: 'Back' }));

      expect(mockNavigate).toHaveBeenCalledWith({ to: '/reporting-units/468' });
    });
  });

  describe('block details query', () => {
    it('shouldRenderBannerAndSummaryOnHappyPath', async () => {
      await renderPage();

      expect(screen.getByTestId('rublock-banner')).toBeTruthy();
      expect(screen.getByTestId('block-details-summary')).toBeTruthy();
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Block ID 12');
      expect(screen.queryByTestId('legacy-data-tag')).toBeNull();
    });

    it('shouldRenderErrorState_whenBlockIsNotFound', async () => {
      mockBlockQuery({ data: undefined, isError: true });

      await renderPage();

      expect(screen.getByText('Reporting Unit Block not found')).toBeTruthy();
      expect(
        screen.getByText('Required data is missing or an error occurred while loading.'),
      ).toBeTruthy();
      expect(screen.queryByTestId('rublock-banner')).toBeNull();
      expect(screen.queryByTestId('block-details-summary')).toBeNull();
      expect(screen.queryByRole('tab', { name: 'Block details' })).toBeNull();
    });

    it('shouldEnableLegacyTag_whenBlockApiReportsLegacy', async () => {
      mockBlockQuery({ data: { ...defaultBlockData, isLegacy: true } });

      await renderPage();

      expect(screen.getByTestId('legacy-data-tag')).toBeTruthy();
    });

    it('shouldDisableLegacyTag_whenBlockApiReportsNotLegacy', async () => {
      // RU grade heuristic alone would not tag this unit either, but an RU-level
      // `isLegacy: true` must not win over the block API's explicit `false`.
      mockQuery({ data: { ...defaultData, isLegacy: true } });
      mockBlockQuery({ data: { ...defaultBlockData, isLegacy: false } });

      await renderPage();

      expect(screen.queryByTestId('legacy-data-tag')).toBeNull();
    });
  });

  describe('submission sections', () => {
    it('shouldRenderProgressSteps', async () => {
      await renderPage();

      expect(screen.getByText('Step 1')).toBeTruthy();
      expect(screen.getByText('Step 2')).toBeTruthy();
      expect(screen.getByText('Step 3')).toBeTruthy();
    });

    it('shouldRenderTabsWithBlockDetailsSelectedByDefault', async () => {
      await renderPage();

      expect(screen.getByRole('tab', { name: 'Block details' })).toBeTruthy();
      expect(screen.getByRole('tab', { name: 'Area calculator' })).toBeTruthy();
      expect(screen.getByRole('tab', { name: 'Waste volumes' })).toBeTruthy();
      expect(screen.getByRole('tab', { name: 'Attachments' })).toBeTruthy();
      expect(screen.getByRole('tab', { name: 'Endorsement' })).toBeTruthy();
      expect(screen.getByText('Block details content')).toBeTruthy();
    });
  });

  describe('success actions', () => {
    it('shouldNavigateToReportingUnit_whenSaveIsClicked', async () => {
      const user = userEvent.setup();

      await renderPage();
      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(mockNavigate).toHaveBeenCalledWith({ to: '/reporting-units/468' });
    });

    it('shouldNavigateToReportingUnit_whenSubmitIsClicked', async () => {
      const user = userEvent.setup();

      await renderPage();
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      expect(mockNavigate).toHaveBeenCalledWith({ to: '/reporting-units/468' });
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

    it('shouldQueryBlockDetailsWithRouteParams_andNotificationTarget', async () => {
      await renderPage();

      await waitFor(() =>
        expect(vi.mocked(useBlockDetailsQuery)).toHaveBeenCalledWith(468, 12, {
          notificationTarget: EVENT_TARGET,
        }),
      );
    });

    it('shouldRefetchBothQueries_whenRetryIsClicked', async () => {
      const user = userEvent.setup();
      mockBlockQuery({ data: undefined, isError: true });

      await renderPage();
      await user.click(screen.getByTestId('rublock-retry'));

      expect(mockRefetch).toHaveBeenCalledTimes(1);
      expect(mockBlockRefetch).toHaveBeenCalledTimes(1);
    });
  });
});
