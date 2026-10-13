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
