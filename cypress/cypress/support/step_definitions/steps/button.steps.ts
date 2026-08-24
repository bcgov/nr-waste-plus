import { When, Step } from "@badeball/cypress-cucumber-preprocessor";
import { findButton } from "../../helpers";

When("I click on the {string} button", (name: string) => {
  buttonClick(name);
});

When("I search", function () {
  // Register the route before clicking so the alias is ready for the request.
  cy.intercept("GET", "**/api/search/reporting-units*").as(
    "searchReportingUnits",
  );

  Step(this, 'I click on the "Search" button');
  // A request should be observed immediately after the click. Keep this short so
  // an alias or application failure is reported instead of consuming a CI minute.
  cy.wait("@searchReportingUnits", { timeout: 15 * 1000 });
});

/**
 * Attempts to click a button by trying multiple selectors in priority order.
 *
 * Cypress commands are NOT Promises — they don't have .catch().
 * Instead, we use $body.find() (synchronous jQuery) to check which selector
 * matches, then use cy.get() on the matched selector for proper Cypress
 * retryability and logging. Includes a retry loop for cases where the
 * element hasn't rendered yet.
 *
 * Selector priority:
 *   1. button[aria-label="<name>"]
 *   2. button:contains("<name>")
 *   3. input[type="submit"][value="<name>"]
 *   4. [data-testid="<name>"]
 *   5. .cds--tooltip-content — icon-only Carbon button (traces back via aria-labelledby)
 *   6. findByRole("button", { name }) — @testing-library fallback
 */
const buttonClick = (
  name: string,
  waitForIntercept: string = "",
  waitForTime: number = 1,
  retries: number = 3,
  retryDelay: number = 100,
  selector: string = "body",
) => {
  const timeout = waitForTime * 1000;

  const button = findButton(name, retries, retryDelay, selector);
  button.click({ force: true });

  if (waitForIntercept) {
    cy.wait(`@${waitForIntercept}`, { timeout });
  } else if (waitForTime) {
    cy.wait(waitForTime);
  }
};
