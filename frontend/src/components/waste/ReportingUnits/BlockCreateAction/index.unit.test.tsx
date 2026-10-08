import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCreateBlock, useReportingUnitBlocksQuery } from '@/config/react-query/hooks';
import { renderWithApp } from '@/config/tests/renderWithApp';
import { Role } from '@/context/auth/types';
import { useAuth } from '@/context/auth/useAuth';

import BlockCreateAction from './index';

import type { BlockCreateRequestDto, BlockCreateResponseDto } from '@/services/types';
import type { UseMutationResult } from '@tanstack/react-query';

// ── Mutable state shared with the module mocks ─────────────────────────────────

const state = vi.hoisted(() => ({
  flagEnabled: true,
  createBlock: vi.fn(),
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

vi.mock('@/config/react-query/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/react-query/hooks')>();
  return { ...actual, useCreateBlock: vi.fn(), useReportingUnitBlocksQuery: vi.fn() };
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

function createMockMutation(
  overrides?: Partial<UseMutationResult<BlockCreateResponseDto, Error, BlockCreateRequestDto>>,
) {
  return {
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue(createdBlock),
    reset: vi.fn(),
    isPending: false,
    isIdle: true,
    isSuccess: false,
    isError: false,
    isPaused: false,
    status: 'idle',
    data: undefined,
    error: null,
    failureCount: 0,
    failureReason: null,
    submittedAt: 0,
    variables: undefined,
    context: undefined,
    ...overrides,
  } as UseMutationResult<BlockCreateResponseDto, Error, BlockCreateRequestDto>;
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
 * Query result stub for the block-list hook the component uses to count
 * existing blocks (issue #1254 item 4 — API-driven visibility).
 *
 * @param totalElements - Block count the hook should report.
 * @returns A minimal `useReportingUnitBlocksQuery` result.
 */
function createMockBlocksQuery(totalElements = 0) {
  return {
    data: {
      content: [],
      page: { size: 10, number: 0, totalElements, totalPages: totalElements > 0 ? 1 : 0 },
    },
    isPending: false,
    isError: false,
  } as unknown as ReturnType<typeof useReportingUnitBlocksQuery>;
}

/**
 * Renders the action panel (optionally with `props`) and waits for the router
 * root to settle. `renderWithApp` commits its tree asynchronously (TanStack
 * Router resolves before first paint), so a sibling probe div marks the moment
 * when both the probe and the panel have been committed — only after that can
 * visibility assertions be trusted.
 */
async function renderAction(props?: Partial<React.ComponentProps<typeof BlockCreateAction>>) {
  renderWithApp(
    <>
      <div data-testid="render-probe" />
      <BlockCreateAction ruId={468} samplingCode="AVG" {...props} />
    </>,
  );
  expect(await screen.findByTestId('render-probe')).not.toBeNull();
}

const HELPER_LINE_1 =
  'Enter at least 2 criteria to search and add block(s) to this reporting unit.';
const HELPER_LINE_2 = 'Once you have added a block, click on a row to start adding block details';

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('BlockCreateAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.flagEnabled = true;
    mockAuthWithRoles([Role.ADMIN]);
    vi.mocked(useCreateBlock).mockReturnValue(createMockMutation());
    vi.mocked(useReportingUnitBlocksQuery).mockReturnValue(createMockBlocksQuery());
  });

  describe('visibility rules (hidden, never disabled)', () => {
    it('shouldRenderAction_whenFlagOnRoleEligibleAndNoExistingBlock [TC-C01]', async () => {
      await renderAction();

      expect(screen.getByTestId('block-create-action')).toBeTruthy();
      expect(screen.getByLabelText('Licence No.')).toBeTruthy();
      expect(screen.getByLabelText('Cutting permit')).toBeTruthy();
      expect(screen.getByLabelText('Timber mark')).toBeTruthy();
      expect(screen.getByLabelText('Block ID')).toBeTruthy();
    });

    it('shouldRenderNothing_whenLiveDistrictAverageBlockExists [TC-C02]', async () => {
      // Issue #1254 item 4: the existing-block count now comes from the
      // block-list query (totalElements) instead of a hardcoded prop.
      vi.mocked(useReportingUnitBlocksQuery).mockReturnValue(createMockBlocksQuery(1));
      await renderAction();

      expect(screen.queryByTestId('block-create-action')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Add' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Add' })).toBeNull();
    });

    it('shouldRenderNothing_whenReportingUnitIsClosed [TC-C03]', async () => {
      await renderAction({ isClosed: true });

      expect(screen.queryByTestId('block-create-action')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Add' })).toBeNull();
    });

    it.each([Role.ADMIN, Role.DISTRICT, Role.AREA, Role.SUBMITTER])(
      'shouldRenderAction_forCreationRole_%s [TC-C08]',
      async (role) => {
        mockAuthWithRoles([role]);
        await renderAction();

        expect(screen.getByTestId('block-create-action')).toBeTruthy();
      },
    );

    it.each([Role.VIEWER, Role.IDIR, Role.BCeID])(
      'shouldRenderNothing_forNonCreationRole_%s [TC-C08]',
      async (role) => {
        mockAuthWithRoles([role]);
        await renderAction();

        expect(screen.queryByTestId('block-create-action')).toBeNull();
      },
    );

    it('shouldRenderNothing_whenUserHasNoRoles [TC-C08]', async () => {
      mockAuthWithRoles([]);
      await renderAction();

      expect(screen.queryByTestId('block-create-action')).toBeNull();
    });

    it('shouldRenderNothing_whenFlagIsOff [TC-C09]', async () => {
      state.flagEnabled = false;
      await renderAction();

      expect(screen.queryByTestId('block-create-action')).toBeNull();
    });

    it('shouldUseServerRuleInsteadOfSamplingFallback_whenBlockRuleIsProvided', async () => {
      await renderAction({ blockRule: { blockType: 'DISTRICT_AVERAGE', maxBlocks: 2 } });

      expect(screen.getByTestId('block-create-action')).toBeTruthy();
      expect(useReportingUnitBlocksQuery).toHaveBeenCalledWith(468, { enabled: true });
    });

    it.each([null, 'AGR', 'BLK', 'OCU'])(
      'shouldHideAction_whenNoSupportedRuleExists_%s',
      async (samplingCode) => {
        await renderAction({ samplingCode });

        expect(screen.queryByTestId('block-create-action')).toBeNull();
        expect(useReportingUnitBlocksQuery).toHaveBeenCalledWith(468, { enabled: false });
      },
    );

    it('shouldKeepActionVisibleWhenBlockCountQueryFails', async () => {
      vi.mocked(useReportingUnitBlocksQuery).mockReturnValue({
        data: undefined,
        isPending: false,
        isError: true,
      } as ReturnType<typeof useReportingUnitBlocksQuery>);

      await renderAction();

      expect(screen.getByTestId('block-create-action')).toBeTruthy();
    });

    it('shouldDisableAddWhileCreateMutationIsPending', async () => {
      vi.mocked(useCreateBlock).mockReturnValue(createMockMutation({ isPending: true }));
      const user = userEvent.setup();
      await renderAction();

      await user.type(screen.getByLabelText('Licence No.'), 'A123');
      await user.type(screen.getByLabelText('Timber mark'), 'X');

      expect(screen.getByRole('button', { name: 'Add' })).toHaveProperty('disabled', true);
    });
  });

  describe('criteria gating and helper copy', () => {
    it('shouldRenderVerbatimTwoLineHelperCopy [TC-C04]', async () => {
      await renderAction();

      const helper = screen.getByTestId('block-create-helper');
      expect(helper.textContent).toBe(`${HELPER_LINE_1}${HELPER_LINE_2}`);
    });

    it('shouldDisableAdd_whenZeroCriteriaAreFilled [TC-C04]', async () => {
      await renderAction();

      expect(screen.getByTestId('block-create-add-button')).toHaveProperty('disabled', true);
    });

    it('shouldKeepAddDisabled_whenOnlyOneCriterionIsFilled [TC-C04]', async () => {
      const user = userEvent.setup();
      await renderAction();

      await user.type(screen.getByLabelText('Licence No.'), 'A123');

      expect(screen.getByTestId('block-create-add-button')).toHaveProperty('disabled', true);
    });

    it('shouldEnableAdd_whenTwoCriteriaAreFilled [TC-C04]', async () => {
      const user = userEvent.setup();
      await renderAction();

      await user.type(screen.getByLabelText('Licence No.'), 'A123');
      await user.type(screen.getByLabelText('Timber mark'), 'X');

      expect(screen.getByTestId('block-create-add-button')).toHaveProperty('disabled', false);
    });
  });

  describe('create flow', () => {
    it('shouldMutateWithDistrictAverageBody_whenAddIsClicked [TC-C05]', async () => {
      const user = userEvent.setup();
      await renderAction();

      await user.type(screen.getByLabelText('Licence No.'), 'A123');
      await user.type(screen.getByLabelText('Block ID'), '999');
      await user.click(screen.getByTestId('block-create-add-button'));

      expect(state.createBlock).not.toHaveBeenCalled(); // hook mocked — mutate only
      const mutation = vi.mocked(useCreateBlock);
      expect(mutation).toHaveBeenCalledWith(
        468,
        expect.objectContaining({
          notificationTarget: 'ru-details',
        }),
      );
      const mutate = vi.mocked(useCreateBlock).mock.results[0].value.mutate;
      expect(mutate).toHaveBeenCalledWith({ blockType: 'DISTRICT_AVERAGE' });
    });

    it.each([
      ['Licence No.', 'A123', 'Block ID', '42'],
      ['Cutting permit', 'CP-1', 'Block ID', '42'],
      ['Timber mark', 'TM-1', 'Block ID', '42'],
      ['Block ID', '42', 'Licence No.', 'A123'],
    ])(
      'shouldEnableAddForAnyTwoCriteria_including_%s',
      async (firstCriterion, value, secondCriterion, secondValue) => {
        const user = userEvent.setup();
        await renderAction();

        await user.type(screen.getByLabelText(firstCriterion), value);
        await user.type(screen.getByLabelText(secondCriterion), secondValue);

        expect(screen.getByRole('button', { name: 'Add' })).toHaveProperty('disabled', false);
      },
    );

    it('shouldHidePanelAndNotNavigate_whenCreateSucceeds [TC-C05]', async () => {
      await renderAction();

      expect(screen.getByTestId('block-create-action')).toBeTruthy();

      const options = vi.mocked(useCreateBlock).mock.calls[0][1];
      act(() => {
        options?.onSuccess?.(createdBlock);
      });

      // #1254: Add creates the block in place — no navigation to another screen.
      expect(screen.queryByTestId('block-create-action')).toBeNull();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('shouldPassInlineNotificationTarget_whenCreateFails [TC-C06]', async () => {
      await renderAction();

      const options = vi.mocked(useCreateBlock).mock.calls[0][1];
      expect(options?.notificationTarget).toBe('ru-details');
      expect(options?.onSuccess).toBeTypeOf('function');
    });

    it('shouldKeepPanelVisibleAndNotNavigate_whenMutationErrors [TC-C07]', async () => {
      const user = userEvent.setup();
      vi.mocked(useCreateBlock).mockReturnValue(createMockMutation({ isError: true }));
      await renderAction();

      await user.type(screen.getByLabelText('Licence No.'), 'A123');
      await user.type(screen.getByLabelText('Block ID'), '999');
      await user.click(screen.getByTestId('block-create-add-button'));

      expect(screen.getByTestId('block-create-action')).toBeTruthy();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
