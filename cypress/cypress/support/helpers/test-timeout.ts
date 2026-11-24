/**
 * Whole-test wall-clock budget.
 *
 * Cypress command timeouts are per command, and Mocha's `this.timeout()` is
 * restarted after every Cypress command, so neither bounds a test that hangs
 * across many commands. This is the official Cypress "test timeout" recipe:
 * a timer throws into whichever runnable is active, and is cleared when that
 * runnable finishes.
 *
 * Budget = 9.8 min (slowest non-hung CI failure) * 1.1 / 53 test cases
 *        = 12.2 s. The slowest passing test body measured locally was 11.6 s.
 * Adding tests therefore grows the suite's runtime budget automatically.
 * Retune `TEST_BUDGET_MS` below if the slowest healthy test body changes.
 */
const TEST_BUDGET_MS = 12_200;

let timer: ReturnType<typeof setTimeout> | undefined;

const clearTimer = (): void => {
  if (timer !== undefined) {
    clearTimeout(timer);
    timer = undefined;
  }
};

const armTimer = (ms: number): void => {
  clearTimer();
  timer = setTimeout(() => {
    throw new Error(
      `Test exceeded its ${ms}ms budget: ${Cypress.currentTest?.title ?? "unknown test"}`,
    );
  }, ms);
};

Cypress.on("test:after:run", clearTimer);

/** Suspends the budget while a login hook runs its own timed commands. */
export const pauseTestBudget = (): void => {
  clearTimer();
};

/** Starts a fresh budget, used after login so it bounds only the test body. */
export const restartTestBudget = (ms: number = TEST_BUDGET_MS): void => {
  armTimer(ms);
};

/** Installs the per-test budget in a support-file `beforeEach`. */
export const installTestTimeouts = (): void => {
  beforeEach(() => {
    armTimer(TEST_BUDGET_MS);
  });
};
