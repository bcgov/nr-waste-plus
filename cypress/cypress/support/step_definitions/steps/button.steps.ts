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

When("I select the district {string}", (districtName: string) => {
  // Scope to the header panel and match the option by its aria-label. An
  // unscoped `button:contains(...)` would also match the profile action button,
  // which displays the already-selected district name, toggling the panel shut.
  cy.get(
    `[data-testid="header-panel"] li[aria-label="${districtName}"] button`,
    { timeout: 30_000 },
  )
    .should("be.visible")
    .click();
});

When("I select no client", () => {
  cy.get(
    '[data-testid="header-panel"] [data-testid="district-select-none"] button',
  )
    .should("be.visible")
    .click();
});

Then("no client should be selected", () => {
  cy.get(
    '[data-testid="header-panel"] [data-testid="district-select-none"] button',
    { timeout: 30_000 },
  ).should("have.class", "selected-district");
});

When("I close the profile panel", () => {
  cy.get('[data-testid="profile-action"]').should("be.visible").click();
});

When("I click on the theme toggle", () => {
  cy.get('[data-testid="theme-toggle"]').should("be.visible").click();
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
 * Cypress commands are NOT Promises — they don't have .catch(). findButton
 * resolves the matching selector synchronously against the DOM inside a single
 * bounded `cy.get().should()`, so a missing element fails once with a clear
 * message instead of burning a hand-rolled retry loop.
 *
 * Selector priority is documented on findButton.
 */
const buttonClick = (
  name: string,
  waitForIntercept: string = "",
  waitForTime: number = 1,
  // The app layout is Suspense-wrapped: after cy.visit the header (and any
  // icon-only header button) mounts only once the lazy route chunk resolves,
  // which routinely takes longer on a CI runner than on a workstation. 20 s is a
  // hard ceiling — one bounded wait, not 50 stacked ones.
  timeout: number = 20_000,
  selector: string = "body",
) => {
  const interceptTimeout = waitForTime * 1000;

  const button = findButton(name, timeout, selector);
  button.click({ force: true });

  if (waitForIntercept) {
    cy.wait(`@${waitForIntercept}`, { timeout: interceptTimeout });
  } else if (waitForTime) {
    cy.wait(waitForTime);
  }
};
