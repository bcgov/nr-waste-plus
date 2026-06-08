# PR #919 — Fix Plan (`fix/tests`)

Branch: `fix/tests` · PR: <https://github.com/bcgov/nr-waste-plus/pull/919>

This plan fixes (A) the broken CI tests/builds and (B) the bot review comments.
Work top-to-bottom. **Commit after each numbered step** using the exact
conventional-commit message provided. Do **not** squash steps together.

---

## 0. Root-cause summary (read first)

The PR changed the Playwright `webServer` command in
`frontend/playwright.config.ts`:

- **Before (main):** `webServer.command = 'npm run dev'`
  → Vite dev server (esbuild, **no TypeScript type-checking**).
- **Now (this PR):** `webServer.command = 'npm run build && npm run serve:e2e'`
  where `build = "tsc -b && vite build"`.

`tsc -b` type-checks the whole project, **including the `*.unit.test.tsx`
files**, with `noUnusedLocals` enabled. The PR's test edits left **60 unused
locals/imports (TS6133)** across **26 test files**. So now:

- `npm run build` exits with **code 2**.
- The e2e `webServer` cannot start →
  `Error: Process from config.webServer was not able to start. Exit code: 2`.
- This fails **all** of: `Frontend Unit Tests` (its `test:coverage` chains into
  `test:e2e`), `E2E Tests (bceid)`, `E2E Tests (idir)`, `Frontend UI Tests`, and
  the `Builds (frontend)` Docker job (it runs `npm run build`).

**Fix = remove the 60 unused locals/imports so `tsc -b` passes.** This also
resolves the `github-code-quality` bot comments (same TS6133 findings). Keep the
new `webServer` command — testing the production build + prod-chunk coverage is
the intent of the PR.

Verify locally before each commit. After **every** step run, in order:

```bash
cd frontend
npx tsc -b          # must exit 0, print no errors
npm run lint        # must end with "0 errors" (warnings trend to 0 as you go)
npm run test:unit   # affected unit suites must stay green
```

> The lint warnings are the **same** unused-vars set as the TS6133 errors
> (`npm run lint` currently reports `61 problems (0 errors, 61 warnings)`), so
> Steps 1–2 clear both at once. Do not commit a step whose `tsc -b` still errors.

---

## STEP 1 — Remove unused **imports** in unit tests (21 files)

For each file, delete only the named symbol shown from its import statement;
keep every other import on that line. Do not touch test logic.

| File | Line | Remove import |
| --- | --- | --- |
| `frontend/src/components/core/EmptySection/index.unit.test.tsx` | 4 | `expect` |
| `frontend/src/components/core/PageTitle/index.unit.test.tsx` | 1 | `render` |
| `frontend/src/components/core/Tags/DateTag/index.unit.test.tsx` | 2 | `expect` |
| `frontend/src/components/core/Tags/UnderConstructionTag/index.unit.test.tsx` | 2 | `expect` |
| `frontend/src/components/core/Tags/YesNoTag/index.unit.test.tsx` | 2 | `expect` |
| `frontend/src/components/Form/TableResource/index.unit.test.tsx` | 12 | `renderWithAppAsync` |
| `frontend/src/components/Layout/HeaderPanelProfile/index.unit.test.tsx` | 1 | `render` |
| `frontend/src/components/Layout/index.unit.test.tsx` | 2 | `expect` |
| `frontend/src/components/Layout/LayoutHeaderPanel/index.unit.test.tsx` | 2 | `expect` |
| `frontend/src/components/waste/CodeDescriptionTag/index.unit.test.tsx` | 2 | `expect` |
| `frontend/src/components/waste/RedirectLinkTag/index.unit.test.tsx` | 1 | `act` |
| `frontend/src/components/waste/WasteSearch/WasteSearchFilters/useWasteSearchFilterOptions.unit.test.tsx` | 1 | `QueryClient` |
| `frontend/src/components/waste/WasteSearch/WasteSearchFiltersAdvanced/AdvancedFilterClientInput/index.unit.test.tsx` | 10 | `renderWithAppAsync` |
| `frontend/src/components/waste/WasteSearch/WasteSearchTable/constants.unit.test.tsx` | 1 | `screen` |
| `frontend/src/components/waste/WasteSearch/WasteSearchTable/rowActions.unit.test.tsx` | 2 | `QueryClient` |
| `frontend/src/components/waste/WasteSearch/WasteSearchTableExpandContent/index.unit.test.tsx` | 10 | `renderWithAppAsync` |
| `frontend/src/context/preference/PreferenceContext.unit.test.tsx` | 2 | `QueryClient` |
| `frontend/src/context/theme/ThemeContext.unit.test.tsx` | 1 | `QueryClient` |
| `frontend/src/pages/Landing/index.unit.test.tsx` | 1 | `render` |
| `frontend/src/pages/NotFound/index.unit.test.tsx` | 2 | `expect` |
| `frontend/src/pages/WasteSearch/index.unit.test.tsx` | 1 | `waitFor` |

Example: `import { act, render, screen, within } from '@testing-library/react';`
→ `import { act, render, within } from '@testing-library/react';` (removed
`screen`). If removing a symbol leaves an empty `import {} from '...'`, delete
the whole import line.

**Verify before committing:**

```bash
cd frontend
npx tsc -b
npm run lint
npm run test:unit
```

All three must pass (tsc 0 errors, lint 0 errors, unit suites green).

**Commit:**

```text
test(fe): remove unused imports in unit tests
```

---

## STEP 2 — Remove unused **local variable bindings** in unit tests

Two mechanical patterns. The query/render call must stay (it still throws if the
element is missing); only the unused binding is removed.

**Pattern A — `const x = screen.getBy...(...)`** → drop `const x =`, keep the call:
`const dl = screen.getByTestId('card-item-test');` → `screen.getByTestId('card-item-test');`

**Pattern B — `const { container } = render(...)`** → drop the destructuring:
`const { container } = render(<Foo />);` → `render(<Foo />);`

### Files / lines (Pattern A — `screen.getBy...`)

`frontend/src/components/Form/ReadonlyInput/index.unit.test.tsx`:

| Line | Var | Action |
| --- | --- | --- |
| 57 | `dl` | Pattern A (drop `const dl =`) |
| 67 | `dd` | Pattern A (drop `const dd =`) |
| 187 | `dl` | Pattern A |
| 192 | `dl` | Pattern A |
| 228 | `dt` | Pattern A — keep `screen.getByRole('term', { name: 'Hidden Label' });` |

Two ReadonlyInput cases — **add the missing assertion instead of plain removal**
(bot explicitly requested this; matches the test title):

| Line | Var | Replace with |
| --- | --- | --- |
| 62 | `dt` | Keep `const dt = screen.getByRole('term');` then add `expect(dt.className).toContain('card-item-label');` |
| 97 | `dd` | Replace `const dd = screen.getByTestId('card-item-content-my-test-label');` with `expect(screen.getByTestId('card-item-content-my-test-label')).toBeInTheDocument();` |
| 92 | `dl` | Pattern A (drop `const dl =`) |

### Files / lines (Pattern B — `const { container } = render(...)`)

| File | Lines |
| --- | --- |
| `frontend/src/components/Form/ActiveMultiSelect/index.unit.test.tsx` | 216, 287 |
| `frontend/src/components/Form/FileUploadInput/index.unit.test.tsx` | 53, 84, 109, 137, 171, 204, 241, 278, 319, 364, 407, 457, 487, 523, 551, 592, 621, 683, 713, 761, 781 (var `container`); 734 (`container1`); 741 (`container2`) |
| `frontend/src/components/Form/ReadonlyInput/index.unit.test.tsx` | 255, 297 |
| `frontend/src/components/waste/RoleBasedRedirectLinkTag/index.unit.test.tsx` | 75 |
| `frontend/src/components/waste/TooltipRoleBasedRedirectLinkTag/index.unit.test.tsx` | 58 |
| `frontend/src/components/waste/WasteSearch/WasteSearchTableExpandContent/index.unit.test.tsx` | 339, 393 |

> Note on `container1` / `container2` (FileUploadInput L734/L741): these are two
> renders in one test, e.g. `const { container: container1 } = render(...)`.
> Convert each to a plain `render(...)`.

**Verify before committing:**

```bash
cd frontend
npx tsc -b          # no errors, exit 0
npm run lint        # 0 errors (unused-var warnings should now be gone)
npm run test:unit   # all unit suites green
```

**Commit:**

```text
test(fe): remove unused local bindings in unit tests
```

---

## STEP 3 — Scope Playwright context options in coverage fixture

File: `frontend/src/config/tests/coverage.setup.ts` (line ~14).

Copilot review: spreading the whole `testInfo.project.use` into
`browser.newContext()` passes test-runner-only options (e.g. `video`, `trace`,
`headless`, `device`, `baseURL`) that `newContext()` does not accept — risking a
runtime throw. Pass only valid `BrowserContextOptions`.

Change:

```ts
const context = await browser.newContext({ ...testInfo.project.use, storageState });
```

to (pick only context-valid fields actually configured in `commonSettings`):

```ts
const { viewport, ignoreHTTPSErrors, baseURL } = testInfo.project.use;
const context = await browser.newContext({ viewport, ignoreHTTPSErrors, baseURL, storageState });
```

**Verify before committing:**

```bash
cd frontend
npx tsc -b          # still 0 errors
npm run lint        # 0 errors
npm run test:e2e:bceid   # confirm e2e webServer still launches (or test:e2e:idir)
```

If the full e2e run is too slow locally, at minimum confirm `tsc -b` + `lint`
and that the Playwright config loads (`npx playwright test --list`).

**Commit:**

```text
fix(fe): scope playwright context options in coverage setup
```

---

## STEP 4 — Stop running the E2E suite twice in CI

File: `.github/workflows/reusable-tests-fe.yml`.

Copilot review: the `tests-frontend` job runs `npm run test:coverage`, and
`test:coverage` already runs `test:unit` **then** `test:e2e` (see
`frontend/package.json`). The PR also added a separate `e2e:` matrix job that
runs the E2E suite **again** — duplicate work, duplicate artifacts/checks.

Pick **one** option (Option 1 recommended — smallest, keeps coverage merge intact):

- **Option 1 (recommended):** Delete the new `e2e:` matrix job (the whole
  `e2e:` block added in this PR, ~74 lines at the end of the file). The
  `tests-frontend` job already runs unit + e2e via `test:coverage` and merges
  coverage in `posttest:coverage`. Also remove the now-unneeded e2e-specific
  artifact upload duplication if it only served that job.

- **Option 2 (only if true unit/e2e split is desired):** Make `tests-frontend`
  unit-only and keep `e2e:` for e2e. This requires:
  1. Change `tests-frontend` command to `npm run test:unit` (not
     `test:coverage`).
  2. Upload unit coverage (`frontend/coverage/coverage-final.json`) and the e2e
     `.nyc_output` as artifacts.
  3. Add a final job that downloads both, runs the merge step from
     `posttest:coverage` (`nyc merge` + `nyc report`), and feeds Sonar.
  This is significantly more work and changes coverage wiring — only do it if
  explicitly requested.

Default to **Option 1** unless told otherwise.

**Verify before committing:**

```bash
cd frontend && npx tsc -b && npm run lint   # both clean
# Optionally validate the workflow YAML parses (e.g. `actionlint` or `yamllint`).
```

**Commit (Option 1):**

```text
ci(fe): remove duplicate e2e job from reusable workflow
```

---

## STEP 5 — Final lint check + fix any remaining warnings

Run lint across the frontend and fix everything it reports. Auto-fix first, then
resolve anything left by hand.

```bash
cd frontend
npm run lint -- --fix   # auto-fix what ESLint can
npm run lint            # must end with "0 problems" (0 errors, 0 warnings)
```

For each warning ESLint cannot auto-fix:

1. Fix it (prefer removing dead code / unused symbols; do **not** silence with
   `// eslint-disable` unless genuinely unavoidable, and justify it if so).
2. After **each** fix, re-run the relevant suite to confirm nothing broke:
   `npm run test:unit` (and `npm run test:e2e:bceid` if the fix touches e2e/config).
3. Group the lint fixes into one commit at the end of this step.

> Expectation: after Steps 1\u20132 the 61 unused-var warnings are already gone, so
> this step should report **0 problems** with no further edits. If new warnings
> appear, fix them here before committing.

**Commit (only if lint required additional edits):**

```text
style(fe): resolve remaining eslint warnings
```

---

## STEP 6 — Final full verification

```bash
cd frontend
npx tsc -b            # 0 errors, exit 0
npm run lint          # 0 problems
npm run build         # tsc + vite build succeed
npm run test:unit     # all unit suites green
```

Push the branch and confirm on PR #919 that `Frontend Unit Tests`,
`E2E Tests (bceid)`, `E2E Tests (idir)`, `Frontend UI Tests`, and
`Builds (frontend)` all go green.

No commit for this step (verification only). Delete this plan file in the final
push if it should not land in the repo:

```text
chore: remove temporary fix plan
```
