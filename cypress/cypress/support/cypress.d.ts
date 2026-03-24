declare namespace Cypress {
  interface Chainable<Subject> {
    logout(): Chainable<void>;    
    checkAutoCompleteErrorMessage(field: string, message: string): Chainable<void>;
    checkAccordionItemState(additionalSelector: string, open: boolean): Chainable<void>;
    waitForPageLoad(element: string): Chainable<void>;
    logAndScreenshot(message: string): Chainable<void>;
    getTokenValue(token: string, property: string): Chainable<string>;
    /**
     * Validate that an element uses a Carbon typography token.
     */
    shouldUseTokenStyle(tokenName: string): Chainable<Element>;

    /**
     * Validate that an element has a specific CSS property/value pair.
     * Example: cy.get('.card').shouldHaveStyle('margin', '16px')
     */
    shouldHaveStyle(property: string, expected: string): Chainable<Element>;

    /**
     * Validate that an element has all styles defined by a Carbon token.
     * Example: cy.get('h1').shouldHaveAllStylesFromToken('productive-heading-01')
     */
    shouldHaveAllStylesFromToken(tokenName: string): Chainable<Element>;
  }
}

declare module "cypress-audit" {
  export function prepareAudit(launchOptions: unknown): void;
  export function lighthouse(
    onReport?: (lighthouseReport: unknown) => unknown
  ): (options?: unknown) => unknown;
}