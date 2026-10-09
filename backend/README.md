# Waste Plus backend

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=nr-waste-plus-backend&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=nr-waste-plus-backend)

The backend is the frontend-facing Spring Boot API for reporting waste and
residue data used in billing and cut control. It coordinates application
workflows, PostgreSQL persistence, Forest Client integration, legacy API calls,
and attachment storage.

## Service boundary

The frontend calls this API; the backend owns application services and
PostgreSQL-backed data access. It integrates with Forest Client and routes
legacy capabilities through the separate [legacy service](../legacy/README.md).
Attachments use an `ObjectStorageProvider` abstraction with S3-compatible
storage. The local Compose environment provides MinIO for that integration.

The API includes areas such as reporting units and search, block calculations,
attachments, formula configuration, district-average volumes, and species
composition. For exact request and response contracts, use the running API's
OpenAPI documentation rather than treating a wiki endpoint list as exhaustive.

## Technology and layout

- Java 21 and Spring Boot 4.1.1 (`pom.xml`)
- Maven wrapper (`./mvnw`)
- PostgreSQL for application persistence
- MinIO/S3-compatible object storage for attachments
- Testcontainers-backed integration tests, including isolated MinIO buckets

The Java package structure separates HTTP controllers, services, repositories,
integration providers, DTOs, security, and configuration. The
[backend architecture overview](https://github.com/bcgov/nr-waste-plus/wiki/Backend-Architecture-Overview)
and [backend structure guide](https://github.com/bcgov/nr-waste-plus/wiki/Backend-Structure)
describe those boundaries and conventions.

## Build and test

Run commands from `backend/`:

```bash
# Run the default test suite
./mvnw test

# Run the CI verification profile and Checkstyle
./mvnw verify -P all-tests checkstyle:checkstyle -Dcheckstyle.skip=false
```

The CI verification runs the `all-tests` Maven profile and Checkstyle. Some
integration tests start services through Testcontainers, so Docker must be
available for those tests. Java 21 is required.

## Local object storage

The root Compose file defines MinIO and a bucket initialization service. Start
them from the repository root:

```bash
docker compose up -d minio minio-init
```

<!-- markdownlint-disable MD013 -->
| Setting | Value or purpose |
| --- | --- |
| S3 API | `http://localhost:9000` from the host; `http://minio:9000` from the Compose network |
| MinIO console | `http://localhost:9001` |
| Default bucket | `nr-waste`, persisted in the `minio_data` named volume |
| `MINIO_ROOT_USER` / `OBJECT_STORAGE_ACCESS_KEY` | MinIO root identity and S3 access key; set locally |
| `MINIO_ROOT_PASSWORD` / `OBJECT_STORAGE_SECRET_KEY` | MinIO root password and S3 secret key; set locally |
| `OBJECT_STORAGE_ENDPOINT` | S3-compatible endpoint; local host default is `http://localhost:9000` |
| `OBJECT_STORAGE_BUCKET` | Bucket name; default is `nr-waste` |
| `OBJECT_STORAGE_REGION` | S3 signing region; local default is `ca-central-1` |
| `S3_FORCE_PATH_STYLE` | Enables path-style S3 addressing; set to `true` for local MinIO |
<!-- markdownlint-enable MD013 -->

Set credentials in your local environment or ignored `.env` file. Never commit
credentials. The backend container uses the Compose-network endpoint
`http://minio:9000`; the host endpoint is for tools running outside Docker.

## More information

- [Backend architecture overview](https://github.com/bcgov/nr-waste-plus/wiki/Backend-Architecture-Overview)
- [Backend structure](https://github.com/bcgov/nr-waste-plus/wiki/Backend-Structure)
- [Authentication and JWT architecture](https://github.com/bcgov/nr-waste-plus/wiki/JSON-Web-Tokens)
- [Environment profiles](https://github.com/bcgov/nr-waste-plus/wiki/Profiles-and-Environment-Separation)
- [Repository overview](../README.md)
