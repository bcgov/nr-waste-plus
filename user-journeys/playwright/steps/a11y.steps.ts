import { expect, type Locator, type Page } from "@playwright/test";

import type { A11yRecorder } from "../fixtures/a11y.fixture.ts";
import { Then, When } from "../fixtures";
import {
  ERROR_ANNOUNCEMENT_SELECTORS,
  LIVE_REGION_SELECTORS,
  MAIN_TARGET_SELECTOR,
  SKIP_LINK_SELECTOR,
  headingHierarchyError,
  normalizeSpace,
  violationDetails,
} from "../support/a11y-pure.ts";
import {
  focusableByLabel,
  inputForStep,
  liveRegionForStep,
  resetFocusToBody,
  resolveRegionSelector,
} from "../support/a11y.ts";
import { runAxe } from "../support/axe.ts";
import { textPattern } from "../support/text.ts";

const MAX_SKIP_TAB_ATTEMPTS = 20;
const MAX_CONTROLS_TAB_ATTEMPTS = 30;

async function checkA11y(
  page: Page,
  a11y: A11yRecorder,
  selector?: string,
): Promise<void> {
  const result = await runAxe(page, selector);
  // Record before asserting: a run with violations still produces a check.
  await a11y.record(result);
  expect(
    result.violations,
    `Accessibility violations found for ${result.scope}: ${violationDetails(result.violations)}`,
  ).toEqual([]);
}

/** Real Tab presses only; the initial body focus is a reset, not an assertion. */
async function tabUntilFocused(
  page: Page,
  target: Locator,
  maxAttempts: number,
  description: string,
): Promise<void> {
  await expect(target).toBeVisible({ timeout: 15_000 });
  const element = await target.elementHandle();
  if (!element) throw new Error(`Could not resolve "${description}" for keyboard navigation.`);

  for (let attempt = 0; attempt <= maxAttempts; attempt += 1) {
    if (await page.evaluate((node) => document.activeElement === node, element)) return;
    if (attempt === maxAttempts) break;
    await page.keyboard.press("Tab");
  }
  throw new Error(`Could not reach "${description}" via keyboard Tab navigation.`);
}

Then("the page should have no accessibility violations", async ({ page, a11y }) => {
  await checkA11y(page, a11y);
});

Then(
  "the {string} region should have no accessibility violations",
  async ({ page, a11y }, region: string) => {
    await checkA11y(page, a11y, await resolveRegionSelector(page, region));
  },
);

When("I press {string} {int} times", async ({ page }, key: string, times: number) => {
  if (times < 1) throw new Error("Number of key presses must be at least 1.");
  for (let index = 0; index < times; index += 1) {
    await page.keyboard.press(key);
  }
});

Then("the {string} input should be focused", async ({ page }, label: string) => {
  await expect(await inputForStep(page, label)).toBeFocused();
});

Then("the skip link should target an existing main landmark", async ({ page }) => {
  await expect(page.locator(SKIP_LINK_SELECTOR).first()).toBeAttached({ timeout: 15_000 });
  const target = await page.evaluate((selector) => {
    const matches = document.querySelectorAll(selector);
    return { count: matches.length, tag: matches[0]?.tagName ?? null };
  }, MAIN_TARGET_SELECTOR);
  expect(target.count, "elements with id main-content").toBe(1);
  expect(target.tag, "skip link target element").toBe("MAIN");
});

When("I activate the skip link with the keyboard", async ({ page }) => {
  await resetFocusToBody(page);
  await tabUntilFocused(
    page,
    page.locator(SKIP_LINK_SELECTOR).first(),
    MAX_SKIP_TAB_ATTEMPTS,
    SKIP_LINK_SELECTOR,
  );
  await page.keyboard.press("Enter");
});

Then("focus should be on the main landmark", async ({ page }) => {
  await expect
    .poll(
      () =>
        page.evaluate(
          (selector) => document.activeElement === document.querySelector(selector),
          MAIN_TARGET_SELECTOR,
        ),
      { message: "document.activeElement after skip-link activation" },
    )
    .toBe(true);
});

Then("the clients page controls should be keyboard focusable", async ({ page }) => {
  const selectors = [
    '[data-testid="side-nav-link-Waste search"]',
    '[data-testid="side-nav-link-Create reporting unit"]',
    '[data-testid="side-nav-link-help"]',
    '[data-testid="main-search"]',
    '[data-testid="search-button-other"]:visible',
  ];
  await resetFocusToBody(page);
  for (const selector of selectors) {
    const control = page.locator(selector).first();
    await expect(control).toBeVisible({ timeout: 15_000 });
    await tabUntilFocused(page, control, MAX_CONTROLS_TAB_ATTEMPTS, selector);
    await expect(control).toBeFocused();
  }
});

Then("the page should have at least one ARIA live region", async ({ page }) => {
  await expect
    .poll(() => page.locator(LIVE_REGION_SELECTORS).count(), {
      timeout: 15_000,
      message: "at least one ARIA live region",
    })
    .toBeGreaterThan(0);
});

Then(
  "the {string} live region should announce {string}",
  async ({ page }, region: string, announcement: string) => {
    const target = await liveRegionForStep(page, region);
    const isLive = await target.evaluate((element) => {
      const ariaLive = element.getAttribute("aria-live");
      const role = element.getAttribute("role");
      return Boolean(ariaLive) || ["status", "alert", "log"].includes(role ?? "");
    });
    expect(isLive, "selected region should be announced by screen readers").toBe(true);

    await expect
      .poll(
        async () => normalizeSpace((await target.textContent()) ?? ""),
        { timeout: 15_000, message: "live region announcement" },
      )
      .toContain(normalizeSpace(announcement));
  },
);

Then(
  "the screen reader announcement should include {string}",
  async ({ page }, expectedText: string) => {
    const expected = normalizeSpace(expectedText);
    await expect
      .poll(
        () =>
          page.evaluate(
            ({ selectors, text }) => {
              const collapse = (value: string) =>
                value.trim().split(/\s+/).filter(Boolean).join(" ");
              return Array.from(document.querySelectorAll(selectors)).some((region) =>
                collapse(region.textContent || "").includes(text),
              );
            },
            { selectors: LIVE_REGION_SELECTORS, text: expected },
          ),
        { timeout: 15_000, message: `announcement including "${expectedText}"` },
      )
      .toBe(true);
  },
);

Then(
  "the page should announce itself on load as {string}",
  async ({ page }, expectedAnnouncement: string) => {
    const expected = normalizeSpace(expectedAnnouncement).toLowerCase();
    await expect
      .poll(
        async () => {
          const title = normalizeSpace(await page.title()).toLowerCase();
          const headingCount = await page.locator("h1").count();
          const heading = headingCount
            ? normalizeSpace((await page.locator("h1").first().textContent()) ?? "").toLowerCase()
            : "";
          const landmarks = await page.evaluate(() => {
            const textOf = (element: Element | null) =>
              (element?.textContent || "").trim().split(/\s+/).filter(Boolean).join(" ");
            const nameOf = (element: Element): string => {
              const ariaLabel = element.getAttribute("aria-label")?.trim();
              if (ariaLabel) return ariaLabel;
              const labelledBy = element.getAttribute("aria-labelledby");
              if (labelledBy) {
                const joined = labelledBy
                  .split(" ")
                  .map((id) => textOf(document.getElementById(id)))
                  .filter(Boolean)
                  .join(" ")
                  .trim();
                if (joined) return joined;
              }
              const id = element.getAttribute("id");
              if (id) {
                const label = textOf(document.querySelector(`label[for='${id}']`));
                if (label) return label;
              }
              return textOf(element.closest("label")) || textOf(element);
            };
            return Array.from(
              document.querySelectorAll("main, [role='main'], [aria-label], [aria-labelledby]"),
            )
              .map((element) => nameOf(element).toLowerCase())
              .join(" ");
          });
          return title.includes(expected) || heading.includes(expected) || landmarks.includes(expected);
        },
        { timeout: 15_000, message: `page load announcement should include "${expectedAnnouncement}"` },
      )
      .toBe(true);
  },
);

Then(
  "the {string} region should have a valid heading hierarchy",
  async ({ page }, region: string) => {
    const selector = await resolveRegionSelector(page, region);
    const tags = await page.locator(`${selector} h1, ${selector} h2, ${selector} h3, ${selector} h4, ${selector} h5, ${selector} h6`)
      .evaluateAll((elements) => elements.map((element) => element.tagName));
    expect(headingHierarchyError(tags, region)).toBeNull();
  },
);

Then("the focus order should be {string}", async ({ page }, expectedOrder: string) => {
  const labels = expectedOrder
    .split(",")
    .map((entry) => normalizeSpace(entry))
    .filter(Boolean);
  if (labels.length === 0) throw new Error("Expected focus order must contain at least one item.");

  await resetFocusToBody(page);
  for (const label of labels) {
    await page.keyboard.press("Tab");
    await expect(await focusableByLabel(page, label)).toBeFocused();
  }
});

Then(
  "the {string} input should be announced as {string}",
  async ({ page }, inputIdentifier: string, expectedLabel: string) => {
    const field = await inputForStep(page, inputIdentifier);
    await expect(field).toHaveAccessibleName(new RegExp(textPattern(expectedLabel).source, "i"));
  },
);

Then("the error message {string} should be announced", async ({ page }, errorText: string) => {
  const expected = normalizeSpace(errorText);
  await expect
    .poll(
      () =>
        page.evaluate(
          ({ selectors, text }) => {
            const collapse = (value: string) =>
              value.trim().split(/\s+/).filter(Boolean).join(" ");
            return Array.from(document.querySelectorAll(selectors)).some((node) =>
              collapse(node.textContent || "").includes(text),
            );
          },
          { selectors: ERROR_ANNOUNCEMENT_SELECTORS, text: expected },
        ),
      { timeout: 15_000, message: `error announcement including "${errorText}"` },
    )
    .toBe(true);
});
