interface RecordedA11yViolation {
  id: string;
  impact: string;
  nodes: number;
  help: string;
  helpUrl: string;
}

interface AxeViolationInput {
  id: string;
  impact?: string | null;
  nodes?: Array<unknown>;
  help: string;
  helpUrl: string;
}

const focusableSelector = [
  "input",
  "textarea",
  "select",
  "button",
  "a[href]",
  "[tabindex]:not([tabindex='-1'])",
  "[contenteditable='true']",
  "[role='button']",
  "[role='link']",
  "[role='textbox']",
  "[role='combobox']",
].join(", ");

const namedRegionSelectors: Record<string, string> = {
  main: '.layout-grid',
  header: "header",
  footer: "footer",
  navigation: "nav",
  nav: "nav",
  form: "form",
};

export const liveRegionSelectors = [
  "[aria-live]",
  "[role='status']",
  "[role='alert']",
  "[role='log']",
  "[role='marquee']",
  "[role='timer']",
].join(", ");

const toRecordedViolations = (violations: AxeViolationInput[]): RecordedA11yViolation[] => {
  return violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact || "unknown",
    nodes: violation.nodes?.length || 0,
    help: violation.help,
    helpUrl: violation.helpUrl,
  }));
};

const getCurrentTestTitle = (): string => {
  const runnable = (Cypress as unknown as { currentTest?: { titlePath?: Array<string>; title?: string } })
    .currentTest;

  if (Array.isArray(runnable?.titlePath) && runnable.titlePath.length > 0) {
    return runnable.titlePath.join(" ");
  }

  return runnable?.title || "Unknown test";
};

const recordA11yCheck = (
  checkType: "page" | "region",
  scope: string,
  violations: RecordedA11yViolation[]
) => {
  return cy.task("a11y:record", {
    checkType,
    scope,
    testTitle: getCurrentTestTitle(),
    featureFile: Cypress.spec.relative || Cypress.spec.name,
    violationCount: violations.length,
    violations,
    timestamp: new Date().toISOString(),
  });
};

const assertNoViolations = (violations: RecordedA11yViolation[], scope: string) => {
  if (violations.length === 0) {
    return;
  }

  const details = violations
    .map((violation) => `${violation.id} (${violation.impact}, nodes: ${violation.nodes})`)
    .join("; ");

  throw new Error(`Accessibility violations found for ${scope}: ${details}`);
};

export const runA11yCheck = (context: string | null, checkType: "page" | "region", scope: string) => {
  let recordedViolations: RecordedA11yViolation[] = [];

  cy.injectAxe();
  cy.checkA11y(
    context || undefined,
    undefined,
    (violations: AxeViolationInput[]) => {
      recordedViolations = toRecordedViolations(violations);
    },
    true
  );

  cy.then(() => {
    recordA11yCheck(checkType, scope, recordedViolations);
    assertNoViolations(recordedViolations, scope);
  });
};

export const resolveRegionSelector = (region: string): Cypress.Chainable<string> => {
  const trimmedRegion = region.trim();
  const regionKey = trimmedRegion.toLowerCase();
  const selectorCandidates: string[] = [];
  
  if (namedRegionSelectors[regionKey]) {
    selectorCandidates.push(namedRegionSelectors[regionKey]);
  }

  selectorCandidates.push(
    trimmedRegion,
    `[aria-label='${trimmedRegion}']`,
    `[data-testid='${trimmedRegion}']`,
    `[role='region'][aria-label='${trimmedRegion}']`
  );
  
  // Wait for React to finish rendering before probing selectors
  return cy.get('div#root *:first', { timeout: 10000 }).then(() => {
    return cy.document().then((doc) => {
      for (const selector of selectorCandidates) {
        try {
          if (doc.querySelector(selector)) {
            return selector;
          }
        } catch {
          continue;
        }
      }

      throw new Error(`Unable to resolve region "${trimmedRegion}" for accessibility check.`);
    });
  });
};

const collapseWhitespace = (value: string): string => {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
};

const getElementText = (element: Element | null): string => {
  return collapseWhitespace(element?.textContent || "");
};

export const getFocusableAccessibleName = (element: HTMLElement, doc: Document): string => {
  const ariaLabel = element.getAttribute("aria-label")?.trim();
  if (ariaLabel) {
    return ariaLabel;
  }

  const ariaLabelledBy = element.getAttribute("aria-labelledby");
  if (ariaLabelledBy) {
    const joined = ariaLabelledBy
      .split(" ")
      .map((id) => getElementText(doc.getElementById(id)))
      .filter(Boolean)
      .join(" ")
      .trim();

    if (joined) {
      return joined;
    }
  }

  const id = element.getAttribute("id");
  if (id) {
    const label = doc.querySelector(`label[for='${id}']`);
    const labelText = getElementText(label);
    if (labelText) {
      return labelText;
    }
  }

  const wrappedLabelText = getElementText(element.closest("label"));
  if (wrappedLabelText) {
    return wrappedLabelText;
  }

  const placeholder = element.getAttribute("placeholder")?.trim();
  if (placeholder) {
    return placeholder;
  }

  return getElementText(element);
};

export const normalizeSpace = (value: string): string => collapseWhitespace(value);

export const findLiveRegion = (region: string): Cypress.Chainable<JQuery<HTMLElement>> => {
  const trimmedRegion = region.trim();

  if (trimmedRegion.startsWith(".") || trimmedRegion.startsWith("#") || trimmedRegion.startsWith("[")) {
    return cy.get(trimmedRegion).first();
  }

  const byRole = `[role='${trimmedRegion}']`;
  const byAriaLabel = `[aria-label='${trimmedRegion}']`;
  const byTestId = `[data-testid='${trimmedRegion}']`;

  return cy
    .get("body")
    .find(`${byRole}, ${byAriaLabel}, ${byTestId}`)
    .first()
    .then(($found) => {
      if ($found.length > 0) {
        return cy.wrap($found);
      }

      return cy.contains(liveRegionSelectors, trimmedRegion).first();
    });
};

export const findInputElement = (inputIdentifier: string): Cypress.Chainable<JQuery<HTMLElement>> => {
  const trimmed = inputIdentifier.trim();

  if (trimmed.startsWith(".") || trimmed.startsWith("#") || trimmed.startsWith("[")) {
    return cy.get(trimmed).first();
  }

  return cy
    .get("body")
    .find(
      `#${trimmed}, [name='${trimmed}'], [data-testid='${trimmed}'], input[placeholder='${trimmed}'], textarea[placeholder='${trimmed}'], [aria-label='${trimmed}']`
    )
    .first()
    .then(($found) => {
      if ($found.length > 0) {
        return cy.wrap($found);
      }

      return findFocusableElement(trimmed);
    });
};

export const findFocusableElement = (label: string): Cypress.Chainable<JQuery<HTMLElement>> => {
  const exactLabel = label.trim();

  return cy.document().then((doc) => {
    const asHTMLElement = (element: Element | null): HTMLElement | null => {
      if (element instanceof HTMLElement) {
        return element;
      }

      return null;
    };

    const labelElement = Array.from(doc.querySelectorAll("label")).find(
      (candidate) => candidate.textContent?.trim() === exactLabel
    );

    if (labelElement) {
      const htmlFor = labelElement.getAttribute("for");
      if (htmlFor) {
        const input = asHTMLElement(doc.getElementById(htmlFor));
        if (input) {
          return cy.wrap(input);
        }
      }

      const containerFocusable = asHTMLElement(
        labelElement.closest(".cds--form-item, .cds--list-box, .cds--search, div")?.querySelector(focusableSelector) || null
      );
      if (containerFocusable) {
        return cy.wrap(containerFocusable);
      }
    }

    const ariaLabelElement = asHTMLElement(doc.querySelector(`[aria-label='${exactLabel}']`));
    if (ariaLabelElement) {
      return cy.wrap(ariaLabelElement);
    }

    const ariaLabelledByElement = Array.from(doc.querySelectorAll<HTMLElement>(focusableSelector)).find(
      (candidate) => {
        const labelledBy = candidate.getAttribute("aria-labelledby");
        if (!labelledBy) {
          return false;
        }

        return labelledBy
          .split(" ")
          .map((id) => doc.getElementById(id)?.textContent?.trim())
          .includes(exactLabel);
      }
    );

    if (ariaLabelledByElement) {
      return cy.wrap(ariaLabelledByElement);
    }

    const textMatchedFocusable = Array.from(doc.querySelectorAll<HTMLElement>(focusableSelector)).find(
      (candidate) => candidate.textContent?.trim() === exactLabel
    );

    if (textMatchedFocusable) {
      return cy.wrap(textMatchedFocusable);
    }

    const placeholderElement = asHTMLElement(doc.querySelector(`input[placeholder='${exactLabel}']`));
    if (placeholderElement) {
      return cy.wrap(placeholderElement);
    }

    throw new Error(`Unable to find a focusable element for label/text "${exactLabel}".`);
  });
};
