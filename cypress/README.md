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

# Against a custom URL
npm run cy:open -- --config baseUrl=https://your-app-url.example.com
```

> [!NOTE]
> You need a `.env` file with login credentials before running the tests. See the [Developer Guide](../../wiki/Developer-Guide#local-development--env-file) for details.

## Submitting a test without coding

You can submit test scenarios directly through GitHub Issues — no coding required:

1. Go to [Issues](https://github.com/bcgov/nr-waste-plus/issues) and click **New issue**.
2. Select the **User provided automated test-case** template.
3. Fill out the form following the provided instructions.

The issue will be automatically converted to a `.feature` file used for testing.
