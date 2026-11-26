import { expect } from "@playwright/test";
import { Then } from "../fixtures";

function textPattern(text: string): RegExp {
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped);
}

Then("I can read {string}", async ({ page }, text: string) => {
  await expect(page.getByText(textPattern(text)).first()).toBeVisible({
    timeout: 30_000,
  });
});

Then("I cannot see {string}", async ({ page }, text: string) => {
  await expect(page.getByText(textPattern(text))).toHaveCount(0);
});
