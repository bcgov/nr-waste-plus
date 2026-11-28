# user-journeys

Playwright + `playwright-bdd` user-journey tests for nr-waste-plus. Gherkin
features live in `features/`; step definitions, fixtures, and support code live
in `playwright/`.

## Setup

```bash
cd user-journeys
npm ci
npx playwright install chromium
```

Requires Node >= 22.19 (Node 24 locally).

## Running

```bash
npm run pw:test                 # bddgen + all ported features
PW_FEATURES=features/screen-load.feature npm run pw:test
PW_FEATURES=features/screen-load.feature,features/search.feature npm run pw:test
npm run pw:ui                   # interactive UI mode
npm run pw:report               # last HTML report
npm run pw:typecheck
npm run lint
npm run test:reporters          # quality reporter unit tests
```

`PW_FEATURES` is a comma-separated list of feature paths relative to this
package. When it is unset, the `DEFAULT_FEATURES` list in `playwright.config.ts`
is used. All 15 features are listed there; `logouts.feature` is split into the
teardown project and `lighthouse.feature`/`ux-quality.feature` run in the
dedicated `lighthouse` project.

### Target environment

Set `CYPRESS_baseUrl` to the deployed instance:

```bash
CYPRESS_baseUrl=https://nr-waste-plus-12-frontend.apps.silver.devops.gov.bc.ca npm run pw:test
```

Precedence: `CYPRESS_baseUrl` -> `E2E_BASE_URL` -> `http://localhost:3000`.

**Rate-limit warning.** The OpenShift route allows 75 new TCP connections and
150 HTTP requests per 3 s per client IP. A fresh browser context opening the
app uses ~40+ connections, so two fresh contexts loaded close together fail
with `net::ERR_EMPTY_RESPONSE`. Keep `workers: 1`, never create a fresh context
per scenario, and keep a >= 3.5 s gap before any unavoidable fresh context.
Do not run parallel workers against the deployed URL.

## Credentials

Loaded from this package's git-ignored `.env`. Recognised names:
`idir_username`, `idir_password`, `idir_totp_secret`, `bceid_username`,
`bceid_password`, plus `CYPRESS_`-prefixed, `IDIR_*`, and local `*2` variants.
The `CYPRESS_*` aliases are retained for compatibility with the deployed-test
environment, which also sets `CYPRESS_baseUrl`. Never commit these values.

## Trace and video

`trace` and `video` are off by design: this is a public repository and traces
can capture tokens or other secrets. `screenshot` is `only-on-failure`.
