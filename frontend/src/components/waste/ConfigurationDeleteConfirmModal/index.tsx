import { Button, ComposedModal, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { type FC } from 'react';

import DateTag from '@/components/core/Tags/DateTag';

interface ConfigurationDeleteConfirmModalProps {
  /** Whether the modal is open. */
  open: boolean;
  /** Human-readable configuration type used in the copy, e.g. "district volume". */
  configurationType: string;
  /** Effective start date (ISO date string) of the configuration being deleted. */
  startDate: string;
  /** Whether the delete request is pending; disables the confirm button. */
  isDeleting: boolean;
  /** Callback fired when the user confirms the deletion. */
  onConfirm: () => void;
  /** Callback fired when the modal is dismissed (cancel or close). */
  onClose: () => void;
}

/**
 * Confirmation dialog for deleting a future configuration entry.
 *
 * Rendered by the configuration list tables (district volume and species
 * composition) when the user picks the delete row action. Shows the
 * configuration type and effective start date, keeps the confirm button
 * disabled while a deletion is in flight, and returns focus to the triggering
 * row action on close via Carbon's focus management.
 *
 * @param props The modal props.
 * @param props.open Whether the modal should be rendered.
 * @param props.configurationType Configuration type used in the copy.
 * @param props.startDate Effective start date of the entry being deleted.
 * @param props.isDeleting Whether the delete request is pending.
 * @param props.onConfirm Confirmation callback.
 * @param props.onClose Dismissal callback.
 * @returns The confirmation modal or `null` when closed.
 */
const ConfigurationDeleteConfirmModal: FC<ConfigurationDeleteConfirmModalProps> = ({
  open,
  configurationType,
  startDate,
  isDeleting,
  onConfirm,
  onClose,
}) => {
  if (!open) return null;

  return (
    <ComposedModal
      className="configuration-delete-modal"
      data-testid="configuration-delete-modal"
      open={open}
      onClose={onClose}
      selectorPrimaryFocus=".configuration-delete-confirm-button"
    >
      <ModalHeader title={`Delete ${configurationType}?`} closeModal={onClose} />
      <ModalBody>
        <p>
          The {configurationType} configuration starting{' '}
          <DateTag date={startDate} format="MMMM dd, yyyy" /> will be deleted. This action cannot be
          undone.
        </p>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose} disabled={isDeleting}>
          Cancel
        </Button>
        <Button
          className="configuration-delete-confirm-button"
          kind="danger"
          onClick={onConfirm}
          disabled={isDeleting}
        >
          Delete
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
};

export default ConfigurationDeleteConfirmModal;
