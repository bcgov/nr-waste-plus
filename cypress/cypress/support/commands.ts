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

    return cy.session(
      "idir",
      () => {
        // Force an interactive login: without prompt=login, Keycloak/Entra can
        // silently reuse a previous session and sign in as the wrong account.
        cy.intercept({ url: "**/protocol/openid-connect/auth*" }, (req) => {
          const url = new URL(req.url);
          url.searchParams.set("prompt", "login");
          req.url = url.toString();
        });

        cy.visit("/");
        cy.contains("button", "Log in with IDIR", { timeout: 30_000 }).click();
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

        // Generate a fresh code immediately before the second origin segment.
        cy.task<string>("generateTotp", { log: false }).then((token) => {
          cy.origin(
            "https://login.microsoftonline.com",
            { args: { token, username } },
            ({ token: code, username: user }) => {
              cy.get('#idTxtBx_SAOTCC_OTC, input[name="otc"]', { timeout: 60_000 })
                .first()
                .type(code, { log: false });
              cy.get('#idSubmit_SAOTCC_Continue, input[type="submit"]', { timeout: 30_000 })
                .first()
                .click();
              cy.get("body", { timeout: 30_000 }).then(($body) => {
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
