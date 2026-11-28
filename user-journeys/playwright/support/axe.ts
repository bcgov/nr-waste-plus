import { expect, type Page } from "@playwright/test";
import { getViolations, injectAxe } from "axe-playwright";

import type { A11yEvent } from "../reporters/quality/schema.ts" with { "resolution-mode": "import" };
import { AXE_TAGS, toRecordedViolations } from "./a11y-pure.ts";

export type AxeRunData = Pick<
  A11yEvent,
  "url" | "scope" | "violationCount" | "violations"
>;

/**
 * Runs one axe audit and maps it to the quality-event payload. The scope is
 * fixed to wcag2a + wcag2aa (D-009); it is never widened or narrowed to make a
 * scenario pass.
 */
export async function runAxe(page: Page, selector?: string): Promise<AxeRunData> {
  // Cypress waited for the loading overlay before injecting axe.
  await expect(page.getByTestId("loading")).toHaveCount(0, { timeout: 10_000 });
  await injectAxe(page);

  // getViolations' third argument is axe-core's RunOptions (the `axeOptions`
  // value that checkA11y wraps). Passing the tags directly keeps the audit on
  // exactly the two WCAG 2.0 levels.
  const violations = await getViolations(page, selector, {
    runOnly: [...AXE_TAGS],
  });
  const recorded = toRecordedViolations(violations);

  return {
    url: page.url(),
    scope: selector ?? "page",
    violationCount: recorded.length,
    violations: recorded,
  };
}
