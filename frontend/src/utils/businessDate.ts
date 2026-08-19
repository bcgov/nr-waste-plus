import { DateTime } from 'luxon';

/**
 * Determines whether a configuration entry's start date is strictly after the
 * current business date.
 *
 * Only future-dated entries can be soft-deleted. The backend is authoritative
 * for this rule; this helper is a client-side usability guard that hides the
 * delete action for current and past entries.
 *
 * @param startDate The ISO date string of the configuration entry (e.g. `2026-06-01`).
 * @param today The reference business date; defaults to the local current date.
 * @returns `true` when the start date is at least one day after `today`.
 */
export const isFutureDated = (startDate: string, today: DateTime = DateTime.local()): boolean => {
  const start = DateTime.fromISO(startDate);
  if (!start.isValid) {
    return false;
  }

  return start.startOf('day') > today.startOf('day');
};
