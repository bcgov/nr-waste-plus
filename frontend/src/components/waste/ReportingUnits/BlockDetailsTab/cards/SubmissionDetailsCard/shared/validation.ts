/**
 * Field-level validators for District Average submission details (Confluence rules,
 * plan BR-1 / D30 / D32). Field-level only — submit-time checks are deferred (D25).
 */

/** Returns an error when the primary logging complete date is missing (INT-1.1a, CST-1.1a). */
export const validatePrimaryLoggingCompleteDateRequired = (value: string): string | undefined =>
  value?.trim() ? undefined : 'Primary logging complete date is required.';

/**
 * Returns an error when the date is in the future (INT-1.1b, applied to both variants by D30).
 * No lower bound is enforced (HBS TBD).
 */
export const validatePrimaryLoggingCompleteDateNotFuture = (value: string): string | undefined => {
  if (!value?.trim()) return undefined;
  const selected = new Date(`${value}T00:00:00`);
  if (Number.isNaN(selected.getTime())) return undefined;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selected > today ? 'Primary logging complete date cannot be in the future.' : undefined;
};

/** Composed PLC date validator (required + no future). */
export const validatePrimaryLoggingCompleteDate = (value: string): string | undefined =>
  validatePrimaryLoggingCompleteDateRequired(value) ??
  validatePrimaryLoggingCompleteDateNotFuture(value);

/**
 * Returns an error when dispersed retention is on but the percentage is not a whole number 50–100
 * (INT-1.4a, CST-1.7a, D32: any whole 50–100, no increments-of-10).
 */
export const validateDispersedRetentionPct = (
  pct: string,
  hasDispersedRetention: boolean,
): string | undefined => {
  if (!hasDispersedRetention) return undefined;
  const raw = pct?.trim() ?? '';
  if (!raw) return 'Dispersed retention percentage is required.';
  if (!/^\d+$/.test(raw)) return 'Enter a whole number between 50 and 100.';
  const n = Number(raw);
  if (n < 50 || n > 100) return 'Enter a whole number between 50 and 100.';
  return undefined;
};

/** Returns an error when dispersed retention is on but the explanation is empty (INT-1.4b). */
export const validateDispersedRetentionExplanation = (
  explanation: string,
  hasDispersedRetention: boolean,
): string | undefined => {
  if (!hasDispersedRetention) return undefined;
  return explanation?.trim() ? undefined : 'Explain how the retention percentage was calculated.';
};
