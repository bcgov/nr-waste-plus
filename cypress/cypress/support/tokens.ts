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


const UX_TAXONOMY_MAP: Record<string, string> = {
  "font-size": "typography",
  "font-weight": "typography",
  "line-height": "typography",

  "color": "color",
  "background-color": "color",

  "padding": "spacing",
  "margin": "spacing",

  "border-color": "border",
  "border-radius": "border"
};

export const getTaxonomy = (property: string) =>
  UX_TAXONOMY_MAP[property] || "style-mismatch";

const UX_SEVERITY_MAP: Record<string, string> = {
  "color": "critical",
  "typography": "major",
  "spacing": "minor",
  "border": "minor",
  "token-missing": "major",
  "style-mismatch": "major"
};

export const getSeverity = (taxonomy: string, event: "check" | "violation") => {
  if (event === "check") return "info";
  return UX_SEVERITY_MAP[taxonomy] || "major";
};
