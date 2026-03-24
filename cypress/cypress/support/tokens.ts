/**
 * Carbon tokens follow the pattern:
 *   --cds-<token-name>
 *
 * Example:
 *   productive-heading-01 → --cds-productive-heading-01
 */
export function tokenToCssVar(tokenName: string): string {
  return `--cds-${tokenName}`;
}

/**
 * Read a CSS variable from a DOM element.
 */
export function getCssVarValue(
  el: Element,
  tokenName: string
): string | null {
  const cssVar = tokenToCssVar(tokenName);
  const value = getComputedStyle(el).getPropertyValue(cssVar);
  return value?.trim() || null;
}
