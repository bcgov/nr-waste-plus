import { type FC } from 'react';

import { CoastSubmissionDetailsFormView } from './Form';
import { CoastSubmissionDetailsReadOnly } from './ReadOnly';

import type { CoastSubmissionDetailsFormProps } from './types';

import './index.scss';

export type { CoastSubmissionDetailsFormProps, CoastSubmissionDetailsValues } from './types';

const CoastSubmissionDetailsForm: FC<CoastSubmissionDetailsFormProps> = ({
  mode,
  ...rest
}) => {
  if (mode === 'read-only') {
    return <CoastSubmissionDetailsReadOnly {...rest} />;
  }

  return <CoastSubmissionDetailsFormView {...rest} />;
};

export default CoastSubmissionDetailsForm;
