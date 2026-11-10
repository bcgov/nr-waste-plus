import type { FC } from 'react';

export type AdditionalRequirementsValues = {
  werePilesBurnt: boolean;
  requiresRationale: boolean;
  certifyNoAdditionalRequirements: boolean;
};

export type AdditionalRequirementsCardProps = {
  mode: 'form' | 'read-only';
  initialValues?: Partial<AdditionalRequirementsValues>;
  onAddAttachments?: () => void;
};

const AdditionalRequirementsCard: FC<AdditionalRequirementsCardProps> = ({ onAddAttachments }) => (
  <section aria-label="Additional requirements">
    <button type="button" onClick={onAddAttachments}>Add attachments</button>
  </section>
);

export default AdditionalRequirementsCard;
