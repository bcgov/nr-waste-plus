import { When, Step } from "@badeball/cypress-cucumber-preprocessor";
import { findButton } from "../../helpers";

When('I click on the {string} button', (name: string) => {
  buttonClick(name);
});

When('I search', function () {
  // The search table reads `plainFilters` from parent state which lags one render
  // behind WasteSearchFilters' internal state (child setFilters -> useEffect
  // onChange -> parent setFilters). Typing then immediately clicking Search can
  // therefore see stale (empty) filters and either send no request or an
  // unfiltered one. `useWasteSearchFilters` now propagates synchronously but we
  // also gate on URL sync as an observable barrier: useSyncFiltersToSearchParams
  // navigates to `?mainSearchTerm=...&district=...` shortly after filters settle.
  // Poll window.location for "?" up to 4s; fall through regardless because
  // WasteSearchTable.executeSearch now always triggers (empty-filter fallback).
  cy.window({ log: false }).then(
    { timeout: 8000 },
    (win) =>
      new Cypress.Promise<void>((resolve) => {
        const deadline = Date.now() + 4000;
        const poll = () => {
          if (win.location.href.includes('?') || Date.now() > deadline) {
            resolve();
          } else {
            setTimeout(poll, 100);
          }
        };
        poll();
      }),
  );

  // Intercept the actual reporting-units search endpoint that the table triggers via
  // useSearchReportingUnitsQuery. Registering before the click guarantees the alias
  // captures the request even when React state settles synchronously.
  cy.intercept('GET', '**/api/search/reporting-units*').as('searchReportingUnits');
  Step(this, 'I click on the "Search" button');
  cy.wait('@searchReportingUnits', { timeout: 60 * 1000 });
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
 *   5. .cds--tooltip-content — icon-only Carbon button (traces back via aria-labelledby)
 *   6. findByRole("button", { name }) — @testing-library fallback
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

  const button = findButton(name, retries, retryDelay, selector);
  button.click({ force: true });

  if (waitForIntercept) {
    cy.wait(`@${waitForIntercept}`, { timeout });
  } else if (waitForTime) {
    cy.wait(waitForTime);
  }
};
