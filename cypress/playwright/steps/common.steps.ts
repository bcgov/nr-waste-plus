import { Given } from "../fixtures";

Given("I visit {string}", async ({ page }, path: string) => {
  await page.goto(path);
});
