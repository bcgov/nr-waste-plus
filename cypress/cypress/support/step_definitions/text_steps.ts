import { BeforeStep, Then } from "@badeball/cypress-cucumber-preprocessor";

let idir = true;

BeforeStep({ tags: "@loginAsBCeID" }, function () {
  idir = false;
});
BeforeStep({ tags: "@loginAsIDIR" }, function () {
  idir = true;
});

Then('I can read {string}', (title: string) => {
  cy.contains(title).should('be.visible');
});

Then('I cannot see {string}', (button: string) => {
  cy.contains(button).should('not.exist');
});

Then('I wait for the text {string} to appear', (text: string) => {
  cy.contains(text).should('be.visible');
});

Then('I wait for the text {string} to appear after {string}', (text: string,waitFor: string) => {
  cy.wait(`@${waitFor}`,{ timeout: 10 * 1000 });
  cy.contains(text).should('be.visible');
});
