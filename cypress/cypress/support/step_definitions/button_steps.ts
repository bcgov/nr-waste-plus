import { When, BeforeStep } from "@badeball/cypress-cucumber-preprocessor";

let idir = true;

BeforeStep({ tags: "@loginAsBCeID" }, function () {
  idir = false;
});
BeforeStep({ tags: "@loginAsIDIR" }, function () {
  idir = true;
});

/* Button Step */

When('I click on the {string} button', (name: string) => {
  buttonClick(name);
});

When('I click on next', () => {  
  
  if (!idir) {
    cy.get('cds-button[data-text="Next"]').click().then(() => {cy.wait(15);});
  } else {
    cy.intercept('POST',  `**/api/clients/matches`).as('matches');  
    cy.get('cds-button[data-text="Next"]').click().then(() => {cy.wait('@matches',{ timeout: 10 * 1000 });});
  }
  
});

When('I submit', () => {
  if(idir){
  cy.intercept('POST',  `**/api/clients/submissions/staff`).as('submit');
  } else {
    cy.intercept('POST',  `**/api/clients/submissions`).as('submit');
  }
  cy.get('cds-button[data-text="Submit"]').scrollIntoView().click().then(() => {cy.wait('@submit',{ timeout: 60 * 1000 });});  
});


/**
 * Attempts to click a button by trying multiple selectors in priority order.
 * 
 * Cypress commands are NOT Promises — they don't have .catch().
 * Instead, we use $body.find() (synchronous jQuery) to check which selector
 * matches, then use cy.get() on the matched selector for proper Cypress
 * retryability and logging. Includes a retry loop for cases where the
 * element hasn't rendered yet.
 *
 * Selector priority:
 *   1. button[aria-label="<name>"]
 *   2. button:contains("<name>")
 *   3. input[type="submit"][value="<name>"]
 *   4. [data-testid="<name>"]
 *   5. findByRole("button", { name }) — @testing-library fallback
 */
const buttonClick = (
  name: string,
  waitForIntercept: string = '',
  waitForTime: number = 1,
  retries: number = 3,
  retryDelay: number = 100,
  selector: string = 'body'
) => {
  const timeout = waitForTime * 1000;

  // Ordered list of jQuery-compatible selectors to try
  const selectors = [
    `button[aria-label="${name}"]`,
    `button:contains("${name}")`,
    `input[type="submit"][value="${name}"]`,
    `[data-testid="${name}"]`,
    `a:contains("${name}")`,
    `a[aria-label="${name}"]`,
  ];

  const attemptClick = (attempt: number): void => {
    cy.get(selector).then(($body) => {
      const matchedSelector = selectors.find(
        (sel) => $body.find(sel).length > 0
      );

      if (matchedSelector) {
        cy.get(matchedSelector).first().click({ force: true });
      } else if (attempt < retries) {
        // Element may not have rendered yet — wait and retry
        cy.wait(retryDelay);
        attemptClick(attempt + 1);
      } else {
        // Last resort: use @testing-library/cypress findByRole
        // Try button first, then link role — covers <a> acting as buttons
        const nameRegex = new RegExp(name, 'i');
        cy.get('body').then(($body) => {
          const hasButton = Array.from($body.find('button, [role="button"]')).some((el) =>
            nameRegex.test(el.textContent || '') || nameRegex.test(el.getAttribute('aria-label') || '')
          );

          if (hasButton) {
            cy.findByRole('button', { name: nameRegex }).click({ force: true });
          } else {
            cy.findByRole('link', { name: nameRegex }).click({ force: true });
          }
        });
      }
    });
  };

  attemptClick(0);

  if (waitForIntercept) {
    cy.wait(`@${waitForIntercept}`, { timeout });
  } else if (waitForTime) {
    cy.wait(waitForTime);
  }
};
