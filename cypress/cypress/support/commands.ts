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
  return cy.env(["idir_username", "idir_password"]).then((env) => {
    const username = env.idir_username as string | undefined;
    const password = env.idir_password as string | undefined;
    if (!username || !password) {
      throw new Error("IDIR username/password are not configured in Cypress env.");
    }

    cy.task("log:debug", "loginViaIdir: env resolved", { log: false });
    return cy.session(
      "idir",
      () => {
        cy.task("log:debug", "loginViaIdir: setup start", { log: false });
        // Force an interactive login: without prompt=login, Keycloak/Entra can
        // silently reuse a previous session and sign in as the wrong account.
        // Test-only: force an interactive login so a previous Keycloak/Entra
        // session cannot silently sign us in as a different account.
        cy.intercept("GET", "**/protocol/openid-connect/auth*", (req) => {
          const url = new URL(req.url);
          if (!url.searchParams.has("prompt")) {
            url.searchParams.set("prompt", "login");
            req.redirect(url.toString());
          }
        });

        cy.visit("/");
        cy.task("log:debug", "loginViaIdir: visited /", { log: false });
        cy.contains("button", "Log in with IDIR", { timeout: 30_000 }).click();
        cy.task("log:debug", "loginViaIdir: clicked IDIR", { log: false });
        cy.url({ timeout: 60_000 }).should("include", "login.microsoftonline.com");

        // Segment 1: credentials. The callback is serialised, so everything it
        // uses must come through `args`.
        cy.origin(
          "https://login.microsoftonline.com",
          { args: { username, password } },
          ({ username: user, password: pass }) => {
            cy.get('#i0116, input[name="loginfmt"]', { timeout: 60_000 }).type(user, { log: false });
            cy.get('#idSIButton9, input[value="Next"]', { timeout: 30_000 }).first().click();
            cy.get('#i0118, input[name="passwd"]', { timeout: 60_000 }).type(pass, { log: false });
            cy.get('#idSIButton9, input[value="Sign in"]', { timeout: 30_000 }).first().click();

            // If Entra defaults to a push/notification method, switch to the
            // authenticator-app code before the next segment.
            cy.get("body", { timeout: 60_000 }).then(($body) => {
              if ($body.find("#signInAnotherWay").length > 0) {
                cy.get("#signInAnotherWay").click();
                cy.get('[data-value="PhoneAppOTP"]').first().click();
              }
            });
          },
        );

        // MFA is conditional: a remembered device may skip the code prompt.
        // Only enter the second origin if Entra is still showing its page.
        cy.location("hostname").then((hostname) => {
          if (!hostname.includes("microsoftonline")) return;

          cy.task<string>("generateTotp", null, { log: false }).then((token) => {
            cy.origin(
              "https://login.microsoftonline.com",
              { args: { token, username } },
              ({ token: code, username: user }) => {
                cy.get("body", { timeout: 30_000 }).then(($body) => {
                  let field = $body.find('#idTxtBx_SAOTCC_OTC, input[name="otc"]');
                  if (field.length === 0 && $body.find("#signInAnotherWay").length > 0) {
                    cy.get("#signInAnotherWay").click();
                    cy.get('[data-value="PhoneAppOTP"]').first().click();
                    cy.get('#idTxtBx_SAOTCC_OTC, input[name="otc"]', { timeout: 30_000 })
                      .first()
                      .should("be.visible");
                    field = $body.find('#idTxtBx_SAOTCC_OTC, input[name="otc"]');
                  }
                  if (field.length > 0) {
                    cy.get('#idTxtBx_SAOTCC_OTC, input[name="otc"]')
                      .first()
                      .clear()
                      .type(code, { log: false });
                    cy.get('#idSubmit_SAOTCC_Continue, input[type="submit"]', { timeout: 30_000 })
                      .first()
                      .click();
                  }
                  if ($body.find("input#idBtn_Back, input[value='No']").length > 0) {
                    cy.get("input#idBtn_Back, input[value='No']").first().click();
                  }
                  if (/pick an account/i.test($body.text())) {
                    cy.contains(user, { matchCase: false }).first().click();
                  }
                });
              },
            );
          });
        });

        cy.url({ timeout: 60_000 }).should("include", Cypress.config("baseUrl") as string);
        cy.get(".cds--header__name", { timeout: 30_000 }).should("be.visible");
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
    );
  });
});
