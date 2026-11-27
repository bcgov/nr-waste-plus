import { When } from "../fixtures";

// Cypress' findButton accepts both buttons and links; getByRole keeps the same
// contract with accessible names instead of CSS selectors.
When("I click on the {string} button", async ({ page }, name: string) => {
  await page
    .getByRole("button", { name })
    .or(page.getByRole("link", { name }))
    .first()
    .click();
});
