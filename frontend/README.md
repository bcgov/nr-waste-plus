# Waste Plus frontend

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=nr-waste-plus-frontend&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=nr-waste-plus-frontend)

The frontend is the React web application for reporting waste and residue data
used in billing and cut control. It presents workflows for reporting units,
search, block details, district-volume data, species composition, and
configuration, and calls the [backend API](../backend/README.md).

## Stack and prerequisites

- Node.js `>=22.19.0`
- React 19, TypeScript 5.9, and Vite 8
- Carbon Design System components and Sass styles
- Vitest for unit/component tests and Playwright for browser tests

Install dependencies and start the Vite development server from `frontend/`:

```bash
npm ci
npm run dev
```

Available everyday checks:

```bash
npm run lint
npm run test:unit
npm run build
```

The build runs TypeScript project checks and produces the Vite production
bundle. See the [frontend architecture overview](https://github.com/bcgov/nr-waste-plus/wiki/Frontend-Architecture-Overview)
and [frontend structure](https://github.com/bcgov/nr-waste-plus/wiki/Frontend-Structure)
for the wider application organization. See the
[authentication guide](https://github.com/bcgov/nr-waste-plus/wiki/Authentication)
for login and test-authentication details.

## Application architecture

The frontend is a React and TypeScript single-page application built with Vite
and Carbon Design System components. It presents the reporting and search
workflows, then uses client-side services to call the backend API. Authentication
uses the application's Cognito/FAM integration; local browser tests can use the
mock-auth flow described below.

The UI is organized around application pages and reusable components. Shared
services handle API requests, while common hooks and state support data used
across screens. The
[frontend architecture overview](https://github.com/bcgov/nr-waste-plus/wiki/Frontend-Architecture-Overview)
and [frontend structure guide](https://github.com/bcgov/nr-waste-plus/wiki/Frontend-Structure)
describe the main boundaries.

## Playwright browser tests

The Playwright end-to-end suite runs against a production build served by Vite
preview, not the Vite development server. The default E2E command enables mock
authentication; it is useful for local browser coverage but does not verify a
real BCeID or IDIR login. The separate [`cypress/`](../cypress/README.md) module
contains Gherkin user-journey scenarios.

### Quick start: mock authentication

From `frontend/`:

```bash
# Install dependencies
npm ci

# Install Chromium (the E2E pre-script also installs browser dependencies)
npx playwright install chromium

# Run the full Playwright suite with mock authentication
npm run test:e2e
```

The test command sets `VITE_MOCK_AUTH=true`; the mock flow uses a synthetic
Cognito JWT cookie instead of navigating through real login. Local environment
configuration can be supplied through an ignored `.env` file:

<!-- markdownlint-disable MD013 -->
| Variable | Required | Description |
| --- | --- | --- |
| `VITE_MOCK_AUTH` | For local mock-auth runs | Set to `true` to skip real login and inject the mock JWT cookie. |
| `VITE_USER_POOLS_WEB_CLIENT_ID` | Yes | Cognito User Pool client ID; mock auth accepts any non-empty value. |
| `BCEID_USERNAME` / `BCEID_PASSWORD` | Real auth only | BCeID credentials for a real login flow. |
| `IDIR_USERNAME` / `IDIR_PASSWORD` | Real auth only | IDIR credentials for a real login flow. |
| `RUN_A11Y_TESTS` | Optional | Set to `true` to include the `a11y-chromium` project (`*.a11y.test.*`). |
<!-- markdownlint-enable MD013 -->

> Credentials are read at runtime and are not stored in Playwright project
> metadata or debug dumps. Keep them in local environment configuration, not
> source control.

### Projects and user types

Standard E2E runs cover each test under BCeID and IDIR Playwright projects:

<!-- markdownlint-disable MD013 -->
| Project | User type | File pattern |
| --- | --- | --- |
| `bceid-chromium` | BCeID business user (submitter and viewer roles) | `*.e2e.test.{ts,tsx}` |
| `idir-chromium` | IDIR admin user | `*.e2e.test.{ts,tsx}` |
| `a11y-chromium` | BCeID accessibility audits; enabled with `RUN_A11Y_TESTS=true` | `*.a11y.test.{ts,tsx}` |
<!-- markdownlint-enable MD013 -->

Tests tagged `@idir-only` are excluded from `bceid-chromium`; tests tagged
`@bceid-only` are excluded from `idir-chromium`.

### Run a subset

```bash
# Run one test file
npx playwright test src/pages/WasteSearch/search-results.e2e.test.tsx

# Run only BCeID tests
npx playwright test --project=bceid-chromium

# Run only IDIR tests
npx playwright test --project=idir-chromium

# Run accessibility tests (requires RUN_A11Y_TESTS=true)
RUN_A11Y_TESTS=true npx playwright test --project=a11y-chromium

# Open the Playwright UI
npx playwright test --ui
```

### Reporters

Local runs use the `list` reporter. CI also creates HTML and JUnit reports:

| Environment | Reporters | Output location |
| --- | --- | --- |
| Local | `list` | Console |
<!-- markdownlint-disable MD013 -->
| CI | `list`, `html`, and `junit` | HTML: `test-reports/report/`; JUnit: `test-reports/junit/report.xml` |
<!-- markdownlint-enable MD013 -->

### Coverage

Collect JavaScript coverage with the E2E suite and merge its output:

```bash
VITE_COVERAGE=true npm run test:e2e
# Coverage JSON is written to .nyc_output/; merge it with:
npm run posttest:coverage
```

## Related documentation

- [Frontend architecture overview](https://github.com/bcgov/nr-waste-plus/wiki/Frontend-Architecture-Overview)
- [Frontend structure](https://github.com/bcgov/nr-waste-plus/wiki/Frontend-Structure)
- [Frontend structure guidelines][frontend-guidelines]
- [Authentication](https://github.com/bcgov/nr-waste-plus/wiki/Authentication)
- [Repository overview](../README.md)

[frontend-guidelines]: https://github.com/bcgov/nr-waste-plus/wiki/Frontend-Structure-Guidelines
