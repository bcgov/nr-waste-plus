import { type FC, type ReactNode } from 'react';

import BlockWizardTabs from './BlockWizardTabs';
import { BlockWizardDirtyProvider } from './BlockWizardDirtyContext';

/**
 * Props for the {@link BlockWizardShell} component.
 */
export interface BlockWizardShellProps {
  /**
   * Lifecycle state of the block (from the create response). Anything other
   * than `DRAFT` renders the shell read-only: Save/Submit disabled (issue
   * #1254 non-functional requirement: editable only while DRAFT).
   *
   * @default 'DRAFT'
   */
  readonly blockState?: string;
  /**
   * One node per wizard tab, index-aligned with the shell's tab order
   * (`Block details`, `Area calculator`, `Waste volumes`, `Attachments`,
   * `Endorsement`). Child tab screens from #1239/#1255, #1240, #1242/#1256,
   * #1243 mount into these slots; omitted slots render an empty placeholder.
   */
  readonly panels?: readonly ReactNode[];
}

/**
 * Wizard frame for a District Average block: Carbon tab strip, unsaved-tab
 * guard, and the Save/Submit footer (issue #1254).
 *
 * The shell owns navigation chrome ONLY — no business validation. Each child
 * tab validates its own fields and clears the shared dirty flag on save
 * through {@link useBlockWizardDirty}.
 *
 * @param props - Component props.
 * @returns The provider-wrapped tab strip and footer.
 */
const BlockWizardShell: FC<BlockWizardShellProps> = ({ blockState, panels }) => (
  <BlockWizardDirtyProvider>
    <BlockWizardTabs
      blockState={blockState ?? 'DRAFT'}
      {...(panels === undefined ? {} : { panels })}
    />
  </BlockWizardDirtyProvider>
);

export default BlockWizardShell;
