import { Before, Step } from "@badeball/cypress-cucumber-preprocessor";

const doLogin = (
  context: Mocha.Context,
  kind: string,
  afterLoginLocation: string,
) => {
  const usernameKey = `${kind}_username`;
  const passwordKey = `${kind}_password`;

  cy.env([usernameKey, passwordKey]).then((env) => {
    const username = env[usernameKey];
    const password = env[passwordKey];

    if (!username || !password) {
      throw new Error(`Username or password for ${kind} not found.`);
    }

    cy.session(
      `${kind}-${username}`,
      () => {
        const landingPage = "/";
        // Visit the landing page
        Step(context, `I visit "${landingPage}"`);
        cy.visit(landingPage);

        cy.waitForPageLoad("img");

        Step(context, 'I can read "Waste Plus"');

        // Click on the login button
        if (kind !== "bceid") {
          Step(context, 'I click on the "Log in with IDIR" button');
        } else if (kind === "bceid") {
          Step(context, 'I click on the "Log in with Business BCeID" button');
        }

        // The hosted login page is cross-origin. Keep all commands that run there inside
        // cy.origin so Cypress does not depend on the current deployment's IdP host.
        cy.location("origin", { timeout: 30000 }).then((loginOrigin) => {
          cy.origin(
            loginOrigin,
            {
              args: { username, password },
            },
            ({ username: loginUsername, password: loginPassword }) => {
              // Do not suppress IdP errors here. This handler preserves the origin-local
              // error context while allowing Cypress to fail on real authentication errors.
              Cypress.on("uncaught:exception", (error) => {
                console.error(`[IdP uncaught:exception] ${error.message}`);
                return true;
              });

              cy.get(".site-title", { timeout: 30000 }).should("be.visible");

              // Keep credentials out of the Cypress command log.
              cy.get("#user", { timeout: 30000 }).type(loginUsername, {
                log: false,
              });
              cy.get("#password", { timeout: 30000 }).type(loginPassword, {
                log: false,
              });
              cy.get('input[type="submit"]', { timeout: 30000 }).click();
            },
          );
        });

        // Validate the login for session purposes
        cy.location("pathname", { timeout: 30000 }).should(
          "include",
          afterLoginLocation,
        );
      },
      {
        validate: () => {
          cy.request(afterLoginLocation).its("status").should("eq", 200);
        },
        // B1 (#1083): reuse the IdP session across specs in one run, so the
        // logontest7.gov.bc.ca login dance runs once per run instead of once per
        // spec. Safe with logouts.feature: cy.session restores the cached snapshot
        // (re-establishing login) before validate, so an in-app logout in one spec
        // does not break later specs.
        cacheAcrossSpecs: true,
      },
    );
    cy.visit(afterLoginLocation);
  });
};

Before({ tags: "@loginAsIDIR" }, function () {
  doLogin(this, "idir", "/search");
  cy.waitForPageLoad(".cds--header__name");
});

Before({ tags: "@loginAsBCeID" }, function () {
  doLogin(this, "bceid", "/search");
  cy.waitForPageLoad(".cds--header__name");
});
