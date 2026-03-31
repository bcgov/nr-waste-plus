/* eslint-disable no-undef */
/// <reference types="cypress" />

import {
  getTokenDefinition,
  valuesMatch,
  getTaxonomy,
  createTaskRecord,
  TOKEN_STYLE_PROPERTIES,
  getContrastRatio,
  getContrastLevel,
  type ContrastLevel,
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
    return cy.window().then(appWindow => {
      const rootFontSize = Number.parseFloat(
        appWindow.getComputedStyle(appWindow.document.documentElement).fontSize
      ) || 16;

      return cy.wrap(subject).then($el => {
        const el = $el[0] as Element;
        const appStyles = appWindow.getComputedStyle(el);

        const propertiesToCheck = property
          ? [property]
          : TOKEN_STYLE_PROPERTIES;

        const results = propertiesToCheck.map(prop => {
          const { value: tokenValue, found } = getTokenDefinition(tokenName, prop, appWindow);
          const actual = appStyles.getPropertyValue(prop).trim();
          const isMissing = !found;
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
          };
        });

        const firstMissing = results.find(r => r.isMissing);
        if (firstMissing) {
          throw new Error(
            `Token '${tokenName}' is not defined for ${firstMissing.property}. ` +
              `Tried: --cds-${tokenName.replace('$', '')}-${firstMissing.property} and --cds-${tokenName.replace('$', '')}`
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
    });
  }
);

Cypress.Commands.add(
  'validateStyle',
  { prevSubject: true },
  (subject, tokenName: string, cssProperty: string) => {
    return cy.window().then(appWindow => {
      const rootFontSize = Number.parseFloat(
        appWindow.getComputedStyle(appWindow.document.documentElement).fontSize
      ) || 16;

      return cy.wrap(subject).then($el => {
        const el = $el[0] as Element;
        const appStyles = appWindow.getComputedStyle(el);

        const { value: tokenValue, found } = getTokenDefinition(tokenName, cssProperty, appWindow);
        const actual = appStyles.getPropertyValue(cssProperty).trim();
        const isMissing = !found;
        const isMismatch = !valuesMatch(tokenValue, actual, rootFontSize);
        
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

        return cy.task('uiux:record', taskRecord).then(() => {
          if (isMissing) {
            throw new Error(
              `Token '${tokenName}' is not defined. ` +
                `Tried: --cds-${tokenName.replace('$', '')}-${cssProperty} and --cds-${tokenName.replace('$', '')}`
            );
          }

          expect(isMismatch,
            `Element ${cssProperty} is '${actual}', expected '${tokenValue}' from token '${tokenName}'`
          ).to.be.false;

          return subject;
        });
      });
    });
  }
);

Cypress.Commands.add(
  'validateSpacing',
  { prevSubject: true },
  (subject, tokenName: string, side?: 'top' | 'right' | 'bottom' | 'left' | 'all') => {
    return cy.window().then(appWindow => {
      const rootFontSize = Number.parseFloat(
        appWindow.getComputedStyle(appWindow.document.documentElement).fontSize
      ) || 16;

      return cy.wrap(subject).then($el => {
        const el = $el[0] as Element;
        const appStyles = appWindow.getComputedStyle(el);

        const getSidePadding = (cssSide: string): number => {
          const value = appStyles.getPropertyValue(`padding-${cssSide}`).trim() || '0px';
          const numValue = parseFloat(value);
          if (value.endsWith('rem')) return numValue * rootFontSize;
          if (value.endsWith('em')) return numValue * rootFontSize;
          return numValue;
        };

        const padding = {
          top: getSidePadding('top'),
          right: getSidePadding('right'),
          bottom: getSidePadding('bottom'),
          left: getSidePadding('left'),
        };

        const checkSpacing = (
          token: string,
          actual: string,
          cssSide: 'top' | 'right' | 'bottom' | 'left' | 'all'
        ) => {
          const propName = cssSide === 'all' ? 'padding' : `padding-${cssSide}`;
          const { value: tokenValue, found } = getTokenDefinition(token, propName, appWindow);
          const isMissing = !found;
          const isMismatch = !valuesMatch(tokenValue, actual, rootFontSize);

          const event = isMissing || isMismatch ? 'violation' : 'check';
          const type = isMissing ? 'token-missing' : isMismatch ? 'style-mismatch' : 'style-check';

          const taskRecord = createTaskRecord(
            event,
            type,
            'spacing',
            actual,
            el.tagName.toLowerCase(),
            {
              token,
              property: propName,
              expected: tokenValue,
            }
          );

          cy.task('uiux:record', taskRecord);

          if (isMissing) {
            throw new Error(
              `Token '${token}' is not defined for ${propName}. ` +
                `Tried: --cds-${token.replace('$', '')}-${propName} and --cds-${token.replace('$', '')}`
            );
          }

          expect(isMismatch,
            `Element ${propName} is '${actual}', expected '${tokenValue}' from token '${token}'`
          ).to.be.false;
        };

        if (side && side !== 'all') {
          const actual = `${padding[side]}px`;
          checkSpacing(tokenName, actual, side);
        } else {
          (['top', 'right', 'bottom', 'left'] as const).forEach(s => {
            const actual = `${padding[s]}px`;
            checkSpacing(tokenName, actual, s);
          });
        }

        return subject;
      });
    });
  }
);

Cypress.Commands.add(
  'validateMargin',
  { prevSubject: true },
  (subject, tokenName: string, side?: 'top' | 'right' | 'bottom' | 'left' | 'all') => {
    return cy.window().then(appWindow => {
      const rootFontSize = Number.parseFloat(
        appWindow.getComputedStyle(appWindow.document.documentElement).fontSize
      ) || 16;

      return cy.wrap(subject).then($el => {
        const el = $el[0] as Element;
        const appStyles = appWindow.getComputedStyle(el);

        const getSideMargin = (cssSide: string): number => {
          const value = appStyles.getPropertyValue(`margin-${cssSide}`).trim() || '0px';
          const numValue = parseFloat(value);
          if (value.endsWith('rem')) return numValue * rootFontSize;
          if (value.endsWith('em')) return numValue * rootFontSize;
          return numValue;
        };

        const margin = {
          top: getSideMargin('top'),
          right: getSideMargin('right'),
          bottom: getSideMargin('bottom'),
          left: getSideMargin('left'),
        };

        const checkMargin = (
          token: string,
          actual: string,
          cssSide: 'top' | 'right' | 'bottom' | 'left' | 'all'
        ) => {
          const propName = cssSide === 'all' ? 'margin' : `margin-${cssSide}`;
          const { value: tokenValue, found } = getTokenDefinition(token, propName, appWindow);
          const isMissing = !found;
          const isMismatch = !valuesMatch(tokenValue, actual, rootFontSize);

          const event = isMissing || isMismatch ? 'violation' : 'check';
          const type = isMissing ? 'token-missing' : isMismatch ? 'style-mismatch' : 'style-check';

          const taskRecord = createTaskRecord(
            event,
            type,
            'spacing',
            actual,
            el.tagName.toLowerCase(),
            {
              token,
              property: propName,
              expected: tokenValue,
            }
          );

          cy.task('uiux:record', taskRecord);

          if (isMissing) {
            throw new Error(
              `Token '${token}' is not defined for ${propName}. ` +
                `Tried: --cds-${token.replace('$', '')}-${propName} and --cds-${token.replace('$', '')}`
            );
          }

          expect(isMismatch,
            `Element ${propName} is '${actual}', expected '${tokenValue}' from token '${token}'`
          ).to.be.false;
        };

        if (side && side !== 'all') {
          const actual = `${margin[side]}px`;
          checkMargin(tokenName, actual, side);
        } else {
          (['top', 'right', 'bottom', 'left'] as const).forEach(s => {
            const actual = `${margin[s]}px`;
            checkMargin(tokenName, actual, s);
          });
        }

        return subject;
      });
    });
  }
);

Cypress.Commands.add(
  'validateColor',
  { prevSubject: true },
  (subject, tokenName: string, property: 'color' | 'background-color' | 'border-color') => {
    return cy.window().then(appWindow => {
      return cy.wrap(subject).then($el => {
        const el = $el[0] as Element;
        const appStyles = appWindow.getComputedStyle(el);

        const { value: tokenValue, found } = getTokenDefinition(tokenName, property, appWindow);
        const actual = appStyles.getPropertyValue(property).trim();
        const isMissing = !found;
        const isMismatch = !valuesMatch(tokenValue, actual);

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

        return cy.task('uiux:record', taskRecord).then(() => {
          if (isMissing) {
            throw new Error(
              `Token '${tokenName}' is not defined. ` +
                `Tried: --cds-${tokenName.replace('$', '')}-${property} and --cds-${tokenName.replace('$', '')}`
            );
          }

          expect(isMismatch,
            `Element ${property} is '${actual}', expected '${tokenValue}' from token '${tokenName}'`
          ).to.be.false;

          return subject;
        });
      });
    });
  }
);

Cypress.Commands.add(
  'validateContrast',
  {
    prevSubject: true,
  },
  (subject, expectedLevel: ContrastLevel = 'AA') => {
    return cy.window().then(appWindow => {
      return cy.wrap(subject).then($el => {
        const el = $el[0] as Element;
        const appStyles = appWindow.getComputedStyle(el);

        const textColor = appStyles.color;
        const backgroundColor = getEffectiveBackgroundColor(el, appWindow);

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

        return cy.task('uiux:record', taskRecord).then(() => {
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
    });
  }
);

Cypress.Commands.add(
  'validateTypography',
  { prevSubject: true },
  (subject, tokenName: string) => {
    return cy.window().then(appWindow => {
      const rootFontSize = Number.parseFloat(
        appWindow.getComputedStyle(appWindow.document.documentElement).fontSize
      ) || 16;

      return cy.wrap(subject).then($el => {
        const el = $el[0] as Element;
        const appStyles = appWindow.getComputedStyle(el);

        const typographyProps = ['font-size', 'font-weight', 'line-height', 'letter-spacing', 'font-family'];

        typographyProps.forEach(prop => {
          const { value: tokenValue, found } = getTokenDefinition(tokenName, prop, appWindow);
          const actual = appStyles.getPropertyValue(prop).trim();
          const isMissing = !found;
          const isMismatch = !valuesMatch(tokenValue, actual, rootFontSize);

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
              `Token '${tokenName}' is not defined for ${prop}. ` +
                `Tried: --cds-${tokenName.replace('$', '')}-${prop} and --cds-${tokenName.replace('$', '')}`
            );
          }

          expect(isMismatch,
            `Element ${prop} is '${actual}', expected '${tokenValue}' from token '${tokenName}'`
          ).to.be.false;
        });

        return subject;
      });
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

function getEffectiveBackgroundColor(el: Element, appWindow: Window): string {
  let current: Element | null = el;

  while (current) {
    const bg = appWindow.getComputedStyle(current).backgroundColor;

    if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
      return bg;
    }

    current = current.parentElement;
  }

  return 'rgb(255, 255, 255)';
}
