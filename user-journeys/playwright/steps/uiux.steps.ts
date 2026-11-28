import { expect } from "@playwright/test";

import { Then } from "../fixtures";
import { resolveElementByTypeAndText } from "../support/elements.ts";
import {
  computedProperty,
  getSeverity,
  getTaxonomy,
  rootFontSize,
  valuesMatch,
} from "../support/tokens.ts";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

Then(
  "the {string} {string} should have {string} as {string}",
  async ({ page, uiux }, text, selector, property, expected) => {
    const target = await resolveElementByTypeAndText(page, selector, text);
    const fontSize = await rootFontSize(target.locator);
    const actual = await computedProperty(target.locator, property);
    const isMissing = !actual;
    const isMismatch = !valuesMatch(expected, actual, fontSize);
    const event: "check" | "violation" =
      isMissing || isMismatch ? "violation" : "check";
    const type = isMissing
      ? "token-missing"
      : isMismatch
        ? "style-mismatch"
        : "style-check";
    const taxonomy = getTaxonomy(property);

    await uiux.record({
      event,
      type,
      taxonomy,
      severity: getSeverity(taxonomy, event),
      property,
      expected,
      actual,
      element: target.element,
      selector: target.selector,
    });

    expect.soft(actual, `Element is missing ${property} style`).not.toBe("");
    await expect.soft(target.locator).toHaveCSS(property, expected);
  },
);

Then(
  "the {string} {string} should use the {string} class",
  async ({ page, uiux }, text, selector, className) => {
    const target = await resolveElementByTypeAndText(page, selector, text);
    const actual = (await target.locator.getAttribute("class")) ?? "";
    const hasClass = actual.split(/\s+/).includes(className);
    const event: "check" | "violation" = hasClass ? "check" : "violation";

    await uiux.record({
      event,
      type: hasClass ? "class-check" : "class-mismatch",
      taxonomy: "style",
      severity: getSeverity("style", event),
      property: "class",
      expected: className,
      actual,
      element: target.element,
      selector: target.selector,
    });

    await expect
      .soft(target.locator)
      .toHaveClass(new RegExp(`(^|\\s)${escapeRegExp(className)}(\\s|$)`));
  },
);
