/**
 * Whole-test wall-clock budget.
 *
 * Cypress command timeouts are per command, and Mocha's `this.timeout()` is
 * restarted after every Cypress command, so neither bounds a test that hangs
 * across many commands (for example an SSO session setup). This is the
 * official Cypress "test timeout" recipe: a timer throws into whichever
 * runnable is active, and is cleared when that runnable finishes.
 *
 * Budget = 9.8 min (slowest non-hung CI failure) * 1.1 / 53 test cases
 *        = 12.2 s. The slowest passing test measured locally was 11.6 s.
 * Every test gets this budget, so suite runtime scales with test count and no
 * global job timeout is needed. Change the constant below to retune.
 */
const TEST_BUDGET_MS = 12_200;

let timer: ReturnType<typeof setTimeout> | undefined;

const clearTimer = (): void => {
  if (timer !== undefined) {
    clearTimeout(timer);
    timer = undefined;
  }
};

Cypress.on("test:after:run", clearTimer);

/** Installs the per-test budget in a support-file `beforeEach`. */
export const installTestTimeouts = (): void => {
  beforeEach(() => {
    clearTimer();
    timer = setTimeout(() => {
      throw new Error(
        `Test exceeded its ${TEST_BUDGET_MS}ms budget: ${Cypress.currentTest?.title ?? "unknown test"}`,
      );
    }, TEST_BUDGET_MS);
  });
};
