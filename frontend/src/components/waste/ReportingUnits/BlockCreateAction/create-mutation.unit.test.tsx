import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import BlockCreateAction from './index';

import PageNotification from '@/components/core/PageNotification';
import { renderWithApp } from '@/config/tests/renderWithApp';
import { Role } from '@/context/auth/types';
import { useAuth } from '@/context/auth/useAuth';

import type { BlockCreateResponseDto } from '@/services/types';

/**
 * End-to-end mutation-path tests for {@link BlockCreateAction} (TC-C05/C06/C07).
 *
 * Unlike `index.unit.test.tsx`, the hooks module is NOT mocked here: the real
 * `useCreateBlock` runs against the mocked `API.reportingUnit.createBlock`
 * (the global setup-env registry is extended with the missing `reportingUnit`
 * namespace), so the request body, the hide-in-place success behaviour, and the
 * inline problem-details notification are verified through the actual wiring.
 */

// ── Mutable state shared with the module mocks ─────────────────────────────────

const state = vi.hoisted(() => ({
  flagEnabled: true,
  createBlock: vi.fn(),
  getBlocks: vi.fn(),
}));

const mockNavigate = vi.hoisted(() => vi.fn());

// ── Module mocks ───────────────────────────────────────────────────────────────

vi.mock('@/context/auth/useAuth', () => ({ useAuth: vi.fn() }));

vi.mock('@/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/env')>();
  return {
    ...actual,
    get featureFlags() {
      return { ...actual.featureFlags, 'block-creation-enabled': state.flagEnabled };
    },
  };
});

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// The global setup-env mock of '@/services/APIs' has no `reportingUnit`
// namespace; extend the REAL registry with the block endpoints so the real
// `useCreateBlock` and `useReportingUnitBlocksQuery` resolve instead of
// throwing on undefined.
vi.mock('@/services/APIs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/APIs')>();
  return {
    ...actual,
    default: {
      ...actual.default,
      reportingUnit: { createBlock: state.createBlock, getBlocks: state.getBlocks },
    },
  };
});

// ── Fixtures ───────────────────────────────────────────────────────────────────

const createdBlock: BlockCreateResponseDto = {
  id: 123,
  reportingUnitId: 468,
  blockType: 'DISTRICT_AVERAGE',
  state: 'DRAFT',
  version: 0,
  createdAt: null,
  updatedAt: null,
};

const CONFLICT_DETAIL = 'A District Average block already exists for this Reporting Unit';

/** Empty page served by the block-list query (no pre-existing blocks). */
const EMPTY_BLOCKS_PAGE = {
  content: [],
  page: { size: 10, number: 0, totalElements: 0, totalPages: 0 },
};

function createConflictError() {
  return Object.assign(new Error('Conflict'), {
    body: { title: 'Conflict', detail: CONFLICT_DETAIL },
  });
}

function mockAuthWithRoles(roles: Role[]) {
  vi.mocked(useAuth).mockReturnValue({
    user: {
      idpProvider: 'IDIR',
      displayName: 'Test User',
      email: 'test@example.com',
      privileges: {},
      roles: roles.map((role) => ({ role, clients: [] })),
    },
    isLoggedIn: true,
    isLoading: false,
  } as unknown as ReturnType<typeof useAuth>);
}

/**
 * Renders the action panel together with the inline notification that
 * receives its `ru-details` events, then waits for the async router root to
 * commit both (probe sibling marks the settled commit).
 */
async function renderActionWithNotification() {
  renderWithApp(
    <>
      <div data-testid="render-probe" />
      <BlockCreateAction ruId={468} samplingCode="AVG" />
      <PageNotification eventTarget="ru-details" />
    </>,
  );
  await waitFor(() => expect(screen.getByTestId('render-probe')).not.toBeNull());
}

/** Fills two criteria (enabling `Add`) and clicks it. */
async function fillTwoCriteriaAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Licence No.'), 'A123');
  await user.type(screen.getByLabelText('Timber mark'), 'X');
  await user.click(screen.getByRole('button', { name: 'Add' }));
}

/**
 * Waits for an inline/toast `role="alert"` whose text contains `text`
 * (the notification stack renders more than one alert region).
 */
async function findAlertContaining(text: string) {
  return waitFor(() => {
    const alert = screen
      .getAllByRole('alert')
      .find((element) => element.textContent?.includes(text));
    expect(alert, `expected an alert containing "${text}"`).toBeDefined();
    return alert;
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('BlockCreateAction — create mutation path (real useCreateBlock)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.flagEnabled = true;
    mockAuthWithRoles([Role.ADMIN]);
    state.getBlocks.mockResolvedValue(EMPTY_BLOCKS_PAGE);
  });

  it('shouldPostDistrictAverageAndHidePanel_whenCreateSucceeds [TC-C05]', async () => {
    const user = userEvent.setup();
    state.createBlock.mockResolvedValue(createdBlock);
    await renderActionWithNotification();

    await fillTwoCriteriaAndSubmit(user);

    await waitFor(() => {
      expect(state.createBlock).toHaveBeenCalledWith(468, {
        blockType: 'DISTRICT_AVERAGE',
        expectedReportingUnitState: 'SUBMISSION',
      });
    });
    // #1254: the Add button creates in place — the panel hides (single-block
    // rule reached) and no navigation to another screen happens.
    await waitFor(() => {
      expect(screen.queryByTestId('block-create-action')).toBeNull();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
    // The notification stack always renders empty alert regions; success must
    // not surface a populated (error) one.
    expect(screen.queryAllByRole('alert').filter((alert) => alert.textContent !== '')).toEqual([]);
  });

  it('shouldShowConflictDetailAndKeepPanel_whenCreateReturns409 [TC-C06]', async () => {
    const user = userEvent.setup();
    state.createBlock.mockRejectedValue(createConflictError());
    await renderActionWithNotification();

    await fillTwoCriteriaAndSubmit(user);

    const alert = await findAlertContaining(CONFLICT_DETAIL);
    expect(alert?.textContent).toContain('Conflict');
    expect(screen.getByTestId('block-create-action')).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shouldShowErrorMessageAndKeepPanel_whenCreateFailsUnexpectedly [TC-C07]', async () => {
    const user = userEvent.setup();
    state.createBlock.mockRejectedValue(new Error('Network failure'));
    await renderActionWithNotification();

    await fillTwoCriteriaAndSubmit(user);

    const alert = await findAlertContaining('Network failure');
    expect(alert?.textContent).toContain('Request failed');
    expect(screen.getByTestId('block-create-action')).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
