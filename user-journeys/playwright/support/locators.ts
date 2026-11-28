import { expect, type Locator, type Page } from "@playwright/test";

import { exactTextPattern, textPattern } from "./text.ts";

/**
 * Cypress `findButton` resolves selectors in a fixed order (data-testid,
 * aria-label, button text, submit value, link, tooltip). Playwright's `.or()`
 * merges matches and then picks DOM order, so an ordered `count()` probe is
 * used here to preserve that precedence.
 */
export async function button(page: Page, name: string): Promise<Locator> {
  const candidates: ReadonlyArray<{ reason: string; locator: Locator }> = [
    { reason: "data-testid", locator: page.getByTestId(name) },
    {
      reason: "button role (exact name)",
      locator: page.getByRole("button", { name: exactTextPattern(name) }),
    },
    {
      reason: "link role (exact name)",
      locator: page.getByRole("link", { name: exactTextPattern(name) }),
    },
    {
      reason: "submit input value",
      locator: page.locator(`input[type="submit"][value=${JSON.stringify(name)}]`),
    },
    {
      // Cypress `button:contains(name)` is case-sensitive substring; the regex
      // form keeps that behaviour (a string name would be case-insensitive).
      reason: "button name (substring)",
      locator: page.getByRole("button", { name: textPattern(name) }),
    },
    {
      reason: "link name (substring)",
      locator: page.getByRole("link", { name: textPattern(name) }),
    },
  ];

  // Cypress bounded the whole lookup in one `cy.get().should()` up to 20 s.
  // The header mounts only after the lazy route chunk resolves, so the probe
  // must wait for any candidate before deciding that the name is absent.
  await expect
    .poll(
      async () => {
        for (const candidate of candidates) {
          if ((await candidate.locator.count()) > 0) return true;
        }
        return false;
      },
      { timeout: 20_000, message: `No button or link named "${name}" appeared` },
    )
    .toBe(true);

  for (const candidate of candidates) {
    if ((await candidate.locator.count()) > 0) return candidate.locator.first();
  }

  // Icon-only Carbon buttons can compute an empty accessible name when a
  // tooltip overrides aria-label; Cypress traces those via aria-labelledby.
  const tooltip = page
    .locator(".cds--tooltip-content")
    .filter({ hasText: name })
    .first();
  if ((await tooltip.count()) > 0) {
    const id = await tooltip.evaluate(
      (element) => element.closest("[id]")?.getAttribute("id") ?? null,
    );
    if (id) {
      const labelledBy = page.locator(
        `button[aria-labelledby=${JSON.stringify(id)}]`,
      );
      if ((await labelledBy.count()) > 0) return labelledBy.first();
    }
  }

  throw new Error(`No button or link named "${name}" was found.`);
}

export async function clickButton(page: Page, name: string): Promise<void> {
  await (await button(page, name)).click();
}

/**
 * The main search field is pinned to its id: Carbon's `<Search label>` does not
 * expose a conventional `<label for>`, and the generic label walk raced the
 * debounce in Cypress.
 */
export function inputByLabel(page: Page, label: string): Locator {
  if (label === "Search") {
    // TODO(a11y-name): Carbon Search has no <label for>; pin #main-search.
    return page.locator("#main-search");
  }
  return page.getByLabel(label);
}

/** Carbon filterable multiselect combobox, with the documented class fallback. */
export function dropdown(page: Page, label: string): Locator {
  const byRole = page.getByRole("combobox", { name: label });
  // TODO(a11y-name): the multiselect can lose its combobox name; the
  // placeholder is the only stable handle in that state.
  const byPlaceholder = page.getByPlaceholder(label);
  const byCarbonClass = page
    .locator(".cds--list-box")
    .filter({ has: byPlaceholder })
    .locator("input");
  return byRole.or(byPlaceholder).or(byCarbonClass).first();
}

/** Carbon listbox option, with the class fallback used only when role is absent. */
export function autocompleteOption(page: Page, text: string): Locator {
  const byRole = page.getByRole("option", { name: text, exact: false });
  // TODO(a11y-name): Carbon list items may not expose role=option.
  const byCarbonClass = page
    .locator('.cds--list-box ul[role="listbox"] li')
    .filter({ hasText: text });
  return byRole.or(byCarbonClass).first();
}
