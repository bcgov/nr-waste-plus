import { expect, type Page } from "@playwright/test";

/** SPA boot is awaited by this check, not by the navigation's load event. */
export async function appReady(page: Page): Promise<void> {
  await expect(page.locator("#root")).not.toBeEmpty({ timeout: 30_000 });
}
