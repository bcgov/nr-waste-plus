import { Then } from "@badeball/cypress-cucumber-preprocessor";

// Issue #1383: an anonymous visit to a protected screen must end in a denial the
// user can actually see. The product accepts two 401 presentations (decision
// recorded on the issue): redirect to the landing sign-in buttons, or an
// unauthorized error page. The oracle matches either and nothing else, so a
// protected screen that simply renders its content never satisfies it.
const DENIAL_TIMEOUT = 30 * 1000;

Then("I am presented with a sign-in challenge or an unauthorized error", () => {
  cy.contains(/Unauthorized|Log in with IDIR|Business BCeID/, {
    timeout: DENIAL_TIMEOUT,
  }).should("be.visible");
});

/**
 * Asserts the authenticated user is the test account configured in Cypress env,
 * not a personal session left over from a previous browser profile. The email
 * is read from env at run time so no account identifier lives in the feature.
 */
Then("the profile email should match the configured {string}", (envKey: string) => {
  cy.env([envKey]).then((env) => {
    const expected = env[envKey] as string | undefined;
    if (!expected) {
      throw new Error(`Missing Cypress env value for ${envKey}.`);
    }
    // The profile panel renders `Email: <value>`; assert against the panel
    // rather than global page text so a stale header cannot satisfy it.
    cy.get('[data-testid="header-panel"]', { timeout: 30_000 }).should(
      "contain.text",
      `Email: ${expected}`,
    );
  });
});
