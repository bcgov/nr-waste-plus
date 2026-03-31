import { Then } from '@badeball/cypress-cucumber-preprocessor';
import { findElement, resolveElementByTypeAndText } from '../helpers';

Then(
  'the {string} button should use the {string} token',
  (text: string, token: string) => {
    resolveElementByTypeAndText('button', text).validateTokenStyle(token);
  }
);

Then(
  'the {string} button should have {string} {string}',
  (text: string, token: string, property: string) => {
    resolveElementByTypeAndText('button', text).validateStyle(token, property);
  }
);

Then(
  'the {string} heading should use the {string} token',
  (text: string, token: string) => {
    resolveElementByTypeAndText('heading', text).validateTypography(token);
  }
);

Then(
  'the {string} heading should have {string} font size',
  (text: string, token: string) => {
    resolveElementByTypeAndText('heading', text).validateStyle(token, 'font-size');
  }
);

Then(
  'the element with text {string} should have {string} {string}',
  (text: string, token: string, property: string) => {
    findElement(text).validateStyle(token, property);
  }
);

Then(
  'the element with text {string} should have {string} background color',
  (text: string, token: string) => {
    findElement(text).validateColor(token, 'background-color');
  }
);

Then(
  'the element with text {string} should have {string} text color',
  (text: string, token: string) => {
    findElement(text).validateColor(token, 'color');
  }
);

Then(
  'the element with text {string} should meet {string} contrast',
  (text: string, level: 'AAA' | 'AA' | 'A') => {
    findElement(text).validateContrast(level);
  }
);