import { When, Then, Step } from "@badeball/cypress-cucumber-preprocessor";
import { findButton } from "../../helpers";

When("I click on the {string} button", (name: string) => {
  buttonClick(name);
});

When("I click on the {string} link", (name: string) => {
  buttonClick(name);
});

Then("the profile settings button should show {string}", (name: string) => {
  cy.get('[data-testid="profile-action"]', { timeout: 30_000 })
    .should("be.visible")
    .should("contain.text", name);
});

When("I select the client {string}", (clientNumber: string) => {
  const clientSelector = `[data-testid="header-panel"] [data-testid="district-select-${clientNumber}"]`;

  cy.get(clientSelector, { timeout: 30_000 })
    .should("be.visible")
    .find("button")
    .should("be.visible")
    .click();

  cy.get(clientSelector, { timeout: 30_000 })
    .find("button", { timeout: 30_000 })
    .should("have.class", "selected-district");
});

When("I select no client", () => {
  cy.get('[data-testid="header-panel"] [data-testid="district-select-none"] button')
    .should("be.visible")
    .click();
});

Then("no client should be selected", () => {
  cy.get('[data-testid="header-panel"] [data-testid="district-select-none"] button', { timeout: 30_000 })
    .should("have.class", "selected-district");
});

When("I close the profile panel", () => {
  cy.get('[data-testid="profile-action"]')
    .should("be.visible")
    .click();
});

When("I click on the theme toggle", () => {
  cy.get('[data-testid="theme-toggle"]')
    .should("be.visible")
    .click();
});

Then("the theme toggle should offer {string} mode", (mode: string) => {
  cy.get('[data-testid="theme-toggle"]')
    .should("be.visible")
    .and("have.attr", "aria-label", `Switch to ${mode} mode`);
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
