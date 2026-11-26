/// <reference types="cypress" />

import {
  logAndScreenshot,
  runLighthouseAudit,
  shouldHaveStyle,
  validateContrast,
  validateStyle,
  validateTokenStyle,
  validateTypography,
  waitForPageLoad,
} from "./helpers";
import { pauseTestBudget, restartTestBudget, TEST_BUDGET_MS } from "./helpers/test-timeout";

Cypress.Commands.add("waitForPageLoad", waitForPageLoad);
Cypress.Commands.add("logAndScreenshot", logAndScreenshot);

Cypress.Commands.add("runLighthouseAudit", runLighthouseAudit);

Cypress.Commands.add("validateStyle", { prevSubject: true }, validateStyle);
Cypress.Commands.add(
  "validateTokenStyle",
  { prevSubject: true },
  validateTokenStyle,
);
Cypress.Commands.add(
  "validateContrast",
  { prevSubject: true },
  validateContrast,
);
Cypress.Commands.add(
  "validateTypography",
  { prevSubject: true },
  validateTypography,
);

Cypress.Commands.add("shouldHaveStyle", { prevSubject: true }, shouldHaveStyle);

/**
 * Real IDIR sign-in through Keycloak -> Entra, with TOTP supplied by the
 * `generateTotp` node task. Secrets are read from Cypress env and never logged.
 */
/**
 * IDIR sign-in adapted from bcgov/sso-requests app/cypress/support/commands.ts.
 * Differences: prompt=login is injected by cy.intercept (test-only) to avoid
 * silent SSO, the TOTP comes from the generateTotp node task, and the budget is
 * paused while the IdP flow runs.
 */
/**
 * IDIR sign-in adapted from bcgov/sso-requests. Entra's frame-busting script
 * reloads the authorize URL forever when the AUT is inside Cypress's iframe;
 * we re-visit the authorize URL inside cy.origin with $Config.allowFrame=true
 * so the real Microsoft form is rendered. TOTP comes from a node task.
 */
/**
 * Authenticated session from the state exported by the Playwright SSO spec.
 * This bypasses Entra's frame-busting script entirely: Cypress never loads the
 * Microsoft UI, so there is no iframe-request-id redirect loop.
 */
Cypress.Commands.add("loginViaIdir", (): Cypress.Chainable<void> => {
  pauseTestBudget();
  cy.task("session:refresh", "idir", { log: false });
  return cy.task<{
    cookies: Array<Record<string, unknown>>;
    session: Record<string, string>;
    local: Record<string, string>;
  }>("session:load", "idir", { log: false }).then((state) => {
    return cy
      .session(
        "idir",
        () => {
          cy.clearCookies();
          cy.clearLocalStorage();
          cy.task("session:applyCookies", state.cookies, { log: false });
          cy.visit("/", {
            onBeforeLoad(win) {
              win.sessionStorage.clear();
              win.localStorage.clear();
              Object.entries(state.session).forEach(([key, value]) =>
                win.sessionStorage.setItem(key, String(value)),
              );
              Object.entries(state.local).forEach(([key, value]) =>
                win.localStorage.setItem(key, String(value)),
              );
            },
          });
        },
        {
          cacheAcrossSpecs: false,
          validate: () => {
            cy.window({ log: false }).then((win) => {
              const store = win.sessionStorage;
              for (let i = 0; i < store.length; i += 1) {
                const key = store.key(i);
                if (key?.includes("user:") && JSON.parse(store.getItem(key) ?? "{}").access_token) {
                  return;
                }
              }
              throw new Error("No OIDC user found in sessionStorage.");
            });
          },
        },
      )
      .then(() => {
        // cy.session leaves the browser on its own reset page; land back on
        // the app so the caller sees the authenticated shell.
        cy.visit("/search");
        cy.reload();
        restartTestBudget(TEST_BUDGET_MS);
      });
  });
});

Cypress.Commands.add("loginViaBceid", (): Cypress.Chainable<void> => {
  pauseTestBudget();
  cy.task("session:refresh", "bceid", { log: false });
  return cy.task<{
    cookies: Array<Record<string, unknown>>;
    session: Record<string, string>;
    local: Record<string, string>;
  }>("session:load", "bceid", { log: false }).then((state) => {
    return cy
      .session(
        "bceid",
        () => {
          cy.clearCookies();
          cy.clearLocalStorage();
          cy.task("session:applyCookies", state.cookies, { log: false });
          cy.visit("/", {
            onBeforeLoad(win) {
              win.sessionStorage.clear();
              win.localStorage.clear();
              Object.entries(state.session).forEach(([key, value]) =>
                win.sessionStorage.setItem(key, String(value)),
              );
              Object.entries(state.local).forEach(([key, value]) =>
                win.localStorage.setItem(key, String(value)),
              );
            },
          });
        },
        {
          cacheAcrossSpecs: false,
          validate: () => {
            cy.window({ log: false }).then((win) => {
              const store = win.sessionStorage;
              for (let i = 0; i < store.length; i += 1) {
                const key = store.key(i);
                if (key?.includes("user:") && JSON.parse(store.getItem(key) ?? "{}").access_token) {
                  return;
                }
              }
              throw new Error("No OIDC user found in sessionStorage.");
            });
          },
        },
      )
      .then(() => {
        // cy.session leaves the browser on its own reset page; land back on
        // the app so the caller sees the authenticated shell.
        cy.visit("/search");
        restartTestBudget(TEST_BUDGET_MS);
      });
  });
});
