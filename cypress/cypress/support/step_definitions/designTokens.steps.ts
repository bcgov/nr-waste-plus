import { Then } from '@badeball/cypress-cucumber-preprocessor';
import { DataTableLike, resolveElementByTypeAndText } from '../helpers';

Then(
  'the {string} {string} should have {string} {string}',
  (text: string, elementType: string, token: string, property: string) => {
    resolveElementByTypeAndText(elementType, text).validateStyle(token, property);
  }
);

Then(
  'the {string} {string} should have the following table values',
  (text: string, elementType: string, table: DataTableLike) => {

    for (const row of table.rawTable) {
      if (!Array.isArray(row) || row.length < 2) {
        throw new Error("Each table row must have token and property columns.");
      }

      const token = row[0] || "";
      const property = row[1] || "";
      resolveElementByTypeAndText(elementType, text).validateStyle(token, property);
    }
    
  }
);

Then(
  'the {string} {string} should use the {string} token',
  (text: string, elementType: string, token: string) => {
    resolveElementByTypeAndText(elementType, text).validateTokenStyle(token);
  }
);

Then(
  'the {string} {string} should meet {string} standard for contrast',
  (text: string, elementType: string, level: 'AAA' | 'AA' | 'A') => {
    resolveElementByTypeAndText(elementType, text).validateContrast(level);
  }
);

Then(
  'the {string} {string} should have {string} typography',
  (text: string, elementType: string, token: string) => {
    resolveElementByTypeAndText(elementType, text).validateTypography(token);
  }
);