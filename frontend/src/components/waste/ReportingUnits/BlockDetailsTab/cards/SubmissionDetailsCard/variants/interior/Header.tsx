import { type FC } from 'react';

/**
 * Shared heading for the Interior submission-details twins.
 *
 * Keeps the Figma-verbatim title, helper text, and the
 * {@link https://developer.mozilla.org/docs/Web/API/ARIA | aria-labelledby}
 * anchor in one place so the form and read-only views cannot drift apart.
 *
 * @returns The submission-details heading block.
 */
const SubmissionDetailsHeader: FC = () => (
  <>
    <h2 id="interior-submission-heading">Submission details</h2>
    <p>Complete all fields and click Save before leaving this tab</p>
  </>
);

export default SubmissionDetailsHeader;
