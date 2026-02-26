/* eslint-disable no-undef */
/// <reference types="cypress" />

Cypress.Commands.add('waitForPageLoad', (element: string) => {
  cy.get(element).should('be.visible').then(() => {
    cy.log('Page loaded');
  });
});

Cypress.Commands.add('logAndScreenshot', (message: string) => {
  cy.log(message).then(() => {
    console.log(message);
    cy.screenshot(`log-${Date.now()}`);  // Takes a screenshot with a timestamp
  });
});