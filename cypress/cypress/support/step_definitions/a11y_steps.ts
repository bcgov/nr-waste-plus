import { Then, When } from "@badeball/cypress-cucumber-preprocessor";

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

const runA11yCheck = (context: string | null, checkType: "page" | "region", scope: string) => {
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

const resolveRegionSelector = (region: string): Cypress.Chainable<string> => {
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

const findFocusableElement = (label: string): Cypress.Chainable<JQuery<HTMLElement>> => {
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

    const placeholder = cy.get('body').find(`input[placeholder="${label}"]`);
    if (placeholder) {
      return placeholder;
    }

    throw new Error(`Unable to find a focusable element for label/text "${exactLabel}".`);
  });
};

Then("the page should have no accessibility violations", () => {
  runA11yCheck(null, "page", "page");
});

Then("the {string} region should have no accessibility violations", (region: string) => {
  resolveRegionSelector(region).then((selector) => {
    runA11yCheck(selector, "region", selector);
  });
});

When("I press {string} {int} times", (key: string, times: number) => {
  if (times < 1) {
    throw new Error("Number of key presses must be at least 1.");
  }

  for (let index = 0; index < times; index += 1) {
    cy.realPress(key as any);
  }
});

Then("the {string} input should be focused", (label: string) => {
  findFocusableElement(label).should("have.focus");
});
