import { Button, Modal, Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import { useState, type FC, type ReactNode } from 'react';

import { useBlockWizardDirty } from './BlockWizardDirtyContext';

/**
 * The five wizard tabs in design order (Figma `1:7361`, verbatim labels —
 * note the lowercase `v` in `Waste volumes`).
 */
export const WIZARD_TABS = [
  { id: 'block-details', label: 'Block details' },
  { id: 'area-calculator', label: 'Area calculator' },
  { id: 'waste-volumes', label: 'Waste volumes' },
  { id: 'attachments', label: 'Attachments' },
  { id: 'endorsement', label: 'Endorsement' },
] as const;

/**
 * Verbatim unsaved-tab warning copy from Figma `1:7341` (issue #1254
 * business rule 2 — exact string, do not reword).
 */
export const UNSAVED_TAB_WARNING = 'Complete all fields and click Save before leaving this tab';

/**
 * Props for the {@link BlockWizardTabs} component.
 */
interface BlockWizardTabsProps {
  /** Lifecycle state of the block; anything but `DRAFT` disables the footer. */
  readonly blockState: string;
  /** One node per tab, index-aligned with {@link WIZARD_TABS}. */
  readonly panels?: readonly ReactNode[];
}

/**
 * Tab strip, unsaved-changes guard, and Save/Submit footer for the block
 * wizard (issue #1254).
 *
 * Rendered inside {@link BlockWizardShell}, which provides the dirty-state
 * context. While the active tab is dirty, switching tabs opens a Carbon danger
 * modal carrying the verbatim warning; navigation proceeds only on explicit
 * discard, and stays put on "Stay on tab".
 *
 * @param props - Component props.
 * @returns The wizard tabs and footer.
 */
const BlockWizardTabs: FC<BlockWizardTabsProps> = ({ blockState, panels }) => {
  const { isDirty, clearDirty } = useBlockWizardDirty();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);

  const isReadOnly = blockState !== 'DRAFT';

  const handleTabChange = (state: { selectedIndex: number }) => {
    const nextIndex = state.selectedIndex;
    if (nextIndex === selectedIndex) {
      return;
    }

    if (isDirty) {
      setPendingIndex(nextIndex);
      return;
    }

    setSelectedIndex(nextIndex);
  };

  const handleDiscardChanges = () => {
    if (pendingIndex !== null) {
      setSelectedIndex(pendingIndex);
    }
    setPendingIndex(null);
    clearDirty();
  };

  const handleStayOnTab = () => {
    setPendingIndex(null);
  };

  return (
    <>
      <Tabs
        selectedIndex={selectedIndex}
        onChange={handleTabChange}
        data-testid="block-wizard-tabs"
      >
        <TabList aria-label="Block wizard tabs" contained size="lg">
          {WIZARD_TABS.map((tab) => (
            <Tab key={tab.id}>{tab.label}</Tab>
          ))}
        </TabList>
        <TabPanels>
          {WIZARD_TABS.map((tab, index) => (
            <TabPanel key={tab.id}>
              <div data-testid={`block-tab-panel-${tab.id}`}>{panels?.[index] ?? null}</div>
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>

      <div className="block-wizard__footer" data-testid="block-wizard-footer">
        <Button kind="secondary" disabled={isReadOnly} data-testid="block-wizard-save">
          Save
        </Button>
        <Button kind="primary" disabled={isReadOnly} data-testid="block-wizard-submit">
          Submit
        </Button>
      </div>

      <Modal
        open={pendingIndex !== null}
        danger
        modalHeading={UNSAVED_TAB_WARNING}
        primaryButtonText="Discard changes"
        secondaryButtonText="Stay on tab"
        onRequestSubmit={handleDiscardChanges}
        onRequestClose={handleStayOnTab}
        data-testid="block-wizard-unsaved-modal"
      />
    </>
  );
};

export default BlockWizardTabs;
