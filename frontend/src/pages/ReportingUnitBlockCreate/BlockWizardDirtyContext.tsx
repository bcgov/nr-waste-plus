import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type FC,
  type ReactNode,
} from 'react';

/**
 * Dirty-state API shared between {@link BlockWizardShell} and the child tab
 * screens mounted into its tab panels.
 *
 * A child tab calls {@link BlockWizardDirtyApi.markDirty} as soon as any of its
 * fields changes, and {@link BlockWizardDirtyApi.clearDirty} after a successful
 * save. While `isDirty` is `true`, the shell blocks tab navigation behind the
 * unsaved-changes confirmation (issue #1254 business rule 2).
 */
export interface BlockWizardDirtyApi {
  /** Whether the active tab holds unsaved changes. */
  readonly isDirty: boolean;
  /** Marks the active tab as having unsaved changes. */
  readonly markDirty: () => void;
  /** Clears the dirty flag (after save or explicit discard). */
  readonly clearDirty: () => void;
}

const BlockWizardDirtyContext = createContext<BlockWizardDirtyApi | undefined>(undefined);

/**
 * Provides the dirty-state API for the block wizard shell.
 *
 * Sits above the tab strip inside {@link BlockWizardShell} so every child tab
 * panel can reach the shared guard state through {@link useBlockWizardDirty}.
 *
 * @param props - Component props.
 * @param props.children - The wizard content that may mark the form dirty.
 * @returns The context provider wrapping its children.
 */
export const BlockWizardDirtyProvider: FC<{ readonly children: ReactNode }> = ({ children }) => {
  const [isDirty, setIsDirty] = useState(false);

  const markDirty = useCallback(() => setIsDirty(true), []);
  const clearDirty = useCallback(() => setIsDirty(false), []);

  const value = useMemo<BlockWizardDirtyApi>(
    () => ({ isDirty, markDirty, clearDirty }),
    [isDirty, markDirty, clearDirty],
  );

  return (
    <BlockWizardDirtyContext.Provider value={value}>{children}</BlockWizardDirtyContext.Provider>
  );
};

/**
 * Reads the wizard dirty-state API from {@link BlockWizardDirtyProvider}.
 *
 * @returns The shared dirty-state API.
 * @throws {Error} When called outside the provider.
 */
export const useBlockWizardDirty = (): BlockWizardDirtyApi => {
  const context = useContext(BlockWizardDirtyContext);
  if (!context) {
    throw new Error('useBlockWizardDirty must be used within a BlockWizardDirtyProvider');
  }
  return context;
};
