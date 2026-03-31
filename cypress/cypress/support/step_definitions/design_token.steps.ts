import { Then } from '@badeball/cypress-cucumber-preprocessor';
import { resolveElementByTypeAndText } from '../helpers';

Then(
  'the "{string}" {string} should use the {string} token',
  (text: string, elementType: string, token: string) => {
    resolveElementByTypeAndText(elementType, text).validateTokenStyle(token);
  }
);

Then(
  'the "{string}" {string} should use the {string} {string}',
  (text: string, elementType: string, token: string, property: string) => {
    resolveElementByTypeAndText(elementType, text).validateStyle(token, property);
  }
);

Then(
  'the "{string}" {string} should have {string} background color',
  (text: string, elementType: string, token: string) => {
    resolveElementByTypeAndText(elementType, text).validateColor(token, 'background-color');
  }
);

Then(
  'the "{string}" {string} should have {string} text color',
  (text: string, elementType: string, token: string) => {
    resolveElementByTypeAndText(elementType, text).validateColor(token, 'color');
  }
);

Then(
  'the "{string}" {string} should have {string} border color',
  (text: string, elementType: string, token: string) => {
    resolveElementByTypeAndText(elementType, text).validateColor(token, 'border-color');
  }
);

Then(
  'the "{string}" {string} should have {string} padding',
  (text: string, elementType: string, token: string) => {
    resolveElementByTypeAndText(elementType, text).validateSpacing(token);
  }
);

Then(
  'the "{string}" {string} should have {string} margin',
  (text: string, elementType: string, token: string) => {
    resolveElementByTypeAndText(elementType, text).validateMargin(token);
  }
);

Then(
  'the "{string}" {string} should have {string} font size',
  (text: string, elementType: string, token: string) => {
    resolveElementByTypeAndText(elementType, text).validateStyle(token, 'font-size');
  }
);

Then(
  'the "{string}" {string} should have {string} line height',
  (text: string, elementType: string, token: string) => {
    resolveElementByTypeAndText(elementType, text).validateStyle(token, 'line-height');
  }
);

Then(
  'the "{string}" {string} should have {string} font weight',
  (text: string, elementType: string, token: string) => {
    resolveElementByTypeAndText(elementType, text).validateStyle(token, 'font-weight');
  }
);

Then(
  'the "{string}" {string} should have {string} typography',
  (text: string, elementType: string, token: string) => {
    resolveElementByTypeAndText(elementType, text).validateTypography(token);
  }
);

Then(
  'the "{string}" {string} should meet {string} contrast',
  (text: string, elementType: string, level: 'AAA' | 'AA' | 'A') => {
    resolveElementByTypeAndText(elementType, text).validateContrast(level);
  }
);
