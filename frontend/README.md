# Harvest Residue System - Waste

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=nr-waste-plus-frontend&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=nr-waste-plus-frontend)

Report logging waste and residue data for billing and cut control

## Development

For more developer information visit the [documentation](https://github.com/bcgov/nr-waste-plus/wiki/Project-Structure) for a broader documentation.

### Component Structure

Every component lives in its own folder with an `index.tsx` and an optional `index.scss`:

```
src/components/MyComponent/
├── index.tsx
├── index.scss
└── index.unit.test.tsx
```

**`index.tsx`** — the component implementation:

```tsx
import type { FC } from 'react';
import './index.scss';

const MyComponent: FC = () => {
  return <div className="my-component">Hello</div>;
};

export default MyComponent;
```

**`index.scss`** — component styles. If you use a Carbon component whose SCSS hasn't been imported yet, add `@use` at the top of this file. Sass deduplicates modules, so it will only be emitted once in the final bundle regardless of how many files import it:

```scss
@use '@carbon/styles/scss/components/toggle';
@use '@carbon/react/scss/spacing' as *;

.my-component {
  padding: $spacing-05;
}
```

> The full list of available component SCSS modules lives in
> `node_modules/@carbon/styles/scss/components/`. The module name matches the
> folder name (e.g. `toggle`, `data-table`, `ui-shell`). Some components like
> `data-table` have sub-modules (`action`, `expandable`, `skeleton`, `sort`).

### Image Usage

All images live in `public/img/` and are served as static assets with deterministic URLs (no content hash). This allows `<link rel="preload">` in `index.html` to discover them immediately — before any JS executes.

#### Format guidelines

| Format | Use for |
|---|---|
| **SVG** | Logos, icons, illustrations — infinitely scalable at any resolution |
| **WebP** | Photos, hero images — 25-35% smaller than PNG/JPEG |

#### Converting photos to WebP

Use any tool that supports WebP output. On macOS with Python 3 + Pillow:

```bash
pip3 install Pillow

python3 -c "
from PIL import Image
img = Image.open('source.png')
img.save('output.webp', 'WebP', quality=50, method=6)
"
```

Or use an online converter such as [squoosh.app](https://squoosh.app).

#### Requirements

| Requirement | Guideline |
|---|---|
| **Format** | SVG for logos/icons, WebP for photos. Avoid PNG/JPEG. |
| **Location** | Place images in `public/img/`. Reference via static paths (e.g., `/img/logo.svg`). |
| **Preload** | Add `<link rel="preload">` in `index.html` for above-the-fold images. |
| **`width` and `height`** | Always set explicit `width` and `height` on `<img>` to prevent layout shifts (CLS). |
| **`fetchPriority`** | Add `fetchPriority="high"` to above-the-fold hero/LCP images. |
| **Quality** | For WebP photos, use `quality=50, method=6` for best compression. |

#### Example

```tsx
{/* SVG logo — scales to any size */}
<img
  src="/img/bc-gov-logo.svg"
  alt="BCGov Logo"
  width={160}
  height={62}
/>

{/* WebP hero image — preloaded in index.html */}
<img
  src="/img/landing.webp"
  alt="Landing cover"
  fetchPriority="high"
/>
```

---

## Running E2E Tests Locally

The E2E suite uses **Playwright** with Vite preview as the test server. All tests run against a production build, not the Vite dev server.

### Quick start (mock auth — no real credentials needed)

```bash
# 1. Install Playwright browsers once
npx playwright install chromium

# 2. Create a .env file with the mock-auth flag and client ID
cat > .env <<'EOF'
VITE_MOCK_AUTH=true
VITE_USER_POOLS_WEB_CLIENT_ID=fake-client-id
EOF

# 3. Run the full suite
npm run test:e2e
```

`VITE_MOCK_AUTH=true` injects a synthetic Cognito JWT cookie instead of navigating through the real login flow. This is the recommended mode for local development.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `VITE_MOCK_AUTH` | Yes (local) | Set to `true` to skip real login and inject a JWT cookie |
| `VITE_USER_POOLS_WEB_CLIENT_ID` | Yes | Cognito User Pool client ID (any non-empty string works with mock auth) |
| `BCEID_USERNAME` / `BCEID_PASSWORD` | Real auth only | BCeID credentials for the real login flow |
| `IDIR_USERNAME` / `IDIR_PASSWORD` | Real auth only | IDIR credentials for the real login flow |
| `RUN_A11Y_TESTS` | Optional | Set to `true` to run the `a11y-chromium` project (`*.a11y.test.*` files) |

> **Security note:** Credentials are read lazily at runtime and are never stored in Playwright project metadata or serialized into debug dumps.

### Projects and user types

The suite runs each test twice by default — once as a **BCeID** user and once as an **IDIR** user:

| Project | User type | File pattern |
|---|---|---|
| `bceid-chromium` | BCeID business user (submitter + viewer roles) | `*.e2e.test.{ts,tsx}` |
| `idir-chromium` | IDIR admin user | `*.e2e.test.{ts,tsx}` |
| `a11y-chromium` | BCeID (accessibility audits) | `*.a11y.test.{ts,tsx}` |

Tests tagged `@idir-only` are skipped in `bceid-chromium`; tests tagged `@bceid-only` are skipped in `idir-chromium`.

### Running a subset of tests

```bash
# Run a single test file
npx playwright test src/pages/WasteSearch/search-results.e2e.test.tsx

# Run only BCeID tests
npx playwright test --project=bceid-chromium

# Run only IDIR tests
npx playwright test --project=idir-chromium

# Run a11y tests (requires RUN_A11Y_TESTS=true)
RUN_A11Y_TESTS=true npx playwright test --project=a11y-chromium

# Run with the Playwright UI (headed, interactive)
npx playwright test --ui
```

### Reporters

Locally, only the `list` reporter is active (console output). In CI, HTML and JUnit reports are also generated:

| Environment | Reporters | Output location |
|---|---|---|
| Local | `list` | Console only |
| CI | `list` + `html` + `junit` | `test-reports/report/`, `test-reports/junit/report.xml` |

### Coverage

To collect JavaScript coverage alongside E2E tests:

```bash
VITE_COVERAGE=true npm run test:e2e
# Coverage JSON lands in .nyc_output/; merge with:
npm run posttest:coverage
```

