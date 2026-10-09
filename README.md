# Waste Plus

Waste Plus is the Harvest Residue System application for reporting waste and
residue data used in billing and cut control. This repository brings together
the web application, its APIs and supporting services, and browser-based user
journey tests.

| Module | Responsibility | Guide |
| --- | --- | --- |
<!-- markdownlint-disable MD013 -->
| `frontend/` | React web application for reporting units, search, district volume data, species composition, and configuration workflows | [Frontend README](frontend/README.md) |
| `backend/` | Frontend-facing API, application services, PostgreSQL persistence, and integrations | [Backend README](backend/README.md) |
| `legacy/` | Oracle-backed legacy APIs and reference-data capabilities used through the backend integration boundary | [Legacy README](legacy/README.md) |
| `cypress/` | Cypress and Gherkin scenarios for deployed application journeys | [Cypress README](cypress/README.md) |
| `database/` | PostgreSQL container image definition for the local Compose environment | — |
<!-- markdownlint-enable MD013 -->

## How the services fit together

```text
Browser ──> React frontend ──> Spring Boot backend ──> PostgreSQL
                                      │
                                      ├──> Legacy Spring Boot API ──> Oracle
                                      ├──> Forest Client integration
                                      └──> MinIO / S3-compatible attachment storage
```

The backend is the main API boundary for the frontend. It owns application
storage and coordinates integrations with Forest Client and the legacy service.
The legacy module retains Oracle-backed capabilities. MinIO provides an
S3-compatible local service for attachments. The service and deployment
configuration is maintained alongside the application in this repository.

## Start here

- **Application developers:** read the [frontend](frontend/README.md),
  [backend](backend/README.md), or [legacy](legacy/README.md) guide for its
  prerequisites, commands, and test workflows.
- **Test authors and QA:** start with the [Cypress guide](cypress/README.md) for
  Gherkin scenarios, local run targets, accessibility steps, and contribution
  workflow.
- **Architecture and conventions:** browse the
  [project wiki](https://github.com/bcgov/nr-waste-plus/wiki), especially the
  [backend architecture overview](https://github.com/bcgov/nr-waste-plus/wiki/Backend-Architecture-Overview),
  [backend structure](https://github.com/bcgov/nr-waste-plus/wiki/Backend-Structure),
  [frontend architecture overview](https://github.com/bcgov/nr-waste-plus/wiki/Frontend-Architecture-Overview),
  and [frontend structure](https://github.com/bcgov/nr-waste-plus/wiki/Frontend-Structure).
- **Security reporting:** see the repository's [security policy](SECURITY.md).

## Local services

The root [`docker-compose.yml`](docker-compose.yml) defines PostgreSQL, Oracle,
the legacy database migration job, MinIO, backend, legacy, and frontend
services. It exposes PostgreSQL on `5432`, Oracle on `1521`, MinIO API and
console on `9000` and `9001`, backend on `8080`, legacy on `9090`, and frontend
on `3000`.

The Compose setup expects local environment configuration, including
`POSTGRES_PASSWORD`, `APP_USER_PASSWORD`, `MINIO_ROOT_USER`, and
`MINIO_ROOT_PASSWORD`; backend and legacy also mount local configuration
directories. Keep credentials and environment-specific configuration out of
Git. For example, to start only the database and object-storage dependencies
for local work, configure the required values in your local environment first,
then run:

```bash
docker compose up -d database legacydb legacyflyway minio minio-init
```

This starts dependencies only; each module guide documents its application
commands and test setup. The PostgreSQL image is based on PostgreSQL 17.11.

## Repository checks

The frontend and Cypress modules require Node.js `>=22.19.0`; the Java
services target Java 21. Run each command from its module directory.

Frontend checks (`frontend/`):

```bash
npm ci
npm run lint
npm run test:unit
npm run build
```

Backend checks (`backend/`):

```bash
./mvnw verify -P all-tests checkstyle:checkstyle -Dcheckstyle.skip=false
```

Legacy checks (`legacy/`):

```bash
./mvnw verify -P all-tests checkstyle:checkstyle -Dcheckstyle.skip=false
```

Scenario-suite checks (`cypress/`):

```bash
npm ci
npm run lint
npm run test:unit
```

Browser-test prerequisites and target URLs are described in their respective
guides.

## Project references

- [Project wiki](https://github.com/bcgov/nr-waste-plus/wiki)
- [Apache License 2.0](LICENSE)
- [Security policy](SECURITY.md)
