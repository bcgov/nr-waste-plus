import { expect, type Locator, type Page } from "@playwright/test";

import {
  FOCUSABLE_SELECTOR,
  LIVE_REGION_SELECTORS,
  regionSelectorCandidates,
} from "./a11y-pure.ts";
import { inputByLabel } from "./locators.ts";
import { textPattern } from "./text.ts";

const PROBE_TIMEOUT = 15_000;

/** Cypress probed `div#root` before walking the DOM; keep that mount barrier. */
async function appMounted(page: Page): Promise<void> {
  await expect(page.getByTestId("loading")).toHaveCount(0, { timeout: 10_000 });
  await expect(page.locator("div#root")).toBeAttached({ timeout: 10_000 });
}

async function firstPresent(candidates: readonly Locator[]): Promise<Locator | null> {
  for (const candidate of candidates) {
    if ((await candidate.count()) > 0) return candidate.first();
  }
  return null;
}

/** Picks the first existing candidate, with Cypress' ordered precedence. */
async function probeCandidates(
  page: Page,
  candidates: readonly Locator[],
  message: string,
): Promise<Locator> {
  await expect
    .poll(
      async () => (await firstPresent(candidates)) !== null,
      { timeout: PROBE_TIMEOUT, message },
    )
    .toBe(true);
  const found = await firstPresent(candidates);
  if (!found) throw new Error(message);
  return found;
}

/**
 * Mirrors Cypress `resolveRegionSelector`: the named region wins, then the
 * literal / aria-label / test-id / labelled-region candidates in that order.
 * There is no Playwright matcher that returns a selector string, so the last
 * step is a small querySelector walk inside the page.
 */
export async function resolveRegionSelector(page: Page, region: string): Promise<string> {
  const candidates = regionSelectorCandidates(region);
  await expect(page.getByTestId("loading")).toHaveCount(0, { timeout: 10_000 });
  await expect
    .poll(
      () =>
        page.evaluate((list) =>
          list.some((selector) => {
            try {
              return document.querySelector(selector) !== null;
            } catch {
              return false;
            }
          }), candidates),
      { timeout: PROBE_TIMEOUT, message: `Region "${region.trim()}" did not appear` },
    )
    .toBe(true);

  const resolved = await page.evaluate((list) => {
    for (const selector of list) {
      try {
        if (document.querySelector(selector)) return selector;
      } catch {
        // An invalid literal candidate is skipped, as in the Cypress helper.
      }
    }
    return null;
  }, candidates);
  if (!resolved) {
    throw new Error(`Unable to resolve region "${region.trim()}" for accessibility check.`);
  }
  return resolved;
}

/** Resets to the document body, the same starting point Cypress used. */
export function resetFocusToBody(page: Page): Promise<void> {
  return page.evaluate(() => {
    (document.body as HTMLElement).focus();
  });
}

/** Cypress `findFocusableElement`, expressed with web-first locator probes. */
export async function focusableByLabel(page: Page, label: string): Promise<Locator> {
  const trimmed = label.trim();
  await appMounted(page);
  return probeCandidates(
    page,
    [
      page.getByLabel(trimmed, { exact: true }),
      page.locator(`[aria-label=${JSON.stringify(trimmed)}]`),
      page.locator(FOCUSABLE_SELECTOR).filter({ hasText: textPattern(trimmed) }),
      page.locator(`input[placeholder=${JSON.stringify(trimmed)}]`),
    ],
    `No focusable element found for label/text "${trimmed}"`,
  );
}

/** Cypress `findInputElement`, including the pinned Carbon search field. */
export async function inputForStep(page: Page, identifier: string): Promise<Locator> {
  const trimmed = identifier.trim();
  if (/^[.#[]/.test(trimmed)) return page.locator(trimmed).first();
  if (trimmed === "Search") return inputByLabel(page, trimmed);

  await appMounted(page);
  const candidates: Locator[] = [
    page.locator(`[id=${JSON.stringify(trimmed)}]`),
    page.locator(`[name=${JSON.stringify(trimmed)}]`),
    page.getByTestId(trimmed),
    page.locator(`input[placeholder=${JSON.stringify(trimmed)}]`),
    page.locator(`textarea[placeholder=${JSON.stringify(trimmed)}]`),
    page.getByLabel(trimmed, { exact: true }),
  ];
  // No poll here: Carbon filter inputs are found by focusableByLabel's own
  // probe, and waiting twice would eat the scenario timeout.
  return (await firstPresent(candidates)) ?? focusableByLabel(page, trimmed);
}

/** Cypress `findLiveRegion`: role, aria-label, test-id, then text fallback. */
export async function liveRegionForStep(page: Page, region: string): Promise<Locator> {
  const trimmed = region.trim();
  if (/^[.#[]/.test(trimmed)) return page.locator(trimmed).first();

  return probeCandidates(
    page,
    [
      page.locator(`[role=${JSON.stringify(trimmed)}]`),
      page.locator(`[aria-label=${JSON.stringify(trimmed)}]`),
      page.getByTestId(trimmed),
      page.locator(LIVE_REGION_SELECTORS).filter({ hasText: textPattern(trimmed) }),
    ],
    `Unable to find live region "${trimmed}"`,
  );
}
