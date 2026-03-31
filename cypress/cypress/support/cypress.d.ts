declare namespace Cypress {
  interface Chainable<Subject> {
    logout(): Chainable<void>;
    checkAutoCompleteErrorMessage(field: string, message: string): Chainable<void>;
    checkAccordionItemState(additionalSelector: string, open: boolean): Chainable<void>;
    waitForPageLoad(element: string): Chainable<void>;
    logAndScreenshot(message: string): Chainable<void>;
    runLighthouseAudit(url: string, options?: unknown): Chainable<unknown>;

    /**
     * Validate that an element uses all properties from a Carbon token.
     * @param tokenName - The token name (e.g., '$button-primary' or 'button-primary')
     * @param property - Optional specific property to check (defaults to all TOKEN_STYLE_PROPERTIES)
     */
    validateTokenStyle(tokenName: string, property?: string): Chainable<Subject>;

    /**
     * Validate that an element has a specific CSS property matching a Carbon token.
     * @param tokenName - The token name (e.g., '$button-primary')
     * @param cssProperty - The CSS property to validate (e.g., 'font-size', 'padding')
     */
    validateStyle(tokenName: string, cssProperty: string): Chainable<Subject>;

    /**
     * Validate that an element's padding matches a Carbon spacing token.
     * @param tokenName - The spacing token (e.g., '$spacing-05')
     * @param side - Optional specific side ('top', 'right', 'bottom', 'left', or 'all')
     */
    validateSpacing(tokenName: string, side?: 'top' | 'right' | 'bottom' | 'left' | 'all'): Chainable<Subject>;

    /**
     * Validate that an element's margin matches a Carbon spacing token.
     * @param tokenName - The spacing token (e.g., '$spacing-05')
     * @param side - Optional specific side ('top', 'right', 'bottom', 'left', or 'all')
     */
    validateMargin(tokenName: string, side?: 'top' | 'right' | 'bottom' | 'left' | 'all'): Chainable<Subject>;

    /**
     * Validate that an element's color matches a Carbon color token.
     * @param tokenName - The color token (e.g., '$text-primary')
     * @param property - The color property to validate ('color', 'background-color', 'border-color')
     */
    validateColor(tokenName: string, property: 'color' | 'background-color' | 'border-color'): Chainable<Subject>;

    /**
     * Validate that an element's text meets minimum contrast ratio.
     * @param expectedLevel - The WCAG level to validate ('AAA', 'AA', 'A')
     */
    validateContrast(expectedLevel?: 'AAA' | 'AA' | 'A'): Chainable<Subject>;

    /**
     * Validate that an element's typography matches a Carbon typography token.
     * @param tokenName - The typography token (e.g., '$heading-01')
     */
    validateTypography(tokenName: string): Chainable<Subject>;

    /**
     * Legacy command - Validate that an element uses a Carbon typography token.
     * @deprecated Use validateTokenStyle instead
     */
    shouldUseTokenStyle(tokenName: string): Chainable<Subject>;

    /**
     * Legacy command - Validate that an element has a specific CSS property/value pair.
     * @deprecated Use validateStyle instead
     */
    shouldHaveStyle(property: string, expected: string): Chainable<Subject>;

    /**
     * Legacy command - Validate that an element has all styles defined by a Carbon token.
     * @deprecated Use validateTokenStyle instead
     */
    shouldHaveAllStylesFromToken(tokenName: string): Chainable<Subject>;
  }
}

declare module 'cypress-audit' {
  export function prepareAudit(launchOptions: unknown): void;
  export function lighthouse(
    onReport?: (lighthouseReport: unknown) => unknown
  ): (options?: unknown) => unknown;
}
