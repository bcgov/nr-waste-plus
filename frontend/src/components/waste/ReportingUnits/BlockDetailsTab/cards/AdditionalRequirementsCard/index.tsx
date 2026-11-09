import { Button, Checkbox, Column, Grid, Toggle } from '@carbon/react';
import { Add } from '@carbon/react/icons';
import { useForm } from '@tanstack/react-form';
import { type FC } from 'react';

import { validateAdditionalRequirementsCertify } from '../SubmissionDetailsCard/shared/validation';

import './index.scss';

export type AdditionalRequirementsValues = {
  /** Toggle 9/14: "Were any piles on this block burnt prior to submission?" */
  werePilesBurnt: boolean;
  /** Toggle 10/15: "Does this block require a rationale according to the Waste manual?" */
  requiresRationale: boolean;
  /** D11: rendered and required only when both toggles are No. */
  certifyNoAdditionalRequirements: boolean;
};

export type AdditionalRequirementsCardProps = {
  mode: 'form' | 'read-only';
  initialValues?: Partial<AdditionalRequirementsValues>;
  /** "Add attachments" navigates to the Attachments tab (S8 → tab 4). */
  onAddAttachments?: () => void;
};

const EMPTY_VALUES: AdditionalRequirementsValues = {
  werePilesBurnt: false,
  requiresRationale: false,
  certifyNoAdditionalRequirements: false,
};

const PILES_LABEL = 'Were any piles on this block burnt prior to submission?';
const RATIONALE_LABEL = 'Does this block require a rationale according to the Waste manual?';
const CERTIFY_LABEL = 'I hereby certify that none of the above conditions apply to this block';

const fieldError = (errors: readonly unknown[]): string | undefined => {
  const first = errors.find((error) => typeof error === 'string' && error.length > 0);
  return typeof first === 'string' ? first : undefined;
};

const ReadOnlyValue: FC<{ label: string; value: string }> = ({ label, value }) => (
  <Column sm={4} md={8} lg={16}>
    <p className="additional-requirements-card__label">{label}</p>
    <p className="additional-requirements-card__value">{value}</p>
  </Column>
);

/**
 * Card 4 — Additional requirements (D20 tier 1, S8/BR-3, variant-identical).
 *
 * D11/INT-1.8a/CST-1.11: the certify checkbox is available only when BOTH toggles are No;
 * otherwise it is forced false and not rendered (not disabled). When both toggles are No the
 * checkbox is required (field-level validation; submit deferred D5/D25). Consequences of Yes
 * answers (Hold, attachment gate) are deferred (OQ-27/D25).
 */
const AdditionalRequirementsCard: FC<AdditionalRequirementsCardProps> = ({
  mode,
  initialValues,
  onAddAttachments,
}) => {
  const form = useForm({
    defaultValues: { ...EMPTY_VALUES, ...initialValues },
  });

  if (mode === 'read-only') {
    const values = { ...EMPTY_VALUES, ...initialValues };
    const showCertify = !values.werePilesBurnt && !values.requiresRationale;
    return (
      <section
        className="additional-requirements-card"
        aria-labelledby="additional-requirements-heading"
      >
        <h3 id="additional-requirements-heading">Additional requirements</h3>
        <Grid condensed className="additional-requirements-card__grid">
          <ReadOnlyValue label={PILES_LABEL} value={values.werePilesBurnt ? 'Yes' : 'No'} />
          <ReadOnlyValue label={RATIONALE_LABEL} value={values.requiresRationale ? 'Yes' : 'No'} />
          {showCertify ? (
            <ReadOnlyValue
              label={CERTIFY_LABEL}
              value={values.certifyNoAdditionalRequirements ? 'Yes' : 'No'}
            />
          ) : null}
          <Column sm={4} md={8} lg={16}>
            <Button kind="tertiary" renderIcon={Add} onClick={onAddAttachments}>
              Add attachments
            </Button>
          </Column>
        </Grid>
      </section>
    );
  }

  return (
    <section
      className="additional-requirements-card"
      aria-labelledby="additional-requirements-heading"
    >
      <h3 id="additional-requirements-heading">Additional requirements</h3>
      <Grid condensed className="additional-requirements-card__grid">
        <Column sm={4} md={8} lg={16}>
          <form.Field name="werePilesBurnt">
            {(field) => (
              <Toggle
                id="additional-requirements-piles-burnt"
                labelText={PILES_LABEL}
                toggled={field.state.value}
                labelA="No"
                labelB="Yes"
                onToggle={(checked) => {
                  field.handleChange(checked);
                  if (checked) form.setFieldValue('certifyNoAdditionalRequirements', false);
                }}
              />
            )}
          </form.Field>
        </Column>
        <Column sm={4} md={8} lg={16}>
          <form.Field name="requiresRationale">
            {(field) => (
              <Toggle
                id="additional-requirements-rationale-required"
                labelText={RATIONALE_LABEL}
                toggled={field.state.value}
                labelA="No"
                labelB="Yes"
                onToggle={(checked) => {
                  field.handleChange(checked);
                  if (checked) form.setFieldValue('certifyNoAdditionalRequirements', false);
                }}
              />
            )}
          </form.Field>
        </Column>
        <form.Subscribe
          selector={(state) =>
            [state.values.werePilesBurnt, state.values.requiresRationale] as const
          }
        >
          {([werePilesBurnt, requiresRationale]) =>
            werePilesBurnt || requiresRationale ? null : (
              <Column sm={4} md={8} lg={16}>
                <form.Field
                  name="certifyNoAdditionalRequirements"
                  validators={{
                    onChangeListenTo: ['werePilesBurnt', 'requiresRationale'],
                    onChange: ({ value, fieldApi }) =>
                      validateAdditionalRequirementsCertify(
                        value,
                        fieldApi.form.getFieldValue('werePilesBurnt'),
                        fieldApi.form.getFieldValue('requiresRationale'),
                      ),
                  }}
                >
                  {(field) => {
                    const invalidText = fieldError(field.state.meta.errors);
                    return (
                      <Checkbox
                        id="additional-requirements-certify"
                        labelText={CERTIFY_LABEL}
                        checked={field.state.value}
                        invalid={Boolean(invalidText)}
                        invalidText={invalidText}
                        onChange={(_event, { checked }) => field.handleChange(Boolean(checked))}
                      />
                    );
                  }}
                </form.Field>
              </Column>
            )
          }
        </form.Subscribe>
        <Column sm={4} md={8} lg={16}>
          <Button kind="tertiary" renderIcon={Add} onClick={onAddAttachments}>
            Add attachments
          </Button>
        </Column>
      </Grid>
    </section>
  );
};

export default AdditionalRequirementsCard;
