import { Given, Then } from "@badeball/cypress-cucumber-preprocessor";

Given("I visit {string}", (url: string) => {
  // Content assertions remain responsible for waiting on React Query rendering. Cypress
  // already waits for the document load event, so adding a second load listener here cannot
  // help when the document itself fails to load.
  cy.visit(url);
});

Then("the current URL should include {string}", (value: string) => {
  cy.url().should("include", value);
});

Given(
  "the reporting unit API for {string} returns no grade",
  (reportingUnitId: string) => {
    cy.intercept(
      "GET",
      `**/api/reporting-units/${reportingUnitId}`,
      (request) => {
        request.continue((response) => {
          if (typeof response.body !== "object" || response.body === null) {
            return;
          }

          const body = response.body as Record<string, unknown>;
          body.grade = { code: null, description: null, areas: [] };
          response.body = body;
        });
      },
    );
  },
);
