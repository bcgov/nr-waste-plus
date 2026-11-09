import type { CodeDescriptionDto } from '@/types/search.types';

/** Which submission-details twin renders. Driven by the reporting-unit grade (plan D3). */
export type SubmissionVariant = 'interior' | 'coast';

/** Grade shape needed for variant resolution. */
type GradeLike = Pick<CodeDescriptionDto, 'code' | 'description'> | null | undefined;

/**
 * Resolves the submission-details variant from the reporting-unit grade.
 *
 * Coast is matched on the grade description (case- and whitespace-insensitive)
 * because the grade code domain is not settled yet. Anything else falls back to interior.
 */
export const resolveSubmissionVariant = (grade: GradeLike): SubmissionVariant =>
  grade?.description?.trim().toLowerCase() === 'coast' ? 'coast' : 'interior';
