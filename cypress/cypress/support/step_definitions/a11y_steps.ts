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

const liveRegionSelectors = [
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

const getFocusableAccessibleName = (element: HTMLElement, doc: Document): string => {
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

const normalizeSpace = (value: string): string => collapseWhitespace(value);

const findLiveRegion = (region: string): Cypress.Chainable<JQuery<HTMLElement>> => {
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

const findInputElement = (inputIdentifier: string): Cypress.Chainable<JQuery<HTMLElement>> => {
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

    const placeholderElement = asHTMLElement(doc.querySelector(`input[placeholder='${exactLabel}']`));
    if (placeholderElement) {
      return cy.wrap(placeholderElement);
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

Then("the page should have at least one ARIA live region", () => {
  cy.get(liveRegionSelectors).should("have.length.greaterThan", 0);
});

Then("the {string} live region should announce {string}", (region: string, announcement: string) => {
  const expectedAnnouncement = normalizeSpace(announcement);

  findLiveRegion(region)
    .should(($region) => {
      const ariaLive = $region.attr("aria-live");
      const role = $region.attr("role");
      const isLive = Boolean(ariaLive) || role === "status" || role === "alert" || role === "log";
      expect(isLive, "selected region should be announced by screen readers").to.equal(true);
    })
    .should(($region) => {
      const text = normalizeSpace($region.text());
      expect(text, "live region announcement").to.include(expectedAnnouncement);
    });
});

Then("the screen reader announcement should include {string}", (expectedText: string) => {
  const normalizedExpectedText = normalizeSpace(expectedText);

  cy.get(liveRegionSelectors).then(($regions) => {
    const matchingRegion = Array.from($regions).find((region) =>
      normalizeSpace(region.textContent || "").includes(normalizedExpectedText)
    );

    expect(matchingRegion, `announcement including "${expectedText}"`).to.exist;
  });
});

Then("the page should announce itself on load as {string}", (expectedAnnouncement: string) => {
  const normalizedExpectedAnnouncement = normalizeSpace(expectedAnnouncement).toLowerCase();

  cy.document().then((doc) => {
    const pageTitle = normalizeSpace(doc.title).toLowerCase();
    const mainHeading = normalizeSpace(doc.querySelector("h1")?.textContent || "").toLowerCase();
    const landmarks = Array.from(doc.querySelectorAll("main, [role='main'], [aria-label], [aria-labelledby]"));

    const landmarkText = landmarks
      .map((element) => (element instanceof HTMLElement ? getFocusableAccessibleName(element, doc) : "").toLowerCase())
      .join(" ");

    const matched =
      pageTitle.includes(normalizedExpectedAnnouncement) ||
      mainHeading.includes(normalizedExpectedAnnouncement) ||
      landmarkText.includes(normalizedExpectedAnnouncement);

    expect(matched, `page load announcement should include "${expectedAnnouncement}"`).to.equal(true);
  });
});

Then("the {string} region should have a valid heading hierarchy", (region: string) => {
  resolveRegionSelector(region).then((selector) => {
    cy.get(selector).then(($region) => {
      const headings = $region.find("h1, h2, h3, h4, h5, h6").toArray();

      if (headings.length === 0) {
        throw new Error(`No headings found in region "${region}".`);
      }

      let previousLevel = 0;
      headings.forEach((heading) => {
        const currentLevel = Number.parseInt(heading.tagName.slice(1), 10);
        if (previousLevel > 0 && currentLevel - previousLevel > 1) {
          throw new Error(
            `Invalid heading order in region "${region}": ${heading.tagName.toLowerCase()} appears after h${previousLevel}.`
          );
        }

        previousLevel = currentLevel;
      });
    });
  });
});

Then("the focus order should be {string}", (expectedOrder: string) => {
  const expectedLabels = expectedOrder
    .split(",")
    .map((entry) => normalizeSpace(entry))
    .filter(Boolean);

  if (expectedLabels.length === 0) {
    throw new Error("Expected focus order must contain at least one item.");
  }

  cy.get("body").then(($body) => {
    ($body.get(0) as HTMLBodyElement).focus();
  });

  expectedLabels.forEach((expectedLabel) => {
    cy.realPress("Tab");
    findFocusableElement(expectedLabel).should("have.focus");
  });
});

Then("the {string} input should be announced as {string}", (inputIdentifier: string, expectedLabel: string) => {
  const normalizedExpectedLabel = normalizeSpace(expectedLabel).toLowerCase();

  findInputElement(inputIdentifier).then(($input) => {
    const element = $input.get(0);
    if (!(element instanceof HTMLElement)) {
      throw new TypeError(`Unable to resolve input "${inputIdentifier}".`);
    }

    cy.document().then((doc) => {
      const accessibleName = normalizeSpace(getFocusableAccessibleName(element, doc)).toLowerCase();
      expect(accessibleName, `accessible name for "${inputIdentifier}"`).to.include(normalizedExpectedLabel);
    });
  });
});

Then("the error message {string} should be announced", (errorText: string) => {
  const normalizedErrorText = normalizeSpace(errorText);

  cy.get("body").then(($body) => {
    const selector = [
      "[role='alert']",
      "[aria-live='assertive']",
      "[aria-live='polite']",
      "[aria-invalid='true']",
      "[aria-errormessage]",
    ].join(", ");

    const announcementNodes = $body.find(selector).toArray();
    const announced = announcementNodes.some((node) =>
      normalizeSpace(node.textContent || "").includes(normalizedErrorText)
    );

    expect(announced, `error announcement including "${errorText}"`).to.equal(true);
  });
});
