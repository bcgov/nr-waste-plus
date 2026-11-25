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
import { pauseTestBudget, restartTestBudget } from "./helpers/test-timeout";

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
Cypress.Commands.add("loginViaIdir", (): Cypress.Chainable<void> => {
  pauseTestBudget();
  return cy.env(["idir_username", "idir_password"]).then((env) => {
    const username = env.idir_username as string | undefined;
    const password = env.idir_password as string | undefined;
    if (!username || !password) {
      throw new Error("IDIR username/password are not configured in Cypress env.");
    }

    return cy
      .session(
        "idir",
        () => {
          cy.task("session:clear", null, { log: false });
          cy.clearCookies();
          cy.clearLocalStorage();
          cy.visit("/", { onBeforeLoad: (win) => win.sessionStorage.clear() });

          cy.intercept("GET", "**/protocol/openid-connect/auth*", (req) => {
            const url = new URL(req.url);
            if (!url.searchParams.has("prompt")) {
              url.searchParams.set("prompt", "login");
              req.redirect(url.toString());
            }
          });

          cy.contains("button", "Log in with IDIR", { timeout: 12_000 }).click();
          cy.url({ timeout: 12_000 }).should("include", "login.microsoftonline.com");

          // Generate immediately before use; the task waits for a fresh window.
          cy.task<string>("generateTotp", null, { log: false }).then((token) => {
            cy.origin(
              "login.microsoftonline.com",
              { args: { username, password, token } },
              ({ username: email, password: pass, token: code }) => {
                cy.get('input[type="email"]', { timeout: 12_000 }).type(email, {
                  delay: 15,
                  log: false,
                });
                cy.contains("Next").click();
                cy.get('input[type="password"]', { timeout: 12_000 }).type(pass, {
                  delay: 15,
                  log: false,
                });
                cy.contains("Sign in").click();
                cy.get('input[type="tel"]', { timeout: 12_000 }).type(code, {
                  delay: 15,
                  log: false,
                });
                cy.contains("Verify").click();
                cy.get('input[type="submit"][value="Yes"]', { timeout: 2000 }).then(($btn) => {
                  if ($btn.length) cy.wrap($btn).click();
                });
              },
            );
          });

          cy.url({ timeout: 12_000 }).should("include", Cypress.config("baseUrl") as string);
          cy.get(".cds--header__name", { timeout: 12_000 }).should("be.visible");
        },
        {
          cacheAcrossSpecs: true,
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
      .then(() => restartTestBudget(12_000));
  });
});
