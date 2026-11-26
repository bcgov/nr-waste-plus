import { Button, Checkbox, Column, Grid, Toggle } from '@carbon/react';
import { useState, type FC } from 'react';

import ReadonlyInput from '@/components/Form/ReadonlyInput';

import { validateAdditionalRequirementsCertify } from '../SubmissionDetailsCard/shared/validation';

import './index.scss';

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

export const PILE_BURN_QUESTION = 'Were any piles on this block burnt prior to submission?';
export const RATIONALE_QUESTION =
  'Does this block require a rationale according to the Waste manual?';
export const CERTIFY_LABEL =
  'I hereby certify that none of the above conditions apply to this block';

const AdditionalRequirementsCard: FC<AdditionalRequirementsCardProps> = ({
  mode,
  initialValues,
  onAddAttachments,
}) => {
  const [werePilesBurnt, setWerePilesBurnt] = useState(initialValues?.werePilesBurnt ?? false);
  const [requiresRationale, setRequiresRationale] = useState(
    initialValues?.requiresRationale ?? false,
  );
  const [certified, setCertified] = useState(
    // D11: a certify value can only start as true while both toggles start "No";
    // contradictory initialValues are sanitised to false at initialisation.
    !initialValues?.werePilesBurnt && !initialValues?.requiresRationale
      ? (initialValues?.certifyNoAdditionalRequirements ?? false)
      : false,
  );
  const [certifyTouched, setCertifyTouched] = useState(false);

  // D11: the certify checkbox exists only while both toggles are "No".
  const showCertify = !werePilesBurnt && !requiresRationale;

  // BR-3: required while both toggles are "No"; the error appears after blur and
  // clears as soon as the box is ticked.
  const certifyError =
    showCertify && certifyTouched
      ? validateAdditionalRequirementsCertify(certified, werePilesBurnt, requiresRationale)
      : undefined;

  const handleToggle =
    (setter: (value: boolean) => void) =>
    (toggled: boolean): void => {
      setter(toggled);
      if (toggled) {
        // D11: any "Yes" hides the checkbox and forces its value back to false.
        setCertified(false);
        setCertifyTouched(false);
      }
    };

  const isReadOnly = mode === 'read-only';

  return (
    <section className="additional-requirements-card" aria-label="Additional requirements">
      <Grid className="detail-header-grid additional-requirements-card__header-grid">
        <Column lg={8} md={8} sm={4} className="additional-requirements-card__title-column">
          <h2 className="additional-requirements-card__title">Additional requirements</h2>
          <p className="additional-requirements-card__helper">
            Please select &apos;yes&apos; if any of these conditions apply to this block
          </p>
        </Column>
        <Column lg={8} md={8} sm={4} className="additional-requirements-card__action-column">
          <Button
            kind="tertiary"
            size="md"
            className="additional-requirements-card__button"
            onClick={onAddAttachments}
          >
            Add attachments
          </Button>
        </Column>
      </Grid>

      <Grid className="detail-header-grid additional-requirements-card__questions-grid">
        <Column lg={4} md={4} sm={4} className="additional-requirements-card__question">
          {isReadOnly ? (
            <ReadonlyInput label={PILE_BURN_QUESTION}>
              {werePilesBurnt ? 'Yes' : 'No'}
            </ReadonlyInput>
          ) : (
            <Toggle
              id="additional-requirements-piles-burnt"
              labelText={PILE_BURN_QUESTION}
              labelA="No"
              labelB="Yes"
              toggled={werePilesBurnt}
              onToggle={handleToggle(setWerePilesBurnt)}
            />
          )}
        </Column>

        <Column lg={4} md={4} sm={4} className="additional-requirements-card__question">
          {isReadOnly ? (
            <ReadonlyInput label={RATIONALE_QUESTION}>
              {requiresRationale ? 'Yes' : 'No'}
            </ReadonlyInput>
          ) : (
            <Toggle
              id="additional-requirements-rationale"
              labelText={RATIONALE_QUESTION}
              labelA="No"
              labelB="Yes"
              toggled={requiresRationale}
              onToggle={handleToggle(setRequiresRationale)}
            />
          )}
        </Column>
      </Grid>

      {showCertify && (
        <Grid className="detail-header-grid additional-requirements-card__certify-grid">
          <Column lg={12} md={8} sm={4} className="additional-requirements-card__certify">
            {isReadOnly ? (
              <ReadonlyInput label={CERTIFY_LABEL}>{certified ? 'Yes' : 'No'}</ReadonlyInput>
            ) : (
              <Checkbox
                id="additional-requirements-certify"
                labelText={CERTIFY_LABEL}
                checked={certified}
                required={showCertify}
                invalid={Boolean(certifyError)}
                invalidText={certifyError}
                onBlur={() => setCertifyTouched(true)}
                onChange={(_, { checked }) => {
                  setCertified(checked);
                  if (checked) setCertifyTouched(false);
                }}
              />
            )}
          </Column>
        </Grid>
      )}
    </section>
  );
};

export default AdditionalRequirementsCard;
