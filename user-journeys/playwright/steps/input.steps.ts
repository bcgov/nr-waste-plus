import { expect, type Page } from "@playwright/test";

import { Then, When } from "../fixtures";
import {
  autocompleteOption,
  dropdown,
  inputByLabel,
} from "../support/locators.ts";

Then(
  "I type {string} into the {string} input",
  async ({ page }, text: string, input: string) => {
    const field = inputByLabel(page, input);
    await expect(field).toBeVisible();
    // fill() skips key events that drive the debounce / Carbon combobox.
    await field.pressSequentially(text, { delay: 10 });
    await field.blur();
  },
);

Then("I clear the {string} input", async ({ page }, input: string) => {
  const field = inputByLabel(page, input);
  await expect(field).toBeVisible();
  await field.fill("");
  await field.blur();
});

Then(
  "the {string} input should contain {string}",
  async ({ page }, input: string, text: string) => {
    await expect(inputByLabel(page, input)).toHaveValue(text);
  },
);

Then(
  "I type {string} into the {string} autocomplete",
  async ({ page }, text: string, input: string) => {
    const field = inputByLabel(page, input);
    await expect(field).toBeVisible();
    await expect(field).toBeEnabled();
    // The alias was a URL-pattern intercept in Cypress; wait for the same
    // endpoint before selecting the option it returns.
    const optionsResponse = page.waitForResponse(
      (response) => response.url().includes("/api/search/reporting-units-users"),
      { timeout: 15_000 },
    );
    await field.pressSequentially(text, { delay: 10 });
    await optionsResponse;
    const option = autocompleteOption(page, text);
    await expect(option).toBeVisible();
    await option.click();
  },
);

Then(
  "I select {string} from the {string} dropdown",
  async ({ page }, option: string, label: string) => {
    const combo = dropdown(page, label);
    await expect(combo).toBeVisible();
    await expect(combo).toBeEnabled();
    await combo.click();
    await combo.pressSequentially(option, { delay: 10 });
    const choice = autocompleteOption(page, option);
    await expect(choice).toBeVisible();
    await choice.click();
    // Close the Carbon menu so its option list cannot cover the Search button.
    await page.keyboard.press("Escape");
  },
);

async function setSwitch(
  page: Page,
  label: string,
  expected: "true" | "false",
): Promise<void> {
  const control = page.getByRole("switch", { name: label });
  await expect(control).toHaveAttribute("aria-checked", expected);
  // Carbon's decorative label sibling covers the switch centre, so a normal
  // click is intercepted; Cypress force-clicked for the same reason.
  await control.click({ force: true });
  await expect(control).toHaveAttribute(
    "aria-checked",
    expected === "true" ? "false" : "true",
  );
}

When("I toggle the {string} switch on", async ({ page }, label: string) => {
  await setSwitch(page, label, "false");
});

When("I toggle the {string} switch off", async ({ page }, label: string) => {
  await setSwitch(page, label, "true");
});

Then("no switch should be visible", async ({ page }) => {
  await expect(page.getByRole("switch")).toHaveCount(0);
});
