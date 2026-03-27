// UX/UI step helpers for Cypress

export function getSelectorOrContains(selector: string, text?: string, component?: string) {
  if (selector) {
    return cy.get(selector);
  }
  if (component && text) {
    return cy.contains(component.trim(), text);
  }
  if (text) {
    return cy.contains(text);
  }
  throw new Error('No valid selector or text provided');
}
