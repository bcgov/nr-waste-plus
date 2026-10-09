import { Button, Column, TextInput } from '@carbon/react';
import { useForm } from '@tanstack/react-form';
import { useState, type FC } from 'react';

import { useCreateBlock, useReportingUnitBlocksQuery } from '@/config/react-query/hooks';
import { Role } from '@/context/auth/types';
import { useAuth } from '@/context/auth/useAuth';
import { featureFlags } from '@/env';
import useNotificationEvents from '@/hooks/useNotificationEvents';

import type { BlockCreateRequestDto } from '@/services/reportingUnit.types';

import './index.scss';

/**
 * Roles allowed to create a District Average block (Figma `163:32230`:
 * Admin, District, Area, Submitter). VIEWER is intentionally excluded.
 */
const CREATION_ROLES: readonly Role[] = [Role.ADMIN, Role.DISTRICT, Role.AREA, Role.SUBMITTER];

/**
 * Minimum number of search criteria that must be filled before the `Add`
 * action becomes available (helper copy: "Enter at least 2 criteria").
 */
const MIN_CRITERIA = 2;

interface BlockCreateCriteria {
  readonly licenceNo: string;
  readonly cuttingPermit: string;
  readonly timberMark: string;
  readonly blockId: string;
}

const validateMinimumCriteria = ({ value }: { value: BlockCreateCriteria }) =>
  Object.values(value).filter((criterion) => criterion.trim() !== '').length >= MIN_CRITERIA
    ? undefined
    : 'Enter at least 2 criteria';

/**
 * Block-creation rules for one sampling-option type (issue #1254: every
 * sampling option carries its own restrictions).
 */
export interface SamplingBlockRule {
  /** The `blockType` POSTed when a block is created for this sampling option. */
  readonly blockType: BlockCreateRequestDto['blockType'];
  /** Maximum number of blocks of this type allowed on one reporting unit. */
  readonly maxBlocks: number;
}

/**
 * TEMPORARY fallback rules per sampling-option code (`AVG`, `AGR`, `BLK`, `OCU`).
 *
 * District Average (`AVG`) allows a single block per reporting unit. Sampling
 * options without an entry do not support block creation yet, so the panel
 * stays hidden for them until their rules are defined.
 *
 * REMOVE once the backend ships `blockRule` on the reporting-unit details
 * response (issue #1254 item 3): API-provided rules take precedence, and this
 * table only covers payloads from backends that predate that field.
 */
export const SAMPLING_BLOCK_RULES: Readonly<Record<string, SamplingBlockRule>> = {
  AVG: { blockType: 'DISTRICT_AVERAGE', maxBlocks: 1 },
};

/**
 * Props for the {@link BlockCreateAction} component.
 */
export interface BlockCreateActionProps {
  /** The numeric reporting unit the block will be created under. */
  readonly ruId: number;
  /**
   * The block-creation rule from the reporting-unit details response
   * (issue #1254 item 3). When present it replaces the client-side
   * {@link SAMPLING_BLOCK_RULES} entirely — the API decides what may be
   * displayed.
   */
  readonly blockRule?: SamplingBlockRule | null;
  /**
   * The reporting unit's sampling-option code (`AVG`, `AGR`, `BLK`, `OCU`).
   * Only consulted as a fallback while `blockRule` is absent (pre-API
   * backend); when neither yields a rule the panel is hidden.
   */
  readonly samplingCode?: string | null;
  /**
   * Whether the reporting unit is `CLOSED` (also hides the action, issue #1254
   * business rule 1 / RU-3). The reporting-unit payload currently carries no
   * state field, so this defaults to `false` until that data source exists.
   *
   * @default false
   */
  readonly isClosed?: boolean;
}

/**
 * "Add block" entry panel on the Reporting Unit details page (Figma `163:27450`).
 *
 * Renders the verbatim helper copy plus the four criteria inputs (Licence No.,
 * Cutting permit, Timber mark, Block ID) and an `Add` button that stays
 * disabled until at least two criteria are filled. The `Add` button itself is
 * responsible for creating the block — `POST /api/reporting-units/{ruId}/blocks`
 * (issue #1228) with the `blockType` from the sampling-option rules — and the
 * page does NOT navigate away: on success the panel hides in place (the
 * reporting unit now has its block); a failed create is reported through the
 * page-level notification event channel.
 *
 * Visibility (issue #1254 business rule 1 — hidden, never disabled): the panel
 * renders nothing when the `block-creation-enabled` flag is off, the user
 * lacks a creation role, the sampling option has no creation rule, the
 * sampling option's block limit is already reached (District Average allows a
 * single block), or the unit is closed.
 *
 * @param props - Component props.
 * @returns The add-block panel, or `null` when the action must be hidden.
 */
const BlockCreateAction: FC<BlockCreateActionProps> = ({
  ruId,
  blockRule,
  samplingCode,
  isClosed = false,
}) => {
  const { user } = useAuth();
  const { sendInlineEvent } = useNotificationEvents();

  // Set once this session's create succeeds so the panel hides immediately,
  // honouring the single-block rule even before the list refetch lands (#1254).
  const [createdBlock, setCreatedBlock] = useState(false);

  // API-provided rule wins; sampling-code fallback covers pre-rule backends.
  const rule = blockRule ?? (samplingCode ? SAMPLING_BLOCK_RULES[samplingCode] : undefined);

  const createMutation = useCreateBlock(ruId, {
    notificationTarget: 'ru-details',
    onSuccess: () => setCreatedBlock(true),
  });

  const form = useForm({
    defaultValues: {
      licenceNo: '',
      cuttingPermit: '',
      timberMark: '',
      blockId: '',
    },
    validators: {
      onMount: validateMinimumCriteria,
      onChange: validateMinimumCriteria,
      onSubmit: validateMinimumCriteria,
    },
    onSubmit: async () => {
      if (rule) {
        await createMutation.mutateAsync({
          blockType: rule.blockType,
          expectedReportingUnitState: 'SUBMISSION',
        });
      }
    },
    onSubmitInvalid: () => {
      sendInlineEvent({
        title: 'Unable to add block',
        description: 'Enter at least 2 non-empty criteria to add a block.',
        eventType: 'error',
        eventTarget: 'ru-details',
      });
    },
  });

  const hasCreationRole = user?.roles?.some((role) => CREATION_ROLES.includes(role.role)) ?? false;

  // Real block rows from the shared list query (one request with the table's).
  // Disabled unless the panel could possibly be shown; an error yields 0, which
  // optimistically keeps the action available (the backend still validates on submit).
  // The count filters by the rule's own block type (and live status — the list
  // endpoint only returns live rows): totalElements counts every block for the
  // unit, so a block of a different type must not hide District Average
  // creation (#1254).
  const blocksQuery = useReportingUnitBlocksQuery(ruId, {
    enabled:
      featureFlags['block-creation-enabled'] &&
      hasCreationRole &&
      rule !== undefined &&
      !isClosed &&
      !createdBlock,
  });
  const blockCount = (blocksQuery.data?.content ?? []).filter(
    (row) => row.blockType === rule?.blockType,
  ).length;

  const existingBlockCount = blockCount + (createdBlock ? 1 : 0);
  const limitReached = rule !== undefined && existingBlockCount >= rule.maxBlocks;
  const isVisible =
    featureFlags['block-creation-enabled'] &&
    hasCreationRole &&
    rule !== undefined &&
    !limitReached &&
    !isClosed;

  // All hooks run unconditionally above; hiding is the final render decision.
  if (!isVisible || !rule) {
    return null;
  }

  return (
    <Column lg={16} md={8} sm={4} className="block-create-action" data-testid="block-create-action">
      <h2 className="block-create-action__title">Add block</h2>
      <div className="block-create-action__description" data-testid="block-create-helper">
        <p>Enter at least 2 criteria to search and add block(s) to this reporting unit.</p>
        <p>Once you have added a block, click on a row to start adding block details</p>
      </div>
      <form
        aria-label="Add block criteria"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit().catch(() => undefined);
        }}
      >
        <div className="block-create-action__fields">
          <div className="block-create-action__textinput">
            <form.Field name="licenceNo">
              {(field) => (
                <TextInput
                  id="block-create-licence-no"
                  labelText="Licence No."
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  data-testid="block-create-licence-no"
                />
              )}
            </form.Field>
          </div>

          <div className="block-create-action__textinput">
            <form.Field name="cuttingPermit">
              {(field) => (
                <TextInput
                  id="block-create-cutting-permit"
                  labelText="Cutting permit"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  data-testid="block-create-cutting-permit"
                />
              )}
            </form.Field>
          </div>

          <div className="block-create-action__textinput">
            <form.Field name="timberMark">
              {(field) => (
                <TextInput
                  id="block-create-timber-mark"
                  labelText="Timber mark"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  data-testid="block-create-timber-mark"
                />
              )}
            </form.Field>
          </div>

          <div className="block-create-action__textinput">
            <form.Field name="blockId">
              {(field) => (
                <TextInput
                  id="block-create-block-id"
                  labelText="Block ID"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  data-testid="block-create-block-id"
                />
              )}
            </form.Field>
          </div>

          <div className="block-create-action__button">
            <form.Subscribe selector={(state) => state.canSubmit}>
              {(canSubmit) => (
                <Button
                  id="block-create-add-button"
                  type="submit"
                  kind="tertiary"
                  size="md"
                  disabled={!canSubmit || createMutation.isPending}
                  data-testid="block-create-add-button"
                >
                  Add
                </Button>
              )}
            </form.Subscribe>
          </div>
        </div>
      </form>
    </Column>
  );
};

export default BlockCreateAction;
