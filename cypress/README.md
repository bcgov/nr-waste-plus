# Automated End-to-End User Journey Tests with Cypress

BDD-driven end-to-end tests using [Cypress](https://www.cypress.io/) + [Cucumber](https://cucumber.io/) / [Gherkin](https://cucumber.io/docs/gherkin/).

This project allows a collaborative environment where **anyone** — technical or not — can describe user journeys as test scenarios, and the development team will make sure they are automated.

## Documentation

| Guide | Audience | Description |
| --- | --- | --- |
| [Writing Test Scenarios](../../wiki/Writing-Test-Scenarios) | Everyone | How to create features, scenarios, and use authentication annotations |
| [Step Reference](../../wiki/Step-Reference) | Everyone | Full list of ready-to-use step instructions |
| [Developer Guide](../../wiki/Developer-Guide) | Developers | Environment setup, project structure, running tests, and CI configuration |

## Quick start

```bash
# Install dependencies
npm ci

# Interactive mode (Cypress UI) against localhost
npm run cy:open:local

# Headless mode against localhost
npm run cy:run:local

# Headless mode with mochawesome JSON output (for markdown summary)
npm run cy:run:md:local

# Against a custom URL
npm run cy:open -- --config baseUrl=https://your-app-url.example.com
```

> [!NOTE]
> You need a `.env` file with login credentials before running the tests. See the [Developer Guide](../../wiki/Developer-Guide#local-development--env-file) for details.

## Accessibility steps (Gherkin)

Accessibility checks are available as first-class Gherkin steps and can be mixed with existing user journey scenarios.

```gherkin
Then the page should have no accessibility violations
Then the "main" region should have no accessibility violations
When I press "Tab" 3 times
Then the element "Facility Name" should be focused
```

These steps use `cypress-axe`, `axe-core`, `@testing-library/cypress`, and `cypress-real-events`.

## GitHub Actions markdown summary (mochawesome)

To generate a markdown report for `GITHUB_STEP_SUMMARY`, run Cypress with mochawesome JSON output and then generate the summary markdown file:

```bash
# Generates JSON files in reports/mochawesome and accessibility metadata in reports/a11y
npm run cy:run:md

# Converts mochawesome + accessibility metadata into summary.md
npm run report:md
```

Generated artifacts:

- `reports/mochawesome/**/*.json` (machine-readable test results)
- `reports/a11y/a11y-results.json` (accessibility checks metadata)
- `summary.md` (markdown report ready for GitHub Actions summary)

In GitHub Actions, append it after your Cypress step:

```bash
cat cypress/summary.md >> "$GITHUB_STEP_SUMMARY"
```

`summary.md` includes:

- test totals and failed tests
- failed test screenshots and videos (when available)
- accessibility check totals and top violations

## Submitting a test without coding

You can submit test scenarios directly through GitHub Issues — no coding required:

1. Go to [Issues](https://github.com/bcgov/nr-waste-plus/issues) and click **New issue**.
2. Select the **User provided automated test-case** template.
3. Fill out the form following the provided instructions.

The issue will be automatically converted to a `.feature` file used for testing.
