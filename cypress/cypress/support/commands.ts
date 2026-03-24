/* eslint-disable no-undef */
/// <reference types="cypress" />

import { getCssVarValue } from './tokens';

Cypress.Commands.add('waitForPageLoad', (element: string, timeout?: number) => {
  cy.get(element, { timeout: timeout || 10000 }).should('be.visible');
});


Cypress.Commands.add('logAndScreenshot', (message: string) => {
  cy.log(message).then(() => {
    console.log(message);
    cy.screenshot(`log-${Date.now()}`);  // Takes a screenshot with a timestamp
  });
});


//
// 1. shouldUseTokenStyle
//
Cypress.Commands.add(
  'shouldUseTokenStyle',
  { prevSubject: true },
  (subject, tokenName: string) => {
    const el = subject[0] as Element;
    const styles = getComputedStyle(el);

    const expectedFontSize = getCssVarValue(el, `${tokenName}-font-size`);
    const expectedFontWeight = getCssVarValue(el, `${tokenName}-font-weight`);
    const expectedLineHeight = getCssVarValue(el, `${tokenName}-line-height`);

    if (expectedFontSize) {
      expect(styles.fontSize).to.equal(expectedFontSize);
    }

    if (expectedFontWeight) {
      expect(styles.fontWeight).to.equal(expectedFontWeight);
    }

    if (expectedLineHeight) {
      expect(styles.lineHeight).to.equal(expectedLineHeight);
    }

    return subject;
  }
);

//
// 2. shouldHaveStyle
//
Cypress.Commands.add(
  'shouldHaveStyle',
  { prevSubject: true },
  (subject, property: string, expected: string) => {
    const el = subject[0] as Element;
    const styles = getComputedStyle(el);

    const actual = styles.getPropertyValue(property).trim();
    expect(actual).to.equal(expected);

    return subject;
  }
);

//
// 3. shouldHaveAllStylesFromToken
//
Cypress.Commands.add(
  'shouldHaveAllStylesFromToken',
  { prevSubject: true },
  (subject, tokenName: string) => {
    const el = subject[0] as Element;
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

    properties.forEach((prop) => {
      const cssVarName = `${tokenName}-${prop}`;
      const expected = getCssVarValue(el, cssVarName);

      if (expected) {
        const actual = styles.getPropertyValue(prop).trim();
        expect(actual).to.equal(expected);
      }
    });

    return subject;
  }
);
