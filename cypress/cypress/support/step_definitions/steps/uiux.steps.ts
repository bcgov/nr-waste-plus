import { Then } from '@badeball/cypress-cucumber-preprocessor';
import { resolveElementByTypeAndText } from '../../helpers';

Then(
  'the {string} {string} should have {string} as {string}',
  (text: string, selector: string, property: string, expected: string) => {
    resolveElementByTypeAndText(selector, text).shouldHaveStyle(property, expected);
  }
);

Then(
  'the {string} {string} should use the {string} class',
  (text: string, selector: string, className: string) => {
    resolveElementByTypeAndText(selector, text).should('have.class', className);
  }
);
