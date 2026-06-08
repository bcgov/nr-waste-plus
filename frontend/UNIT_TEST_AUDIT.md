# Frontend Unit Test Audit (Vitest + Testing Library)

**Scope:** `frontend/src/**/*.unit.test.{ts,tsx}` (118 files)
**Tooling reviewed:** `vite.config.ts` (`test` section), `src/config/tests/*`, ESLint config
**Stack:** Vitest 4 · @testing-library/react 16 · @testing-library/user-event 14 · jsdom · React 19 · Carbon · TanStack Router/Query

---

## Executive Summary

The suite has **broad coverage** (118 unit files plus 14 e2e) and a sensible structure (colocated `*.unit.test.tsx`, one Vitest project, central setup files). However it leans heavily on **implementation-detail testing**: CSS selectors, `document.querySelector` against Carbon internals, `data-testid` where roles would work, `fireEvent` in place of `userEvent`, and `expect(x).toBeDefined()` as the universal "rendered" assertion (which silently passes for absent or empty nodes).

Provider scaffolding (QueryClient + Auth + Preference + Router) is **duplicated in every page test** — no shared render helper exists despite `routerTestHelper.tsx` already being a partial step in that direction. Several tests use **real-time `setTimeout` waits** (race risk) and **mutate global env** between describe blocks (order-dependent).

The project ships two custom matchers (`toContainText`, `toBeEmptyDOMElement`). No snapshot abuse (no `toMatchSnapshot` / `toMatchInlineSnapshot` anywhere — **good**).

**Overall quality:** functional but **moderately brittle**. The same component will likely require test updates whenever Carbon upgrades or class names change. Estimated 30–40 % of assertion sites are coupled to implementation details that a behavior-first refactor would eliminate.

---

## Findings

### Critical

#### C1. `expect(...).toBeDefined()` used as the universal render assertion (project-wide anti-pattern)

- **Description:** Nearly every test asserts presence with `expect(screen.getByText('x')).toBeDefined()` or `expect(screen.getByTestId('y')).toBeDefined()`. `getByText`/`getByRole`/`getByTestId` already throw if not found, so the `.toBeDefined()` is a **no-op assertion** — it always passes as long as the element was found, even if it is hidden or empty. Worse, when paired with `screen.queryBy*`, the pattern silently passes for `null` because `null` satisfies `.toBeDefined()` only in the abstract type sense but in Vitest `null` is *not* undefined, so this is actually the inverse trap: `expect(null).toBeDefined()` **passes**. Either way there is no real behavioral signal.
  - **For `getBy*`:** drop the `expect` entirely — throwing on miss *is* the assertion — or add a meaningful follow-up: `getByRole('button', { name: /submit/i })` implicitly asserts presence *and* accessible name.
  - **For `queryBy*` absence:** use `expect(screen.queryByText('x')).toBeNull()` (Vitest built-in).
  - **For `queryBy*` presence:** prefer `getBy*` directly (throws on miss), or assert `expect(el).not.toBeNull()`.
  - **For `.className.toContain(...)` and `.getAttribute(...)` presence checks:** prefer `screen.getByRole` with a `name` filter (validates accessible name) or the custom `toContainText` matcher already in `custom-matchers.ts`.
- **Files affected:** ~110 of 118 unit tests. Sample: [frontend/src/pages/WasteSearch/index.unit.test.tsx](frontend/src/pages/WasteSearch/index.unit.test.tsx#L82), [frontend/src/components/Layout/index.unit.test.tsx](frontend/src/components/Layout/index.unit.test.tsx#L85), [frontend/src/components/Form/TableResource/index.unit.test.tsx](frontend/src/components/Form/TableResource/index.unit.test.tsx#L116), [frontend/src/components/core/PageNotification/index.unit.test.tsx](frontend/src/components/core/PageNotification/index.unit.test.tsx#L68), [frontend/src/components/core/DistrictSelection/DistrictListing/index.unit.test.tsx](frontend/src/components/core/DistrictSelection/DistrictListing/index.unit.test.tsx#L100).
- **Why it matters:** Visibility, accessible-name correctness, and "queryBy returned null" bugs are not caught. Tests pass even when the rendered element is hidden or empty. This is the single largest source of false-negative coverage in the suite.
- **Risk:** High — passing tests do not guarantee user-visible behavior.
- **Effort:** Medium. Mechanical codemod per the rules above; prefer `getByRole(..., { name })` for interactive elements and `toBeNull()` for absence assertions.
- **Expected benefit:** Real behavioral assertions; future regressions on accessible names and visibility caught immediately.

#### C2. Heavy reliance on `document.querySelector` / `container.querySelector` with CSS selectors

- **Description:** 180+ matches. Tests assert against Carbon-internal class names (`.cds--header`, `.cds--content`, `.cds--multi-select`, `.cds--skeleton`, `.cds--popover-content`, `.cds--tag--green`, `.cds--side-nav__link--current`), product-specific class names (`.create-ru-column__content`, `.create-ru-submit-button`, `.file-upload-item`, `.legacy-data-tag`, `.tag-wrapper`, `.layout-grid`), and DOM `id` attributes (`#create-ru-district`, `#as-sampling-multi-select`, `#create-ru-grade-coastal`).
- **Files most affected:**
  - [frontend/src/components/waste/ReportingUnits/ReportingUnitCreate/index.unit.test.tsx](frontend/src/components/waste/ReportingUnits/ReportingUnitCreate/index.unit.test.tsx) — **80+ `document.querySelector` calls**, near-100 % implementation-detail tests.
  - [frontend/src/components/Form/FileUploadInput/index.unit.test.tsx](frontend/src/components/Form/FileUploadInput/index.unit.test.tsx) — 30+ `container.querySelector('input[type="file"]')` and `.file-upload-item` queries.
  - [frontend/src/components/Form/ReadonlyInput/index.unit.test.tsx](frontend/src/components/Form/ReadonlyInput/index.unit.test.tsx) — 30+ DOM tag queries (`dl`, `dt`, `dd`, class-based).
  - [frontend/src/components/waste/WasteSearch/WasteSearchTableExpandContent/index.unit.test.tsx](frontend/src/components/waste/WasteSearch/WasteSearchTableExpandContent/index.unit.test.tsx) — uses `container.querySelector(`#${rowId}-...`)` for each cell.
  - [frontend/src/components/Layout/index.unit.test.tsx](frontend/src/components/Layout/index.unit.test.tsx#L79-L84) — three CSS-class assertions stand in for the entire test.
  - [frontend/src/components/Layout/ThemeToggle/index.unit.test.tsx](frontend/src/components/Layout/ThemeToggle/index.unit.test.tsx#L43), [frontend/src/components/core/Tags/ColorTag/index.unit.test.tsx](frontend/src/components/core/Tags/ColorTag/index.unit.test.tsx#L31), [frontend/src/components/core/Tags/LegacyDataTag/index.unit.test.tsx](frontend/src/components/core/Tags/LegacyDataTag/index.unit.test.tsx#L95-L109), [frontend/src/components/Form/ConditionalField/index.unit.test.tsx](frontend/src/components/Form/ConditionalField/index.unit.test.tsx#L425-L451), [frontend/src/components/Form/ActiveMultiSelect/index.unit.test.tsx](frontend/src/components/Form/ActiveMultiSelect/index.unit.test.tsx#L217-L299).
- **Why it matters:** A Carbon minor version bump, a SCSS rename, or any internal restructure breaks tests that the user cannot see. Tests describe *the DOM*, not *the behavior*.
- **Risk:** High — fragility, brittle migrations, Carbon upgrade pain.
- **Effort:** High (one component at a time). For inputs, switch to `getByRole('combobox' | 'textbox' | 'button')` + `getByLabelText`. For tags, assert on accessible text + role. For Carbon overlay components, assert on the visible label/role rather than `.cds--popover-content`.
- **Expected benefit:** Tests survive Carbon upgrades and CSS refactors.

#### C3. No shared render helper — provider scaffolding duplicated in ~30 page/feature tests

- **Description:** The combination `QueryClientProvider` + `PreferenceProvider` + `AuthProvider` + `RouterProvider(createTestRouter(...))` is **literally copy-pasted** across every page test. `routerTestHelper.tsx` exists but only covers the router; `createRouterWrapper` is rarely used.
- **Files affected (representative):** [frontend/src/pages/WasteSearch/index.unit.test.tsx](frontend/src/pages/WasteSearch/index.unit.test.tsx#L36-L56), [frontend/src/pages/Landing/index.unit.test.tsx](frontend/src/pages/Landing/index.unit.test.tsx#L13-L25), [frontend/src/pages/MyClientList/index.unit.test.tsx](frontend/src/pages/MyClientList/index.unit.test.tsx#L26-L42), [frontend/src/pages/NoRole/index.unit.test.tsx](frontend/src/pages/NoRole/index.unit.test.tsx#L46-L56), [frontend/src/pages/ReportingUnitDetails/index.unit.test.tsx](frontend/src/pages/ReportingUnitDetails/index.unit.test.tsx#L59-L66), [frontend/src/components/Layout/index.unit.test.tsx](frontend/src/components/Layout/index.unit.test.tsx#L57-L77), [frontend/src/components/waste/MyClientListing/index.unit.test.tsx](frontend/src/components/waste/MyClientListing/index.unit.test.tsx#L128-L143), [frontend/src/components/waste/ReportingUnits/ReportingUnitCreate/index.unit.test.tsx](frontend/src/components/waste/ReportingUnits/ReportingUnitCreate/index.unit.test.tsx#L127-L139), [frontend/src/components/waste/WasteSearch/WasteSearchFilters/index.unit.test.tsx](frontend/src/components/waste/WasteSearch/WasteSearchFilters/index.unit.test.tsx#L49-L67).
- **Why it matters:** Maintenance tax (every provider added/changed touches 30+ files), inconsistent provider order (some files nest `AuthProvider` inside the router, others outside), and each test creates a fresh `new QueryClient()` *without* `retry: false` — slow tests under failure paths.
- **Risk:** High — quality, speed, and consistency suffer.
- **Effort:** Medium. Build `src/config/tests/renderWithApp.tsx` exposing `renderWithProviders(ui, { route, queryClient, mockUser })` and an `AppTestProviders` component. Migrate file-by-file.
- **Expected benefit:** Drop 20–40 lines per page test, single source of truth, faster failure paths (every test gets `retry: false`).

---

### High

#### H1. `fireEvent` used where `userEvent` is appropriate

- **Description:** 80+ `fireEvent.click/change/blur/focus/keyDown` occurrences. `fireEvent.change(input, { target: { value: 'Al' } })` does **not** simulate typing, focus, blur, or controlled-input behavior the way a real user does. Several tests wrap clicks in `act(async () => fireEvent.click(...))` — `userEvent` already wraps in act, making the wrapper redundant.
- **Files most affected:** [frontend/src/components/Form/AutoCompleteInput/index.unit.test.tsx](frontend/src/components/Form/AutoCompleteInput/index.unit.test.tsx#L41-L156) (16 `fireEvent` calls — should be `userEvent.type` / `userEvent.click`), [frontend/src/components/Form/ActiveMultiSelect/index.unit.test.tsx](frontend/src/components/Form/ActiveMultiSelect/index.unit.test.tsx#L99-L456) (~20 `act + fireEvent.click`), [frontend/src/components/Layout/ThemeToggle/index.unit.test.tsx](frontend/src/components/Layout/ThemeToggle/index.unit.test.tsx#L59-L73), [frontend/src/components/Layout/LayoutHeader/LayoutHeaderGlobalBar.unit.test.tsx](frontend/src/components/Layout/LayoutHeader/LayoutHeaderGlobalBar.unit.test.tsx#L52), [frontend/src/components/Layout/HeaderPanelProfile/index.unit.test.tsx](frontend/src/components/Layout/HeaderPanelProfile/index.unit.test.tsx#L93), [frontend/src/hooks/useOutsideClick/index.unit.test.tsx](frontend/src/hooks/useOutsideClick/index.unit.test.tsx#L40-L64), [frontend/src/context/preference/PreferenceContext.unit.test.tsx](frontend/src/context/preference/PreferenceContext.unit.test.tsx#L90), [frontend/src/context/layout/LayoutContext.unit.test.tsx](frontend/src/context/layout/LayoutContext.unit.test.tsx#L50), [frontend/src/pages/Landing/index.unit.test.tsx](frontend/src/pages/Landing/index.unit.test.tsx#L122-L128), [frontend/src/components/core/PageNotification/index.unit.test.tsx](frontend/src/components/core/PageNotification/index.unit.test.tsx#L141).
- **Why it matters:** Misses real keyboard/focus regressions, less realistic. Mixed style hurts readability.
- **Risk:** High.
- **Effort:** Medium (mechanical replacement; keep `fireEvent` only where userEvent intentionally cannot reach, e.g. `dispatchEvent` on a non-interactive element).
- **Expected benefit:** Better fidelity, removed redundant `act` wraps, fewer flakes around focus/blur.

#### H2. Real-time `setTimeout` sleeps in tests (race-prone, slow)

_(was H3 — numbering unchanged)_

<!-- marker-remove-next-line -->

- **Description:** Tests use raw `await new Promise(r => setTimeout(r, 100))` to wait for state to settle.
- **Files affected:**
  - [frontend/src/components/waste/WasteSearch/WasteSearchTable/index.unit.test.tsx](frontend/src/components/waste/WasteSearch/WasteSearchTable/index.unit.test.tsx#L418) (`setTimeout 100ms`)
  - [frontend/src/components/waste/WasteSearch/WasteSearchTableExpandContent/index.unit.test.tsx](frontend/src/components/waste/WasteSearch/WasteSearchTableExpandContent/index.unit.test.tsx#L92-L102) (two × `setTimeout 100ms`)
  - [frontend/src/components/Form/FileUploadInput/index.unit.test.tsx](frontend/src/components/Form/FileUploadInput/index.unit.test.tsx#L378-L426) (`setTimeout 10ms` × 2)
  - [frontend/src/utils/runValidators.unit.test.ts](frontend/src/utils/runValidators.unit.test.ts#L89-L312)
- **Why it matters:** Race conditions on slower CI; couples test timing to wall clock; adds non-deterministic slowdown.
- **Risk:** High (flake risk).
- **Effort:** Low. Replace with `await screen.findBy*` or `await waitFor(() => expect(...))` against the *observable* condition (`mockFn` called, text appearing, etc.).
- **Expected benefit:** Eliminates a known flake vector; speeds up tests.

#### H3. `clearMocks: true` set but `restoreMocks` and `unstubGlobals` are not

- **Description:** [frontend/vite.config.ts](frontend/vite.config.ts#L181) sets `clearMocks: true` (clears call history) but not `restoreMocks: true` (restores spies) or `unstubGlobals: true`. `setup-env.ts` patches `process.stderr.write` and overwrites `window.matchMedia`, `global.ResizeObserver`, several `SVGElement.prototype` methods inside `beforeAll`, and they are **never restored**. Mutations on `env.VITE_MOCK_AUTH` in AuthProvider tests likewise persist.
- **Files affected:** [frontend/src/config/tests/setup-env.ts](frontend/src/config/tests/setup-env.ts#L36-L66), [frontend/src/context/auth/AuthProvider.unit.test.tsx](frontend/src/context/auth/AuthProvider.unit.test.tsx#L33-L119).
- **Why it matters:** Cross-file leakage; tests pass alone but fail in a different file order. Specifically, AuthProvider's `beforeAll(() => { env.VITE_MOCK_AUTH = 'true' })` runs once per describe and never reverts — any later test importing `env` sees mutated state.
- **Risk:** High (order-dependent flakes; debugging tax).
- **Effort:** Low. Add `restoreMocks: true`, `unstubGlobals: true`, `unstubEnvs: true` to vitest config; use `vi.stubEnv('VITE_MOCK_AUTH', 'true')` instead of direct mutation; ensure `process.stderr.write` patch is restored in `afterAll`.
- **Expected benefit:** Removes a category of order-dependent flakes; makes tests truly isolated.

#### H4. Global `vi.mock('@/services/APIs', ...)` in `setup-env.ts` shadowed by per-file remocks

- **Description:** [frontend/src/config/tests/setup-env.ts](frontend/src/config/tests/setup-env.ts#L11-L33) mocks `APIs` globally with 8 methods. Many files declare their **own** `vi.mock('@/services/APIs', () => ...)` exposing a *different* shape (e.g. [WasteSearch index test](frontend/src/pages/WasteSearch/index.unit.test.tsx#L17-L34) adds `getSamplingOptions`/`getAssessAreaStatuses` not present in the global). The last `vi.mock` per file wins, so the global mock is effectively dead for those files — making it unclear which API surface is mocked where.
- **Why it matters:** Confusing developer experience; if a service grows a new method, the global mock will silently miss it for some files; encourages over-mocking.
- **Risk:** High (maintenance and confusion).
- **Effort:** Medium. Either (a) make the global mock authoritative and add helper accessors per service, or (b) remove the global APIs mock and require explicit per-file mocks. Pick one.
- **Expected benefit:** Mock surface is predictable; less duplication.

#### H5. `data-testid` queries used where accessible queries are available

- **Description:** Components have visible roles/labels but tests reach for `getByTestId`. Examples:
  - `screen.getByTestId('landing-button__idir')` in [Landing test](frontend/src/pages/Landing/index.unit.test.tsx#L69) — button with visible name "Log in with IDIR" → `getByRole('button', { name: /log in with idir/i })`.
  - `screen.getByTestId('district-select-DCR')` in [DistrictListing test](frontend/src/components/core/DistrictSelection/DistrictListing/index.unit.test.tsx#L114) — radio-like item that could use `getByRole('button'|'option', { name: ... })`.
  - `screen.getByTestId('search-button-other')` in [MyClientListing test](frontend/src/components/waste/MyClientListing/index.unit.test.tsx) (used 9×) — could use `getByRole('button', { name: /search/i })`.
  - `screen.getByTestId('loading')`, `getByTestId('dummy-page')`, `getByTestId('outlet')` — these test-only sentinels are fine; the issue is real user-visible elements.
- **Why it matters:** Reinforces the Carbon-coupling problem; `aria-label`/visible text regressions go undetected.
- **Risk:** High.
- **Effort:** Medium per file.
- **Expected benefit:** Real accessible-name regressions caught (cf. existing repo memory note `carbon-tooltip-aria.md`).

#### H7. `act()` warnings flooding stderr — Carbon async state updates not flushed

- **Description:** Running `npm run test:unit` produces **React `act()` warnings on every test** in two files. Two distinct warning variants appear:

  **Variant A — `"not wrapped in act(...)"` (Carbon Tooltip / Popover async transitions)**
  ```
  An update to Transitioner inside a test was not wrapped in act(...).
  An update to MatchesInner inside a test was not wrapped in act(...).
  An update to LocalSubscribe inside a test was not wrapped in act(...).
  ```
  Source: Carbon `ComboBox` / `Dropdown` / `MultiSelect` components use `react-transition-group`'s `Transitioner` + `floating-ui`'s `MatchesInner`/`LocalSubscribe` for overlay animations. These schedule async state updates after `render()` that RTL's synchronous `act()` (called implicitly on `render`) does not flush.

  **Variant B — `"not configured to support act(...)"` (test environment detection)**
  ```
  The current testing environment is not configured to support act(...)
  ```
  Source: `AdvancedFilterClientInput` — fires `fireEvent.blur` directly on an element. Carbon's `ActiveMultiSelect` responds with a state update outside any `act` boundary.

  **Affected files and test counts:**
  | File | Tests emitting warnings | Variant |
  |---|---|---|
  | [src/components/waste/ReportingUnits/ReportingUnitCreate/index.unit.test.tsx](frontend/src/components/waste/ReportingUnits/ReportingUnitCreate/index.unit.test.tsx) | **41 / 41** (every test) | A — `Transitioner`, `MatchesInner`, `LocalSubscribe` |
  | [src/components/waste/WasteSearch/WasteSearchFiltersAdvanced/AdvancedFilterClientInput/index.unit.test.tsx](frontend/src/components/waste/WasteSearch/WasteSearchFiltersAdvanced/AdvancedFilterClientInput/index.unit.test.tsx) | 2 / 15 (onBlur tests) | B — environment detection |
  | `src/env.unit.test.ts` | 3 / 14 | **Expected** — intentional `console.error` from `env` fallback logic; not a React warning |

- **Root cause for Variant A:** Every test in `ReportingUnitCreate` renders a `ComboBox` (district) and a `MultiSelect` (sampling). Carbon mounts these with async transition state. The fix is to flush pending microtasks after `render` via:
  ```ts
  import { act } from '@testing-library/react';
  // after render(...)
  await act(async () => {});
  ```
  This is the documented pattern for Carbon overlays (cf. user memory `testing-pitfalls.md`).

- **Root cause for Variant B:** `fireEvent.blur` in `AdvancedFilterClientInput` triggers Carbon `ActiveMultiSelect`'s blur handler which updates state outside an `act` boundary. Replace with `await userEvent.tab()` (moves focus away, triggering blur through the real event system inside `act`), or wrap the `fireEvent.blur` in `await act(async () => { fireEvent.blur(el); })`.

- **Why it matters:** Warnings indicate real async state leakage between tests — state updates complete *after* the test ends, potentially contaminating the next test. 41 spammy warnings per run also drown out real signal in CI logs.
- **Risk:** High — state leakage; signal-to-noise ratio in CI.
- **Effort:** Low–Medium.
  - `ReportingUnitCreate`: add `await act(async () => {})` after each `render` call (one-liner per test, or move to a `beforeEach`).
  - `AdvancedFilterClientInput`: replace `fireEvent.blur` with `await userEvent.tab()` or `await act(async () => { fireEvent.blur(el); })`.
- **Expected benefit:** Zero act() warnings; no cross-test state leakage from Carbon transitions.



- **Description:** [frontend/src/context/auth/AuthProvider.unit.test.tsx](frontend/src/context/auth/AuthProvider.unit.test.tsx#L32-L119) does `beforeAll(async () => { const { env } = await import('@/env'); env.VITE_MOCK_AUTH = 'false' })` for one describe and `'true'` for the next. This is order-dependent and leaks into other test files importing `env`. There is no `afterAll` to revert.
- **Why it matters:** Order-dependent test fragility. The current pass is coincidental.
- **Risk:** High (intermittent failures with file-order changes / parallelism).
- **Effort:** Low. Use `vi.stubEnv('VITE_MOCK_AUTH', ...)` + `vi.unstubAllEnvs()` in `afterEach`, or migrate to `vi.doMock('@/env', ...)`.
- **Expected benefit:** Deterministic tests; unblocks parallel execution.

---

### Medium

#### M1. ESLint missing `eslint-plugin-testing-library` and `eslint-plugin-vitest`

- **Description:** `eslint.config.js` has no testing-library plugin, so violations like `prefer-screen-queries`, `no-container`, `no-node-access`, `no-wait-for-multiple-assertions`, `prefer-find-by`, `prefer-user-event` go undetected. Without these, violations detected by this audit (C1, C2, H1) will keep regressing.
- **Files affected:** [frontend/eslint.config.js](frontend/eslint.config.js)
- **Why it matters:** No automated guardrails for the testing standards being introduced by this audit.
- **Risk:** Medium.
- **Effort:** Low (`npm i -D eslint-plugin-testing-library eslint-plugin-vitest`).
- **Expected benefit:** Lint-time enforcement; prevents regressions.

#### M2. Per-test `new QueryClient()` without `retry: false`

- **Description:** Most page tests construct `const qc = new QueryClient()` with defaults. The default retry policy is 3 with exponential backoff. When a mock rejects, `waitFor` may run up to ~7 s before the failure surfaces.
- **Files affected:** [WasteSearch page](frontend/src/pages/WasteSearch/index.unit.test.tsx#L36), [Layout component](frontend/src/components/Layout/index.unit.test.tsx#L59), [Landing](frontend/src/pages/Landing/index.unit.test.tsx#L13), [MyClientList](frontend/src/pages/MyClientList/index.unit.test.tsx#L26), [NoRole](frontend/src/pages/NoRole/index.unit.test.tsx#L46), [ThemeContext](frontend/src/context/theme/ThemeContext.unit.test.tsx#L37), [PreferenceContext](frontend/src/context/preference/PreferenceContext.unit.test.tsx#L48), [TableResource](frontend/src/components/Form/TableResource/index.unit.test.tsx#L48), [AutoCompleteInput](frontend/src/components/Form/AutoCompleteInput/index.unit.test.tsx#L17), [WasteSearchFilters index](frontend/src/components/waste/WasteSearch/WasteSearchFilters/index.unit.test.tsx#L49). Some tests do set `{ retry: false }` already ([DistrictListing](frontend/src/components/core/DistrictSelection/DistrictListing/index.unit.test.tsx#L53-L57), [MyClientListing](frontend/src/components/waste/MyClientListing/index.unit.test.tsx#L128), [WasteSearchFilterOptions hook](frontend/src/components/waste/WasteSearch/WasteSearchFilters/useWasteSearchFilterOptions.unit.test.tsx#L39)) — inconsistent.
- **Why it matters:** Slow failures, timeout-driven flakes, inconsistent behavior between test files.
- **Risk:** Medium (speed + flake).
- **Effort:** Low — collapsed into the shared render helper (C3).
- **Expected benefit:** Uniformly fast failures.

#### M3. Redundant `expect(getByX).toBeDefined()` after a throwing query

- **Description:** Same root cause as C1 but worth calling out separately: many tests have **no real assertion** because `getByText`/`getByRole` already throw on miss. Drop the wrapping `expect(...).toBeDefined()` entirely — the throwing query is the assertion — or follow it with a meaningful check (`toHaveTextContent`, `toContainText`, `toBeNull`, `not.toBeNull`) using Vitest built-ins or the existing custom matchers.
- **Files affected:** Same set as C1.
- **Risk:** Medium (false confidence).
- **Effort:** Low (codemod).
- **Expected benefit:** Real test coverage at the assertion line.

#### M4. Mega-tests over 500 lines with deep nesting

- **Description:**
  - [frontend/src/components/waste/MyClientListing/index.unit.test.tsx](frontend/src/components/waste/MyClientListing/index.unit.test.tsx) — 500+ lines, dozens of `waitFor` blocks, 9 `getByTestId('search-button-other')` repeats.
  - [frontend/src/components/waste/ReportingUnits/ReportingUnitCreate/index.unit.test.tsx](frontend/src/components/waste/ReportingUnits/ReportingUnitCreate/index.unit.test.tsx) — 800+ lines.
  - [frontend/src/components/waste/WasteSearch/WasteSearchTable/index.unit.test.tsx](frontend/src/components/waste/WasteSearch/WasteSearchTable/index.unit.test.tsx) — 800+ lines with 30+ `userEvent.click(searchButton)` cycles.
  - [frontend/src/components/Form/FileUploadInput/index.unit.test.tsx](frontend/src/components/Form/FileUploadInput/index.unit.test.tsx) — 800+ lines.
- **Why it matters:** Hard to read, slow to run, expensive to fix when a single setup detail changes; shared fixtures repeated.
- **Risk:** Medium.
- **Effort:** Medium (split by concern: rendering, filtering, pagination, errors).
- **Expected benefit:** Targeted reruns, faster feedback loops, parallelizable.

#### M5. Coverage thresholds (80 %) paired with broad excludes inflate the number

- **Description:** [frontend/vite.config.ts](frontend/vite.config.ts#L196-L221) excludes `config/react-query/*` (despite the file having a 600-line test!), `config/fam/*`, `config/tests/*`, `*.env.ts`, `main.tsx`, `App.tsx`, `e2e.setup.ts`, `**/types/**`, `**/constants/**`. Some excludes are reasonable; excluding `config/react-query/*` while testing it heavily is contradictory.
- **Why it matters:** Reported coverage overstates real coverage; encourages "hit 80 %" gaming.
- **Risk:** Medium.
- **Effort:** Low.
- **Expected benefit:** Honest metric; identify true gaps.

#### M6. `routerTestHelper.createRouterWrapper` exported but largely unused

- **Description:** Helper exists ([frontend/src/config/tests/routerTestHelper.tsx](frontend/src/config/tests/routerTestHelper.tsx#L50-L55)) for `renderHook` wrapper but most files still inline `RouterProvider`. The function returns a *new* router on every render — when used with `renderHook`'s rerender, it would lose history. Minor design smell.
- **Risk:** Medium.
- **Effort:** Low — fold into the shared render helper from C3.

#### M7. Sibling/parent DOM traversal: `parentElement?.querySelector`

- **Description:** [WasteSearchFilters index test](frontend/src/components/waste/WasteSearch/WasteSearchFilters/index.unit.test.tsx#L118-L126) navigates `samplingBox.parentElement?.querySelector('button')`. Same in [WasteSearchFiltersAdvanced index test](frontend/src/components/waste/WasteSearch/WasteSearchFiltersAdvanced/index.unit.test.tsx#L165) and [Landing test](frontend/src/pages/Landing/index.unit.test.tsx#L69).
- **Why it matters:** Brittle to any DOM restructure; assumes Carbon multi-select layout.
- **Risk:** Medium.
- **Effort:** Medium (use `within(combobox).getByRole('button')` or `getByRole('combobox', { name })` directly).

#### M8. Excessive `await waitFor(() => expect(getBy*).toBeDefined())` — prefer `findBy*`

- **Description:** Pattern `await waitFor(() => expect(screen.getByText('x')).toBeDefined())` appears throughout. `findByText('x')` does the same thing, retries internally, and returns the element.
- **Files most affected:** [react-query hooks](frontend/src/config/react-query/hooks.unit.test.ts) (25+), [RedirectLinkTag](frontend/src/components/waste/RedirectLinkTag/index.unit.test.tsx), [MyClientListing](frontend/src/components/waste/MyClientListing/index.unit.test.tsx).
- **Risk:** Medium (readability; sometimes hides multiple assertions per `waitFor` which is a Testing Library anti-pattern).
- **Effort:** Low (codemod).
- **Expected benefit:** Shorter, clearer tests.

#### M9. AutoCompleteInput keyboard test has no assertion

- **Description:** [frontend/src/components/Form/AutoCompleteInput/index.unit.test.tsx](frontend/src/components/Form/AutoCompleteInput/index.unit.test.tsx#L117-L125) drives arrow/Enter/Escape keys but never asserts the effect. Likewise the "calls onSelect when suggestion is clicked" test ends with a comment instead of an assertion.
- **Risk:** Medium (silent gap in keyboard a11y coverage).
- **Effort:** Low.

#### M10. Test name conventions inconsistent

- **Description:** Several files use Java-style `shouldXxxx_whenYyyy` ([WasteSearch page](frontend/src/pages/WasteSearch/index.unit.test.tsx#L82), [withProtected guard](frontend/src/routes/guards/withProtected.unit.test.tsx#L69)); others use idiomatic English ("renders skeleton when loading"). Mixed style hurts skim-reading and CI output grouping.
- **Risk:** Medium (DX).
- **Effort:** Low.

---

### Low

#### L1. `await act(async () => render(...))` is rarely needed in RTL v16

- **Description:** Common pattern wraps the initial `render` in `await act`. RTL handles this internally for the initial render; the explicit `act` is only needed when an effect schedules pending state. Removing it where unnecessary clarifies intent.
- **Risk:** Low.
- **Effort:** Low.

#### L2. `process.stderr.write` patched without `afterAll` restore

- **Description:** [setup-env.ts](frontend/src/config/tests/setup-env.ts#L41-L65) silences `flatpickr` locale warnings by replacing `process.stderr.write`. Never restored.
- **Risk:** Low (only affects test process).
- **Effort:** Trivial. Capture original and restore in `afterAll`.

#### L3. Service worker / PWA mocks not centralized

- **Description:** Several PWA + idb tests rely on per-file mocks. Some live in `setup-env.ts` for SVG/`matchMedia`/`ResizeObserver` but PWA-specific scaffolding is scattered.
- **Risk:** Low.
- **Effort:** Low.

#### L4. `aria-label` assertion via `.getAttribute('aria-label').toContain(...)` — brittle string match

- **Description:** [PageNotification test](frontend/src/components/core/PageNotification/index.unit.test.tsx#L102) — manual attribute string match. Prefer querying by accessible name directly: `getByRole('button', { name: /close/i })`, which validates the accessible name and element presence in one query.
- **Risk:** Low.
- **Effort:** Trivial.

#### L5. `userEvent.setup()` usage inconsistent

- **Description:** Some files call `userEvent.setup()` per test, some use the static `userEvent.click`. The static API still works in v14 but builds a fresh user on each call. Pick one style — `userEvent.setup()` once per test is the documented best practice.
- **Files:** [FileUploadInput](frontend/src/components/Form/FileUploadInput/index.unit.test.tsx), [AdvancedFilterClientInput](frontend/src/components/waste/WasteSearch/WasteSearchFiltersAdvanced/AdvancedFilterClientInput/index.unit.test.tsx) use setup; most others use static.
- **Risk:** Low.
- **Effort:** Low.

#### L6. `MockResizeObserver` calls callback synchronously in `observe`

- **Description:** [setup-env.ts](frontend/src/config/tests/setup-env.ts#L67-L90) — synchronous callback in `observe` is convenient but unusual; real `ResizeObserver` is async. Could cause false-positive code paths during render.
- **Risk:** Low.
- **Effort:** Low.

#### L7. `tsconfig.test.json` referenced but not reviewed; `@/` alias defined in two places

- **Description:** [vite.config.ts](frontend/vite.config.ts#L175-L178) repeats the `@/` alias inside `test`. Keep them in sync via a shared constant or rely on `vite-tsconfig-paths` plugin which is already imported.
- **Risk:** Low.
- **Effort:** Low.

#### L8. `globalThis.fetch` mocked once in `beforeAll` and never reset

- **Description:** [setup-env.ts](frontend/src/config/tests/setup-env.ts#L36-L40) — `clearMocks: true` does not restore the assignment (since it's not a spy). A test that does `vi.stubGlobal('fetch', ...)` will leak across files unless `unstubGlobals` is enabled (see H3).
- **Risk:** Low.

---

## Recommended Roadmap

Apply in this order. Each step is independently shippable and validates the next.

1. **Codemod `.toBeDefined()` on `getBy*`/`queryBy*` results** *(C1, M3)*
   - `expect(screen.getByX(...)).toBeDefined()` → drop the `expect` entirely (throwing is the assertion), or follow with a meaningful check (`toHaveTextContent`, `toContainText`, etc.).
   - `expect(screen.queryByX(...)).toBeDefined()` → `expect(screen.queryByX(...)).not.toBeNull()` (absence: `.toBeNull()`).
   - `getByRole('button', { name: /label/i })` implicitly asserts accessible name — prefer over any follow-up string check.
2. **Fix `act()` warnings** — flush Carbon async transitions after render; replace `fireEvent.blur` in `AdvancedFilterClientInput` with `userEvent.tab()`. *(H7)*
3. **Strengthen Vitest config**: add `restoreMocks: true`, `unstubGlobals: true`, `unstubEnvs: true`; switch `process.stderr` patch and global `fetch` mock to use `vi.spyOn` / `vi.stubGlobal`. *(H3, L2, L8)*
4. **Convert AuthProvider env mutation to `vi.stubEnv`** with `vi.unstubAllEnvs()` cleanup. *(H6)*
5. **Add ESLint plugins** `eslint-plugin-testing-library` and `eslint-plugin-vitest` with recommended preset; surface violations as warnings first. *(M1)*
6. **Build shared render helper** `src/config/tests/renderWithApp.tsx` exposing `renderWithProviders(ui, { initialPath, mockUser, queryClient })` and `AppTestProviders`. Standardize `QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })`. *(C3, M2)*
7. **Migrate page-level tests to the helper** (pages first, then complex components). *(C3)*
8. **Replace `fireEvent` with `userEvent`**, drop redundant `act` wrappers; standardize on `userEvent.setup()` once per test. *(H1, L1, L5)*
9. **Remove `setTimeout` sleeps**; replace with `findBy*` / `waitFor` against observable conditions. *(H2)*
10. **Replace `data-testid` queries with role/label queries** where the element has a real accessible name. Keep `testid` for test-only sentinels (loading, outlet, dummy-page). *(H5)*
11. **Replace `document.querySelector` / `container.querySelector` with semantic queries** or `within()`-scoped role queries. Start with [Layout test](frontend/src/components/Layout/index.unit.test.tsx) (3 lines), then `Tags/*`, `Form/ReadonlyInput`, `ThemeToggle`, `LegacyDataTag`, `ColorTag`. *(C2)*
12. **Refactor mega-tests** (`MyClientListing`, `ReportingUnitCreate`, `WasteSearchTable`, `FileUploadInput`) into focused files by concern. *(M4)*
13. **Replace `waitFor(() => expect(getBy*).toBeDefined())` with `await screen.findBy*`** project-wide. *(M8)*
14. **Decide on the global API mock contract**: either keep it authoritative and remove file-level overrides, or remove it entirely and require explicit per-file mocks. Document the choice in `src/config/tests/README.md`. *(H4)*
15. **Revisit coverage excludes**; remove excludes for files that are heavily tested; raise thresholds to a level that reflects real coverage. *(M5)*
16. **Add missing assertions** to AutoCompleteInput keyboard/click tests. *(M9)*
16. **Normalize test naming** to a single convention. *(M10)*

---

## STOP

Awaiting approval before any code change. No files have been modified.

