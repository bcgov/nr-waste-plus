import { Given } from "@badeball/cypress-cucumber-preprocessor";

Given('I visit {string}', (url: string) => {
  if (url.includes('/search')) {
    cy.intercept('GET', '**/api/codes/districts*').as('getDistricts');
    cy.intercept('GET', '**/api/codes/samplings*').as('getSamplings');
    cy.intercept('GET', '**/api/codes/assess-area-statuses*').as('getStatuses');
  }

  cy.visit(url).then(() => {
    cy.window().then((win) => {
      return new Cypress.Promise((resolve) => {
        if (win.document.readyState === 'complete') {
          resolve();
        } else {
          win.addEventListener('load', resolve);
        }
      });
    });
  });

  if (url.includes('/search')) {
    // Wait for the reference data to load so dropdowns are populated
    cy.wait(['@getDistricts', '@getSamplings', '@getStatuses'], { timeout: 15000 });
  }
});
