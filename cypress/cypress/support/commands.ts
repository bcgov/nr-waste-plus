/* eslint-disable no-undef */
/// <reference types="cypress" />

import {
  getTokenValue,
  tokenToCssVar,
  valuesMatch,
  getTaxonomy,
  createTaskRecord,
  TOKEN_STYLE_PROPERTIES,
  getElementSpacing,
  getContrastRatio,
  getContrastLevel,
  type ContrastLevel,
  getEffectiveBackgroundColor,
  CONTRAST_RANK,
} from './tokens';

Cypress.Commands.add('waitForPageLoad', (element: string, timeout?: number) => {
  cy.get(element, { timeout: timeout || 10000 }).should('be.visible');
});

Cypress.Commands.add('logAndScreenshot', (message: string) => {
  cy.log(message).then(() => {
    console.log(message);
    cy.screenshot(`log-${Date.now()}`);
  });
});

Cypress.Commands.add(
  'validateTokenStyle',
  { prevSubject: true },
  (subject, tokenName: string, property?: string) => {
    const rootFontSize = Number.parseFloat(
      getComputedStyle(document.documentElement).fontSize
    ) || 16;

    return cy.wrap(subject).then($el => {
      const el = $el[0] as Element;
      const styles = getComputedStyle(el);

      const propertiesToCheck = property
        ? [property]
        : TOKEN_STYLE_PROPERTIES;

      const results = propertiesToCheck.map(prop => {
        const tokenValue = getTokenValue(tokenName, prop);
        const actual = styles.getPropertyValue(prop).trim();
        const isMissing = !tokenValue;
        const isMismatch = !valuesMatch(tokenValue, actual, rootFontSize);

        const event = isMissing || isMismatch ? 'violation' : 'check';
        const type = isMissing
          ? 'token-missing'
          : isMismatch
            ? 'token-style-mismatch'
            : 'style-check';

        const taskRecord = createTaskRecord(
          event,
          type,
          getTaxonomy(prop),
          actual,
          el.tagName.toLowerCase(),
          {
            token: tokenName,
            property: prop,
            expected: tokenValue,
          }
        );

        cy.task('uiux:record', taskRecord);

        return {
          property: prop,
          tokenValue,
          actual,
          isMissing,
          isMismatch,
          taskRecord,
        };
      });

      const firstMissing = results.find(r => r.isMissing);
      if (firstMissing) {
        throw new Error(
          `CSS variable '${tokenToCssVar(tokenName)}-${firstMissing.property}' is not defined. ` +
            `Ensure the token is defined in your design system.`
        );
      }

      const mismatches = results.filter(r => r.isMismatch);
      if (mismatches.length > 0) {
        const details = mismatches
          .map(m => `${m.property}: got '${m.actual}', expected '${m.tokenValue}'`)
          .join('; ');
        throw new Error(
          `Token style mismatch for '${tokenName}': ${details}`
        );
      }

      return subject;
    });
  }
);

Cypress.Commands.add(
  'validateStyle',
  { prevSubject: true },
  (subject, tokenName: string, cssProperty: string) => {
    const rootFontSize = Number.parseFloat(
      getComputedStyle(document.documentElement).fontSize
    ) || 16;

    return cy.wrap(subject).then($el => {
      const el = $el[0] as Element;
      const styles = getComputedStyle(el);

      const tokenValue = getTokenValue(tokenName, cssProperty);
      const actual = styles.getPropertyValue(cssProperty).trim();
      const isMissing = !tokenValue;
      const isMismatch = !valuesMatch(tokenValue, actual, rootFontSize);

      cy.log(`Validating style '${cssProperty}' for element <${el.tagName.toLowerCase()}> against token '${tokenName}' with expected value '${tokenValue}' and actual value '${actual}'`);

      const event = isMissing || isMismatch ? 'violation' : 'check';
      const type = isMissing ? 'token-missing' : isMismatch ? 'style-mismatch' : 'style-check';

      const taskRecord = createTaskRecord(
        event,
        type,
        getTaxonomy(cssProperty),
        actual,
        el.tagName.toLowerCase(),
        {
          token: tokenName,
          property: cssProperty,
          expected: tokenValue,
        }
      );

      return cy
      .task('uiux:record', taskRecord)
      .then(() => {

      if (isMissing) {
        throw new Error(
          `CSS variable '${tokenToCssVar(tokenName)}-${cssProperty}' is not defined. ` +
            `Ensure the token is defined in your design system.`
        );
      }

      expect(isMismatch,
        `Element ${cssProperty} is '${actual}', expected '${tokenValue}' from token '${tokenName}'`
      ).to.be.false;

      return subject;
      });
    });
  }
);

Cypress.Commands.add(
  'validateSpacing',
  { prevSubject: true },
  (subject, tokenName: string, side?: 'top' | 'right' | 'bottom' | 'left' | 'all') => {
    const rootFontSize = Number.parseFloat(
      getComputedStyle(document.documentElement).fontSize
    ) || 16;

    return cy.wrap(subject).then($el => {
      const el = $el[0] as Element;
      const spacing = getElementSpacing(el);

      const checkSpacing = (
        token: string,
        actual: string,
        cssSide: 'top' | 'right' | 'bottom' | 'left' | 'all'
      ) => {
        const tokenValue = getTokenValue(token, cssSide === 'all' ? 'padding' : `padding-${cssSide}`);
        const isMissing = !tokenValue;
        const isMismatch = !valuesMatch(tokenValue, actual, rootFontSize);

        const event = isMissing || isMismatch ? 'violation' : 'check';
        const type = isMissing ? 'token-missing' : isMismatch ? 'style-mismatch' : 'style-check';

        const property = cssSide === 'all' ? 'padding' : `padding-${cssSide}`;
        const taskRecord = createTaskRecord(
          event,
          type,
          'spacing',
          actual,
          el.tagName.toLowerCase(),
          {
            token,
            property,
            expected: tokenValue,
          }
        );

        cy.task('uiux:record', taskRecord);

        if (isMissing) {
          throw new Error(
            `CSS variable '${tokenToCssVar(token)}-${property}' is not defined.`
          );
        }

        expect(isMismatch,
          `Element padding-${cssSide} is '${actual}', expected '${tokenValue}' from token '${token}'`
        ).to.be.false;
      };

      if (side && side !== 'all') {
        const actual = `${spacing.padding[side]}px`;
        checkSpacing(tokenName, actual, side);
      } else {
        (['top', 'right', 'bottom', 'left'] as const).forEach(s => {
          const actual = `${spacing.padding[s]}px`;
          checkSpacing(tokenName, actual, s);
        });
      }

      return subject;
    });
  }
);

Cypress.Commands.add(
  'validateMargin',
  { prevSubject: true },
  (subject, tokenName: string, side?: 'top' | 'right' | 'bottom' | 'left' | 'all') => {
    const rootFontSize = Number.parseFloat(
      getComputedStyle(document.documentElement).fontSize
    ) || 16;

    return cy.wrap(subject).then($el => {
      const el = $el[0] as Element;
      const spacing = getElementSpacing(el);

      const checkMargin = (
        token: string,
        actual: string,
        cssSide: 'top' | 'right' | 'bottom' | 'left' | 'all'
      ) => {
        const tokenValue = getTokenValue(token, cssSide === 'all' ? 'margin' : `margin-${cssSide}`);
        const isMissing = !tokenValue;
        const isMismatch = !valuesMatch(tokenValue, actual, rootFontSize);

        const event = isMissing || isMismatch ? 'violation' : 'check';
        const type = isMissing ? 'token-missing' : isMismatch ? 'style-mismatch' : 'style-check';

        const property = cssSide === 'all' ? 'margin' : `margin-${cssSide}`;
        const taskRecord = createTaskRecord(
          event,
          type,
          'spacing',
          actual,
          el.tagName.toLowerCase(),
          {
            token,
            property,
            expected: tokenValue,
          }
        );

        cy.task('uiux:record', taskRecord);

        if (isMissing) {
          throw new Error(
            `CSS variable '${tokenToCssVar(token)}-${property}' is not defined.`
          );
        }

        expect(isMismatch,
          `Element margin-${cssSide} is '${actual}', expected '${tokenValue}' from token '${token}'`
        ).to.be.false;
      };

      if (side && side !== 'all') {
        const actual = `${spacing.margin[side]}px`;
        checkMargin(tokenName, actual, side);
      } else {
        (['top', 'right', 'bottom', 'left'] as const).forEach(s => {
          const actual = `${spacing.margin[s]}px`;
          checkMargin(tokenName, actual, s);
        });
      }

      return subject;
    });
  }
);

Cypress.Commands.add(
  'validateColor',
  { prevSubject: true },
  (subject, tokenName: string, property: 'color' | 'background-color' | 'border-color') => {
    return cy.wrap(subject).then($el => {
      const el = $el[0] as Element;
      const styles = getComputedStyle(el);

      const tokenValue = getTokenValue(tokenName, property);
      const actual = styles.getPropertyValue(property).trim();
      const isMissing = !tokenValue;
      const isMismatch = actual !== tokenValue;

      const event = isMissing || isMismatch ? 'violation' : 'check';
      const type = isMissing ? 'token-missing' : isMismatch ? 'style-mismatch' : 'style-check';

      const taskRecord = createTaskRecord(
        event,
        type,
        'color',
        actual,
        el.tagName.toLowerCase(),
        {
          token: tokenName,
          property,
          expected: tokenValue,
        }
      );

      cy.task('uiux:record', taskRecord);

      if (isMissing) {
        throw new Error(
          `CSS variable '${tokenToCssVar(tokenName)}-${property}' is not defined.`
        );
      }

      expect(isMismatch,
        `Element ${property} is '${actual}', expected '${tokenValue}' from token '${tokenName}'`
      ).to.be.false;

      return subject;
    });
  }
);

Cypress.Commands.add(
  'validateContrast',
  {
    prevSubject: true,
  },
  (subject, expectedLevel: ContrastLevel = 'AA') => {
    return cy.wrap(subject).then($el => {
      const el = $el[0] as Element;
      const styles = getComputedStyle(el);

      const textColor = styles.color;
      const backgroundColor = getEffectiveBackgroundColor(el);

      const ratio = getContrastRatio(textColor, backgroundColor);
      const actualLevel = getContrastLevel(ratio || 0);

      const taskRecord = createTaskRecord(
        actualLevel === expectedLevel ? 'check' : 'violation',
        actualLevel === expectedLevel ? 'contrast-pass' : 'contrast-fail',
        'contrast',
        `Ratio: ${ratio?.toFixed(2) || 'N/A'}`,
        el.tagName.toLowerCase(),
        {
          property: 'contrast',
          expected: expectedLevel,
        }
      );

      return cy
      .task('uiux:record', taskRecord)
      .then(() => {

      if (!ratio) {
        throw new Error(
          `Unable to calculate contrast ratio. Text color: ${textColor}, Background: ${backgroundColor}`
        );
      }

      const actualRank = CONTRAST_RANK[actualLevel];
      const expectedRank = CONTRAST_RANK[expectedLevel];

      expect(
        actualRank,
        `Contrast ratio ${ratio.toFixed(2)}:1 meets ${expectedLevel} standard (actual: ${actualLevel})`
      ).to.be.gte(expectedRank);


      return subject;
      });
    });
  }
);

Cypress.Commands.add(
  'validateTypography',
  { prevSubject: true },
  (subject, tokenName: string) => {
    const rootFontSize = Number.parseFloat(
      getComputedStyle(document.documentElement).fontSize
    ) || 16;

    return cy.wrap(subject).then($el => {
      const el = $el[0] as Element;
      const styles = getComputedStyle(el);

      const typographyProps = ['font-size', 'font-weight', 'line-height', 'letter-spacing', 'font-family'];

      typographyProps.forEach(prop => {
        const tokenValue = getTokenValue(tokenName, prop);
        const actual = styles.getPropertyValue(prop).trim();
        const isMissing = !tokenValue;
        const isMismatch = prop === 'font-size' || prop === 'line-height' || prop === 'letter-spacing'
          ? !valuesMatch(tokenValue, actual, rootFontSize)
          : actual !== tokenValue;

        const event = isMissing || isMismatch ? 'violation' : 'check';
        const type = isMissing ? 'token-missing' : isMismatch ? 'style-mismatch' : 'style-check';

        const taskRecord = createTaskRecord(
          event,
          type,
          'typography',
          actual,
          el.tagName.toLowerCase(),
          {
            token: tokenName,
            property: prop,
            expected: tokenValue,
          }
        );

        cy.task('uiux:record', taskRecord);

        if (isMissing) {
          throw new Error(
            `CSS variable '${tokenToCssVar(tokenName)}-${prop}' is not defined.`
          );
        }
      });

      return subject;
    });
  }
);

Cypress.Commands.add(
  'runLighthouseAudit',
  (url: string, options: unknown = {}) => {
    return cy
      .task('lighthouse:run', { url, options })
      .as('lhReport')
      .then(report => report);
  }
);
