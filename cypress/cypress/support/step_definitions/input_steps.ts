import { Then, BeforeStep } from "@badeball/cypress-cucumber-preprocessor";

let idir = true;

BeforeStep({ tags: "@loginAsBCeID" }, function () {
  idir = false;
});
BeforeStep({ tags: "@loginAsIDIR" }, function () {
  idir = true;
});

/* Input Steps */

Then('I type {string} into the {string} input', (text: string, input: string) => {
  findInputByLabel(input).type(text).blur();
});

Then('I clear the {string} input', (input: string) => {
  findInputByLabel(input).clear().blur();
});

/* Filterable dropdown steps */

Then('I select {string} from the {string} dropdown', (option: string, dropdown: string) => {
  selectFromFilterableDropdown(dropdown, option);
});

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
const selectFromFilterableDropdown = (label: string, option: string) => {
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
  })
};

/**
 * Finds an input associated with a label, regardless of structure.
 * Supports:
 * 1. Placeholder match: input[placeholder="..."] (for Carbon dropdowns that hide the label)
 * 2. <label for="id"> + <input id="id">
 * 3. Carbon wrappers where label + input share a container
 * 4. Generic fallback: label text near an input
 */
const findInputByLabel = (labelText: string) => {
  // Synchronous check to decide which strategy to use
  return cy.document().then((doc) => {
    const hasPlaceholder = doc.querySelector(`input[placeholder="${labelText}"]`);

    if (hasPlaceholder) {
      // Case 1: Use cy.get for retryability
      return cy.get(`input[placeholder="${labelText}"]`).first();
    }

    // Case 2-4: Label-based lookup
    return cy.contains('label', labelText).then(($label) => {
      const id = $label.attr('for');

      if (id) {
        // Case 2: direct semantic link
        return cy.get(`#${id}`);
      }

      // Case 3: Carbon-style shared container
      const carbonContainer = $label.closest('.cds--form-item, .cds--search, .cds--text-input, div');
      if (carbonContainer.length) {
        const input = carbonContainer.find('input, textarea');
        if (input.length) {
          return cy.wrap(input.first());
        }
      }

      // Case 4: fallback — search nearby
      return cy.contains(labelText)
        .parentsUntil('form')
        .parent()
        .find('input, textarea')
        .first();
    });
  });
};
