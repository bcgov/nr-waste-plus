import type { FC } from 'react';

export type CoastSubmissionDetailsValues = Record<string, unknown>;
export type CoastSubmissionDetailsFormProps = { mode?: 'form' | 'read-only'; [key: string]: unknown };

const CoastSubmissionDetailsForm: FC<CoastSubmissionDetailsFormProps> = () => null;
export default CoastSubmissionDetailsForm;
