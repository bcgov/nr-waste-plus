import { Then, When } from "@badeball/cypress-cucumber-preprocessor";
import { selectFromAutocomplete, selectFromFilterableDropdown, findInputByLabel } from "../../helpers";
/* Input Steps */

Then('I type {string} into the {string} input', (text: string, input: string) => {
  findInputByLabel(input).type(text).blur();
});

Then('I clear the {string} input', (input: string) => {
  findInputByLabel(input).clear().blur();
});

Then('the {string} input should contain {string}', (input: string, text: string) => {
  findInputByLabel(input).should('have.value', text);
});

Then('I type {string} into the {string} autocomplete', (text: string, input: string) => {
  selectFromAutocomplete(input, text);
});

/* Filterable dropdown steps */

Then('I select {string} from the {string} dropdown', (option: string, dropdown: string) => {
  selectFromFilterableDropdown(dropdown, option);
});

/* Switch (Carbon Toggle) steps */

/**
 * Clicks a Carbon Toggle by its accessible name. Carbon renders the control as
 * `<button role="switch" aria-labelledby>` with the label in a sibling
 * `<label>`, so the text-based `findButton` lookup never matches it. The click
 * is forced because `.cds--toggle__appearance` (a decorative sibling inside the
 * label) covers the button's centre - the same reason `buttonClick` forces its
 * clicks.
 *
 * @param label - The toggle's `labelText`.
 * @param expected - `aria-checked` the switch must have before the click.
 */
const setSwitch = (label: string, expected: 'true' | 'false') => {
  cy.findByRole('switch', { name: label })
    .should('have.attr', 'aria-checked', expected)
    .click({ force: true })
    .should('have.attr', 'aria-checked', expected === 'true' ? 'false' : 'true');
};

When('I toggle the {string} switch on', (label: string) => {
  setSwitch(label, 'false');
});

When('I toggle the {string} switch off', (label: string) => {
  setSwitch(label, 'true');
});

Then('no switch should be visible', () => {
  cy.findAllByRole('switch').should('have.length', 0);
});
