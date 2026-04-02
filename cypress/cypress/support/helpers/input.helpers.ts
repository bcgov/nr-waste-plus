export const selectFromAutocomplete = (label: string, option: string, url: string = '/api/search/reporting-units-users') => {

  const pattern = new RegExp(String.raw`(?=.*\/api)(?=.*=${option})`);
  cy.intercept(pattern).as('acUrl');
  const autocomplete = findInputByLabel(label);

  autocomplete
  .then($input => {
    if ($input.length) {
      cy.wrap($input).type(option);

      cy.wait(`@acUrl`, { timeout: 15 * 1000 });

      cy.wrap($input)
        .closest('.cds--list-box')
        .find('ul[role="listbox"]')
        .should('be.visible')
        .find('li')
        .contains(option,{ matchCase: false })
        .click({ force: true });
    }
  });

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
  cy.get('body')
  .find(`input[placeholder="${label}"]`)
  .then($input => {
    if ($input.length) {
      cy.wrap($input).type(option)
      cy.wrap($input)
        .closest('.cds--list-box')
        .find('ul[role="listbox"]')
        .should('be.visible')
        .find('li')
        .contains(option)
        .click({ force: true });
    }
  });
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
  // Synchronous check to decide which strategy to use
  return cy.document().then((doc) => {
    
    // Case 1-3: Label-based lookup
    return cy.contains('label', labelText).then(($label) => {
      const id = $label.attr('for');

      if (id) {
        // Case 1: direct semantic link
        return cy.get(`#${id}`);
      }

      // Case 2: Carbon-style shared container
      const carbonContainer = $label.closest('.cds--form-item, .cds--search, .cds--text-input, div');
      if (carbonContainer.length) {
        const input = carbonContainer.find('input, textarea');
        if (input.length) {
          return cy.wrap(input.first());
        }
      }

      // Case 3: fallback — search nearby
      return cy.contains(labelText)
        .parentsUntil('form')
        .parent()
        .find('input, textarea')
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
 *   6. findByRole("button", { name }) — @testing-library fallback
 */

/**
 * Finds a button (or similar element) by name using multiple strategies and returns a Cypress chainable for the element.
 * The caller can then perform any action (e.g., click, invoke, etc.) on the returned element.
 *
 * Selector priority:
 *   1. button[aria-label="<name>"]
 *   2. button:contains("<name>")
 *   3. input[type="submit"][value="<name>"]
 *   4. [data-testid="<name>"]
 *   5. .cds--tooltip-content — icon-only Carbon button (traces back via aria-labelledby)
 *   6. findByRole("button", { name }) — @testing-library fallback
 */
export const findButton = (
  name: string,
  retries: number = 3,
  retryDelay: number = 100,
  selector: string = 'body'
): Cypress.Chainable<JQuery<HTMLElement>> => {
  const selectors = [
    `button[aria-label="${name}"]`,
    `button:contains("${name}")`,
    `input[type="submit"][value="${name}"]`,
    `[data-testid="${name}"]`,
    `a:contains("${name}")`,
    `a[aria-label="${name}"]`,
  ];

  function tryFind(attempt: number): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get(selector).then(($body) => {
      const matchedSelector = selectors.find(
        (sel) => $body.find(sel).length > 0
      );

      if (matchedSelector) {
        return cy.get(matchedSelector).first();
      } else if ($body.find(`.cds--tooltip-content:contains("${name}")`).length > 0) {
        // Icon-only Carbon button: locate the tooltip text and trace back
        // to the button via the tooltip's id / aria-labelledby relationship
        return cy.contains('.cds--tooltip-content', name)
          .invoke('closest', '[id]')
          .then($tooltip => {
            const id = $tooltip.attr('id');
            return cy.get(`button[aria-labelledby="${id}"]`).first();
          });
      } else if (attempt < retries) {
        // Element may not have rendered yet — wait and retry
        return cy.wait(retryDelay).then(() => tryFind(attempt + 1));
      } else {
        // Last resort: use @testing-library/cypress findByRole
        // Try button first, then link role — covers <a> acting as buttons
        const nameRegex = new RegExp(name, 'i');
        return cy.get('body').then(($body) => {
          const hasButton = Array.from($body.find('button, [role="button"]')).some((el) =>
            nameRegex.test(el.textContent || '') || nameRegex.test(el.getAttribute('aria-label') || '')
          );

          if (hasButton) {
            return cy.findByRole('button', { name: nameRegex });
          } else {
            return cy.findByRole('link', { name: nameRegex });
          }
        });
      }
    });
  }

  return tryFind(0);
};
