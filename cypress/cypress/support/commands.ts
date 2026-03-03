/* eslint-disable no-undef */
/// <reference types="cypress" />

Cypress.Commands.add('waitForPageLoad', (element: string, timeout?: number) => {
  cy.get(element, { timeout: timeout || 10000 }).should('be.visible');
});

Cypress.Commands.add('logAndScreenshot', (message: string) => {
  cy.log(message).then(() => {
    console.log(message);
    cy.screenshot(`log-${Date.now()}`);  // Takes a screenshot with a timestamp
  });
});