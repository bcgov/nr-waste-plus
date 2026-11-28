/**
 * Builds the case-sensitive substring RegExp used by the text steps, so the
 * Cypress `cy.contains(text)` semantics survive the port (including literal
 * metacharacters such as the parentheses in the "No results" hint).
 */
export function textPattern(text: string): RegExp {
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped);
}

/**
 * Anchored, case-sensitive variant used for accessible names. Playwright's
 * string `name` option is a case-insensitive substring match, which would make
 * "Search" also match "Clear search input"; Cypress' selectors do not.
 */
export function exactTextPattern(text: string): RegExp {
  return new RegExp(`^${textPattern(text).source}$`);
}
