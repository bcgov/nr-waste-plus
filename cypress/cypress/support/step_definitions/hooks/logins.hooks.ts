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
          // A silent SSO round trip can finish before the first sample. Return
          // the app origin so the caller can check whether the app is already
          // authenticated instead of misrouting cy.origin() to the app itself.
          return cy.wrap(appOrigin, { log: false });
        }
        return settle(current, hops + 1);
      });

  return cy
    .location("origin", { timeout: 30_000 })
    .then((first) => settle(first, 0));
};

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

  // Suspend the test-body budget before any login command is queued. Cypress
  // runs support beforeEach and Gherkin Before hooks as command chains, so
  // pausing inside cy.env().then() is too late when the IdP hop is slow.
  pauseTestBudget();
  cy.env([usernameKey, passwordKey, "idir_totp_secret"]).then((env) => {
    const username = env[usernameKey];
    const password = env[passwordKey];
    const totpSecret = env.idir_totp_secret as string | undefined;

    if (!username || !password) {
      throw new Error(`Username or password for ${provider} not found.`);
    }

    // Login is bounded by its own command timeouts; the budget restarts after
    // the session is established so it covers only the test body.
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
          if (loginOrigin === appOrigin) {
            // No observable IdP hop: either SSO silently signed us in, or the
            // login button did nothing. The authenticated app shell decides.
            cy.get("body", { timeout: 10_000 }).should(($body) => {
              expect(
                $body.find(".cds--header__name").length,
                "authenticated app shell after silent SSO",
              ).to.be.greaterThan(0);
            });
            return;
          }

          cy.origin(
            loginOrigin,
            { args: { provider, username, password, totpSecret } },
            ({
              provider: loginProvider,
              username: loginUsername,
              password: loginPassword,
              totpSecret: loginTotpSecret,
            }) => {
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
                // Entra MFA (TOTP from the account's authenticator secret) and the
                // post-sign-in interstitials. This is a polling state machine: Entra
                // renders each step asynchronously after the previous submit, so a
                // single look at the body right after "Sign in" always sees the
                // password page and wrongly concludes the account is MFA-exempt.
                //
                // It is deliberately inlined: a `cy.origin()` callback is
                // serialised and executed in a separate bundle, so it cannot call
                // helpers (or constants) defined outside it.
                const OTC_FIELD = '#idTxtBx_SAOTCC_OTC, input[name="otc"]';
                const OTC_SUBMIT =
                  '#idSubmit_SAOTCC_Continue, input[type="submit"], button[type="submit"]';
                const MAX_POLLS = 45;

                const settleEntra = (poll: number, done: string[]): void => {
                  if (poll >= MAX_POLLS) return;
                  const seen = (step: string) => done.includes(step);

                  cy.wait(1000, { log: false });
                  cy.get("body", { timeout: 10_000, log: false }).then(($body) => {
                    const text = $body.text();
                    if (/your account or password is incorrect|sign-in was blocked/i.test(text)) {
                      throw new Error("Entra rejected the IDIR credentials.");
                    }

                    const codeField = $body.find(OTC_FIELD);
                    const method = $body.find('[data-value="PhoneAppOTP"]');
                    const otherWay = $body.find("#signInAnotherWay");
                    const stay = $body.find("input#idBtn_Back");

                    // Entra rejects a reused code, and the field can linger for a
                    // poll after submit, so each code is submitted once per 5 polls.
                    const lastSubmit = done
                      .filter((d) => d.startsWith("otc@"))
                      .map((d) => Number(d.slice(4)))
                      .pop();
                    const recentlySubmitted = lastSubmit !== undefined && poll - lastSubmit < 5;

                    if (codeField.length > 0) {
                      if (recentlySubmitted) return settleEntra(poll + 1, done);
                      if (!loginTotpSecret) {
                        throw new Error(
                          "Entra MFA prompt present but `idir_totp_secret` is not configured " +
                            "(cypress/.env locally, IDIR_CSS_TOTP_SECRET in CI). Register a TOTP " +
                            "authenticator on the test IDIR account and store its base32 key.",
                        );
                      }
                      cy.task<string>("totp:fresh", loginTotpSecret, { log: false }).then((token) => {
                        cy.get(OTC_FIELD).first().clear().type(token, { log: false });
                        cy.get(OTC_SUBMIT).first().click();
                      });
                      return settleEntra(poll + 1, [...done, `otc@${poll}`]);
                    }

                    if (method.length > 0 && !seen("method")) {
                      cy.wrap(method.first(), { log: false }).click();
                      return settleEntra(poll + 1, [...done, "method"]);
                    }

                    if (otherWay.length > 0 && !seen("other")) {
                      cy.wrap(otherWay.first(), { log: false }).click();
                      return settleEntra(poll + 1, [...done, "other"]);
                    }

                    if (stay.length > 0 && !seen(`stay@${poll - 1}`)) {
                      cy.wrap(stay.first(), { log: false }).click();
                      return settleEntra(poll + 1, [...done, `stay@${poll}`]);
                    }

                    if (/pick an account/i.test(text) && !seen("pick")) {
                      const localPart = loginUsername.split("\\").pop()!.split("@")[0];
                      cy.contains(localPart, { matchCase: false }).first().click();
                      return settleEntra(poll + 1, [...done, "pick"]);
                    }

                    return settleEntra(poll + 1, done);
                  });
                };

                settleEntra(0, []);
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
