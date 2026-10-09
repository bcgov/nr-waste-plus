# Waste Plus legacy service

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=nr-waste-plus-legacy&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=nr-waste-plus-legacy)

The legacy module is a Spring Boot service that retains Oracle-backed reporting
and reference-data capabilities for Waste Plus. The modern
[backend](../backend/README.md) integrates with this service; the frontend
normally reaches it through the backend boundary.

## Service boundary

Legacy APIs support reporting-unit and related search/detail operations, user
and client lookup, and code-table data. The module is kept separate from the
PostgreSQL-backed application services in the modern backend. The wiki's
generated endpoint list is a useful orientation, not a complete API contract;
consult the current controllers and API documentation for exact behavior.

## Technology and local dependencies

- Java 21 and Spring Boot 4.1.1 (`pom.xml`)
- Maven wrapper (`./mvnw`)
- Oracle Free 23.9 in the local Compose environment
- Flyway service for Oracle database migrations

From the repository root, Compose defines Oracle on `localhost:1521` and runs
the Flyway migration service using scripts mounted from
`legacy/src/test/resources/db/migration`. The Oracle application password is
provided through the local `APP_USER_PASSWORD` environment variable. Configure
credentials locally; do not copy passwords into documentation or commit them.

The backend connects to the legacy service through its internal service URL in
the deployment environment. Local application configuration is environment
specific; see the repository's Compose file and deployment manifests rather
than assuming the wiki's older profile examples are current.

## Build and test

Run commands from `legacy/`:

```bash
# Run the default test suite
./mvnw test

# Run the CI verification profile and Checkstyle
./mvnw verify -P all-tests checkstyle:checkstyle -Dcheckstyle.skip=false
```

CI runs the `all-tests` profile and Checkstyle with Java 21. Integration tests
that depend on Oracle require Docker and the configured local database
environment.

## Documentation

- [Legacy overview](https://github.com/bcgov/nr-waste-plus/wiki/Legacy-Overview)
- [Legacy endpoints](https://github.com/bcgov/nr-waste-plus/wiki/Legacy-Endpoints)
- [Backend architecture overview](https://github.com/bcgov/nr-waste-plus/wiki/Backend-Architecture-Overview)
- [Environment profiles](https://github.com/bcgov/nr-waste-plus/wiki/Profiles-and-Environment-Separation)
- [Repository overview](../README.md)
