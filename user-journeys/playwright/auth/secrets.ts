import type { Locator } from "@playwright/test";

/**
 * Sets an input value without putting the secret in Playwright's step titles or
 * artifacts. `fill()` / `pressSequentially()` name the value in the step title;
 * `evaluate()` is titled just "Evaluate". The input event is what the hosted
 * login forms listen for, so this reads as typing to them.
 */
export async function fillSecret(locator: Locator, value: string): Promise<void> {
  await locator.waitFor({ timeout: 30_000 });
  await locator.evaluate((el, v) => {
    const input = el as HTMLInputElement;
    input.focus();
    input.value = v;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}
