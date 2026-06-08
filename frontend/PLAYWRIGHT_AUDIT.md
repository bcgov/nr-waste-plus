# Playwright Performance & Reliability Audit — Phase 1 (Audit Only)

**Date:** 2026-06-05
**Scope:** `frontend/` Playwright suite (22 `*.e2e.test.{ts,tsx}` files, ~120 unique tests, 2 default user projects → ~240 default executions; up to ~1,320 when mobile + cross-browser flags are enabled).
**Status:** No code changes performed. Awaiting approval to proceed with Phase 2.

---

## Executive Summary

The suite is **functionally rich but architecturally inefficient**. Five structural issues dominate every other concern:

1. **`webServer` runs the Vite dev server** (`npm run dev`) instead of a pre-built static preview. Every test boots through Vite's transform pipeline on first request, with no production minification.
2. **Custom `coverage.setup` fixture silently breaks Playwright's `storageState` reuse** by calling `browser.newContext()` with no arguments, ignoring the project-level `storageState` config. Authentication is effectively re-established per test through cookies set by `mockJwt`/`auth.setup`, not via the documented Playwright reuse path.
3. **`page.waitForLoadState('networkidle')` is used ~180 times.** Officially discouraged by the Playwright team; it is the single largest source of wall-time and flakiness in the suite.
4. **`globalSetup` launches one full browser per project (10+ projects) just to call `page.goto(baseURL)` and close** — pure overhead with no useful work.
5. **No `fullyParallel`, no explicit `workers`, no sharding.** Tests within each file run serially even though they are fully independent (each uses `test.beforeEach` to re-establish state).

Combined, fixing items 1–5 alone is expected to cut wall time by **~50–65%** on CI and **~70%** locally, without removing a single test.

The auth strategy (`storageState` JSON + `mockJwt`) is sound in principle but is being short-circuited by the coverage fixture. The mock-API strategy (route fulfilment from `stub/__files`) is excellent and should be preserved.

---

## Findings

### Critical

#### C1. `webServer` uses the Vite dev server, not a built preview (complete)
- **Description:** [frontend/playwright.config.ts](frontend/playwright.config.ts#L375-L379) runs `npm run dev`. Every cold navigation pays for Vite source transform, dependency pre-bundling, and full HMR machinery. With `reuseExistingServer: true` it is tolerable on subsequent runs but always slower than serving a built bundle.
- **Files affected:** [frontend/playwright.config.ts](frontend/playwright.config.ts), [frontend/package.json](frontend/package.json)
- **Effort:** Small (add `build` step + `vite preview` script, swap webServer command).
- **Expected gain:** 30–50% reduction in per-test navigation time; far fewer timeouts and Carbon hydration races.
- **Risk:** Low — only test environment changes.

#### C2. `coverage.setup.ts` breaks `storageState` reuse (complete)
- **Description:** [frontend/src/config/tests/coverage.setup.ts](frontend/src/config/tests/coverage.setup.ts#L14-L18) overrides the `context` fixture with `await browser.newContext()` — no `storageState`, no project options. Playwright's documented behavior is to inject the project's `storageState` only when the default context is constructed; overriding it nullifies that injection. Tests that import `test` from this file (most of them) therefore start with an empty context and rely on `mockJwt`/`auth.setup` cookie writes to bootstrap auth. This explains why every page test must call `await page.goto(...)` followed by `waitForLoadState('networkidle')` in `beforeEach`.
- **Files affected:** [frontend/src/config/tests/coverage.setup.ts](frontend/src/config/tests/coverage.setup.ts), every `*.e2e.test.{ts,tsx}` that imports from it.
- **Effort:** Small (forward project options into `browser.newContext({ storageState: testInfo.project.use.storageState, ...testInfo.project.use })`).
- **Expected gain:** Eliminates an entire category of "why is auth missing" flakes; enables true storage-state reuse and fast cold-start.
- **Risk:** Medium — touches the fixture every test depends on; must validate auth still works for IDIR + BCeID projects.

#### C3. `globalSetup` launches one browser per project with no useful work (complete)
- **Description:** [frontend/src/config/tests/browser.setup.ts](frontend/src/config/tests/browser.setup.ts#L26-L31) iterates **all** configured projects (setup + chromium + optional firefox/webkit/mobile = up to 13) and for each launches a real browser, navigates to `baseURL`, injects axe, and closes. This adds ~1–3s per project on every run with zero benefit (the axe injection is per-page and is not persisted, and the cookie/storage state from this throwaway page is never saved).
- **Files affected:** [frontend/src/config/tests/browser.setup.ts](frontend/src/config/tests/browser.setup.ts), [frontend/playwright.config.ts](frontend/playwright.config.ts#L368)
- **Effort:** Trivial (delete the function or replace with a no-op that warms `webServer` once).
- **Expected gain:** 10–30 seconds shaved off every run.
- **Risk:** Very low — no test depends on side effects.

#### C4. ~180 `page.waitForLoadState('networkidle')` calls (complete)
- **Description:** Used in every `beforeEach` and many test bodies. `networkidle` waits 500ms after the last network request — but since tests use route mocking and React Query background refetches, this either waits too long or never settles (then times out at 30s). Playwright's official guidance: replace with web-first assertions (`expect(locator).toBeVisible()`, `await page.waitForResponse(...)`, etc.).
- **Files affected:** All 22 e2e test files plus [frontend/src/config/tests/auth.setup.ts](frontend/src/config/tests/auth.setup.ts), [frontend/src/config/tests/auth.helper.ts](frontend/src/config/tests/auth.helper.ts).
- **Effort:** Medium — mechanical replacement, but volume is large. Codemod plus one helper (`waitForApp` that asserts a known stable element) is recommended.
- **Expected gain:** 20–40% wall-time reduction; massive reliability improvement.
- **Risk:** Medium — each replacement must wait for the *actual* condition the test depends on. Should be done incrementally and validated.

#### C5. No `fullyParallel`, no explicit `workers`, no per-project sharding (complete)
- **Description:** [frontend/playwright.config.ts](frontend/playwright.config.ts#L364-L384) does not set `fullyParallel: true`. Tests within a single file run serially even though `test.beforeEach` re-creates state per test. CI also has no `workers` override and **no per-project matrix** — both `bceid-chromium` and `idir-chromium` share the same worker pool, so a single project can monopolize all workers if its files happen to be picked first.
- **Files affected:** [frontend/playwright.config.ts](frontend/playwright.config.ts), [.github/workflows/reusable-tests-fe.yml](.github/workflows/reusable-tests-fe.yml)
- **Effort:** Small.
- **Expected gain:** 30–50% CI wall time reduction with project-sharded matrix + `fullyParallel`.
- **Risk:** Low if tests are truly independent. Some files (e.g. `bookmark.e2e.test.tsx`) write to IndexedDB and may need explicit isolation.
- **Worker-per-project guarantee:** Playwright has no per-project worker reservation. The deterministic way to guarantee that `bceid` and `idir` run in parallel is **GitHub Actions matrix sharding by project** — one job per project (`--project=bceid-chromium`, `--project=idir-chromium`) running concurrently. Inside each shard, `fullyParallel: true` + `workers: '100%'` uses the full runner. This is the recommended split (see roadmap items 6a + 6b).

---

### High

#### H1. Per-test browser context (no isolation amortization) (complete)
- [frontend/src/config/tests/coverage.setup.ts](frontend/src/config/tests/coverage.setup.ts#L14) creates and closes a `BrowserContext` per test. Combined with C2, every test pays full context-creation cost (~100–300ms) and full auth round-trip. Worker-scoped storage state + worker-scoped context would cut this dramatically.
- **Gain:** ~15–25% wall time. **Risk:** Medium (test isolation must remain).

#### H2. `pretest:e2e` runs full Playwright install every time (complete)
- [frontend/package.json](frontend/package.json#L14) runs `playwright install-deps && playwright install` on every `test:e2e` invocation. On CI this is wasted work because the workflow image (`mcr.microsoft.com/playwright:v1.60.0-noble`) already contains the browsers. Locally it is run unconditionally.
- **Fix:** Gate on `CI` env or move to a separate `prepare` script; the CI workflow already calls `npx playwright install-deps && npx playwright install` redundantly inside `bcgov/action-test-and-analyse` ([.github/workflows/reusable-tests-fe.yml](.github/workflows/reusable-tests-fe.yml#L62-L65)).
- **Gain:** 30–90s saved per local run. **Risk:** Low.

#### H3. Video recording forced ON for every test, not just on failure (complete)
- [frontend/playwright.config.ts](frontend/playwright.config.ts#L15-L20) sets `video: { mode: 'retain-on-failure' }` **and** `contextOptions.recordVideo.dir`. The latter unconditionally records video for every context; the former only controls *retention*. Recording is the cost. Remove `contextOptions.recordVideo` to let `retain-on-failure` actually short-circuit recording.
- **Gain:** 5–15% wall time, especially on mobile/webkit. **Risk:** Very low.

#### H4. No tracing configured (complete)
- No `trace` option in `playwright.config.ts`. When a test fails on CI we get a video but no trace, which is the single most useful debug artifact. Recommend `trace: 'on-first-retry'`.
- **Gain:** Negligible cost (only on retry), large debug value. **Risk:** None.

#### H5. JS coverage collected unconditionally on chromium projects (complete)
- [frontend/src/config/tests/coverage.setup.ts](frontend/src/config/tests/coverage.setup.ts#L21-L57) starts/stops `page.coverage` on every chromium test. v8-to-istanbul + file-system writes per-test are expensive and not needed during normal e2e runs — only `test:coverage` requires it.
- **Fix:** Gate on `process.env.VITE_COVERAGE === 'true'`.
- **Gain:** 10–20% wall time on non-coverage runs (which is most of local dev). **Risk:** Low.

#### H6. `auth.setup.ts` registers full mock suite in `beforeEach` and uses `networkidle` (complete)
- [frontend/src/config/tests/auth.setup.ts](frontend/src/config/tests/auth.setup.ts#L6-L29) re-registers ~6 stubs and waits for `networkidle` before the single `authenticate` test. Setup runs once per worker per project; the stubs are not needed for the JWT cookie injection path used in mock mode.
- **Gain:** A few seconds per worker, but more importantly removes a confusing dependency between auth and unrelated stubs. **Risk:** Low.

#### H7. Cross-browser & mobile project list adds ~6× executions when enabled (complete)
- 11 projects total when `RUN_BROWSERS_TESTS=true && RUN_MOBILE_TESTS=true`. None are run by default in CI, but the configuration shape means enabling them has no parallelism strategy (no sharding). Recommend project-tag based filtering + matrix in CI.
- **Gain:** Makes opt-in cross-browser feasible without 10× wall-time. **Risk:** Low.

---

### Medium

#### M1. Mobile project entries spread `devices[name]` twice (skipped)
- Each entry in `mobileProjects` does `...devices['Pixel 7'], device: devices['Pixel 7']`. `device` is not a Playwright option; it's only stored as metadata (and currently unused outside log lines). Harmless but noisy; recommend dropping the extra key.

#### M2. `test.skip(runtimeCondition, ...)` after expensive `beforeEach` (complete)
- Tests like the role-override variants in [frontend/src/components/Layout/HeaderPanelProfile/index.e2e.test.tsx](frontend/src/components/Layout/HeaderPanelProfile/index.e2e.test.tsx#L511-L516) run all of `beforeEach` (open page, mock APIs, navigate, networkidle) and then call `test.skip(...)`. Use project-level `grep` / `grepInvert` or test tags (`@idir-only`) to exclude at scheduling time.
- **Gain:** Saves wasted setup time for ~30% of tests in 50% of projects. **Risk:** Low (annotations only).

#### M3. `HeaderPanelProfile` BCeID-only branches still execute IDIR mocks (complete — resolved by M2)
- [frontend/src/components/Layout/HeaderPanelProfile/index.e2e.test.tsx](frontend/src/components/Layout/HeaderPanelProfile/index.e2e.test.tsx#L13-L39) conditionally mocks `forest-clients/*` only for BCeID, then navigates and waits for networkidle for all users. Combined with M2 and C4 this is the slowest single file in the suite.

#### M4. `MockPromise` adds 200 ms artificial delay (complete)
- [frontend/src/config/tests/MockPromise.ts](frontend/src/config/tests/MockPromise.ts#L8) `setTimeout(() => resolve(content), 200)`. If any test code path actually awaits this, every awaited resolution costs 200ms. Verify whether this delay is required to reproduce real-world race conditions or can be reduced to 0 in tests.

#### M5. Repeated locator construction in test bodies (complete)
- Many tests do `page.getByRole('searchbox')`, `page.getByTestId('search-button-most')`, etc. repeatedly per test. Hoist to constants or a Page Object to avoid re-evaluation and improve readability.

#### M6. Common per-page `beforeEach` mock setup is half-extracted (complete)
- `setupWasteSearchMocks` and `setupCreateRuMocks` are good. The remaining ~10 test files duplicate similar boilerplate inline. Extract one shared helper per page route.

#### M7. Viewport is `1920×1080` for every desktop test (complete)
- Larger viewports = more pixels to render = slower frame production, especially with Carbon's heavy CSS. `1366×768` or `1440×900` is plenty for testing and faster.

---

### Low

#### L1. Reporters are full triple stack locally and in CI (complete)
- `list + html + junit`. The HTML reporter writes hundreds of artifacts per run. Consider `reporter: process.env.CI ? [...] : 'list'`.

#### L2. `dotenv.config()` runs at config evaluation (complete)
- [frontend/playwright.config.ts](frontend/playwright.config.ts#L1-L6) calls `dotenv.config()` at module load. Fine, but the project metadata snapshots `process.env.BCEID_PASSWORD` etc. into a plain object at config build time, making secrets visible in any debug dump of project metadata. Switch to lazy `process.env` reads inside `auth.setup`.

#### L3. `pree2e` overwrites storage state files to `{}` before every run
- [frontend/package.json](frontend/package.json#L13) wipes `user.bceid.json` and `user.idir.json` to `{}` before `test:e2e`. Combined with `globalTeardown` clearing them, the suite never benefits from cached auth between local runs. For local dev, a `--keep-auth` mode would help.

#### L4. No README section on running the e2e suite (complete)
- [frontend/README.md](frontend/README.md) lacks "Running E2E tests locally" guidance (workers, env vars, what `VITE_MOCK_AUTH` does).

#### L5. `axe-playwright` is injected in `globalSetup` but lost (complete — resolved by C3)
- Axe injection on a throwaway page is discarded when the browser closes. The actual a11y tests inject it again at point of use, so the globalSetup injection is dead code.

---

## Estimated Impact Summary

| ID | Item | Effort | Wall-time Gain | Risk |
|----|------|--------|----------------|------|
| C1 | Use `vite preview` for webServer | S | 30–50% per test | L |
| C2 | Fix coverage fixture to honor storageState | S | Enables C5/H1 gains | M |
| C3 | Delete useless globalSetup loop | XS | 10–30s/run | L |
| C4 | Remove `networkidle` waits | M | 20–40% | M |
| C5 | `fullyParallel` + workers + per-project matrix sharding | S | 30–50% (CI) | L |
| H1 | Worker-scoped context | M | 15–25% | M |
| H2 | Gate playwright install | XS | 30–90s/local | L |
| H3 | Stop recording video unconditionally | XS | 5–15% | L |
| H4 | Add `trace: 'on-first-retry'` | XS | n/a (debug) | None |
| H5 | Gate coverage collection | XS | 10–20% (local) | L |
| H6 | Trim auth.setup `beforeEach` | XS | seconds | L |
| H7 | Tag-based filtering for cross-browser | M | enables future opt-in | L |
| M1–M7 | Polish | XS–S | 5–10% combined | L |
| L1–L5 | Cosmetic | XS | minimal | None |

**Aggregate expected reduction** (Critical + High applied, conservative):
- **Local default run:** ~65–75% faster
- **CI default run (chromium only):** ~50–65% faster
- **CI cross-browser opt-in:** scales linearly with shard count

---

## Recommended Phase 2 Roadmap

Implement in this order. Each item is **one commit, one verification, one Conventional Commit message**. Stop after each step and run `npm run test:e2e`.

- [x] 1. **H4 + H3** — Add `trace: 'on-first-retry'`, fix video recording config. _Tiny, near-zero risk, gives us a debug artifact for the rest of the roadmap._
   `perf(playwright): enable on-failure traces and stop unconditional video recording`

- [x] 2. **C3** — Delete the useless `globalSetup` loop (or shrink to one warm-up).
   `perf(playwright): remove redundant per-project browser warm-up in globalSetup`

- [ ] 3. **H2** — Gate `playwright install` on CI/first-run.
   `chore(playwright): skip browser install when already provisioned`

- [x] 4. **H5** — Gate JS coverage collection on `VITE_COVERAGE=true`.
   `perf(playwright): only collect JS coverage when explicitly requested`

- [ ] 5. **C1** — Switch `webServer` to `vite preview` of a pre-built bundle.
   `perf(playwright): serve built bundle to e2e suite instead of vite dev`

- [ ] 6. **C5 (a)** — Enable `fullyParallel`, set explicit `workers`.
   `perf(playwright): enable fullyParallel and configure workers`

- [ ] 7. **C5 (b)** — Add GitHub Actions matrix that shards the e2e suite by Playwright project (one job per project) so `bceid` and `idir` always run in parallel runners. Inside each shard, use `workers: '100%'`.
   `ci(playwright): shard e2e suite by project across matrix jobs`

- [x] 8. **C2 + H1** — Fix `coverage.setup` to honor `storageState`; promote context to worker scope where safe.
   `perf(playwright): restore project storageState reuse and worker-scoped context`

- [ ] 9. **H6** — Trim `auth.setup` `beforeEach` and remove its `networkidle` wait.
   `perf(playwright): simplify auth setup and drop network-idle wait`

- [ ] 10. **C4** — Bulk replace `waitForLoadState('networkidle')` with web-first assertions or `waitForResponse`. Done file-by-file in 3–5 commits, not one mega-commit.
    `perf(playwright): replace networkidle waits with web-first assertions (<file>)`

- [ ] 11. **M2** — Convert runtime `test.skip(userType...)` into project-level filtering with tags.
    `perf(playwright): filter user-specific tests via project tags`

- [ ] 12. **M6** — Extract remaining per-page mock helpers.
    `refactor(playwright): centralize per-page mock setup helpers`

- [ ] 13. **M1, M5, M7, L1, L4** — Polish pass.
    `chore(playwright): cleanup config and locator hygiene`

---

## STOP

Awaiting approval. No code will be modified, no commits will be created, and no fixes will be applied until you confirm the roadmap (or amend it).
