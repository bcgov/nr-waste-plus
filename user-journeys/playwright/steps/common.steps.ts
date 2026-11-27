import { Given } from "../fixtures";
import { appReady } from "../fixtures/app-ready.ts";

Given("I visit {string}", async ({ page }, path: string) => {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await appReady(page);
});
