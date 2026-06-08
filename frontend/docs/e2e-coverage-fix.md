# Fix: E2E Coverage Collection Is a No-Op in CI

## Status

**Wired but non-functional.** The `VITE_COVERAGE` flag, `coverage.setup.ts`, and `coverage-merge` job
all exist and run, but produce zero Istanbul files from e2e runs in CI.

---

## Root Cause

`coverage.setup.ts` filters collected JS coverage entries by URL:

```ts
// frontend/src/config/tests/coverage.setup.ts  line ~38
if (!entry.url.startsWith(`${testInfo.project.use.baseURL}/src`)) continue;
```

In CI, Playwright runs against `vite preview` (`npm run build && npm run serve:e2e`).
`vite preview` serves the **production build** from `frontend/build/`, so JS URLs look like:

```
http://localhost:3000/assets/react-vendor-BzQm1Ab3.js
http://localhost:3000/assets/index-C8kFpqWZ.js
```

None start with `…/src/…`, so **every entry is skipped**. The `.nyc_output/` directory
stays empty for e2e jobs.

A second compounding issue: `vite.config.ts` does **not** emit sourcemaps for the
production build (`build.sourcemap` is absent — defaults to `false`). Even if the URL
filter were fixed, `v8-to-istanbul` needs a sourcemap to map bundle offsets back to
original `src/` files.

---

## What Exists Today

| File | Role |
|---|---|
| `frontend/src/config/tests/coverage.setup.ts` | Playwright fixture that collects V8 coverage per page per test via `page.coverage.startJSCoverage` / `stopJSCoverage`, converts with `v8-to-istanbul`, writes Istanbul JSON to `.nyc_output/` |
| `frontend/src/config/tests/browser.teardown.ts` | Global teardown — only clears `user.*.json` state files; does **not** touch coverage |
| `frontend/.nyc_output/` | Scratch directory; unit test `posttest:coverage` copies `coverage/coverage-final.json` here as `unit-coverage.json` before the nyc merge |
| `reusable-tests-fe.yml` `coverage-merge` job | Downloads `nyc-output-unit`, `nyc-output-bceid`, `nyc-output-idir` artifacts → `nyc merge` → `nyc report` (lcov + cobertura) |
| `package.json` `posttest:coverage` | `nyc merge .nyc_output .nyc_output/coverage.json && nyc report …` — runs locally after `test:coverage` |

---

## Fix Plan

### Option A — `vite dev` server for e2e (recommended)

Run Playwright against the **dev server** instead of `vite preview`.
The dev server serves files at `/src/…` URLs exactly matching the existing filter.

**Changes required:**

1. **`playwright.config.ts`** — change `webServer.command`:

   ```diff
   -  command: 'npm run build && npm run serve:e2e',
   +  command: process.env.CI ? 'npm run build && npm run serve:e2e' : 'npm run dev',
   ```

   For CI-only coverage, add a dedicated command that starts `vite --mode test`:

   ```diff
   -  command: 'npm run build && npm run serve:e2e',
   +  command: process.env.VITE_COVERAGE === 'true'
   +    ? 'vite --mode test'
   +    : 'npm run build && npm run serve:e2e',
   ```

2. **`vite.config.ts`** — make sure dev server works with `VITE_MOCK_AUTH=true` (it already
   does via `loadEnv`). No code change needed.

3. **`coverage.setup.ts`** — no filter change needed; `/src/…` URLs remain valid.

**Trade-offs:**
- Dev server is slower to start in CI (~5 s vs ~30 s for build, but HMR overhead gone).
- Untransformed source → faster `v8-to-istanbul` conversion (no sourcemap step needed).
- Auth setup tests run identically; storage state files are project-scoped.

---

### Option B — Emit sourcemaps in production build + fix URL mapping (alternative)

Keep `vite preview` but add sourcemaps and rewrite URLs in `coverage.setup.ts`.

**Changes required:**

1. **`vite.config.ts`** — enable sourcemaps when `VITE_COVERAGE=true`:

   ```ts
   build: {
     sourcemap: process.env.VITE_COVERAGE === 'true' ? 'inline' : false,
     // ... existing options
   }
   ```

   `'inline'` embeds the map in the bundle. `true` emits a separate `.map` file (requires
   file access from within Playwright fixture). Use `'inline'` for simplicity.

2. **`coverage.setup.ts`** — replace the URL filter + path resolution logic:

   ```ts
   // Old: only matches /src/ URLs (dev server only)
   if (!entry.url.startsWith(`${testInfo.project.use.baseURL}/src`)) continue;
   const absPath = entry.url.replace(testInfo.project.use.baseURL ?? '', process.cwd());

   // New: accept any /assets/ JS chunk that has sources from /src/
   import { SourceMapConsumer } from 'source-map'; // npm i -D source-map

   for (const entry of jsCoverage) {
     if (!entry.url.includes('/assets/') || !entry.url.endsWith('.js')) continue;
     if (!entry.source) continue; // no inline sourcemap → skip

     const consumer = await new SourceMapConsumer(entry.source); // parse inline map
     const sourceFiles = consumer.sources.filter(s => s.includes('/src/'));

     if (sourceFiles.length === 0) { consumer.destroy(); continue; }

     const converter = v8toIstanbul(
       entry.url,               // virtual path — v8toIstanbul uses it as the key
       0,
       {
         source: entry.source,  // bundle source text
         wasm: undefined,
       },
       // sourceMap override: pull from inline
       (path) => ({ sourceMap: consumer }),
     );
     await converter.load();
     converter.applyCoverage(entry.functions);
     // ... rest of write logic unchanged
     consumer.destroy();
   }
   ```

   > **Note:** `v8toIstanbul` v9 accepts a `sourceMapCallback` as fourth argument.
   > See [v8-to-istanbul docs](https://github.com/istanbuljs/v8-to-istanbul#usage).

3. **Dependencies:**

   ```bash
   npm i -D source-map
   ```

**Trade-offs:**
- Larger CI build artifact (inline sourcemaps in JS chunks).
- More complex fixture code.
- Tests run against the actual production bundle → higher fidelity.
- Build time increases slightly; `vite preview` startup is fast.

---

### Option C — Istanbul instrumentation via Vite plugin (simplest output, most invasive)

Use `@istanbuljs/schema` + `babel-plugin-istanbul` via a Vite plugin to **instrument source
files at build time**. Coverage is then available as `window.__coverage__` and collected
without V8 API.

```ts
// vite.config.ts
import istanbul from 'vite-plugin-istanbul'; // npm i -D vite-plugin-istanbul

plugins: [
  react(),
  tsconfigPaths(),
  process.env.VITE_COVERAGE === 'true' && istanbul({
    include: 'src/**',
    exclude: ['node_modules', 'coverage/**', 'src/config/tests/**'],
    extension: ['.ts', '.tsx'],
    requireEnv: false,
  }),
  // ...
]
```

Then in `coverage.setup.ts` collect `window.__coverage__` instead of V8:

```ts
const coverage = await page.evaluate(() => (window as any).__coverage__);
if (coverage) {
  const safeTestId = testInfo.testId.replace(/\W+/g, '_');
  const outPath = path.join(COVERAGE_DIR, `coverage-istanbul-${safeTestId}.json`);
  fs.writeFileSync(outPath, JSON.stringify(coverage));
}
```

No sourcemap mapping needed — Istanbul records original source positions directly.

**Trade-offs:**
- Works with `vite preview` without sourcemap changes.
- Requires `npm i -D vite-plugin-istanbul`.
- Build output is ~3× larger when instrumented (only used when `VITE_COVERAGE=true`).
- Relies on Babel transform; may conflict with React Compiler or SWC if added later.

---

## Recommended Approach

**Option A first** (dev server): minimal code change, no new deps, reuses existing
`/src/…` URL logic unchanged. If test reliability on the dev server is a concern
(e.g., HMR noise), fall back to **Option C** (istanbul plugin) which is the most
portable across server modes.

---

## Acceptance Criteria

- [ ] `VITE_COVERAGE=true npm run test:e2e:bceid` produces `.nyc_output/coverage-*.json` files
  in `frontend/.nyc_output/`
- [ ] `nyc merge .nyc_output .nyc_output/coverage.json` produces a non-empty merged file
  containing both unit and e2e entries
- [ ] `coverage/lcov.info` after merge contains line hits for at least one component
  exercised only by e2e (e.g. `WasteSearch/index.tsx`)
- [ ] CI `coverage-merge` job uploads a non-zero `combined-coverage` artifact
- [ ] SonarCloud receives the merged `lcov.info` (update `sonar_args` in
  `reusable-tests-fe.yml` to point at the artifact path if needed)

---

## Files to Change (by option)

| File | Option A | Option B | Option C |
|---|---|---|---|
| `frontend/playwright.config.ts` | ✅ `webServer.command` | — | — |
| `frontend/vite.config.ts` | — | ✅ `build.sourcemap` | ✅ `vite-plugin-istanbul` |
| `frontend/src/config/tests/coverage.setup.ts` | — | ✅ URL filter + sourcemap | ✅ collect `window.__coverage__` |
| `package.json` devDependencies | — | ✅ `source-map` | ✅ `vite-plugin-istanbul` |
| `.github/workflows/reusable-tests-fe.yml` | possibly `webServer` timeout | — | — |

---

## Related

- `frontend/src/config/tests/coverage.setup.ts` — fixture collecting V8 coverage
- `frontend/src/config/tests/browser.teardown.ts` — global teardown (no coverage logic)
- `frontend/vite.config.ts` `build:` section (lines 111–142) — no sourcemap today
- `frontend/playwright.config.ts` `webServer` (lines 113–119) — `vite preview` command
- `.github/workflows/reusable-tests-fe.yml` `coverage-merge` job — downstream consumer
- `package.json` `posttest:coverage` — local nyc merge script
