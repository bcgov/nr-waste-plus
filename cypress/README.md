# Automated End-to-End User Journey Tests with Cypress

BDD-driven end-to-end tests using [Cypress](https://www.cypress.io/) + [Cucumber](https://cucumber.io/) / [Gherkin](https://cucumber.io/).

This project allows a collaborative environment where **anyone** — technical or not — can describe user journeys as test scenarios, and the development team will make sure they are automated.

## Quick start

```bash
# Install dependencies
npm ci

# Interactive mode (Cypress UI) against localhost
npm run cy:open:local

# Headless mode against localhost
npm run cy:run:local

# Headless mode with JSON reports and markdown summary generation
npm run cy:run:md:local
```

> [!NOTE]
> You need a `.env` file with login credentials before running the tests. See the [Developer Guide](https://github.com/bcgov/nr-waste-plus/wiki/Developer-Guide) for details.

## Documentation

| Guide | Audience | Description |
| --- | --- | --- |
| [Writing Test Scenarios](https://github.com/bcgov/nr-waste-plus/wiki/Writing-Cypress-Test-Scenarios) | Everyone | How to create features, scenarios, and use authentication annotations |
| [Step Reference](https://github.com/bcgov/nr-waste-plus/wiki/Step-Reference) | Everyone | Full list of ready-to-use step instructions |
| [Developer Guide](https://github.com/bcgov/nr-waste-plus/wiki/Developer-Guide) | Developers | Environment setup, project structure, running tests, and CI configuration |

## Accessibility steps (Gherkin)

Accessibility checks are available as first-class Gherkin steps and can be mixed with existing user journey scenarios.

```gherkin
Then the page should have no accessibility violations
Then the "main" region should have no accessibility violations
When I press "Tab" 3 times
Then the element "Facility Name" should be focused
```

These steps use `cypress-axe`, `axe-core`, `@testing-library/cypress`, and `cypress-real-events`.

## Submitting a test without coding

You can submit test scenarios directly through GitHub Issues — no coding required:

1. Go to [Issues](https://github.com/bcgov/nr-waste-plus/issues) and click **New issue**.
2. Select the **User provided automated test-case** template.
3. Fill out the form following the provided instructions.

The issue will be automatically converted to a `.feature` file used for testing.
