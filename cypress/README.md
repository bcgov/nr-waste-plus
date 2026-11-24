# Cypress user-journey tests

This module runs behavior-driven browser tests with
[Cypress](https://www.cypress.io/), the
[Cucumber preprocessor](https://github.com/badeball/cypress-cucumber-preprocessor),
and [Gherkin](https://cucumber.io/). Scenario files describe user journeys in
`.feature` files, which can be reviewed by product, QA, and engineering
contributors. Shared TypeScript step definitions connect those scenarios to
browser interactions.

The suite currently covers login and logout, profile, application loading,
search, keyboard navigation, accessibility, Lighthouse, theme switching, UI
quality, and reporting-unit details. Browse
[`cypress/cypress/e2e/`](cypress/e2e/) for the feature files and
[`cypress/cypress/support/step_definitions/`](cypress/support/step_definitions/)
for shared steps and hooks.

## Prerequisites

- Node.js `>=22.19.0`
- A supported Chrome/Chromium browser installed by Cypress
- A running local frontend at `http://localhost:3000` for headless local runs
- Local BCeID or IDIR credentials for scenarios that perform real login

Provide login credentials in local environment configuration. The Cypress
configuration accepts `idir_username`, `idir_password`, `bceid_username`, and
`bceid_password`, as well as their `CYPRESS_`-prefixed forms. Do not put real
credentials in source control, issue content, or feature files. CI injects its
test credentials through the workflow environment.

## Install and run

Install dependencies from `cypress/`:

```bash
npm ci
```

The interactive and headless scripts use different base URLs:

<!-- markdownlint-disable MD013 -->
| Command | Mode | Base URL |
| --- | --- | --- |
| `npm run cy:open:local` | Cypress interactive UI | Deployed Silver frontend (`https://nr-waste-plus-40-frontend.apps.silver.devops.gov.bc.ca/`) |
| `npm run cy:run:local` | Headless Chrome; generates report summary | Local frontend at `http://localhost:3000` |
| `npm run cy:run:md:local` | Headless Chrome; generates JSON reports and Markdown summary | Local frontend at `http://localhost:3000` |
<!-- markdownlint-enable MD013 -->

Start the local frontend separately before either headless command. `cy:open:local`
is named for the local workflow but is configured to open the deployed Silver
URL; use the headless scripts for the configured localhost target.

Each test body has a 30-second wall-clock budget, installed from
`cypress/support/helpers/test-timeout.ts`; Business BCeID authenticated tests
get 24.4 seconds. The IDIR budget allows for the silent SSO redirect that can
take ~15 seconds to settle. The SSO login hook suspends the budget while
`cy.session` runs its own timed commands, then re-arms it for the test body.
The baseline is derived from the slowest non-hung CI failure (9.8 min) plus 10%,
divided across the 53 test cases (12.2 s); adding tests therefore grows the
suite's runtime budget automatically. Retune the constants in that helper if
the slowest healthy test changes.

Useful maintenance commands:

```bash
npm run lint
npm run test:unit
npm run report:md
npm run report:clean
```

The Cypress run scripts clear prior reports before a run and generate a
Markdown summary afterward. Generated reports, screenshots, and videos are
output artifacts and should not be committed unless a task specifically
requires them.

## Writing scenarios

Gherkin keeps user-facing behavior readable while shared step definitions
provide the implementation. For example, accessibility checks can be combined
with navigation and focus expectations:

```gherkin
Then the page should have no accessibility violations
Then the "main" region should have no accessibility violations
When I press "Tab" 3 times
Then the element "Facility Name" should be focused
```

The accessibility steps use `axe-core`, `@testing-library/cypress`, and
`cypress-real-events`. Additional shared steps cover common interactions,
design-token checks, UI/UX checks, and Lighthouse audits. Check the step
reference for the current vocabulary before adding a custom step.

## Contribute a scenario through GitHub Issues

Scenarios can be proposed without writing code:

1. Open the repository's [Issues](https://github.com/bcgov/nr-waste-plus/issues).
2. Choose the **User provided automated test-case** template and describe the
   expected journey.
3. Apply the `gherkin` label so the workflow can process the issue.

For a newly opened issue with the `gherkin` label, the GitHub Actions workflow
creates a `.feature` file on a test branch and opens a pull request. An issue
without that label is not automatically converted.

## Guides

| Guide | Audience | What it covers |
| --- | --- | --- |
| [Writing Cypress Test Scenarios](https://github.com/bcgov/nr-waste-plus/wiki/Writing-Cypress-Test-Scenarios) | Scenario authors and contributors | Feature files, scenarios, and authentication annotations |
| [Cypress Step Reference](https://github.com/bcgov/nr-waste-plus/wiki/Cypress-Step-Reference) | Scenario authors | Shared Gherkin steps available to use |
| [Cypress Developer Guide](https://github.com/bcgov/nr-waste-plus/wiki/Cypress-Developer-Guide) | Developers | Environment setup, project structure, test runs, and CI |
| [Repository overview](../README.md) | Everyone | Application modules and architecture links |
