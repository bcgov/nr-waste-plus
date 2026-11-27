import { expect } from "@playwright/test";

import { Then } from "../fixtures";
import { resolveElementByTypeAndText } from "../support/elements.ts";
import {
  CONTRAST_RANK,
  computedProperty,
  effectiveBackgroundColor,
  expectTokens,
  getContrastLevel,
  getContrastRatio,
  getSeverity,
  missingTokens,
  type ContrastLevel,
} from "../support/tokens.ts";

Then(
  "the {string} {string} should have {string} {string}",
  async ({ page, uiux }, text, elementType, token, property) => {
    const target = await resolveElementByTypeAndText(page, elementType, text);
    await expectTokens(
      target.locator,
      { [property]: token },
      uiux,
      { element: target.element, selector: target.selector },
    );
  },
);

Then("the design tokens {string} should be defined", async ({ page }, names: string) => {
  const requested = names
    .split(",")
    .map((name: string) => name.trim())
    .filter(Boolean);
  const missing = await missingTokens(page, requested);
  expect(
    missing,
    `Design tokens not defined on :root: ${missing.join(", ")}`,
  ).toEqual([]);
});

Then(
  "the {string} {string} should meet {string} standard for contrast",
  async ({ page, uiux }, text, elementType, level) => {
    const expectedLevel = level as ContrastLevel;
    if (!(expectedLevel in CONTRAST_RANK)) {
      throw new Error(`Unknown contrast level "${level}".`);
    }

    const target = await resolveElementByTypeAndText(page, elementType, text);
    const textColor = await computedProperty(target.locator, "color");
    const backgroundColor = await effectiveBackgroundColor(target.locator);
    const ratio = getContrastRatio(textColor, backgroundColor);
    const actualLevel = getContrastLevel(ratio ?? 0);
    const event =
      CONTRAST_RANK[actualLevel] >= CONTRAST_RANK[expectedLevel]
        ? "check"
        : "violation";
    const taxonomy = "contrast";

    await uiux.record({
      event,
      type: event === "check" ? "contrast-pass" : "contrast-fail",
      taxonomy,
      severity: getSeverity(taxonomy, event),
      property: "contrast",
      expected: expectedLevel,
      actual: `Ratio: ${(ratio ?? 0).toFixed(2)} ${actualLevel}`,
      element: target.element,
      selector: target.selector,
    });

    expect.soft(
      ratio,
      `Unable to calculate contrast ratio. Text color: ${textColor}, Background: ${backgroundColor}`,
    ).not.toBeNull();
    expect.soft(
      CONTRAST_RANK[actualLevel],
      `Contrast ratio ${(ratio ?? 0).toFixed(2)}:1 meets ${expectedLevel} standard (actual: ${actualLevel})`,
    ).toBeGreaterThanOrEqual(CONTRAST_RANK[expectedLevel]);
  },
);
