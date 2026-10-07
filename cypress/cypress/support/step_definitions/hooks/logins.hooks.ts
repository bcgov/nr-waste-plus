import { Before, Step } from "@badeball/cypress-cucumber-preprocessor";

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

/** Cognito namespaces its cookies as `<prefix>.<userId>.<tokenName>`. */
const ACCESS_TOKEN_SUFFIX = ".accessToken";
const LAST_AUTH_USER_SUFFIX = ".LastAuthUser";

/** Resolved once per run; `/data/config.js` is injected at deploy time. */
let backendOriginCache: string | null = null;

/**
 * Reads the access token the app sends as `Authorization: Bearer`.
 *
 * `services/APIs.ts` resolves its token via `getUserAccessTokenFromCookie()`,
 * which reads `document.cookie` on the frontend origin. The backend lives on a
 * different origin, so a `cy.request` to it carries no usable credentials by
 * itself — the header has to be set explicitly from this cookie.
 *
 * @returns The current user's access token.
 * @throws When no access-token cookie exists, which means the session snapshot
 *   was captured before the OAuth callback finished storing tokens.
 */
const readAccessToken = (): Cypress.Chainable<string> =>
  cy.getCookies({ log: false }).then((cookies) => {
    const bySuffix = (suffix: string) =>
      cookies.find((cookie) => cookie.name.endsWith(suffix))?.value;

    // Mirror getUserAccessTokenFromCookie(): prefer the cookie namespaced by the
    // current user id, then fall back to any access-token cookie.
    const lastAuthUser = bySuffix(LAST_AUTH_USER_SUFFIX);
    const namespaced = lastAuthUser
      ? bySuffix(`.${encodeURIComponent(lastAuthUser)}${ACCESS_TOKEN_SUFFIX}`)
      : undefined;
    const token = namespaced ?? bySuffix(ACCESS_TOKEN_SUFFIX);

    if (!token) {
      throw new Error(
        "No Cognito accessToken cookie present: the session snapshot was taken " +
          "before the OAuth callback finished exchanging its code.",
      );
    }

    return token;
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
        throw new Error(
          "Could not resolve VITE_BACKEND_URL from /data/config.js; the session " +
            "probe cannot reach the backend.",
        );
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
        //
        // The assertion is load-bearing: without it `cy.location` yields whatever
        // origin exists at that instant and `timeout` never applies, so a redirect
        // chain that has not landed yet passes the app's own origin into
        // `cy.origin` and the failure surfaces later as a 30 s wait on
        // `.site-title`. This race is slower on a CI runner, where Chrome can take
        // ~19 s to connect, than on a workstation.
        const appOrigin = new URL(Cypress.config("baseUrl") as string).origin;

        cy.location("origin", { timeout: 30_000 })
          .should("not.eq", appOrigin)
          .then((loginOrigin) => {
            cy.origin(
              loginOrigin,
              { args: { username, password } },
              ({ username: loginUsername, password: loginPassword }) => {
                cy.get(".site-title", { timeout: 30_000 }).should("be.visible");

                // Keep credentials out of the command log and recordings.
                cy.get("#user", { timeout: 30_000 }).type(loginUsername, {
                  log: false,
                });
                cy.get("#password", { timeout: 30_000 }).type(loginPassword, {
                  log: false,
                });
                cy.get('input[type="submit"]', { timeout: 30_000 }).click();
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
        // logontest7.gov.bc.ca login dance runs once per run instead of once per
        // spec. A logout in one spec is now self-healing rather than poisonous:
        // validate() fails on the revoked token and Cypress re-runs setup once for
        // the next spec, instead of replaying a dead session into every later one.
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
