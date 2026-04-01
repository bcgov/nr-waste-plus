// UX/UI step helpers for Cypress

export const shouldHaveStyle = (subject: JQuery<HTMLElement>, property: string, expected: string) => {
  return cy.window().then(appWindow => {
    const rootFontSize = Number.parseFloat(
      appWindow.getComputedStyle(appWindow.document.documentElement).fontSize
    ) || 16;

    return cy.wrap(subject).should($el => {
      const el = $el[0] as Element;
      const appStyles = appWindow.getComputedStyle(el);
      const actual = appStyles.getPropertyValue(property).trim();

      //TODO: check if property exist, and fail if not, to avoid false positives when the property is misspelled in the test

      //TODO: add the cy.task recording logic here as well, similar to the one in validateTokenStyle, to log style mismatches that are not related to tokens

      expect(
        actual,
        `Element's ${property} is '${actual}', expected '${expected}'`
      ).to.equal(expected);
    });
  });
};