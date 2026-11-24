import { Before, Step } from "@badeball/cypress-cucumber-preprocessor";
import {
  BCEID_TEST_BUDGET_MS,
  pauseTestBudget,
  restartTestBudget,
} from "../../helpers/test-timeout";

type Provider = "idir" | "bceid";

/** Per-provider landing-page login button label. */
const PROVIDERS: Record<Provider, { loginButton: string }> = {
  idir: { loginButton: "Log in with IDIR" },
  bceid: { loginButton: "Log in with Business BCeID" },
};

/**
 * Auth-gated endpoint used to prove a session is still alive.
 *
 * This must NOT be a frontend route. The SPA answers `200` with `index.html` for
 * every unmatched path — including `/search` — whether or not anyone is logged
 * in, so validating against a frontend route can never fail and silently
 * replays dead sessions. `/api/users/preferences` returns `401` anonymously and
 * exists for both IDIR and BCeID users.
 */
const SESSION_PROBE_PATH = "/api/users/preferences";

/**
 * sessionStorage prefix `oidc-client-ts` stores the signed-in user under:
 * `user:<authority>:<client_id>`. The authority segment differs per
 * environment, so the key is located by prefix rather than reconstructed.
 */
const OIDC_USER_KEY_PREFIX = "user:";

/** Resolved once per run; `/data/config.js` is injected at deploy time. */
let backendOriginCache: string | null = null;

/**
 * Reads the access token the app sends as `Authorization: Bearer`.
 *
 * `services/APIs.ts` resolves its token from the `oidc-client-ts` user object,
 * which lives in the frontend origin's **sessionStorage** (the migration moved
 * tokens off Cognito cookies). `cy.session` snapshots cookies and localStorage
 * but never sessionStorage, so the token must be read from the live page right
 * before it is needed.
 *
 * @returns The current user's access token.
 * @throws When no OIDC user is stored, which means the session snapshot was
 *   captured before the OAuth callback finished exchanging its code.
 */
const readAccessToken = (): Cypress.Chainable<string> =>
  cy.window({ log: false }).then((win) => {
    const storage = win.sessionStorage;

    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key || !key.includes("user:")) continue;

      const parsed = JSON.parse(storage.getItem(key) ?? "{}") as {
        access_token?: string;
      };
      if (parsed.access_token) {
        return parsed.access_token;
      }
    }

    throw new Error(
      "No OIDC user found in sessionStorage: the session snapshot was taken " +
        "before the OAuth callback finished exchanging its code.",
    );
  });

/**
 * Resolves the backend origin from the deploy-time runtime config.
 *
 * The backend is not proxied through the frontend origin, and its hostname is
 * not derivable from the frontend URL — PR deployments name the frontend with
 * `PR % 50` (`nr-waste-plus-32-frontend`) but the backend with the raw PR number
 * (`nr-waste-plus-1382-backend`). It therefore has to be read from
 * `/data/config.js`.
 *
 * @returns The backend origin, without a trailing slash.
 */
const resolveBackendOrigin = (): Cypress.Chainable<string> => {
  if (backendOriginCache) {
    return cy.wrap(backendOriginCache, { log: false });
  }

  return cy
    .request({ url: "/data/config.js", timeout: 20_000, log: false })
    .then((response) => {
      const body =
        typeof response.body === "string"
          ? response.body
          : JSON.stringify(response.body);
      const match = /VITE_BACKEND_URL:\s*['"]([^'"]+)['"]/.exec(body);

      if (!match) {
        // Local runs serve the stock `public/data/config.js` (an empty
        // `window.config`), which carries no VITE_BACKEND_URL. The packaged
        // dev default is the localhost backend; deployed previews always
        // carry the value, so this fallback only ever fires locally.
        backendOriginCache = "http://localhost:8080";
        return backendOriginCache;
      }

      backendOriginCache = match[1].replace(/\/+$/, "");
      return backendOriginCache;
    });
};

/**
 * Asserts the backend still accepts the current session's access token.
 *
 * Used both as the `cy.session` `validate` callback and as the final readiness
 * gate inside the setup callback, so a half-authenticated state can never be
 * snapshotted and replayed into every later spec.
 */
const assertBackendAcceptsSession = (): void => {
  readAccessToken().then((token) => {
    resolveBackendOrigin().then((origin) => {
      cy.request({
        url: `${origin}${SESSION_PROBE_PATH}`,
        headers: { Authorization: `Bearer ${token}` },
        timeout: 20_000,
        failOnStatusCode: false,
        log: false,
      })
        .its("status")
        .should("eq", 200);
    });
  });
};

/**
 * Waits until the browser has left the app origin and settled on the IdP
 * origin across the broker redirect chain.
 *
 * The realm hands off through several hosted pages before the login form
 * appears (app → loginproxy realm → the broker's own login page, e.g.
 * `logontest7.gov.bc.ca` for BCeID or Azure AD for IDIR). Two consecutive
 * samples that agree are not enough on their own: sampling before the first
 * hop yields the app origin twice, and `cy.origin()` then rejects it as
 * identical to the top origin. Only a stable non-app origin is usable.
 */
const waitForStableOrigin = (appOrigin: string): Cypress.Chainable<string> => {
  const settle = (previous: string, hops: number): Cypress.Chainable<string> =>
    cy
      .wait(750, { log: false })
      .then(() => cy.location("origin", { timeout: 30_000 }))
      .then((current) => {
        if (current !== appOrigin && current === previous) {
          return cy.wrap(current, { log: false });
        }
        if (hops >= 20) {
          throw new Error(
            `IdP redirect never left the app origin (${appOrigin}); last seen ${current}`,
          );
        }
        return settle(current, hops + 1);
      });

  return cy
    .location("origin", { timeout: 30_000 })
    .then((first) => settle(first, 0));
};

/**
 * Answers the Entra MFA prompt with a TOTP code derived from the test
 * account's authenticator secret (pattern:
 * https://bcgov.github.io/sso-docs/advanced/automating-mfa-totp). Entra shows
 * the code entry on the same origin as the password form; if the account's
 * default method is an authenticator push instead, switches to "Use a
 * verification code" first. No prompt at all (MFA-exempt account) returns
 * quietly.
 *
 * Requires `idir_totp_secret` — the base32 key from My Sign-Ins → Add
 * sign-in method → Microsoft Authenticator → "Can't scan QR code?".
 */
const completeTotpChallenge = (username: string): Cypress.Chainable<void> =>
  cy
    .env(["idir_totp_secret"])
    .then((env) => cy.wrap(env.idir_totp_secret as string | undefined))
    .then((secret) =>
      cy
        .get("body", { timeout: 20_000 })
        .then(($body) => {
          const codeField = $body.find('#idTxtBx_SAOTCC_OTC, input[name="otc"]');
          const otherWay = $body.find("#signInAnotherWay");

          if (codeField.length === 0 && otherWay.length === 0) {
            return cy.wrap(null); // no MFA prompt — exempt account
          }

          if (!secret) {
            throw new Error(
              "Entra MFA prompt present but `idir_totp_secret` is not configured in " +
                "cypress/.env — register a TOTP authenticator on the test IDIR account " +
                "and store its base32 key.",
            );
          }

          if (codeField.length === 0) {
            cy.get("#signInAnotherWay").click();
            cy.get('[data-value="PhoneAppOTP"]').click();
          }

          return cy
            .task<string>("totp:fresh", secret, { log: false })
            .then((token) => {
              cy.get('#idTxtBx_SAOTCC_OTC, input[name="otc"]')
                .first()
                .type(token, { log: false });
              cy.get('#idSubmit_SAOTCC_Continue, input[type="submit"], button[type="submit"]')
                .first()
                .click();
              return cy.wrap(null);
            });
        })
        .then(() => undefined),
    );

/**
 * Clears the interstitials Entra can show between MFA and the redirect back
 * to the app — "Pick an account" (clicks the tile for the signing-in user)
 * and "Stay signed in?" (declines) — in whatever order they come. Bounded
 * poll: returns once neither screen is present or the hop budget runs out;
 * the outer pathname wait fails the run if the redirect never arrives.
 */
const finishEntraInterstitials = (username: string, hops: number): Cypress.Chainable<void> =>
  cy
    .get("body", { timeout: 10_000 })
    .then(($body) => {
      const staySignedIn = $body.find("input#idBtn_Back, input[value='No']");
      if (staySignedIn.length > 0) {
        cy.wrap(staySignedIn.first(), { log: false }).click();
        return finishEntraInterstitials(username, hops + 1);
      }

      if (/pick an account/i.test($body.text())) {
        const localPart = username.split("\\").pop()!.split("@")[0];
        const escaped = localPart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        cy.contains(new RegExp(`^${escaped}`), { matchCase: false }).first().click();
        return finishEntraInterstitials(username, hops + 1);
      }

      return undefined;
    })
    .then(() => undefined)
    .then(() => {
      if (hops >= 10) {
        return undefined;
      }
      return finishEntraInterstitials(username, hops + 1);
    });

/**
 * Logs in as the given provider and lands on `afterLoginLocation`.
 *
 * @param context Mocha context, used to record `Step()` entries in the report.
 * @param provider Which IdP to authenticate against.
 * @param afterLoginLocation App route to finish on.
 */
const doLogin = (
  context: Mocha.Context,
  provider: Provider,
  afterLoginLocation: string,
) => {
  const usernameKey = `${provider}_username`;
  const passwordKey = `${provider}_password`;

  cy.env([usernameKey, passwordKey]).then((env) => {
    const username = env[usernameKey];
    const password = env[passwordKey];

    if (!username || !password) {
      throw new Error(`Username or password for ${provider} not found.`);
    }

    // The test-body budget starts in the support beforeEach. Login is bounded
    // by its own command timeouts, so suspend the budget until the session is
    // established, then restart it for the test body.
    pauseTestBudget();
    cy.session(
      `${provider}-${username}`,
      () => {
        // `Step()` executes the matching step definition, which already performs
        // the visit. The `cy.visit()` that used to follow it loaded "/" twice per
        // login and doubled the chance of racing the redirect.
        Step(context, 'I visit "/"');

        cy.waitForPageLoad("img");

        Step(context, 'I can read "Waste Plus"');
        Step(
          context,
          `I click on the "${PROVIDERS[provider].loginButton}" button`,
        );

        // The hosted login page is cross-origin, so every command that runs there
        // stays inside `cy.origin` and nothing depends on a hardcoded IdP host.
        const appOrigin = new URL(Cypress.config("baseUrl") as string).origin;

        waitForStableOrigin(appOrigin).then((loginOrigin) => {
          cy.origin(
            loginOrigin,
            { args: { provider, username, password } },
            ({ provider: loginProvider, username: loginUsername, password: loginPassword }) => {
              // Fail loudly when the IdP rejects the test account instead of
              // letting cy.session wait forever for a redirect that never comes.
              cy.get("body", { timeout: 30_000 }).should(
                "not.contain.text",
                "You are not authorized to access this page",
              );

              // The realm's brokers expose different hosted pages: IDIR
              // federates through Azure AD (`loginfmt`/`passwd`, plus the
              // "Stay signed in?" interstitial), while the BCeID business page
              // keeps the classic `#user`/`#password` form.
              if (loginProvider === "idir") {
                cy.get('input[name="loginfmt"]', { timeout: 30_000 }).type(
                  loginUsername,
                  { log: false },
                );
                cy.get('input[value="Next"]', { timeout: 30_000 }).click();
                cy.get('input[name="passwd"]', { timeout: 30_000 }).type(
                  loginPassword,
                  { log: false },
                );
                cy.get('input[value="Sign in"]', { timeout: 30_000 }).click();
                // Entra MFA (TOTP from the account's authenticator secret) and
                // the post-sign-in interstitials — both on this origin.
                completeTotpChallenge(loginUsername);
                finishEntraInterstitials(loginUsername, 0);
              } else {
                cy.get("#user", { timeout: 30_000 }).type(loginUsername, {
                  log: false,
                });
                cy.get("#password", { timeout: 30_000 }).type(loginPassword, {
                  log: false,
                });
                cy.get('input[type="submit"]', { timeout: 30_000 }).click();
              }
            },
          );
        });

        // `pathname` already matches while the OAuth callback (`/search?code=…`)
        // is still being exchanged, and `cy.session` snapshots as soon as this
        // callback returns. Waiting for the backend to accept the token proves the
        // tokens were actually stored before the snapshot is taken.
        cy.location("pathname", { timeout: 30_000 }).should(
          "include",
          afterLoginLocation,
        );

        assertBackendAcceptsSession();
      },
      {
        validate: assertBackendAcceptsSession,
        // B1 (#1083): reuse the IdP session across specs in one run, so the
        // login dance runs once per run instead of once per spec. A logout in
        // one spec is now self-healing rather than poisonous: validate() fails
        // on the revoked token and Cypress re-runs setup once for the next
        // spec, instead of replaying a dead session into every later one.
        cacheAcrossSpecs: true,
      },
    ).then(() =>
      restartTestBudget(provider === "bceid" ? BCEID_TEST_BUDGET_MS : undefined),
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
