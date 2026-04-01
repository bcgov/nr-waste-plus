// UX/UI step helpers for Cypress

import { createTaskRecord, getTaxonomy, valuesMatch } from "./tokens.helpers";

export const shouldHaveStyle = (subject: JQuery<HTMLElement>, property: string, expected: string) => {
  return cy.window().then(appWindow => {
    const rootFontSize = Number.parseFloat(
      appWindow.getComputedStyle(appWindow.document.documentElement).fontSize
    ) || 16;

    return cy.wrap(subject).should($el => {
      const el = $el[0] as Element;
      const appStyles = appWindow.getComputedStyle(el);
      const actual = appStyles.getPropertyValue(property).trim();

      const isMissing = !actual;
      const isMismatch = !valuesMatch(expected, actual, rootFontSize);

      const event = isMissing || isMismatch ? 'violation' : 'check';
      const mismatchValue = isMismatch ? 'style-mismatch' : 'style-check';
      const type = isMissing ? 'token-missing' : mismatchValue;

      const taskRecord = createTaskRecord(
                event,
                type,
                getTaxonomy(property),
                actual,
                el.tagName.toLowerCase(),
                {
                  token: property, // This is not a token, but we can use the property name as a reference in the logs
                  property: property,
                  expected: expected,
                }
              );

      return cy.task('uiux:record', taskRecord).then(() => {
        expect(isMissing, `Element is missing ${property} class`).to.be.false;
          
          expect(
            actual,
            `Element's ${property} is '${actual}', expected '${expected}'`
          ).to.equal(expected);

          return subject;
        });
    });
  });
};