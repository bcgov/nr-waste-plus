// UX/UI step helpers for Cypress

interface SelectorOptions {
  selector?: string;
  text?: string;
  component?: string;
}

export function getSelectorOrContains(options: SelectorOptions) {
  const { selector, text, component } = options;
  
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
