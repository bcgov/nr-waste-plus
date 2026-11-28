import { expect, type Page } from "@playwright/test";

import { connectionBudget } from "./connection-budget.ts";

/** SPA boot is awaited by this check, not by the navigation's load event. */
export async function appReady(page: Page): Promise<void> {
  await expect(page.locator("#root")).not.toBeEmpty({ timeout: 30_000 });
}

/**
 * Cypress' @loginAs* hook left the browser on /search before the test body.
 * A Playwright page starts on about:blank, so assertions that run before an
 * explicit `I visit` step land the authenticated app first.
 */
export async function openAppIfBlank(page: Page, path = "/search"): Promise<void> {
  if (page.url() !== "about:blank") return;
  await connectionBudget.beforePageLoad();
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await appReady(page);
}
