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

const AdditionalRequirementsCard: FC<AdditionalRequirementsCardProps> = () => (
  <section aria-label="Additional requirements">Additional requirements (stub)</section>
);

export default AdditionalRequirementsCard;
