import { Then } from '@badeball/cypress-cucumber-preprocessor';
import { getSelectorOrContains, findButton } from '../helpers';

Then(
  'the {string} button should use the {string} style',
  (selector: string, token: string) => {
    findButton(selector).shouldUseTokenStyle(token);
  }
);

Then(
  'the {string} button should have {string} {string}',
  (selector: string, property: string, expected: string) => {
    findButton(selector).shouldHaveStyle(property, expected);
  }
);

Then(
  'the {string} button should have all styles from the {string} token',
  (selector: string, token: string) => {
    findButton(selector).shouldHaveAllStylesFromToken(token);
  }
);

// Should not be used for buttons, ideally
Then(
  'the element {string} with text {string} should use the {string} style',
  (selector: string, text: string, token: string) => {
    getSelectorOrContains('', text, selector).shouldUseTokenStyle(token);
  }
);

Then(
  'the element {string} with text {string} should have {string} {string}',
  (selector: string, text: string, property: string, expected: string) => {
    getSelectorOrContains('', text, selector).shouldHaveStyle(property, expected);
  }
);

Then(
  'the element {string} with text {string} should have all styles from the {string} token',
  (selector: string, text: string, token: string) => {
    getSelectorOrContains('', text, selector).shouldHaveAllStylesFromToken(token);
  }
);

Then(
  'the element with text {string} should use the {string} style',
  (text: string, token: string) => {
    getSelectorOrContains('', text, '').shouldUseTokenStyle(token);
  }
);

Then(
  'the element with text {string} should have {string} {string}',
  (text: string, property: string, expected: string) => {
    getSelectorOrContains('', text, '').shouldHaveStyle(property, expected);
  }
);

Then(
  'the element with text {string} should have all styles from the {string} token',
  (text: string, token: string) => {
    getSelectorOrContains('', text, '').shouldHaveAllStylesFromToken(token);
  }
);