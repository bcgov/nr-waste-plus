import { expect } from "@playwright/test";

import { credentials, envValue, requireValue } from "../env.ts";
import { Then } from "../fixtures";

Then("I am presented with a sign-in challenge or an unauthorized error", async ({ page }) => {
  await expect(
    page.getByText(/Unauthorized|Log in with IDIR|Business BCeID/).first(),
  ).toBeVisible({ timeout: 30_000 });
});

/**
 * Asserts the configured test account, not a personal session left over from
 * another browser profile. The email is read from env at run time.
 */
Then("the profile email should match the configured {string}", async ({ page }, key: string) => {
  const configured =
    key === "idir_username"
      ? credentials().idir.username
      : key === "bceid_username"
        ? credentials().bceid.username
        : envValue(key);
  const expected = requireValue(configured, key);
  const panel = page.getByTestId("header-panel");
  await expect(panel).toContainText(`Email: ${expected}`, { timeout: 30_000 });
});
