import { Then } from "@badeball/cypress-cucumber-preprocessor";

// The app is a Vite SPA: content (driven by @tanstack/react-query) renders only AFTER the
// backend responds, so `cy.contains` must tolerate the async render race. The timeout is a CEILING
// (contains resolves the instant the text appears — usually <2s locally, a few s under CI load),
// NOT a blind fixed wait, so it stays fast in the common case while killing the flakiness.
const CONTENT_TIMEOUT = 30 * 1000;

Then('I can read {string}', (title: string) => {
  cy.contains(title, { timeout: CONTENT_TIMEOUT }).should('be.visible');
});

Then('I cannot see {string}', (button: string) => {
  cy.contains(button).should('not.exist');
});

Then('I wait for the text {string} to appear', (text: string) => {
  cy.contains(text, { timeout: CONTENT_TIMEOUT }).should('be.visible');
});

Then('I wait for the text {string} to appear after {string}', (text: string,waitFor: string) => {
  cy.wait(`@${waitFor}`,{ timeout: 10 * 1000 });
  cy.contains(text, { timeout: CONTENT_TIMEOUT }).should('be.visible');
});
