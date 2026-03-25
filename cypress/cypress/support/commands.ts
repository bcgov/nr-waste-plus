/* eslint-disable no-undef */
/// <reference types="cypress" />

import { getCssVarValue, getTaxonomy, getSeverity } from './tokens';

Cypress.Commands.add('waitForPageLoad', (element: string, timeout?: number) => {
  cy.get(element, { timeout: timeout || 10000 }).should('be.visible');
});


Cypress.Commands.add('logAndScreenshot', (message: string) => {
  cy.log(message).then(() => {
    console.log(message);
    cy.screenshot(`log-${Date.now()}`);  // Takes a screenshot with a timestamp
  });
});

Cypress.Commands.add(
  'shouldUseTokenStyle',
  { prevSubject: true },
  (subject, tokenName: string) => {

    return cy.wrap(subject).then($el => {
      const el = $el[0] as Element;
      const styles = getComputedStyle(el);

      const checks = [
        { property: "font-size", expected: getCssVarValue(el, `${tokenName}-font-size`), actual: styles.fontSize, taxonomy: "typography" },
        { property: "font-weight", expected: getCssVarValue(el, `${tokenName}-font-weight`), actual: styles.fontWeight, taxonomy: "typography" },
        { property: "line-height", expected: getCssVarValue(el, `${tokenName}-line-height`), actual: styles.lineHeight, taxonomy: "typography" }
      ];

      // Chain through each check sequentially
      return checks
        .reduce<Cypress.Chainable<any>>((chain, { property, expected, actual, taxonomy }) => {
        return chain.then(() => {

          const isMissing = !expected;        
          const isMismatch = actual !== expected;

          const event = isMissing || isMismatch ? "violation" : "check";
          const type = isMissing
            ? "token-missing"
            : isMismatch
              ? "token-style-mismatch"
              : "style-check";

          const severity = getSeverity(taxonomy, event);

          const taskRecord = {
            event,
            type,
            taxonomy,
            token: tokenName,
            property,
            expected: expected ?? null,
            actual,
            severity,
            element: el.tagName.toLowerCase(),
            selector: subject.selector,
            scenario: Cypress.currentTest.title,
            feature: Cypress.spec.relative,
            timestamp: Date.now()
          };

          return cy.task("uiux:record", taskRecord).then(() => {
            // Only assert when expected exists
            if (!isMissing) {
              expect(actual).to.equal(expected);
            }
          });
        });
      }, cy.wrap(null)).then(() => subject);
    });
  }
);


Cypress.Commands.add(
  'shouldHaveStyle',
  { prevSubject: true },
  (subject, property: string, expected: string) => {
      
      return cy.wrap(subject).then($el => {
        const el = $el[0] as Element;
        const styles = getComputedStyle(el);
        const actual = styles.getPropertyValue(property).trim();
        const taxonomy = getTaxonomy(property);
        const isViolation = actual !== expected;

        let taskRecord = {
          event: isViolation ? "violation" : "check",
          type: isViolation ? "style-mismatch" : "style-check",
          taxonomy,
          property,
          expected,
          actual,
          severity: getSeverity(taxonomy, isViolation ? "violation" : "check"),
          element: el.tagName.toLowerCase(),
          selector: subject.selector,
          scenario: Cypress.currentTest.title,
          feature: Cypress.spec.relative,
          timestamp: Date.now()
        };

        return cy.task("uiux:record", taskRecord).then(() => {
          expect(actual).to.equal(expected);
          return subject;
        });
    });
  }
);

//
// 3. shouldHaveAllStylesFromToken
//
Cypress.Commands.add(
  'shouldHaveAllStylesFromToken',
  { prevSubject: true },
  (subject, tokenName: string) => {
    return cy.wrap(subject).then($el => {
      const el = $el[0] as Element;
      const styles = getComputedStyle(el);

      const properties = [
        'font-size',
        'font-weight',
        'line-height',
        'color',
        'background-color',
        'border-color',
        'padding',
        'margin'
      ];

      return properties.reduce<Cypress.Chainable<any>>((chain, prop) => {
        return chain.then(() => {
        const cssVarName = `${tokenName}-${prop}`;
        const expected = getCssVarValue(el, cssVarName);
        const taxonomy = getTaxonomy(prop);
        const actual = styles.getPropertyValue(prop).trim();

        const isMissing = !expected;
        const isMismatch = actual !== expected;

        const event = isMissing || isMismatch ? "violation" : "check";
        const type = isMissing
            ? "token-missing"
            : isMismatch
              ? "token-style-mismatch"
              : "style-check";
        const severity = getSeverity(taxonomy, event);

        const taskRecord = {
            event,
            type,
            taxonomy,
            token: tokenName,
            property: prop,
            expected: expected ?? null,
            actual,
            severity,
            element: el.tagName.toLowerCase(),
            selector: subject.selector,
            scenario: Cypress.currentTest.title,
            feature: Cypress.spec.relative,
            timestamp: Date.now()
          };

        return cy.task("uiux:record", taskRecord).then(() => {
            // Only assert when expected exists
            if (!isMissing) {
              expect(actual).to.equal(expected);
            }
          });
        });
      }, cy.wrap(null)).then(() => subject);
    });
  }
);
