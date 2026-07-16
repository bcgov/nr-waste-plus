import { Given } from "@badeball/cypress-cucumber-preprocessor";

Given('I visit {string}', (url: string) => {
  // The app is a Vite SPA: page content renders only after @tanstack/react-query fetches
  // resolve. We deliberately do NOT guess/intercept specific API paths here (they drift and
  // cause spurious waits). Instead the content assertions in text.steps (`I can read`) poll for
  // the rendered text with a 30s ceiling — they resolve the instant the data appears, so the
  // wait is content-driven and fast, not a blind fixed delay.
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
});
