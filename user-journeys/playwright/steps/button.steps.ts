import { expect } from "@playwright/test";

import { Given, Then, When } from "../fixtures";
import { clickButton } from "../support/locators.ts";

// Cypress' findButton accepts both buttons and links; the ordered locator probe
// in support/locators.ts keeps that contract without force clicks or sleeps.
When("I click on the {string} button", async ({ page }, name: string) => {
  await clickButton(page, name);
});

When("I click on the {string} link", async ({ page }, name: string) => {
  await clickButton(page, name);
});

Then(
  "the profile settings button should show {string}",
  async ({ page }, name: string) => {
    const action = page.getByTestId("profile-action");
    await expect(action).toBeVisible({ timeout: 30_000 });
    await expect(action).toContainText(name);
  },
);

When("I select the client {string}", async ({ page }, clientNumber: string) => {
  const client = page
    .getByTestId("header-panel")
    .getByTestId(`district-select-${clientNumber}`)
    .getByRole("button");
  await expect(client).toBeVisible({ timeout: 30_000 });
  await client.click();
  await expect(client).toHaveClass(/selected-district/);
});

When("I select the district {string}", async ({ page }, districtName: string) => {
  // The district name lives on the <li aria-label>, while the button's own
  // accessible name also carries "ID <code>", so scope by the Cypress selector.
  const district = page
    .getByTestId("header-panel")
    .locator(`li[aria-label=${JSON.stringify(districtName)}] button`);
  await expect(district).toBeVisible({ timeout: 30_000 });
  await district.click();
});

When("I select no client", async ({ page }) => {
  const deselect = page
    .getByTestId("header-panel")
    .getByTestId("district-select-none")
    .getByRole("button");
  await expect(deselect).toBeVisible();
  await deselect.click();
});

Then("no client should be selected", async ({ page }) => {
  const deselect = page
    .getByTestId("header-panel")
    .getByTestId("district-select-none")
    .getByRole("button");
  await expect(deselect).toHaveClass(/selected-district/, { timeout: 30_000 });
});

When("I close the profile panel", async ({ page }) => {
  const action = page.getByTestId("profile-action");
  await expect(action).toBeVisible();
  await action.click();
});

When("I click on the theme toggle", async ({ page }) => {
  // The toggle's aria-label names the mode it switches TO, so there is no
  // stable accessible name for "theme toggle" to click by.
  // TODO(a11y-name): Carbon HeaderGlobalAction has no "theme toggle" name.
  const toggle = page.getByTestId("theme-toggle");
  await expect(toggle).toBeVisible();
  await toggle.click();
});

Then(
  "the theme toggle should offer {string} mode",
  async ({ page }, mode: string) => {
    // TODO(a11y-name): the toggle is only addressable via its data-testid.
    const toggle = page.getByTestId("theme-toggle");
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-label", `Switch to ${mode} mode`);
  },
);

Given("the app is in light mode", async ({ page }) => {
  // The aria-label names the target mode, so the current mode is the opposite.
  // Persisted preferences can start the account in dark mode; normalize first.
  // TODO(a11y-name): the toggle is only addressable via its data-testid.
  const toggle = page.getByTestId("theme-toggle");
  await expect(toggle).toBeVisible({ timeout: 30_000 });
  if ((await toggle.getAttribute("aria-label")) === "Switch to light mode") {
    await toggle.click();
  }
  await expect(toggle).toHaveAttribute("aria-label", "Switch to dark mode");
});

When("I search", async ({ page }) => {
  // Register the response wait before the click so a fast response cannot be
  // missed. The click helper is called directly, not through a BDD step.
  const searchResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/search/reporting-units") &&
      response.request().method() === "GET",
    { timeout: 15_000 },
  );
  await clickButton(page, "Search");
  await searchResponse;
});
