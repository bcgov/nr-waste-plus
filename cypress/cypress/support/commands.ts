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
Cypress.Commands.add("loginViaIdir", (): Cypress.Chainable<void> => {
  pauseTestBudget();
  cy.task("log:debug", "login: env", { log: false });
  return cy.env(["idir_username", "idir_password"]).then((env) => {
    const username = env.idir_username as string | undefined;
    const password = env.idir_password as string | undefined;
    if (!username || !password) {
      throw new Error("IDIR username/password are not configured in Cypress env.");
    }

    return cy.session(
      "idir",
      () => {
        cy.task("log:debug", "login: setup", { log: false });
        // Clean slate: a stale Keycloak/Entra session would silently sign in
        // as the wrong account instead of showing the email form.
        cy.task("session:clear", null, { log: false });
        cy.clearCookies();
        cy.clearLocalStorage();
        cy.visit("/", { onBeforeLoad: (win) => win.sessionStorage.clear() });

        // Test-only: force interactive login. Verified to reach Entra with
        // prompt=login and to avoid the iframe redirect storm.
        cy.intercept("GET", "**/protocol/openid-connect/auth*", (req) => {
          const url = new URL(req.url);
          if (!url.searchParams.has("prompt")) {
            url.searchParams.set("prompt", "login");
            req.redirect(url.toString());
          }
        });

        cy.contains("button", "Log in with IDIR", { timeout: 12_000 }).click();
        cy.url({ timeout: 12_000 }).should("include", "login.microsoftonline.com");
        cy.task("log:debug", "login: MS page reached", { log: false });

        // Segment 1: credentials. Everything used here comes through args.
        cy.origin(
          "https://login.microsoftonline.com",
          { args: { username, password } },
          ({ username: user, password: pass }) => {
            cy.get('#i0116, input[name="loginfmt"]', { timeout: 12_000 }).type(user, { log: false });
            cy.get('#idSIButton9, input[value="Next"]', { timeout: 12_000 }).first().click();
            cy.get('#i0118, input[name="passwd"]', { timeout: 12_000 }).type(pass, { log: false });
            cy.get('#idSIButton9, input[value="Sign in"]', { timeout: 12_000 }).first().click();
            cy.task("log:debug", "login: credentials submitted", { log: false });

            cy.get("body", { timeout: 12_000 }).then(($body) => {
              if ($body.find("#signInAnotherWay").length > 0) {
                cy.get("#signInAnotherWay").click();
                cy.get('[data-value="PhoneAppOTP"]').first().click();
              }
            });
          },
        );

        // MFA may be skipped for a remembered device. Generate a code outside
        // cy.origin and only enter the second origin while Entra is showing.
        cy.location("hostname").then((hostname) => {
          if (!hostname.includes("microsoftonline")) return;

          cy.task<string>("generateTotp", null, { log: false }).then((token) => {
            cy.origin(
              "https://login.microsoftonline.com",
              { args: { token } },
              ({ token: code }) => {
                cy.get("body", { timeout: 12_000 }).then(($body) => {
                  if ($body.find('#idTxtBx_SAOTCC_OTC, input[name="otc"]').length > 0) {
                    cy.get('#idTxtBx_SAOTCC_OTC, input[name="otc"]')
                      .first()
                      .clear()
                      .type(code, { log: false });
                    cy.get('#idSubmit_SAOTCC_Continue, input[type="submit"]', { timeout: 12_000 })
                      .first()
                      .click();
                  }
                  if ($body.find("input#idBtn_Back, input[value='No']").length > 0) {
                    cy.get("input#idBtn_Back, input[value='No']").first().click();
                  }
                });
              },
            );
          });
        });

        cy.url({ timeout: 12_000 }).should("include", Cypress.config("baseUrl") as string);
        cy.get(".cds--header__name", { timeout: 12_000 }).should("be.visible");
        cy.task("log:debug", "login: app reached", { log: false });
      },
      {
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
        cacheAcrossSpecs: true,
      },
    ).then(() => restartTestBudget(12_000));
  });
});
