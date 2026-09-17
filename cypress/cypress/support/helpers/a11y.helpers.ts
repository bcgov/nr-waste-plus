import type axe from "axe-core";

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

export const injectAxe = (): void => {
  cy.window({ log: false }).then((win) => {
    if (!(win as unknown as { axe?: typeof axe }).axe) {
      cy.task<string>("a11y:getSource").then((source) => {
        (win as unknown as { eval: (code: string) => void }).eval(source);
      });
    }
  });
};

const isValidSelector = (selector: string): boolean => {
  try {
    document.createDocumentFragment().querySelector(selector);
    return true;
  } catch {
    return false;
  }
};

export const runA11yCheck = (context: string | null, checkType: "page" | "region", scope: string) => {
  cy.get('[data-testid="loading"]', { timeout: 10000 }).should('not.exist');
  injectAxe();

  cy.window({ log: false })
    .then((win) => {
      const axeInstance = (win as unknown as { axe?: typeof axe }).axe;
      if (!axeInstance) {
        throw new Error("axe-core was not injected into the application window.");
      }
      return axeInstance.run(context || win.document);
    })
    .then((results) => {
      const violations = results.violations ?? [];
      if (violations.length > 0) {
        violations.forEach((v) => {
          const selectors = v.nodes
            .map((node) => Array.isArray(node.target) ? node.target.join(" ") : String(node.target))
            .join(", ");
          Cypress.log({
            name: "a11y error!",
            message: `${v.id} on ${v.nodes.length} Node(s): ${selectors}`,
            consoleProps: () => v,
          });
        });
      }

      const recordedViolations = toRecordedViolations(violations as unknown as AxeViolationInput[]);
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
  
  const validCandidates = selectorCandidates.filter(isValidSelector);
  const combinedSelector = validCandidates.length > 0 ? validCandidates.join(", ") : trimmedRegion;

  // Wait for the region element to be present in the DOM and any loading overlay to clear
  return cy.get(combinedSelector, { timeout: 15000 }).then(() => {
    cy.get('[data-testid="loading"]', { timeout: 10000 }).should('not.exist');
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

  cy.get('[data-testid="loading"]', { timeout: 10000 }).should('not.exist');
  return cy.get('div#root', { timeout: 10000 }).then(($root) => {
    console.log(`Finding focusable element for label/text: "${exactLabel}"`, $root);
    const asHTMLElement = (element: Element | null): HTMLElement | null => {
      if (element instanceof HTMLElement) {
        return element;
      }

      return null;
    };

    const labelElement = Array.from($root.find("label")).find(
      (candidate) => candidate.textContent?.trim() === exactLabel
    );

    if (labelElement) {
      const htmlFor = labelElement.getAttribute("for");
      if (htmlFor) {
        const input = asHTMLElement($root.find(`#${htmlFor}`)[0]);
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

    const ariaLabelElement = asHTMLElement($root.find(`[aria-label='${exactLabel}']`)[0]);
    if (ariaLabelElement) {
      return cy.wrap(ariaLabelElement);
    }

    const ariaLabelledByElement = Array.from($root.find(focusableSelector)).find(
      (candidate) => {
        const labelledBy = candidate.getAttribute("aria-labelledby");
        if (!labelledBy) {
          return false;
        }

        return labelledBy
          .split(" ")
          .map((id) => $root.find(`#${id}`)[0]?.textContent?.trim())
          .includes(exactLabel);
      }
    );

    if (ariaLabelledByElement) {
      return cy.wrap(ariaLabelledByElement);
    }

    const textMatchedFocusable = Array.from($root.find(focusableSelector)).find(
      (candidate) => candidate.textContent?.trim() === exactLabel
    );

    if (textMatchedFocusable) {
      return cy.wrap(textMatchedFocusable);
    }

    const placeholderElement = asHTMLElement($root.find(`input[placeholder='${exactLabel}']`)[0]);
    if (placeholderElement) {
      return cy.wrap(placeholderElement);
    }

    throw new Error(`Unable to find a focusable element for label/text "${exactLabel}".`);
  });
};
