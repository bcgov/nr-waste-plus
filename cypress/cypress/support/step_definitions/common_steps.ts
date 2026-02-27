import { BeforeStep, Given } from "@badeball/cypress-cucumber-preprocessor";

let idir = true;

BeforeStep({ tags: "@loginAsBCeID" }, function () {
  idir = false;
});
BeforeStep({ tags: "@loginAsIDIR" }, function () {
  idir = true;
});

Given('I visit {string}', (url: string) => {
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
