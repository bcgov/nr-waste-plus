import { expect, type Locator, type Page } from "@playwright/test";

import { button } from "./locators.ts";
import { textPattern } from "./text.ts";

export interface StepElement {
  locator: Locator;
  /** Tag name, lower-cased, as recorded in the uiux event. */
  element: string;
  /** Accessible name when the element has one, otherwise the CSS used. */
  selector: string;
}

/**
 * Cypress `resolveElementByTypeAndText` resolves `button` as
 * `cy.contains('button', text)`, `heading` as the first h1..h6 containing the
 * text, and falls back to `cy.contains(text)` for the remaining types.
 */
export async function resolveElementByTypeAndText(
  page: Page,
  type: string,
  text: string,
): Promise<StepElement> {
  const normalizedType = type.toLowerCase().trim();
  let cssUsed: string;
  let locator: Locator;

  switch (normalizedType) {
    case "button":
    case "link":
      cssUsed = `${normalizedType} "${text}"`;
      locator = await button(page, text);
      break;
    case "heading":
    case "headings":
      cssUsed = `h1,h2,h3,h4,h5,h6 :has-text("${text}")`;
      locator = page
        .locator("h1,h2,h3,h4,h5,h6")
        .filter({ hasText: textPattern(text) })
        .first();
      break;
    case "input":
    case "field":
      cssUsed = `input[value="${text}"], input[placeholder="${text}"]`;
      locator = page.locator(
        `input[value=${JSON.stringify(text)}], input[placeholder=${JSON.stringify(text)}]`,
      ).first();
      break;
    case "section":
      cssUsed = `section :has-text("${text}")`;
      locator = page.locator("section").filter({ hasText: textPattern(text) }).first();
      break;
    case "image":
    case "icon":
      cssUsed = `img[alt="${text}"], [aria-label="${text}"]`;
      locator = page.locator(
        `img[alt=${JSON.stringify(text)}], [aria-label=${JSON.stringify(text)}]`,
      ).first();
      break;
    case "div":
    case "card":
      cssUsed = `div :has-text("${text}")`;
      locator = page.locator("div").filter({ hasText: textPattern(text) }).first();
      break;
    default:
      cssUsed = `:text("${text}")`;
      locator = page.getByText(textPattern(text)).first();
      break;
  }

  await expect(locator, `No ${cssUsed} element was found`).toBeVisible({
    timeout: 30_000,
  });

  const details = await locator.evaluate((element) => {
    const ariaLabel = element.getAttribute("aria-label")?.trim();
    if (ariaLabel) return { accessibleName: ariaLabel, tag: element.tagName.toLowerCase() };
    const labelledBy = element.getAttribute("aria-labelledby");
    if (labelledBy) {
      const joined = labelledBy
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
        .filter(Boolean)
        .join(" ")
        .trim();
      if (joined) return { accessibleName: joined, tag: element.tagName.toLowerCase() };
    }
    return {
      accessibleName: (element.textContent ?? "").trim().split(/\s+/).join(" "),
      tag: element.tagName.toLowerCase(),
    };
  });

  return {
    locator,
    element: details.tag,
    selector: details.accessibleName || cssUsed,
  };
}
