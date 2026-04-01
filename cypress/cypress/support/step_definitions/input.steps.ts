import { Then } from "@badeball/cypress-cucumber-preprocessor";
import { selectFromAutocomplete, selectFromFilterableDropdown, findInputByLabel } from "../helpers";
/* Input Steps */

Then('I type {string} into the {string} input', (text: string, input: string) => {
  findInputByLabel(input).type(text).blur();
});

Then('I clear the {string} input', (input: string) => {
  findInputByLabel(input).clear().blur();
});

Then('I type {string} into the {string} autocomplete', (text: string, input: string) => {
  selectFromAutocomplete(input, text);
});

/* Filterable dropdown steps */

Then('I select {string} from the {string} dropdown', (option: string, dropdown: string) => {
  selectFromFilterableDropdown(dropdown, option);
});
