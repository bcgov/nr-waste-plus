/**
 * Pure accessibility helpers shared by the axe runner, the BDD steps and their
 * unit tests. No imports and no browser globals: the DOM-walking callers wrap
 * these in page.evaluate where Playwright has no equivalent matcher.
 */

/** D-009: WCAG 2.0 A + AA, identical to frontend/src/config/tests/a11y.helper.ts. */
export const AXE_TAGS = ["wcag2a", "wcag2aa"] as const;

export const SKIP_LINK_SELECTOR = 'a[href="#main-content"]';
export const MAIN_TARGET_SELECTOR = "#main-content";

export const LIVE_REGION_SELECTORS = [
  "[aria-live]",
  "[role='status']",
  "[role='alert']",
  "[role='log']",
  "[role='marquee']",
  "[role='timer']",
].join(", ");

export const ERROR_ANNOUNCEMENT_SELECTORS = [
  "[role='alert']",
  "[aria-live='assertive']",
  "[aria-live='polite']",
  "[aria-invalid='true']",
  "[aria-errormessage]",
].join(", ");

export const FOCUSABLE_SELECTOR = [
  "input",
  "textarea",
  "select",
  "button",
  "a[href]",
  "[tabindex]:not([tabindex='-1'])",
  "[contenteditable='true']",
  "[role='button']",
  "[role='link']",
  "[role='textbox']",
  "[role='combobox']",
].join(", ");

const NAMED_REGIONS: Readonly<Record<string, string>> = {
  main: ".layout-grid",
  header: "header",
  footer: "footer",
  navigation: "nav",
  nav: "nav",
  form: "form",
};

export interface RecordedAxeViolation {
  id: string;
  impact: string;
  nodes: number;
  help: string;
  helpUrl: string;
}

interface AxeViolationInput {
  id: string;
  impact?: string | null;
  nodes: readonly unknown[];
  help: string;
  helpUrl: string;
}

export function normalizeSpace(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}

/** Fixed Cypress precedence: named region first, then the literal selectors. */
export function regionSelectorCandidates(region: string): string[] {
  const trimmed = region.trim();
  const named = NAMED_REGIONS[trimmed.toLowerCase()];
  const candidates = named ? [named] : [];
  candidates.push(
    trimmed,
    `[aria-label='${trimmed}']`,
    `[data-testid='${trimmed}']`,
    `[role='region'][aria-label='${trimmed}']`,
  );
  return candidates;
}

/** Returns null for a valid hierarchy, otherwise the Cypress-style message. */
export function headingHierarchyError(tags: readonly string[], region: string): string | null {
  if (tags.length === 0) return `No headings found in region "${region}".`;

  let previousLevel = 0;
  for (const tag of tags) {
    const currentLevel = Number.parseInt(tag.slice(1), 10);
    if (!Number.isFinite(currentLevel)) continue;
    if (previousLevel > 0 && currentLevel - previousLevel > 1) {
      return `Invalid heading order in region "${region}": ${tag.toLowerCase()} appears after h${previousLevel}.`;
    }
    previousLevel = currentLevel;
  }
  return null;
}

export function toRecordedViolations(
  violations: readonly AxeViolationInput[],
): RecordedAxeViolation[] {
  return violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact || "unknown",
    nodes: violation.nodes.length,
    help: violation.help,
    helpUrl: violation.helpUrl,
  }));
}

export function violationDetails(
  violations: readonly Pick<RecordedAxeViolation, "id" | "impact" | "nodes">[],
): string {
  return violations
    .map((violation) => `${violation.id} (${violation.impact}, nodes: ${violation.nodes})`)
    .join("; ");
}
