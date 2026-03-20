declare namespace Cypress {
  interface Chainable<Subject> {
    logout(): Chainable<void>;    
    checkAutoCompleteErrorMessage(field: string, message: string): Chainable<void>;
    checkAccordionItemState(additionalSelector: string, open: boolean): Chainable<void>;
    waitForPageLoad(element: string): Chainable<void>;
    logAndScreenshot(message: string): Chainable<void>;
    lighthouse(
      thresholds?: Record<string, number>,
      options?: Record<string, unknown>,
      config?: Record<string, unknown>
    ): Chainable<Subject>;
  }
}

declare module "cypress-audit" {
  export function prepareAudit(launchOptions: unknown): void;
  export function lighthouse(
    onReport?: (lighthouseReport: unknown) => unknown
  ): (options?: unknown) => unknown;
}