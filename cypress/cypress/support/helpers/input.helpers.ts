export const selectFromAutocomplete = (
  label: string,
  option: string,
  url: string = "/api/search/reporting-units-users",
) => {
  const pattern = new RegExp(String.raw`(?=.*\/api)(?=.*=${option})`);
  cy.intercept(pattern).as("acUrl");
  findInputByLabel(label)
    .should("be.visible")
    .should("not.be.disabled")
    .type(option);

  cy.wait(`@acUrl`, { timeout: 15 * 1000 });

  findInputByLabel(label)
    .closest(".cds--list-box")
    .find('ul[role="listbox"]')
    .should("be.visible")
    .find("li")
    .contains(option, { matchCase: false })
    .click({ force: true });
};

/**
 * Selects an option from a Carbon filterable multi-select dropdown.
 *
 * How it works:
 *   1. Finds the combobox input via `findInputByLabel` (placeholder/label match).
 *   2. Types the option text to trigger filtering and open the dropdown list.
 *   3. Waits for the `<ul>` menu to become visible.
 *   4. Clicks the matching `<li>` item (checkbox) by its text.
 *   5. Clears the typed filter text and blurs to close the dropdown.
 *
 * Supports Carbon's `cds--multi-select--filterable` and `cds--combo-box`.
 */
export const selectFromFilterableDropdown = (label: string, option: string) => {
  cy.get(`input[placeholder="${label}"]`, { timeout: 10000 })
    .should("be.visible")
    .should("not.be.disabled")
    .click()
    .type(option);

  cy.get(`input[placeholder="${label}"]`)
    .closest(".cds--list-box")
    .find('ul[role="listbox"]')
    .should("be.visible")
    .find("li")
    .contains(option)
    .click({ force: true });
};

/**
 * Finds an input associated with a label, regardless of structure.
 * Supports:
 * 1. Placeholder match: input[placeholder="..."] (for Carbon dropdowns that hide the label)
 * 2. <label for="id"> + <input id="id">
 * 3. Carbon wrappers where label + input share a container
 * 4. Generic fallback: label text near an input
 */
export const findInputByLabel = (labelText: string) => {
  // Fast path: Waste Search main input is Carbon <Search id="main-search"> with no
  // conventional <label for=...>. Pinning avoids the generic contains("label")
  // walk which races the search debounce and occasionally resolves the wrong input.
  if (labelText === "Search") {
    return cy.get("body").then(($body) => {
      const pinned = $body.find("#main-search");
      if (pinned.length) return cy.get("#main-search");
      // fallback to generic lookup below
      return cy.document().then(() =>
        cy.contains("label", labelText).then(($label) => {
          const id = $label.attr("for");
          if (id) return cy.get(`#${id}`);
          const carbonContainer = $label.closest(
            ".cds--form-item, .cds--search, .cds--text-input, div",
          );
          if (carbonContainer.length) {
            const input = carbonContainer.find("input, textarea");
            if (input.length) return cy.wrap(input.first());
          }
          return cy
            .contains(labelText)
            .parentsUntil("form")
            .parent()
            .find("input, textarea")
            .first();
        }),
      );
    });
  }

  // Synchronous check to decide which strategy to use
  return cy.document().then((doc) => {
    // Case 1-3: Label-based lookup
    return cy.contains("label", labelText).then(($label) => {
      const id = $label.attr("for");

      if (id) {
        // Case 1: direct semantic link
        return cy.get(`#${id}`);
      }

      // Case 2: Carbon-style shared container
      const carbonContainer = $label.closest(
        ".cds--form-item, .cds--search, .cds--text-input, div",
      );
      if (carbonContainer.length) {
        const input = carbonContainer.find("input, textarea");
        if (input.length) {
          return cy.wrap(input.first());
        }
      }

      // Case 3: fallback — search nearby
      return cy
        .contains(labelText)
        .parentsUntil("form")
        .parent()
        .find("input, textarea")
        .first();
    });
  });
};

/**
 * Attempts to click a button by trying multiple selectors in priority order.
 *
 * Cypress commands are NOT Promises — they don't have .catch().
 * Instead, we use $body.find() (synchronous jQuery) to check which selector
 * matches, then use cy.get() on the matched selector for proper Cypress
 * retryability and logging. Includes a retry loop for cases where the
 * element hasn't rendered yet.
 *
 * Selector priority:
 *   1. button[aria-label="<name>"]
 *   2. button:contains("<name>")
 *   3. input[type="submit"][value="<name>"]
 *   4. [data-testid="<name>"]
 *   5. .cds--tooltip-content — icon-only Carbon button (traces back via aria-labelledby)
 *   6. explicit attribute selectors with a 20s timeout — late-render fallback
 */

/**
 * Finds a button (or similar element) by name using multiple strategies and returns a Cypress chainable for the element.
 * The caller can then perform any action (e.g., click, invoke, etc.) on the returned element.
 *
 * Selector priority:
 *   1. [data-testid="<name>"]
 *   2. button[aria-label="<name>"]
 *   3. button:contains("<name>")
 *   4. input[type="submit"][value="<name>"]
 *   5. a:contains("<name>") / a[aria-label="<name>"]
 *   6. .cds--tooltip-content — icon-only Carbon button (traced back via aria-labelledby)
 *
 * The wait is a single bounded `cy.get().should()`: Cypress already retries the
 * assertion until `timeout`, so there is no manual retry loop. The previous
 * implementation recursed through `cy.wait(retryDelay).then(() => tryFind(n + 1))`
 * up to 50 times and then added a further 20 s fallback `cy.get()` — roughly 35 s
 * of silent waiting per click, and 50 levels of nested chainables accumulating in
 * the command queue. That is what made a missing element indistinguishable from a
 * hung CI job, and it multiplied by three under `retries.runMode: 2`.
 *
 * @param name Test id, accessible name, or visible text of the target.
 * @param timeout Total bounded wait in milliseconds.
 * @param scope Selector for the subtree to search within.
 * @returns A chainable yielding the first matching element.
 */
export const findButton = (
  name: string,
  timeout: number = 20_000,
  scope: string = "body",
): Cypress.Chainable<JQuery<HTMLElement>> => {
  const selectors = [
    `[data-testid="${name}"]`,
    `button[aria-label="${name}"]`,
    `button:contains("${name}")`,
    `input[type="submit"][value="${name}"]`,
    `a:contains("${name}")`,
    `a[aria-label="${name}"]`,
  ];

  /**
   * Synchronously resolves the best matching selector for `name`.
   *
   * @returns The matching selector, or undefined while nothing matches yet.
   */
  const resolveSelector = (): string | undefined => {
    const $scope = Cypress.$(scope);

    const matched = selectors.find((sel) => $scope.find(sel).length > 0);
    if (matched) return matched;

    // Icon-only Carbon button: locate the tooltip text and trace back to the
    // button via the tooltip's id / aria-labelledby relationship. Such buttons
    // can compute an empty accessible name (an empty tooltip overrides
    // aria-label), which defeats role-based queries.
    const $tooltip = $scope
      .find(`.cds--tooltip-content:contains("${name}")`)
      .first();
    if ($tooltip.length > 0) {
      const id = $tooltip.closest("[id]").attr("id");
      if (id) return `button[aria-labelledby="${id}"]`;
    }

    return undefined;
  };

  let resolved: string | undefined;

  return cy
    .get(scope, { timeout })
    .should(() => {
      resolved = resolveSelector();
      expect(resolved, `expected to find a button named "${name}"`).to.exist;
    })
    .then(() => cy.get(resolved as string, { timeout: 1_000 }).first());
};
