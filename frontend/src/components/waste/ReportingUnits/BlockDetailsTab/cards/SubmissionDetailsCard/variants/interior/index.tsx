import { type FC } from 'react';

import { InteriorSubmissionDetailsFormView } from './Form';
import { InteriorSubmissionDetailsReadOnly } from './ReadOnly';

import type { InteriorSubmissionDetailsFormProps } from './types';

import './index.scss';

export type { InteriorBecSubzoneVariantOption, InteriorSubmissionDetailsValues } from './types';

/**
 * Interior District Average submission-details component: renders the editable
 * form or the read-only view selected by {@linkcode mode}. Option lists and
 * read-only values are supplied by the containing page so this component does
 * not assume an API contract or maintain a duplicate code list.
 *
 * @param props - Mode, initial data, option lists, and local-change callbacks.
 * @returns The Interior submission-details form or read-only view.
 */
const InteriorSubmissionDetailsForm: FC<InteriorSubmissionDetailsFormProps> = ({
  mode,
  ...rest
}) => {
  if (mode === 'read-only') {
    return <InteriorSubmissionDetailsReadOnly {...rest} />;
  }

  return <InteriorSubmissionDetailsFormView {...rest} />;
};

export default InteriorSubmissionDetailsForm;
