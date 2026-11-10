import {
  Button,
  ComposedModal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextInput,
} from '@carbon/react';
import { Add, Close } from '@carbon/react/icons';
import { type FC, useEffect, useRef, useState } from 'react';

import { normalizeTimberMark } from './format';

import './TimberMarkRepeatSection.scss';

export type TimberMarkRepeatSectionProps = {
  /** Visible section/field label, e.g. "Secondary timber mark". */
  label: string;
  /** Accessible name for the add action, e.g. "Add secondary timber mark". */
  addButtonLabel: string;
  /** Current mark values (normalized). */
  marks: readonly string[];
  /** Called with the next marks array. */
  onChange: (marks: string[]) => void;
  /** Optional callback invoked when a new mark row is added. */
  onAdd?: () => void;
  /** Maximum number of entries (INT-1.6d/CST-1.9: 5). */
  max?: number;
  mode: 'form' | 'read-only';
  /** Prefix for stable ids/test ids. */
  idPrefix: string;
};

const DEFAULT_MAX = 5;

/**
 * Repeatable timber-mark entry section (S6, BR-2 / INT-1.6a,d / CST-1.9, D10/OQC).
 * Shared by secondary and road-permit marks and by both DA variants (D20 card-1 tier).
 *
 * - Alphanumeric only, auto-uppercased (normalized on change).
 * - Max entries enforced (default 5) with observable feedback (add disabled).
 * - Removal in form mode asks for confirmation (Draft remove-confirmation modal).
 * - FTA existence/mapping validation is submit-time/backend (D17/D25) — not here.
 */
const TimberMarkRepeatSection: FC<TimberMarkRepeatSectionProps> = ({
  label,
  addButtonLabel,
  marks,
  onChange,
  onAdd,
  max = DEFAULT_MAX,
  mode,
  idPrefix,
}) => {
  const [pendingRemoveIndex, setPendingRemoveIndex] = useState<number | null>(null);
  const keyCounter = useRef(0);
  const makeKey = () => `${idPrefix}-row-${keyCounter.current++}`;
  const [rowKeys, setRowKeys] = useState<string[]>(() => marks.map(() => makeKey()));
  const atMax = marks.length >= max;

  useEffect(() => {
    setRowKeys((current) => {
      if (current.length === marks.length) return current;
      if (marks.length > current.length) {
        return [
          ...current,
          ...Array.from({ length: marks.length - current.length }, () => makeKey()),
        ];
      }
      return current.slice(0, marks.length);
    });
  }, [marks.length, idPrefix]);

  const handleAdd = () => {
    setRowKeys((current) => [...current, makeKey()]);
    onChange([...marks, '']);
    onAdd?.();
  };

  const handleMarkChange = (index: number, value: string) => {
    const next = [...marks];
    next[index] = normalizeTimberMark(value);
    onChange(next);
  };

  const confirmRemove = () => {
    if (pendingRemoveIndex !== null) {
      setRowKeys((current) => current.filter((_key, index) => index !== pendingRemoveIndex));
      onChange(marks.filter((_mark, index) => index !== pendingRemoveIndex));
    }
    setPendingRemoveIndex(null);
  };

  if (mode === 'read-only') {
    if (marks.length === 0) return null;
    return (
      <div className="timber-mark-repeat-section" data-testid={`${idPrefix}-read-only`}>
        {marks.map((mark, index) => (
          <p key={`${idPrefix}-${index}`} className="timber-mark-repeat-section__value">
            <span className="timber-mark-repeat-section__label">{label}</span>: {mark || '--'}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className="timber-mark-repeat-section">
      {marks.map((mark, index) => (
        <div key={rowKeys[index] ?? `${idPrefix}-${index}`} className="timber-mark-repeat-section__row">
          <TextInput
            id={`${idPrefix}-${index}`}
            labelText={`${label} ${index + 1}`}
            value={mark}
            onChange={(event) => handleMarkChange(index, event.currentTarget.value)}
          />
          <Button
            kind="ghost"
            hasIconOnly
            renderIcon={Close}
            iconDescription={`Remove ${label.toLowerCase()} ${index + 1}`}
            onClick={() => setPendingRemoveIndex(index)}
            className="timber-mark-repeat-section__remove"
          />
        </div>
      ))}

      <Button
        kind="ghost"
        renderIcon={Add}
        onClick={handleAdd}
        disabled={atMax}
        title={atMax ? `Maximum ${max} ${label.toLowerCase()}s allowed` : undefined}
      >
        {addButtonLabel}
      </Button>
      {atMax ? (
        <output className="timber-mark-repeat-section__limit">
          You can add up to {max} {label.toLowerCase()}s.
        </output>
      ) : null}

      {pendingRemoveIndex === null ? null : (
        <ComposedModal
          open
          size="xs"
          onClose={() => setPendingRemoveIndex(null)}
          data-testid={`${idPrefix}-remove-modal`}
        >
          <ModalHeader title="Remove timber mark?" closeModal={() => setPendingRemoveIndex(null)} />
          <ModalBody>
            <p>Are you sure you want to remove this timber mark? This cannot be undone.</p>
          </ModalBody>
          <ModalFooter>
            <Button kind="secondary" onClick={() => setPendingRemoveIndex(null)}>
              Cancel
            </Button>
            <Button kind="danger" onClick={confirmRemove}>
              Remove
            </Button>
          </ModalFooter>
        </ComposedModal>
      )}
    </div>
  );
};

export default TimberMarkRepeatSection;
