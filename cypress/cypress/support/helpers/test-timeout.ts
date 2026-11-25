/**
 * Whole-test wall-clock budget.
 *
 * Cypress command timeouts are per command, and Mocha's `this.timeout()` is
 * restarted after every Cypress command, so neither bounds a test that hangs
 * across many commands. This is the official Cypress "test timeout" recipe:
 * a timer throws into whichever runnable is active, and is cleared when that
 * runnable finishes.
 *
 * Baseline = 9.8 min (slowest non-hung CI failure) * 1.1 / 53 test cases
 *           = 12.2 s. The slowest passing test body measured locally was 11.6 s.
 * The IDIR path can spend ~15 s waiting for a silent SSO redirect to settle,
 * so its budget is 30 s. Business BCeID gets 2x the baseline (24.4 s) for its
 * post-login steps. Adding tests still grows the suite's runtime budget
 * automatically. Retune the constants below if the slowest healthy test changes.
 */
const BASELINE_BUDGET_MS = 12_200;
export const TEST_BUDGET_MS = 120_000;
// Entra's hosted sign-in page keeps polling the authorize endpoint while the
// MFA step is open (a captured local run showed 309 repeat requests, ~65 s of
// server time). The whole IDIR path must stay outside the test-body budget.
export const IDIR_TEST_BUDGET_MS = 120_000;
export const BCEID_TEST_BUDGET_MS = BASELINE_BUDGET_MS * 2;

let timer: ReturnType<typeof setTimeout> | undefined;
let paused = false;
let restartedAfterLogin = false;

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

Cypress.on("test:after:run", () => {
  clearTimer();
  paused = false;
  restartedAfterLogin = false;
});

/** Suspends the budget while a login hook runs its own timed commands. */
export const pauseTestBudget = (): void => {
  paused = true;
  clearTimer();
};

/** Starts a fresh budget, used after login so it bounds only the test body. */
export const restartTestBudget = (ms: number = TEST_BUDGET_MS): void => {
  paused = false;
  restartedAfterLogin = true;
  armTimer(ms);
};

/**
 * Installs the per-test budget in a support-file `beforeEach`.
 *
 * Gherkin `Before` hooks and support `beforeEach` hooks can run in either
 * order, so a pause issued before this hook runs is honoured instead of being
 * overwritten by a fresh timer.
 */
export const installTestTimeouts = (): void => {
  beforeEach(() => {
    if (paused || restartedAfterLogin) {
      paused = false;
      return;
    }
    armTimer(TEST_BUDGET_MS);
  });
};
