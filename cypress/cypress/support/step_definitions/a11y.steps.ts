import { Then, When } from "@badeball/cypress-cucumber-preprocessor";

import { 
  runA11yCheck,
  resolveRegionSelector,
  findFocusableElement,
  liveRegionSelectors,
  normalizeSpace,
  findLiveRegion,
  getFocusableAccessibleName,
  findInputElement
} from "../helpers";

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
  findInputElement(label).should("have.focus");
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
    $body.get(0).focus();
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
