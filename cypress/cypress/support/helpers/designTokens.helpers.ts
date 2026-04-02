import { 
  CONTRAST_RANK,
  ContrastLevel,
  createTaskRecord,
  getAllTokenDefinitions,
  getContrastLevel,
  getContrastRatio,
  getEffectiveBackgroundColor,
  getTaxonomy,
  getTokenDefinition,
  propertyFromToken,
  valuesMatch
} from "./tokens.helpers";

export const validateStyle = (subject: any, tokenName: string, cssProperty: string) => {
  return cy.window().then(appWindow => {
    const rootFontSize = Number.parseFloat(
        appWindow.getComputedStyle(appWindow.document.documentElement).fontSize
      ) || 16;
      
      return cy.wrap(subject).then($el => {
        const el = $el[0] as Element;
        const appStyles = appWindow.getComputedStyle(el);

        const { value: tokenValue, found } = getTokenDefinition(tokenName, cssProperty, appWindow, true);
        const actual = appStyles.getPropertyValue(cssProperty).trim();
        const isMissing = !found;
        const isMismatch = !valuesMatch(tokenValue, actual, rootFontSize);

        const event = isMissing || isMismatch ? 'violation' : 'check';
        const mismatchValue = isMismatch ? 'style-mismatch' : 'style-check';
        const type = isMissing ? 'token-missing' : mismatchValue;

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
          expect(isMissing,
              `Token '${tokenName}' is not defined. ` +
                `Tried: --cds-${tokenName.replace('$', '')}-${cssProperty} and --cds-${tokenName.replace('$', '')}`
            ).to.be.false;

          expect(isMismatch,
            `Element ${cssProperty} is '${actual}', expected '${tokenValue}' from token '${tokenName}'`
          ).to.be.false;

          return subject;
        });
      });
  });
};

export const validateTokenStyle = (subject: any, tokenName: string) => {
    return cy.window().then(appWindow => {
      const rootFontSize = Number.parseFloat(
        appWindow.getComputedStyle(appWindow.document.documentElement).fontSize
      ) || 16;

      return cy.wrap(subject).then($el => {
        const el = $el[0] as Element;
        const appStyles = appWindow.getComputedStyle(el);

        const tokenDefinitions = getAllTokenDefinitions(tokenName, appWindow);
          
        const results = Object.entries(tokenDefinitions).map(([property, tokenValue]) => {
          const prop = propertyFromToken(tokenName, property);          
          const actual = appStyles.getPropertyValue(prop).trim();
          const isMissing = !actual;
          const isMismatch = !valuesMatch(tokenValue as string, actual, rootFontSize);

          const event = isMissing || isMismatch ? 'violation' : 'check';
          const mismatchValue = isMismatch ? 'token-style-mismatch' : 'style-check';
          const type = isMissing ? 'token-missing' : mismatchValue;

          const taskRecord = createTaskRecord(
            event,
            type,
            getTaxonomy(prop),
            actual,
            el.tagName.toLowerCase(),
            {
              token: tokenName,
              property: prop,
              expected: tokenValue as string,
            }
          );

          cy.task('uiux:record', taskRecord);

          return {
            property: prop,
            tokenValue: tokenValue as string,
            actual,
            isMissing,
            isMismatch,
          };
        });

        if(results.length === 0) {
          expect(results.length, `No token definitions found for token '${tokenName}'`).to.be.greaterThan(0);
        } 

        const firstMissing = results.find(r => r.isMissing);
        if (firstMissing) {
          expect(firstMissing.isMissing,
            `Token '${tokenName}' is missing definition for property '${firstMissing.property}'. ` +
              `Tried: --cds-${tokenName.replace('$', '')}-${firstMissing.property} and --cds-${tokenName.replace('$', '')}`
          ).to.be.false;
        }

        const mismatches = results.filter(r => r.isMismatch);
        if (mismatches.length > 0) {
          const details = mismatches
            .map(m => `${m.property}: got '${m.actual}', expected '${m.tokenValue}'`)
            .join('; ');
            expect(mismatches.length,
            `Element has ${mismatches.length} style mismatches for token '${tokenName}': ${details}`
          ).to.equal(0);
        }
        return subject;
      });
    });
};

export const validateContrast = (subject: any, expectedLevel: ContrastLevel = 'AA') => {
  return cy.window().then(appWindow => {
    return cy.wrap(subject).then($el => {
      const el = $el[0] as Element;
      const appStyles = appWindow.getComputedStyle(el);

      const textColor = appStyles.color;
      const backgroundColor = getEffectiveBackgroundColor(el, appWindow);

      const ratio = getContrastRatio(textColor, backgroundColor);
      const actualLevel = getContrastLevel(ratio || 0);

      const taskRecord = createTaskRecord(
        actualLevel >= expectedLevel ? 'check' : 'violation',
        actualLevel >= expectedLevel ? 'contrast-pass' : 'contrast-fail',
        'contrast',
        `Ratio: ${ratio?.toFixed(2) || 'N/A'} ${actualLevel}`,
        el.tagName.toLowerCase(),
        {
          property: 'contrast',
          expected: expectedLevel,
        }
      );

      return cy.task('uiux:record', taskRecord).then(() => {
        expect(ratio,
          `Unable to calculate contrast ratio. Text color: ${textColor}, Background: ${backgroundColor}`
        ).to.not.be.undefined;

        const actualRank = CONTRAST_RANK[actualLevel];
        const expectedRank = CONTRAST_RANK[expectedLevel];

        expect(
          actualRank,
          `Contrast ratio ${(ratio || 0).toFixed(2)}:1 meets ${expectedLevel} standard (actual: ${actualLevel})`
        ).to.be.gte(expectedRank);

        return subject;
      });
    });
  });
};

export const validateTypography = (subject: any, tokenName: string) => {
  return cy.window().then(appWindow => {
    const rootFontSize = Number.parseFloat(
      appWindow.getComputedStyle(appWindow.document.documentElement).fontSize
    ) || 16;

    return cy.wrap(subject).then($el => {
      const el = $el[0] as Element;
      const appStyles = appWindow.getComputedStyle(el);

      const typographyProps = ['font-size', 'font-weight', 'line-height', 'letter-spacing', 'font-family'];
      const allTokens = getAllTokenDefinitions(tokenName, appWindow);

      typographyProps.forEach(prop => {
        const check = allTokens[prop] === undefined
          ? getTokenDefinition(tokenName, prop, appWindow, false)
          : { value: allTokens[prop] as string, found: true, source: 'property' };

        const { value: tokenValue, found } = check;

        const actual = appStyles.getPropertyValue(prop).trim();
        const isMissing = !found;
        const isMismatch = !valuesMatch(tokenValue, actual, rootFontSize);

        const event = isMissing || isMismatch ? 'violation' : 'check';
        const mismatchValue = isMismatch ? 'typography-mismatch' : 'typography-check';        
        const type = isMissing ? 'token-missing' : mismatchValue;

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

        expect(found, `Token '${tokenName}' is not defined for ${prop}. ` +
              `Tried: --cds-${tokenName.replace('$', '')}-${prop} and --cds-${tokenName.replace('$', '')}`
            ).to.be.true;        

        expect(isMismatch,
          `Element ${prop} is '${actual}', expected '${tokenValue}' from token '${tokenName}'`
        ).to.be.false;
      });

      return subject;
    });
  });
};