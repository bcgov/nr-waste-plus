import { expect } from "@playwright/test";

import { Then } from "../fixtures";
import { openAppIfBlank } from "../fixtures/app-ready.ts";
import { textPattern } from "../support/text.ts";

Then("I can read {string}", async ({ page }, text: string) => {
  // Cypress' login hook had already landed on /search for these scenarios.
  await openAppIfBlank(page);
  await expect(page.getByText(textPattern(text)).first()).toBeVisible({
    timeout: 30_000,
  });
});

Then("I cannot see {string}", async ({ page }, text: string) => {
  await openAppIfBlank(page);
  await expect(page.getByText(textPattern(text))).toHaveCount(0);
});

Then("I wait for the text {string} to appear", async ({ page }, text: string) => {
  await expect(page.getByText(textPattern(text)).first()).toBeVisible({
    timeout: 30_000,
  });
});

Then(
  "I wait for the text {string} to appear after {string}",
  async ({ page }, text: string, waitFor: string) => {
    // Playwright has no Cypress aliases; the named value is the response URL
    // fragment to wait for before asserting the content.
    await page.waitForResponse((response) => response.url().includes(waitFor), {
      timeout: 10_000,
    });
    await expect(page.getByText(textPattern(text)).first()).toBeVisible({
      timeout: 30_000,
    });
  },
);

Then("the {string} tab should be selected", async ({ page }, tabName: string) => {
  await expect(page.getByRole("tab", { name: tabName, exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});
