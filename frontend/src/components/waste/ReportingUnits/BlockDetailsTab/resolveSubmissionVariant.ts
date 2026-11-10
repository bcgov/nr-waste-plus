import type { CodeDescriptionDto } from '@/types/search.types';

/** Which submission-details twin renders. Driven by the reporting-unit grade (plan D3). */
export type SubmissionVariant = 'interior' | 'coast';

/** Grade shape needed for variant resolution. */
type GradeLike = Pick<CodeDescriptionDto, 'code' | 'description'> | null | undefined;

/**
 * Resolves the submission-details variant from the reporting-unit grade.
 *
 * Coast is matched on the grade code (`COASTAL`, case-insensitive) and on the
 * grade description (`coast`/`coastal`, case- and whitespace-insensitive) to
 * cover legacy and fallback responses. Anything else falls back to interior.
 */
export const resolveSubmissionVariant = (grade: GradeLike): SubmissionVariant => {
  if (grade?.code?.trim().toUpperCase() === 'COASTAL') {
    return 'coast';
  }
  const description = grade?.description?.trim().toLowerCase();
  return description === 'coast' || description === 'coastal' ? 'coast' : 'interior';
};
