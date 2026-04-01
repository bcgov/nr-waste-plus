declare namespace Cypress {
  interface Chainable<Subject> {
    
    /**
     * Waits for a specific element to be visible on the page.
     * @param element - The selector of the element to wait for (e.g., '#main-content', '.header', 'button')
     * @param timeout - Optional timeout in milliseconds (default: 10000ms)
     */
    waitForPageLoad(element: string, timeout?: number): Chainable<void>;

    /**
     * Logs a message to the Cypress command log and takes a screenshot.
     * @param message - The message to log and display in the screenshot.
     */
    logAndScreenshot(message: string): Chainable<void>;
    
    /**
     * Runs a Lighthouse audit on the current page.
     * @param url - The URL to audit (defaults to the current page)
     * @param options - Optional Lighthouse options (e.g., { thresholds: { performance: 90 } })
     */
    runLighthouseAudit(url: string, options?: unknown): Chainable<unknown>;

    /**
     * Validate that an element has a specific CSS property matching a Carbon token.
     * @param tokenName - The token name (e.g., '$button-primary')
     * @param cssProperty - The CSS property to validate (e.g., 'font-size', 'padding')
     */
    validateStyle(tokenName: string, cssProperty: string): Chainable<Subject>;

    /**
     * Validate that an element uses all properties from a Carbon token.
     * @param tokenName - The token name (e.g., '$button-primary' or 'button-primary')
     * @param property - Optional specific property to check (defaults to all TOKEN_STYLE_PROPERTIES)
     */
    validateTokenStyle(tokenName: string, property?: string): Chainable<Subject>;

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
  }
}

declare module 'cypress-audit' {
  export function prepareAudit(launchOptions: unknown): void;
  export function lighthouse(
    onReport?: (lighthouseReport: unknown) => unknown
  ): (options?: unknown) => unknown;
}
